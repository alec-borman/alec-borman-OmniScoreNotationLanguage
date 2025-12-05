import { NoteEvent } from '../types';

export class ParserService {
  private static BPM = 100; // Default fallback

  // Map OmniScore duration fractions to relative beats (Quarter note = 1 beat)
  private static DURATION_MAP: Record<string, number> = {
    '1': 4.0,    // Whole
    '2': 2.0,    // Half
    '4': 1.0,    // Quarter
    '8': 0.5,    // Eighth
    '16': 0.25,  // Sixteenth
    '32': 0.125, // Thirty-second
    '1.': 6.0,   // Dotted Whole
    '2.': 3.0,   // Dotted Half
    '4.': 1.5,   // Dotted Quarter
    '8.': 0.75,  // Dotted Eighth
  };

  static parse(code: string): NoteEvent[] {
    const events: NoteEvent[] = [];
    
    // Extract Tempo if exists
    const tempoMatch = code.match(/tempo:\s*(\d+)/);
    const tempo = tempoMatch ? parseInt(tempoMatch[1], 10) : this.BPM;
    const beatDuration = 60 / tempo;

    // 1. Identify Hand Content
    const parts = [
      { hand: 'RH', pattern: /rh:\s*([^|]+)/g },
      { hand: 'LH', pattern: /lh:\s*([^|]+)/g },
    ];

    // Regex: Group 1 captures the whole chunk e.g. "[c4 e4]:4" or "c4:8" or "r:4"
    // Inner regex breaks down: (Chord OR Rest OR Note) : (Duration)
    const chunkRegex = /((?:\[[^\]]+\]|r|[a-g][#b]?\d):(?:[124863]\d?\.?))/g;

    parts.forEach(part => {
      let currentTime = 0;
      part.pattern.lastIndex = 0;

      let measureMatch;
      while ((measureMatch = part.pattern.exec(code)) !== null) {
        const notesString = measureMatch[1].trim();
        
        chunkRegex.lastIndex = 0;
        let chunkMatch;

        while ((chunkMatch = chunkRegex.exec(notesString)) !== null) {
          const chunk = chunkMatch[0];
          const [content, durationStr] = chunk.split(':');
          
          const relativeBeats = this.DURATION_MAP[durationStr];
          
          if (relativeBeats === undefined) {
             console.warn(`Unsupported duration: ${durationStr}`);
             // Fallback to quarter note to prevent freeze
             currentTime += (1.0 * beatDuration); 
             continue;
          }

          const durationSeconds = relativeBeats * beatDuration;

          let notesToSchedule: string[] = [];

          if (content.startsWith('[')) {
            // Chord
            const inner = content.slice(1, -1).trim();
            notesToSchedule = inner.split(/\s+/).filter(n => n);
          } else {
            // Single
            notesToSchedule = [content];
          }

          notesToSchedule.forEach(rawNote => {
            if (rawNote.toLowerCase() === 'r') return; // Rest

            // Normalize note: c#4 -> C#4
            const note = rawNote.charAt(0).toUpperCase() + rawNote.slice(1).toLowerCase();
            
            events.push({
              note,
              duration: durationSeconds,
              time: currentTime,
              hand: part.hand
            });
          });

          currentTime += durationSeconds;
        }
      }
    });

    return events.sort((a, b) => a.time - b.time);
  }
}
