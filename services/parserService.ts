import { NoteEvent } from '../types';

interface InstrumentState {
  id: string;
  name: string;
  transpose: number;
}

interface StaffContext {
  lastDuration: string;
  lastOctave: number;
  gridResolution: string | null;
}

export interface ScoreStructure {
  groups: {
    name: string;
    instruments: { id: string; name: string }[];
  }[];
  duration: number;
}

export class ParserService {
  private static DURATION_MAP: Record<string, number> = {
    '0.25': 16.0, '0.5': 8.0, '1': 4.0, '2': 2.0, '4': 1.0, '8': 0.5, '16': 0.25, '32': 0.125,
    '1.': 6.0, '2.': 3.0, '4.': 1.5, '8.': 0.75, '16.': 0.375, '32.': 0.1875
  };

  private static NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  private static parsePitch(token: string, context: StaffContext): { note: string, octave: number } {
    const match = token.match(/^([a-gA-G])(#|b|x|bb|n|qs|qf|tqs|tqf)?(-?\d+)?/i);
    if (!match) return { note: 'C', octave: context.lastOctave };

    let [_, name, acc, octStr] = match;
    name = name.toUpperCase();
    acc = acc || '';
    if (acc === 'n') acc = '';
    
    let octave = octStr ? parseInt(octStr, 10) : context.lastOctave;
    context.lastOctave = octave;

    return { note: name + acc, octave };
  }

  private static transpose(pitch: string, octave: number, semitones: number): string {
    let baseIdx = this.NOTES.indexOf(pitch.toUpperCase());
    if (baseIdx === -1) {
        if (pitch.endsWith('b')) {
            const step = pitch.substring(0, pitch.length-1).toUpperCase();
            baseIdx = (this.NOTES.indexOf(step) - 1 + 12) % 12;
            if (baseIdx === 11) octave--; 
        } else if (pitch.endsWith('#')) {
             const step = pitch.substring(0, pitch.length-1).toUpperCase();
             baseIdx = (this.NOTES.indexOf(step) + 1) % 12;
             if (baseIdx === 0) octave++;
        } else {
            baseIdx = 0;
        }
    }

    let absolute = (octave * 12) + baseIdx + semitones;
    let newOctave = Math.floor(absolute / 12);
    let newNoteIdx = ((absolute % 12) + 12) % 12;
    return this.NOTES[newNoteIdx] + newOctave;
  }

  static parse(code: string): { events: NoteEvent[], structure: ScoreStructure } {
    const events: NoteEvent[] = [];
    const structure: ScoreStructure = { groups: [], duration: 0 };
    const instruments: Record<string, InstrumentState> = {};
    const macros: Record<string, string> = {};
    const staffContexts: Record<string, StaffContext> = {};

    let globalBpm = 120;
    let globalTime = { num: 4, den: 4 };

    let processedCode = code.replace(/%%.*/g, '');
    
    // Macro extraction
    processedCode = processedCode.replace(/(?:macro|\$)\s*(\w+)\s*[={]\s*([^\}]+)\}?/gi, (_, name, body) => {
      macros[name] = body.trim();
      return '';
    });

    const expandMacros = (text: string): string => {
      return text.replace(/\$(\w+)(?:\+?(-?\d+))?/g, (_, name, shift) => {
        let body = macros[name] || '';
        return body;
      });
    };

    const rawLines = processedCode.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let activeGroup = { name: 'Orchestra', instruments: [] as { id: string, name: string }[] };
    
    rawLines.forEach(line => {
      if (line.startsWith('@')) {
        const parts = line.split(/\s+/);
        if (parts[2]) globalBpm = parseInt(parts[2], 10);
        if (parts[3] && parts[3].includes('/')) {
            const tParts = parts[3].split('/');
            globalTime = { num: parseInt(tParts[0], 10), den: parseInt(tParts[1], 10) };
        }
        return;
      }

      const dMatch = line.match(/^d\s+(\w+)\s+(\w+)\s+(\w+)/i);
      if (dMatch) {
          const id = dMatch[1];
          const nameMap: Record<string, string> = { 
              'Br': 'Brass', 'Ww': 'Woodwinds', 'St': 'Strings', 'Tp': 'Timpani'
          };
          instruments[id] = { id, name: nameMap[id] || id, transpose: 0 };
          staffContexts[id] = { lastDuration: '4', lastOctave: 4, gridResolution: null };
          activeGroup.instruments.push({ id, name: instruments[id].name });
          return;
      }

      const stdDMatch = line.match(/def\s+(\w+)\s+(?:"([^"]+)"|([^\s]+))(?:\s+.*?)?(?:transpose=([+-]?\d+))?/i);
      if (stdDMatch) {
        const id = stdDMatch[1], name = stdDMatch[2] || stdDMatch[3], transp = stdDMatch[4] ? parseInt(stdDMatch[4], 10) : 0;
        instruments[id] = { id, name, transpose: transp };
        staffContexts[id] = { lastDuration: '4', lastOctave: 4, gridResolution: null };
        activeGroup.instruments.push({ id, name });
      }
    });
    if (activeGroup.instruments.length > 0) structure.groups.push(activeGroup);

    let currentGlobalBeat = 0;
    let i = 0;
    while (i < rawLines.length) {
      const line = rawLines[i];
      const mMatch = line.match(/^(?:measure|m)\s+(\d+)(?:[\.\-](\d+))?/i);
      
      if (mMatch) {
        const startM = parseInt(mMatch[1], 10);
        const endM = mMatch[2] ? parseInt(mMatch[2], 10) : startM;
        const measureCount = endM - startM + 1;
        
        i++;
        const blockLines: string[] = [];
        let mBpm = globalBpm;
        let mTime = { ...globalTime };

        while (i < rawLines.length && !rawLines[i].match(/^(?:measure|m)\s+\d+/i)) {
          const bLine = rawLines[i];
          if (bLine.startsWith('meta') || bLine.startsWith('@')) {
             const tMatch = bLine.match(/tempo:\s*(\d+)/) || bLine.match(/@\s+tempo:(\d+)/);
             if (tMatch) mBpm = parseInt(tMatch[1], 10);
          }
          blockLines.push(rawLines[i]);
          i++;
        }

        const beatSec = 60 / mBpm;
        const mDurBeats = (mTime.num * 4) / mTime.den;

        blockLines.forEach(bLine => {
          const assignMatch = bLine.match(/^([\w\s,]+):(.*)/);
          if (!assignMatch) return;

          const ids = assignMatch[1].split(',').map(s => s.trim());
          let content = expandMacros(assignMatch[2].trim());

          content = content.replace(/\{([^\}]+)\}\s*[\*x]\s*(\d+)/gi, (_, body, count) => 
            Array(parseInt(count, 10)).fill(body).join(' ')
          );

          ids.forEach(id => {
            const ctx = staffContexts[id] || { lastDuration: '4', lastOctave: 4, gridResolution: null };
            const inst = instruments[id] || { id, name: id, transpose: 0 };
            let trackTime = currentGlobalBeat * beatSec;
            let measureOffset = 0;

            const tokens = content.split(/\s+/).filter(t => t.length > 0);

            tokens.forEach(token => {
              if (token === '|') {
                measureOffset++;
                trackTime = (currentGlobalBeat + (measureOffset * mDurBeats)) * beatSec;
                return;
              }

              if (token.startsWith('!')) {
                ctx.gridResolution = token.substring(1);
                ctx.lastDuration = ctx.gridResolution;
                return;
              }

              let notePart = token, durStr = ctx.gridResolution || ctx.lastDuration;
              
              if (token.includes(':')) {
                const parts = token.split(':');
                notePart = parts[0];
                const dMatch = parts[1].match(/^([\d\.]+)/);
                if (dMatch) {
                    durStr = dMatch[1];
                    if (!ctx.gridResolution) ctx.lastDuration = durStr;
                }
              }

              const relBeats = this.DURATION_MAP[durStr] || 1.0;
              const durSec = relBeats * beatSec;

              if (notePart !== 'r' && !notePart.startsWith('<')) {
                const clean = (t: string) => t.replace(/[\.>\^!~]+.*/, '').replace(/[\[\]]/g, '').trim();
                const noteTokens = notePart.startsWith('[') 
                    ? notePart.slice(1, notePart.lastIndexOf(']')).split(/\s+/) 
                    : [notePart];

                noteTokens.forEach(nt => {
                    if (!nt) return;
                    const { note, octave } = this.parsePitch(clean(nt), ctx);
                    const transposed = this.transpose(note, octave, inst.transpose);
                    events.push({
                        note: transposed,
                        time: trackTime,
                        duration: durSec,
                        hand: id,
                        instrumentName: inst.name
                    });
                    if (trackTime + durSec > structure.duration) structure.duration = trackTime + durSec;
                });
              }
              trackTime += durSec;
            });
          });
        });

        currentGlobalBeat += (measureCount * mDurBeats);
        continue;
      }
      i++;
    }

    return { events: events.sort((a, b) => a.time - b.time), structure };
  }
}
