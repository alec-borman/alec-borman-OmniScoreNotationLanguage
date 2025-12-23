import * as Tone from 'tone';
import { InstrumentDefinition, INSTRUMENTS, NoteEvent } from '../types';

export class AudioService {
  private samplers: Map<string, Tone.Sampler> = new Map();
  private reverb: Tone.Reverb;
  private limiter: Tone.Limiter;
  private compressor: Tone.Compressor;
  private masterGain: Tone.Gain;
  
  private readonly DEFAULT_FALLBACK_ID = 'acoustic_grand_piano';

  constructor() {
    this.masterGain = new Tone.Gain(1.2).toDestination();
    this.limiter = new Tone.Limiter(-1).connect(this.masterGain);
    
    this.compressor = new Tone.Compressor({
        threshold: -18,
        ratio: 4,
        attack: 0.003,
        release: 0.2
    }).connect(this.limiter);
    
    this.reverb = new Tone.Reverb({
      decay: 1.2,
      preDelay: 0.04,
      wet: 0.08
    }).connect(this.compressor);
  }

  public async start() {
    if (Tone.context.state !== 'running') {
      await Tone.start();
      await Tone.context.resume();
    }
    console.log("Audio Context Started:", Tone.context.state);
  }

  private getSampleMap(): Record<string, string> {
    const notes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    const octaves = [1, 2, 3, 4, 5, 6, 7];
    const urlMap: Record<string, string> = {};

    octaves.forEach(octave => {
      notes.forEach(note => {
        const midiNote = `${note}${octave}`;
        urlMap[midiNote] = `${midiNote}.mp3`;
      });
    });
    
    urlMap['C8'] = 'C8.mp3';
    return urlMap;
  }

  private getBaseUrl(instrumentId: string): string {
    return `https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/${instrumentId}-mp3/`;
  }

  private mapNameToSoundfontId(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('piano') || n.includes('rh') || n.includes('lh') || n.match(/^v\d+$/)) return 'acoustic_grand_piano';
    if (n.includes('flaut') || n.includes('flute')) return 'flute';
    if (n.includes('oboi') || n.includes('oboe')) return 'oboe';
    if (n.includes('clarinet')) return 'clarinet';
    if (n.includes('fagot') || n.includes('bassoon')) return 'bassoon';
    if (n.includes('horn')) return 'french_horn';
    if (n.includes('trumpet') || n.includes('trombe')) return 'trumpet';
    if (n.includes('trombone')) return 'trombone';
    if (n.includes('violin') || n.includes('vln')) return 'violin';
    if (n.includes('cello') || n.includes('vc')) return 'cello';
    if (n.includes('timp')) return 'timpani';
    if (n.includes('bass') || n.includes('cb')) return 'contrabass';
    if (n.includes('viola') || n.includes('vla')) return 'viola';
    return this.DEFAULT_FALLBACK_ID; 
  }

  public async loadSoundfont(soundfontId: string): Promise<void> {
    if (this.samplers.has(soundfontId)) return;
    const baseUrl = this.getBaseUrl(soundfontId);
    const urls = this.getSampleMap();

    return new Promise((resolve) => {
      let resolved = false;
      const timeoutId = setTimeout(() => { 
          if (!resolved) { 
              console.warn(`Sampler ${soundfontId} load timeout`);
              resolved = true; 
              resolve(); 
          } 
      }, 15000);

      const sampler = new Tone.Sampler({
        urls, baseUrl,
        onload: () => { 
            if (!resolved) { 
                clearTimeout(timeoutId); 
                resolved = true; 
                console.log(`Loaded ${soundfontId}`);
                resolve(); 
            } 
        },
        onerror: (err) => { 
            console.error(`Error loading sampler ${soundfontId}`, err);
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

  public async preparePlayback(events: NoteEvent[]): Promise<void> {
    const required = new Set<string>([this.DEFAULT_FALLBACK_ID]);
    events.forEach(ev => {
        const sfId = this.mapNameToSoundfontId(ev.instrumentName || ev.hand || 'piano');
        required.add(sfId);
        (ev as any)._soundfontId = sfId;
    });
    
    const missing = Array.from(required).filter(id => !this.samplers.has(id));
    for (const id of missing) {
        await this.loadSoundfont(id);
    }
    await Tone.loaded();
  }

  public play(events: NoteEvent[], onStopCallback: () => void) {
    this.stop(); 
    if (events.length === 0) { onStopCallback(); return; }

    if (Tone.context.state !== 'running') {
        Tone.start();
        Tone.context.resume();
    }

    Tone.Transport.cancel(0);
    Tone.Transport.seconds = 0;

    events.forEach(event => {
      const sfId = (event as any)._soundfontId || this.DEFAULT_FALLBACK_ID;
      let sampler = this.samplers.get(sfId);
      if (!sampler || !sampler.loaded) sampler = this.samplers.get(this.DEFAULT_FALLBACK_ID);

      if (sampler && sampler.loaded) {
          Tone.Transport.schedule((time) => {
            sampler!.triggerAttackRelease(event.note, event.duration, time);
            
            Tone.Draw.schedule(() => {
                const noteKey = event.note.toLowerCase().replace('#', 's').replace('b', 's');
                const el = document.getElementById(`key-${noteKey}`);
                if (el) {
                    const isBlack = el.classList.contains('active-black-target');
                    const activeClass = isBlack ? 'active-black' : 'active-white';
                    el.classList.add(activeClass);
                    setTimeout(() => el.classList.remove(activeClass), (event.duration * 1000) - 20);
                }
            }, time);
          }, event.time);
      }
    });

    const lastEvent = events[events.length - 1];
    const endTime = lastEvent ? lastEvent.time + lastEvent.duration + 0.1 : 1;
    
    Tone.Transport.schedule(() => { 
        this.stop(); 
        onStopCallback(); 
    }, endTime);

    Tone.Transport.start("+0.05");
  }

  public stop() {
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    this.samplers.forEach(s => s.releaseAll());
    document.querySelectorAll('.active-white, .active-black').forEach(el => {
        el.classList.remove('active-white', 'active-black');
    });
  }
}
export const audioService = new AudioService();
