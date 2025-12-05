export const INITIAL_SCORE = `
meta {
  title: "La cathédrale engloutie (The Sunken Cathedral)"
  composer: "Claude Debussy"
}

group "Piano" symbol=brace {
  def rh "Right Hand" style=standard clef=treble
  def lh "Left Hand"  style=standard clef=bass
}

// --- I. SUBMERGED BELLS ---
instruction "Profondément calme"
meta { tempo: 80, time: 6/4 }

measure 1
  rh: [e4 g4 c5]:1. | 
  lh: [c2 c3]:1.    |
measure 2
  rh: [d4 a4 d5]:1. |
  lh: [d2 d3]:1.    |
measure 3
  rh: [e4 g4 c5]:1. |
  lh: [c2 c3]:1.    |
measure 4
  rh: [d4 g4 c5]:1. |
  lh: [c2 c3]:1.    |

measure 5
  meta { time: 3/2 } instruction "pp"
  rh: [c4 f4 a4]:2 [d4 g4 b4]:2 |
  lh: [c2 c3]:1                 | 
measure 6
  rh: [e4 g4 c5]:2 [d4 g4 c5]:2 |
  lh: [e2 e3]:1                 |
measure 7
  meta { time: 4/4 }
  rh: [f4 a4 d5]:2 [g4 b4 e5]:2 |
  lh: [a2 a3]:2. [g2 g3]:2.    |

measure 8
  meta { time: 6/4 }
  rh: [c5]:4 [b4]:4 [c5]:4 [e5]:4 |
  lh: c3:1. |
measure 9
  rh: [e5]:4 [f5]:4 [g5]:4 [c5]:4 |
  lh: g2:1. |
measure 10
  rh: [g4]:4 [a4]:4 [b4]:4 [d5]:4 |
  lh: d3:1. |
measure 11
  rh: [c5]:4 [b4]:4 [c5]:4 [e5]:4 |
  lh: c3:1. |

measure 16
  instruction "Le Full Piano Test (Range A0 - C8)"
  rh: [a0 c1 e1]:2 [a6 c7 e7]:2 |
  lh: [a0]:1 |
measure 17
  rh: [c8]:1. |
  lh: [c1]:1. |
`;

// Helper to generate 88 keys from A0 to C8
export const GENERATE_88_KEYS = () => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const keys = [];
  
  // A0, A#0, B0
  keys.push({ note: 'A0', type: 'white' });
  keys.push({ note: 'A#0', type: 'black' });
  keys.push({ note: 'B0', type: 'white' });

  // Octaves 1 to 7
  for (let octave = 1; octave <= 7; octave++) {
    notes.forEach(note => {
      const fullNote = `${note}${octave}`;
      const type = note.includes('#') ? 'black' : 'white';
      keys.push({ note: fullNote, type });
    });
  }

  // C8
  keys.push({ note: 'C8', type: 'white' });

  return keys;
};

export const KEYBOARD_KEYS = GENERATE_88_KEYS();
