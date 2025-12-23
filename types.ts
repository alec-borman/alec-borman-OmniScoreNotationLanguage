export interface NoteEvent {
  note: string;     // e.g., "C4", "F#5"
  duration: number; // in seconds
  time: number;     // start time in seconds
  hand?: string;    // Used as Instrument ID (e.g. 'fl', 'vln1')
  instrumentName?: string; // The full name defined in the score (e.g. "Flauti")
}

export interface InstrumentDefinition {
  name: string;
  id: string;
  source: 'salamander' | 'fluid';
}

export const INSTRUMENTS: InstrumentDefinition[] = [
  // Switched to Fluid for performance/reliability in web context
  { name: 'Grand Piano', id: 'acoustic_grand_piano', source: 'fluid' }, 
  // Strings
  { name: 'Violin', id: 'violin', source: 'fluid' },
  { name: 'Viola', id: 'viola', source: 'fluid' },
  { name: 'Cello', id: 'cello', source: 'fluid' },
  { name: 'Contrabass', id: 'contrabass', source: 'fluid' },
  { name: 'Tremolo Strings', id: 'tremolo_strings', source: 'fluid' },
  { name: 'Pizzicato Strings', id: 'pizzicato_strings', source: 'fluid' },
  { name: 'Orchestral Harp', id: 'orchestral_harp', source: 'fluid' },
  // Woodwinds
  { name: 'Flute', id: 'flute', source: 'fluid' },
  { name: 'Oboe', id: 'oboe', source: 'fluid' },
  { name: 'Clarinet', id: 'clarinet', source: 'fluid' },
  { name: 'Bassoon', id: 'bassoon', source: 'fluid' },
  // Brass
  { name: 'Trumpet', id: 'trumpet', source: 'fluid' },
  { name: 'French Horn', id: 'french_horn', source: 'fluid' },
  { name: 'Trombone', id: 'trombone', source: 'fluid' },
  { name: 'Tuba', id: 'tuba', source: 'fluid' },
  // Percussion / Keys
  { name: 'Timpani', id: 'timpani', source: 'fluid' },
  { name: 'Church Organ', id: 'church_organ', source: 'fluid' },
  // Guitars / Modern
  { name: 'Acoustic Guitar (Nylon)', id: 'acoustic_guitar_nylon', source: 'fluid' },
  { name: 'Electric Guitar (Clean)', id: 'electric_guitar_clean', source: 'fluid' },
  { name: 'Electric Piano', id: 'electric_piano_1', source: 'fluid' },
];

export interface OmniScoreConfig {
  tempo: number;
}
