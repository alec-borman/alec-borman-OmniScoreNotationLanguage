export const INITIAL_SCORE = `
omniscore
  meta {
    title: "Symphony No. 9 in D Minor, Op. 125"
    movement: "IV. Presto"
    composer: "Ludwig van Beethoven"
    tempo: 288 %% Presto (d. = 96) -> 96 * 3 = 288 BPM (Quarter note)
    key: "Dm"
    time: 3/4
  }

  %% === INSTRUMENT DEFINITIONS ===
  
  group "Woodwinds" symbol=bracket {
    def fl    "Flauti"          style=standard
    def ob    "Oboi"            style=standard
    def cl    "Clarinetti in B" style=standard transpose=-2  %% Sounds Major 2nd lower (Bb)
    def fag   "Fagotti"         style=standard clef=bass
    def cfg   "Contrafagotto"   style=standard clef=bass transpose=-12 %% Sounds 8vb
  }

  group "Brass" symbol=bracket {
    def corD  "Corni in D"      style=standard transpose=+2  %% Sounds Major 2nd higher
    def corB  "Corni in B"      style=standard transpose=-2  %% Sounds Major 2nd lower (Bb Basso)
    def tpt   "Trombe in D"     style=standard transpose=+2  %% Sounds Major 2nd higher
  }

  def timp "Timpani in D.A." style=standard clef=bass

  group "Strings" symbol=brace {
    def vln1  "Violino I"       style=standard
    def vln2  "Violino II"      style=standard
    def vla   "Viola"           style=standard clef=alto
    def vc    "Violoncello"     style=standard clef=bass
    def cb    "e Basso"         style=standard clef=bass transpose=-12 %% Sounds 8vb
  }

  %% === MUSIC DATA ===

  %% MEASURE 1-7: The "Schreckensfanfare"
  measure 1..7
    instruction "Presto (d. = 96)"
    
    %% Woodwinds: Rapid alternating 16th notes
    fl:   { bf5:16 a5 } x 18 | 
    ob:   { bf5:16 a5 } x 18 |
    
    %% Clarinets (Written C6/B5 -> Sounds Bb5/A5 due to transpose=-2)
    cl:   { c6:16  b5 } x 18 | 
    
    %% Bassoons
    fag:  { bf2:16 a2 } x 18 |
    cfg:  { bf2:16 a2 } x 18 |

    %% Brass: Sustained Fortissimo
    corD: g4:2. | %% Written G4 -> Sounds A4 (+2)
    corB: c5:2. | %% Written C5 -> Sounds Bb4 (-2)
    tpt:  g4:2. | %% Written G4 -> Sounds A4 (+2)

    %% Percussion
    timp: { d3 a2 }:2. |

    %% Strings: Tremolo
    vln1: d6:2. |
    vln2: a5:2. |
    vla:  f5:2. |
    vc:   bf2:2. | 
    cb:   bf2:2. |

  %% MEASURE 8: General Pause
  measure 8
    instruction "G.P."
    %% Special shorthand to broadcast rest to everyone
    fl, ob, cl, fag, cfg, corD, corB, tpt, timp, vln1, vln2, vla, vc, cb: r:2. |

  %% MEASURE 9: Recitative
  measure 9
    instruction "Recitativo"
    %% All others rest
    fl, ob, cl, fag, cfg, corD, corB, tpt, timp, vln1, vln2, vla: r:2. |
    
    %% Recitative Melody (Unison Vc/Cb)
    vc: c#3:32 d3:2. | %% Grace note approx as 32nd
    cb: c#3:32 d3:2. |

  measure 10
    vc: a3:4   bf3:4   c4:4 |
    cb: a3:4   bf3:4   c4:4 |

  measure 11
    vc: c#4:4. d4:8    e4:4 |
    cb: c#4:4. d4:8    e4:4 |

  measure 12
    vc: f4:4.  e4:8 d4:4 |
    cb: f4:4.  e4:8 d4:4 |
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
