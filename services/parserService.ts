import { NoteEvent } from '../types';

interface InstrumentState {
  id: string;
  name: string;
  transpose: number; // semitones
}

export class ParserService {
  private static BPM = 120; 

  private static DURATION_MAP: Record<string, number> = {
    '1': 4.0, '2': 2.0, '4': 1.0, '8': 0.5, '16': 0.25, '32': 0.125,
    '1.': 6.0, '2.': 3.0, '4.': 1.5, '8.': 0.75,
  };

  private static NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Helper to transpose a note string (e.g. "C4" + 2 = "D4")
  private static transposeNote(note: string, semitones: number): string {
    if (semitones === 0) return note;

    const regex = /^([a-gA-G])([#b]?)(-?\d+)$/;
    const match = note.match(regex);
    if (!match) return note;

    let [_, name, acc, octStr] = match;
    let octave = parseInt(octStr, 10);
    name = name.toUpperCase();
    
    // Normalize flat to sharp
    if (acc === 'b') {
      const idx = this.NOTES.indexOf(name);
      const prevIdx = (idx - 1 + 12) % 12;
      name = this.NOTES[prevIdx];
      if (idx === 0) octave--; 
      acc = ''; 
    }

    let noteIndex = this.NOTES.indexOf(name + acc);
    if (noteIndex === -1) {
       noteIndex = this.NOTES.indexOf(name);
    }

    let absIndex = octave * 12 + noteIndex;
    absIndex += semitones;

    const newOctave = Math.floor(absIndex / 12);
    const newNoteIndex = absIndex % 12;
    const normalizedNoteIndex = (newNoteIndex + 12) % 12;

    return `${this.NOTES[normalizedNoteIndex]}${newOctave}`;
  }

  static parse(code: string): NoteEvent[] {
    const events: NoteEvent[] = [];
    
    // 1. Clean comments
    const lines = code.split('\n').map(l => l.replace(/%%.*/, '').trim()).filter(l => l);

    // 2. Global Metadata Parsing
    let beatDuration = 60 / this.BPM;
    const tempoMatch = code.match(/tempo:\s*(\d+)/);
    if (tempoMatch) {
      beatDuration = 60 / parseInt(tempoMatch[1], 10);
    }

    // 3. Parse Definitions
    // Regex: def id "Name" ... transpose=+2
    const instruments: Record<string, InstrumentState> = {};
    const defRegex = /def\s+(\w+)\s+"([^"]+)"(?:\s+.*?)?(?:transpose=([+-]?\d+))?/;

    lines.forEach(line => {
      if (line.startsWith('def ')) {
        const match = line.match(defRegex);
        if (match) {
          const id = match[1];
          const name = match[2];
          const transp = match[3] ? parseInt(match[3], 10) : 0;
          instruments[id] = { id, name, transpose: transp };
        }
      }
    });

    // 4. Measure Loop
    let currentMeasureStartBeat = 0; 
    let measureDurationBeats = 4; // Default 4/4
    
    // State machine for blocks
    let inMeasureBlock = false;
    let currentMeasureLines: string[] = [];
    let measureRangeEnd = 0;
    let measureCurrent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect Measure Header
      const measureMatch = line.match(/^measure\s+(\d+)(?:\.\.(\d+))?/);
      
      if (measureMatch) {
        if (inMeasureBlock) {
             processMeasureBlock(currentMeasureLines, measureCurrent, measureRangeEnd);
        }
        inMeasureBlock = true;
        currentMeasureLines = [];
        const start = parseInt(measureMatch[1], 10);
        const end = measureMatch[2] ? parseInt(measureMatch[2], 10) : start;
        measureCurrent = start;
        measureRangeEnd = end;
        continue;
      }

      if (inMeasureBlock) {
        currentMeasureLines.push(line);
      }
    }
    // Process final block
    if (inMeasureBlock) {
       processMeasureBlock(currentMeasureLines, measureCurrent, measureRangeEnd);
    }

    function processMeasureBlock(lines: string[], startMsr: number, endMsr: number) {
      const count = endMsr - startMsr + 1;
      
      for (let m = 0; m < count; m++) {
        // Check for time sig change in this block
        lines.forEach(l => {
           const timeMatch = l.match(/time:\s*(\d+)\/(\d+)/);
           if (timeMatch) {
              const num = parseInt(timeMatch[1], 10);
              const den = parseInt(timeMatch[2], 10);
              const beatVal = 4 / den;
              measureDurationBeats = num * beatVal;
           }
        });

        lines.forEach(line => {
           if (line.startsWith('meta') || line.startsWith('instruction')) return;

           const assignMatch = line.match(/^([\w\s,]+):(.*)/);
           if (!assignMatch) return;

           const ids = assignMatch[1].split(',').map(s => s.trim());
           let rawContent = assignMatch[2].trim();
           if (rawContent.endsWith('|')) rawContent = rawContent.slice(0, -1);

           // REPETITION SYNTAX: { content } x N
           rawContent = rawContent.replace(/\{([^\}]+)\}\s*x\s*(\d+)/g, (match, p1, p2) => {
               const repeatCount = parseInt(p2, 10);
               let expanded = "";
               for(let r=0; r<repeatCount; r++) expanded += " " + p1;
               return expanded;
           });

           // Tokenizer for Sticky Duration
           const tokens = rawContent.split(/\s+/).filter(t => t);
           let lastDurationStr = '4'; 
           let trackTime = currentMeasureStartBeat * beatDuration;

           tokens.forEach(token => {
              if (token === '.') return;
              if (token.startsWith('.')) return; 

              let content = '';
              let durStr = '';

              if (token.includes(':')) {
                  [content, durStr] = token.split(':');
                  const dMatch = durStr.match(/^([\d\.]+)/);
                  if (dMatch) {
                      durStr = dMatch[1]; 
                      lastDurationStr = durStr;
                  }
              } else {
                  content = token;
                  durStr = lastDurationStr;
              }

              let relBeats = ParserService.DURATION_MAP[durStr];
              if (!relBeats) relBeats = 1.0; 
              const durSec = relBeats * beatDuration;

              if (content === 'r') {
                 trackTime += durSec;
                 return;
              }

              let notes: string[] = [];
              if (content.startsWith('[')) {
                 notes = content.slice(1, -1).split(/\s+/);
              } else {
                 notes = [content];
              }

              ids.forEach(instId => {
                  const instDef = instruments[instId] || { id: instId, name: instId, transpose: 0 };
                  
                  notes.forEach(rawNote => {
                      if (!rawNote.match(/^[a-g]/i)) return;

                      const transposed = ParserService.transposeNote(rawNote, instDef.transpose);
                      const cleanNote = transposed.charAt(0).toUpperCase() + transposed.slice(1);

                      events.push({
                          note: cleanNote,
                          time: trackTime,
                          duration: durSec,
                          hand: instId,
                          instrumentName: instDef.name
                      });
                  });
              });

              trackTime += durSec;
           });
        });

        currentMeasureStartBeat += measureDurationBeats;
      }
    }

    return events.sort((a, b) => a.time - b.time);
  }
}
