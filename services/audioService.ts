import * as Tone from 'tone';
import { InstrumentDefinition, INSTRUMENTS, NoteEvent } from '../types';

export class AudioService {
  private sampler: Tone.Sampler | null = null;
  private currentInstrumentId: string = '';
  private reverb: Tone.Reverb;
  private limiter: Tone.Limiter;

  constructor() {
    this.limiter = new Tone.Limiter(-1).toDestination();
    this.reverb = new Tone.Reverb({
      decay: 2.5,
      preDelay: 0.1,
      wet: 0.3
    }).connect(this.limiter);
  }

  public async start() {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }
  }

  /**
   * Generates a map of notes to file names for the sampler.
   * We skip notes to save bandwidth, letting Tone.js repitch samples.
   * Mapping Pattern: C, D#, F#, A (Diminished chord steps)
   */
  private getSampleMap(source: 'salamander' | 'fluid', instrumentId: string): Record<string, string> {
    const notes = ['C', 'D#', 'F#', 'A'];
    // Salamander (Piano) has full range. Fluid varies, so we stick to a safe middle range for Fluid to avoid 404s.
    // Tone.js will automatically pitch shift samples for notes outside this range.
    const octaves = source === 'salamander' ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7];
    
    const urlMap: Record<string, string> = {};

    octaves.forEach(octave => {
      notes.forEach(note => {
        const midiNote = `${note}${octave}`;
        
        // Refine edge cases
        if (source === 'salamander') {
             // Salamander is Piano A0 - C8
             if (octave === 0 && (note === 'C' || note === 'D#' || note === 'F#')) return; // A0 starts later
             if (octave === 8 && note !== 'C') return; // Ends at C8
        }

        let fileName = midiNote;
        if (source === 'fluid') {
             // FluidR3 repo typically uses 'Ab3.mp3' style. 
             // Convert Sharp to Flat: D# -> Eb, F# -> Gb, A# -> Bb
             // BUT, C# -> Db.
             const replacement = midiNote
                .replace('C#', 'Db')
                .replace('D#', 'Eb')
                .replace('F#', 'Gb')
                .replace('G#', 'Ab')
                .replace('A#', 'Bb');
             
             fileName = replacement;
        } else {
             // Salamander (Tonejs) uses 'A0.mp3', 'C1.mp3', 'Ds1.mp3'
             fileName = midiNote.replace('#', 's');
        }

        urlMap[midiNote] = `${fileName}.mp3`;
      });
    });

    return urlMap;
  }

  private getBaseUrl(instrument: InstrumentDefinition): string {
    if (instrument.source === 'salamander') {
      return 'https://tonejs.github.io/audio/salamander/';
    }
    // Using raw.githubusercontent to avoid potential CORS issues with gh-pages or other gateways
    return `https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/${instrument.id}-mp3/`;
  }

  public async loadInstrument(instrumentId: string): Promise<void> {
    if (this.currentInstrumentId === instrumentId && this.sampler?.loaded) {
      return;
    }

    const instrumentDef = INSTRUMENTS.find(i => i.id === instrumentId);
    if (!instrumentDef) throw new Error(`Instrument ${instrumentId} not found`);

    if (this.sampler) {
      this.sampler.releaseAll();
      this.sampler.dispose();
    }

    const baseUrl = this.getBaseUrl(instrumentDef);
    const urls = this.getSampleMap(instrumentDef.source, instrumentDef.id);

    return new Promise((resolve, reject) => {
      let resolved = false;

      // Timeout fallback: if loading takes too long (e.g. 10s), assume it failed or let it play with what it has
      const timeoutId = setTimeout(() => {
          if (!resolved) {
              console.warn(`Timeout loading instrument ${instrumentId}. Resolving anyway.`);
              resolved = true;
              // We don't reject because some samples might have loaded.
              // We mark as current so we don't retry in a loop.
              this.currentInstrumentId = instrumentId;
              resolve(); 
          }
      }, 10000);

      this.sampler = new Tone.Sampler({
        urls,
        baseUrl,
        onload: () => {
          if (!resolved) {
              clearTimeout(timeoutId);
              resolved = true;
              this.currentInstrumentId = instrumentId;
              resolve();
          }
        },
        onerror: (err) => {
          // One single file error triggers this, but we might want to continue.
          console.warn("Sampler error (missing file?):", err);
          // Don't reject immediately, maybe other files load.
          // If all fail, timeout will handle it.
        }
      }).connect(this.reverb);
    });
  }

  public play(events: NoteEvent[], onStopCallback: () => void) {
    this.stop(); 

    if (!this.sampler || !this.sampler.loaded) {
        console.warn("Sampler not loaded");
        // Try to play anyway? No, silent.
        // But if timeout forced resolution, 'loaded' property might be true (Tone.js internal).
    }

    // Schedule Notes
    events.forEach(event => {
      Tone.Transport.schedule((time) => {
        this.sampler?.triggerAttackRelease(event.note, event.duration, time);
      }, event.time);

      // Visuals
      const cleanNote = event.note.replace('#', 's').toLowerCase();
      const elementId = `key-${cleanNote}`;
      const isBlack = event.note.includes('#');
      const activeClass = isBlack ? 'active-black' : 'active-white';

      // ON
      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => {
          const el = document.getElementById(elementId);
          if (el) el.classList.add(activeClass);
        }, time);
      }, event.time);

      // OFF
      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => {
          const el = document.getElementById(elementId);
          if (el) el.classList.remove(activeClass);
        }, time + event.duration - 0.05); 
      }, event.time);
    });

    const lastEvent = events[events.length - 1];
    const endTime = lastEvent ? lastEvent.time + lastEvent.duration + 2.0 : 1;
    
    Tone.Transport.schedule(() => {
      this.stop();
      onStopCallback();
    }, endTime);

    Tone.Transport.start();
  }

  public stop() {
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    this.sampler?.releaseAll();
    
    document.querySelectorAll('.active-white, .active-black').forEach(el => {
        el.classList.remove('active-white', 'active-black');
    });
  }
}

export const audioService = new AudioService();