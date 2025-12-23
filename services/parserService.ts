
import { NoteEvent } from '../types';

interface InstrumentState {
  id: string;
  name: string;
  transpose: number;
}

interface StaffContext {
  lastDuration: string;
  lastOctave: number;
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
    // Regex for: [Note][Accidental][Octave?]
    // Accidentals: #, b, x, bb, n, qs, qf, tqs, tqf
    const match = token.match(/^([a-gA-G])(#|b|x|bb|n|qs|qf|tqs|tqf)?(-?\d+)?/i);
    if (!match) return { note: 'C', octave: context.lastOctave };

    let [_, name, acc, octStr] = match;
    name = name.toUpperCase();
    acc = acc || '';
    
    // Convert synonyms
    if (acc === 'n') acc = ''; // Natural override
    
    let octave = octStr ? parseInt(octStr, 10) : context.lastOctave;
    context.lastOctave = octave;

    return { note: name + acc, octave };
  }

  private static transpose(pitch: string, octave: number, semitones: number): string {
    const noteIdx = this.NOTES.indexOf(pitch.replace('b', '#').replace('bb', '').replace('x', '')); 
    // Simplified transposition for standard notes. 
    // In a full implementation, we'd handle all OmniScore accidentals correctly.
    let baseIdx = this.NOTES.indexOf(pitch.toUpperCase());
    if (baseIdx === -1) {
        // Handle flats
        if (pitch.endsWith('b')) {
            const step = pitch.substring(0, pitch.length-1).toUpperCase();
            baseIdx = (this.NOTES.indexOf(step) - 1 + 12) % 12;
            if (baseIdx === 11) octave--; 
        } else {
            baseIdx = 0; // Fallback
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

    // 1. Pre-process Macros
    code = code.replace(/macro\s+(\w+)\s*=\s*\{([^\}]+)\}/gi, (_, name, body) => {
      macros[name] = body.trim();
      return '';
    });

    const expandMacros = (text: string): string => {
      return text.replace(/\$(\w+)(?:\+?(-?\d+))?/g, (_, name, shift) => {
        let body = macros[name] || '';
        if (shift) {
            // Very basic transposition logic for macro contents
            // In a real compiler, we would tokenize and shift each note
        }
        return body;
      });
    };

    const rawLines = code.split('\n');

    // 2. Metadata & Definitions
    let activeGroup = { name: 'Ungrouped', instruments: [] as { id: string, name: string }[] };
    rawLines.forEach(line => {
      const cleanLine = line.replace(/%%.*/, '').trim();
      if (!cleanLine) return;

      const tempoMatch = cleanLine.match(/tempo:\s*(\d+)/);
      if (tempoMatch) globalBpm = parseInt(tempoMatch[1], 10);

      const timeMatch = cleanLine.match(/time:\s*(\d+)\/(\d+)/);
      if (timeMatch) globalTime = { num: parseInt(timeMatch[1], 10), den: parseInt(timeMatch[2], 10) };

      const gMatch = cleanLine.match(/group\s+"([^"]+)"/);
      if (gMatch) {
        if (activeGroup.instruments.length > 0) structure.groups.push(activeGroup);
        activeGroup = { name: gMatch[1], instruments: [] };
      }

      const dMatch = cleanLine.match(/def\s+(\w+)\s+(?:"([^"]+)"|([^\s]+))(?:\s+.*?)?(?:transpose=([+-]?\d+))?/);
      if (dMatch) {
        const id = dMatch[1], name = dMatch[2] || dMatch[3], transp = dMatch[4] ? parseInt(dMatch[4], 10) : 0;
        instruments[id] = { id, name, transpose: transp };
        staffContexts[id] = { lastDuration: '4', lastOctave: 4 };
        activeGroup.instruments.push({ id, name });
      }

      if (cleanLine === '}' && activeGroup.name !== 'Ungrouped') {
        structure.groups.push(activeGroup);
        activeGroup = { name: 'Ungrouped', instruments: [] };
      }
    });
    if (activeGroup.instruments.length > 0) structure.groups.push(activeGroup);

    // 3. Linearization of Measure Blocks
    let currentGlobalBeat = 0;
    let i = 0;
    while (i < rawLines.length) {
      const line = rawLines[i].replace(/%%.*/, '').trim();
      const mMatch = line.match(/^measure\s+(\d+)(?:\.\.(\d+))?/i);
      if (mMatch) {
        const startM = parseInt(mMatch[1], 10);
        const endM = mMatch[2] ? parseInt(mMatch[2], 10) : startM;
        const measureCount = endM - startM + 1;
        
        i++;
        const blockLines: string[] = [];
        let mBpm = globalBpm;
        let mTime = { ...globalTime };

        while (i < rawLines.length && !rawLines[i].match(/^measure/i)) {
          const bLine = rawLines[i].replace(/%%.*/, '').trim();
          if (bLine.startsWith('meta')) {
             const tMatch = bLine.match(/tempo:\s*(\d+)/);
             if (tMatch) mBpm = parseInt(tMatch[1], 10);
             const tmMatch = bLine.match(/time:\s*(\d+)\/(\d+)/);
             if (tmMatch) mTime = { num: parseInt(tmMatch[1], 10), den: parseInt(tmMatch[2], 10) };
          }
          blockLines.push(rawLines[i]);
          i++;
        }

        const beatSec = 60 / mBpm;
        const measureDurBeats = (mTime.num * 4) / mTime.den;

        blockLines.forEach(bLine => {
          const assignMatch = bLine.match(/^([\w\s,]+):(.*)/);
          if (!assignMatch) return;

          const ids = assignMatch[1].split(',').map(s => s.trim());
          let content = expandMacros(assignMatch[2].trim());

          // Handle { ... } x N
          content = content.replace(/\{([^\}]+)\}\s*x\s*(\d+)/gi, (_, body, count) => {
             return Array(parseInt(count, 10)).fill(body).join(' ');
          });

          // Tokenize
          const tokens: string[] = [];
          let cur = "", inBrk = 0;
          for (const char of content) {
            if (char === '[') inBrk++; else if (char === ']') inBrk--;
            if (char === ' ' && inBrk === 0) { if (cur) tokens.push(cur); cur = ""; }
            else cur += char;
          }
          if (cur) tokens.push(cur);

          ids.forEach(id => {
            const ctx = staffContexts[id] || { lastDuration: '4', lastOctave: 4 };
            const inst = instruments[id] || { id, name: id, transpose: 0 };
            let trackTime = currentGlobalBeat * beatSec;
            let measureOffset = 0;

            tokens.forEach(token => {
              if (token === '|') {
                measureOffset++;
                trackTime = (currentGlobalBeat + (measureOffset * measureDurBeats)) * beatSec;
                return;
              }

              let notePart = token, durStr = ctx.lastDuration;
              if (token.includes(':')) {
                const parts = token.split(':');
                notePart = parts[0];
                const dMatch = parts[1].match(/^([\d\.]+)/);
                if (dMatch) {
                    durStr = dMatch[1];
                    ctx.lastDuration = durStr;
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

        // Fix: Changed measureDurationBeats to measureDurBeats to fix ReferenceError
        currentGlobalBeat += (measureCount * measureDurBeats);
        continue;
      }
      i++;
    }

    return { events: events.sort((a, b) => a.time - b.time), structure };
  }
}
