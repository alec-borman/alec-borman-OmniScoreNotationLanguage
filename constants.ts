export const INITIAL_SCORE = `@ "Finlandia" 72 4/4 Ab

%% 1. ORCHESTRAL SCHEMATIC
d Br st b  %% Heavy Brass (Trb, Tba, Hn)
d Ww st t  %% Woodwinds (Fl, Ob, Cl)
d St st t  %% Strings (Vln, Vla, Vc, Db)
d Tp gr gm %% Timpani & Percussion

%% 2. THEMATIC DNA (SHARDS)
$BrassDark = { [Ab1 C2 Eb2]:1.ff.ten [Gb1 Bb1 Db2]:2.sfz [F1 Ab1 C2]:2 }
$StrAgit   = { !16 [Ab3 C4] [Ab3 C4] [Ab3 C4] [Ab3 C4] [Gb3 Bb3] [Gb3 Bb3] [Gb3 Bb3] [Gb3 Bb3] }
$Hymn      = { !4 f4:2 g8. f16 | e4. f8 g4 | c4. f8 e d | c2. }
$Victory   = { [Ab4 C5 Eb5]:8. [Ab4 C5 Eb5]:16 [Ab4 C5 Eb5]:4 }

%% 3. THE "ANDANTE SOSTENUTO" (Measures 1-12: The Gloom)
m 1-12
  Br: $BrassDark $BrassDark+5.dim r:2 [Eb2 G2 Bb2]:2 |
  Tp: Ab1:1.roll.ff.decresc |
  St: r:1 r:1 r:1 r:1 [Ab2 Eb3]:1.p.cresc |

%% 4. THE "ALLEGRO MODERATO" (Measures 13-24: The Struggle)
@ tempo:136
m 13-24
  St: !16 $StrAgit { [Gb3 Bb3] } x 4 { [F3 Ab3] } x 4 |
  Br: !4 r:1 [Eb2]:4.stacc [Eb2]:4 [Eb2]:4 |
  Ww: !16 r:4 [c5] [c5] [c5] [c5] [eb5] [eb5] [eb5] [eb5] |

%% 5. THE "FINLANDIA HYMN" (Measures 70-85)
@ tempo:80 4/4
m 70-85
  St: $Hymn |
  Ww: $Hymn |
  Br: [Ab1 Eb2 Ab2]:2.p [Db2 Ab2 Db3]:2 |

%% 6. THE "ALLEGRO" FINALE
@ tempo:144
m 111-120
  St: !16 $StrAgit.ffff |
  Br: $Victory $Victory $Victory |
  Tp: Ab1:1.roll.ffff |

m 121
  Br: [Ab1 Eb2 Ab2 C3]:1.ffff.accent |
  Ww: [Ab4 C5 Eb5 Ab5]:1 |
  St: [Ab3 C4 Eb4 Ab4]:1 |
`;

export const GENERATE_88_KEYS = () => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const keys = [];
  keys.push({ note: 'A0', type: 'white' });
  keys.push({ note: 'A#0', type: 'black' });
  keys.push({ note: 'B0', type: 'white' });
  for (let octave = 1; octave <= 7; octave++) {
    notes.forEach(note => {
      const fullNote = `${note}${octave}`;
      const type = note.includes('#') ? 'black' : 'white';
      keys.push({ note: fullNote, type });
    });
  }
  keys.push({ note: 'C8', type: 'white' });
  return keys;
};

export const KEYBOARD_KEYS = GENERATE_88_KEYS();
