import * as Tone from 'tone';
import { InstrumentDefinition, INSTRUMENTS, NoteEvent } from '../types';

export class AudioService {
  // Registry to hold multiple loaded samplers
  private samplers: Map<string, Tone.Sampler> = new Map();
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

  private getSampleMap(source: 'salamander' | 'fluid', instrumentId: string): Record<string, string> {
    const notes = ['C', 'D#', 'F#', 'A'];
    // Optimization: limit range for Fluid to avoid 404s on extremes
    const octaves = source === 'salamander' ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7];
    
    const urlMap: Record<string, string> = {};

    octaves.forEach(octave => {
      notes.forEach(note => {
        const midiNote = `${note}${octave}`;
        if (source === 'salamander') {
             if (octave === 0 && (note === 'C' || note === 'D#' || note === 'F#')) return;
             if (octave === 8 && note !== 'C') return;
        }

        let fileName = midiNote;
        if (source === 'fluid') {
             // Fluid map: D#->Eb, etc.
             const replacement = midiNote
                .replace('C#', 'Db')
                .replace('D#', 'Eb')
                .replace('F#', 'Gb')
                .replace('G#', 'Ab')
                .replace('A#', 'Bb');
             fileName = replacement;
        } else {
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
    return `https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/${instrument.id}-mp3/`;
  }

  /**
   * Smartly maps a score instrument name (e.g. "Flauti") to a soundfont ID (e.g. "flute")
   */
  private mapNameToSoundfontId(name: string): string {
    const n = name.toLowerCase();
    
    // Heuristic Matching
    if (n.includes('piano')) return 'grand_piano';
    if (n.includes('flaut') || n.includes('flute')) return 'flute';
    if (n.includes('oboi') || n.includes('oboe')) return 'oboe';
    if (n.includes('clarinet') || n.includes('clarinetti')) return 'clarinet';
    if (n.includes('fagot') || n.includes('bassoon')) return 'bassoon';
    if (n.includes('corni') || n.includes('horn')) return 'french_horn';
    if (n.includes('trombe') || n.includes('trumpet')) return 'trumpet';
    if (n.includes('trombon')) return 'trombone';
    if (n.includes('tuba')) return 'tuba';
    if (n.includes('violin')) return 'violin';
    if (n.includes('viola')) return 'viola';
    if (n.includes('violoncell') || n.includes('cello')) return 'cello';
    if (n.includes('basso') || n.includes('contrabass')) return 'contrabass';
    if (n.includes('timp')) return 'timpani';
    if (n.includes('harp')) return 'orchestral_harp';
    if (n.includes('guitar')) return 'acoustic_guitar_nylon';
    
    // Fallback based on ID if name fails
    return 'grand_piano'; 
  }

  /**
   * Loads a specific soundfont into the registry if not present
   */
  public async loadSoundfont(soundfontId: string): Promise<void> {
    if (this.samplers.has(soundfontId)) return; // Already loaded

    const instrumentDef = INSTRUMENTS.find(i => i.id === soundfontId) || INSTRUMENTS[0];
    const baseUrl = this.getBaseUrl(instrumentDef);
    const urls = this.getSampleMap(instrumentDef.source, instrumentDef.id);

    return new Promise((resolve) => {
      let resolved = false;
      const timeoutId = setTimeout(() => {
          if (!resolved) {
              console.warn(`Timeout loading ${soundfontId}.`);
              resolved = true;
              resolve(); 
          }
      }, 8000); // 8s timeout

      const sampler = new Tone.Sampler({
        urls,
        baseUrl,
        onload: () => {
          if (!resolved) {
              clearTimeout(timeoutId);
              resolved = true;
              resolve();
          }
        },
        onerror: (e) => {
            console.warn(`Error loading ${soundfontId}`, e);
            // Resolve anyway to prevent blocking
            if (!resolved) {
                clearTimeout(timeoutId);
                resolved = true;
                resolve();
            }
        }
      }).connect(this.reverb);

      this.samplers.set(soundfontId, sampler);
    });
  }

  /**
   * Prepares playback by analyzing events and loading necessary instruments
   */
  public async preparePlayback(events: NoteEvent[]): Promise<void> {
    // 1. Identify unique instruments needed
    const requiredSoundfonts = new Set<string>();

    events.forEach(ev => {
        // Use name if available ("Flauti"), else id ("fl")
        const nameToMap = ev.instrumentName || ev.hand || 'piano';
        const soundfontId = this.mapNameToSoundfontId(nameToMap);
        requiredSoundfonts.add(soundfontId);
        
        // Tag the event with the resolved soundfont ID for playback later
        (ev as any)._soundfontId = soundfontId;
    });

    // 2. Load missing ones
    const promises: Promise<void>[] = [];
    requiredSoundfonts.forEach(sfId => {
        if (!this.samplers.has(sfId)) {
            promises.push(this.loadSoundfont(sfId));
        }
    });

    if (promises.length > 0) {
        await Promise.all(promises);
    }
  }

  public play(events: NoteEvent[], onStopCallback: () => void) {
    this.stop(); 

    if (events.length === 0) {
        onStopCallback();
        return;
    }

    // Schedule Notes
    events.forEach(event => {
      const sfId = (event as any)._soundfontId || 'grand_piano';
      const sampler = this.samplers.get(sfId);

      if (sampler && sampler.loaded) {
          Tone.Transport.schedule((time) => {
            sampler.triggerAttackRelease(event.note, event.duration, time);
          }, event.time);
      }

      // Visuals (keep existing logic)
      const cleanNote = event.note.replace('#', 's').toLowerCase();
      const elementId = `key-${cleanNote}`;
      const isBlack = event.note.includes('#');
      const activeClass = isBlack ? 'active-black' : 'active-white';

      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => {
          const el = document.getElementById(elementId);
          if (el) el.classList.add(activeClass);
        }, time);
      }, event.time);

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
    // Do NOT dispose samplers here, we keep them in cache
    this.samplers.forEach(s => s.releaseAll());
    
    document.querySelectorAll('.active-white, .active-black').forEach(el => {
        el.classList.remove('active-white', 'active-black');
    });
  }
}

export const audioService = new AudioService();
