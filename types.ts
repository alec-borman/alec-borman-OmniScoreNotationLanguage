export interface NoteEvent {
  note: string;     // e.g., "C4", "F#5"
  duration: number; // in seconds
  time: number;     // start time in seconds
  hand?: string;    // "RH" or "LH"
}

export interface InstrumentDefinition {
  name: string;
  id: string;
  source: 'salamander' | 'fluid';
}

export const INSTRUMENTS: InstrumentDefinition[] = [
  { name: 'Grand Piano (High Quality)', id: 'grand_piano', source: 'salamander' },
  { name: 'Electric Piano', id: 'electric_piano_1', source: 'fluid' },
  { name: 'Rock Organ', id: 'rock_organ', source: 'fluid' },
  { name: 'Church Organ', id: 'church_organ', source: 'fluid' },
  { name: 'Acoustic Guitar (Nylon)', id: 'acoustic_guitar_nylon', source: 'fluid' },
  { name: 'Electric Guitar (Clean)', id: 'electric_guitar_clean', source: 'fluid' },
  { name: 'Violin', id: 'violin', source: 'fluid' },
  { name: 'Cello', id: 'cello', source: 'fluid' },
  { name: 'Contrabass', id: 'contrabass', source: 'fluid' },
  { name: 'Tremolo Strings', id: 'tremolo_strings', source: 'fluid' },
  { name: 'Trumpet', id: 'trumpet', source: 'fluid' },
  { name: 'French Horn', id: 'french_horn', source: 'fluid' },
  { name: 'Alto Sax', id: 'alto_sax', source: 'fluid' },
  { name: 'Oboe', id: 'oboe', source: 'fluid' },
  { name: 'Flute', id: 'flute', source: 'fluid' },
  { name: 'Lead 1 (Square)', id: 'lead_1_square', source: 'fluid' },
  { name: 'Pad 1 (New Age)', id: 'pad_1_new_age', source: 'fluid' },
];

export interface OmniScoreConfig {
  tempo: number;
}
