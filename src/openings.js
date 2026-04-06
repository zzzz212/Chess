// ============================================================
// OPENING DATABASE - 80+ openings with ECO codes
// Key = space-separated moves, Value = { eco, name }
// ============================================================

const OPENINGS = {
  // A00-A09: Irregular/Flank
  "1.g3": { eco: "A00", name: "Hungarian Opening" },
  "1.b3": { eco: "A01", name: "Nimzowitsch-Larsen Attack" },
  "1.f4": { eco: "A02", name: "Bird's Opening" },
  "1.f4 d5": { eco: "A03", name: "Bird's Opening" },
  "1.c4": { eco: "A10", name: "English Opening" },
  "1.c4 e5": { eco: "A20", name: "English Opening: Reversed Sicilian" },
  "1.c4 c5": { eco: "A30", name: "English Opening: Symmetrical" },
  "1.c4 Nf6": { eco: "A15", name: "English Opening: Anglo-Indian Defense" },
  "1.c4 e6": { eco: "A13", name: "English Opening: Agincourt Defense" },
  "1.Nf3": { eco: "A04", name: "Reti Opening" },
  "1.Nf3 d5": { eco: "A06", name: "Reti Opening" },
  "1.Nf3 d5 2.c4": { eco: "A09", name: "Reti Opening: Advance Variation" },
  "1.Nf3 Nf6 2.c4 g6 3.g3": { eco: "A05", name: "Reti Opening: King's Indian Attack" },

  // B00-B09: Miscellaneous after 1.e4
  "1.e4": { eco: "B00", name: "King's Pawn Opening" },
  "1.e4 d6": { eco: "B07", name: "Pirc Defense" },
  "1.e4 d6 2.d4 Nf6 3.Nc3 g6": { eco: "B08", name: "Pirc Defense: Classical" },
  "1.e4 Nf6": { eco: "B02", name: "Alekhine's Defense" },
  "1.e4 Nf6 2.e5 Nd5": { eco: "B03", name: "Alekhine's Defense: Four Pawns Attack" },
  "1.e4 d5": { eco: "B01", name: "Scandinavian Defense" },
  "1.e4 d5 2.exd5 Qxd5": { eco: "B01", name: "Scandinavian Defense: Mieses-Kotroc" },
  "1.e4 d5 2.exd5 Nf6": { eco: "B01", name: "Scandinavian Defense: Modern" },
  "1.e4 g6": { eco: "B06", name: "Modern Defense" },
  "1.e4 Nc6": { eco: "B00", name: "Nimzowitsch Defense" },

  // B10-B19: Caro-Kann
  "1.e4 c6": { eco: "B10", name: "Caro-Kann Defense" },
  "1.e4 c6 2.d4 d5": { eco: "B12", name: "Caro-Kann Defense" },
  "1.e4 c6 2.d4 d5 3.Nc3": { eco: "B15", name: "Caro-Kann Defense: Main Line" },
  "1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4": { eco: "B15", name: "Caro-Kann Defense: Main Line" },
  "1.e4 c6 2.d4 d5 3.e5": { eco: "B12", name: "Caro-Kann Defense: Advance Variation" },
  "1.e4 c6 2.d4 d5 3.exd5 cxd5": { eco: "B13", name: "Caro-Kann Defense: Exchange Variation" },
  "1.e4 c6 2.d4 d5 3.Nd2": { eco: "B12", name: "Caro-Kann Defense: Classical" },
  "1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5": { eco: "B18", name: "Caro-Kann Defense: Classical Variation" },

  // B20-B99: Sicilian Defense
  "1.e4 c5": { eco: "B20", name: "Sicilian Defense" },
  "1.e4 c5 2.Nf3": { eco: "B27", name: "Sicilian Defense" },
  "1.e4 c5 2.Nf3 d6": { eco: "B50", name: "Sicilian Defense" },
  "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3": { eco: "B56", name: "Sicilian Defense: Open" },
  "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6": { eco: "B90", name: "Sicilian Defense: Najdorf Variation" },
  "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6": { eco: "B70", name: "Sicilian Defense: Dragon Variation" },
  "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e6": { eco: "B80", name: "Sicilian Defense: Scheveningen Variation" },
  "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6": { eco: "B56", name: "Sicilian Defense: Classical Variation" },
  "1.e4 c5 2.Nf3 Nc6": { eco: "B30", name: "Sicilian Defense" },
  "1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5": { eco: "B33", name: "Sicilian Defense: Sveshnikov Variation" },
  "1.e4 c5 2.Nf3 Nc6 3.Bb5": { eco: "B31", name: "Sicilian Defense: Rossolimo Variation" },
  "1.e4 c5 2.Nf3 e6": { eco: "B40", name: "Sicilian Defense" },
  "1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6": { eco: "B45", name: "Sicilian Defense: Kan Variation" },
  "1.e4 c5 2.c3": { eco: "B22", name: "Sicilian Defense: Alapin Variation" },
  "1.e4 c5 2.d4": { eco: "B21", name: "Sicilian Defense: Smith-Morra Gambit" },
  "1.e4 c5 2.Nc3": { eco: "B23", name: "Sicilian Defense: Closed Variation" },

  // C00-C19: French Defense
  "1.e4 e6": { eco: "C00", name: "French Defense" },
  "1.e4 e6 2.d4 d5": { eco: "C00", name: "French Defense" },
  "1.e4 e6 2.d4 d5 3.Nc3": { eco: "C03", name: "French Defense: Tarrasch" },
  "1.e4 e6 2.d4 d5 3.Nc3 Bb4": { eco: "C15", name: "French Defense: Winawer Variation" },
  "1.e4 e6 2.d4 d5 3.Nc3 Nf6": { eco: "C10", name: "French Defense: Classical" },
  "1.e4 e6 2.d4 d5 3.Nd2": { eco: "C01", name: "French Defense: Tarrasch Variation" },
  "1.e4 e6 2.d4 d5 3.e5": { eco: "C02", name: "French Defense: Advance Variation" },
  "1.e4 e6 2.d4 d5 3.exd5 exd5": { eco: "C01", name: "French Defense: Exchange Variation" },

  // C20-C29: Open games misc
  "1.e4 e5": { eco: "C20", name: "King's Pawn Game" },
  "1.e4 e5 2.d4": { eco: "C21", name: "Center Game" },
  "1.e4 e5 2.Bc4": { eco: "C23", name: "Bishop's Opening" },
  "1.e4 e5 2.f4": { eco: "C30", name: "King's Gambit" },
  "1.e4 e5 2.f4 exf4": { eco: "C33", name: "King's Gambit Accepted" },

  // C42-C43: Petrov/Russian
  "1.e4 e5 2.Nf3 Nf6": { eco: "C42", name: "Petrov's Defense (Russian Game)" },
  "1.e4 e5 2.Nf3 Nf6 3.Nxe5": { eco: "C42", name: "Petrov's Defense: Classical Attack" },
  "1.e4 e5 2.Nf3 Nf6 3.d4": { eco: "C43", name: "Petrov's Defense: Steinitz Attack" },

  // C44-C49: Scotch, Four Knights
  "1.e4 e5 2.Nf3 Nc6 3.d4": { eco: "C44", name: "Scotch Game" },
  "1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Nxd4": { eco: "C45", name: "Scotch Game" },
  "1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6": { eco: "C47", name: "Four Knights Game" },

  // C50-C59: Italian, Two Knights
  "1.e4 e5 2.Nf3 Nc6": { eco: "C40", name: "King's Knight Opening" },
  "1.e4 e5 2.Nf3 Nc6 3.Bc4": { eco: "C50", name: "Italian Game" },
  "1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5": { eco: "C50", name: "Italian Game: Giuoco Piano" },
  "1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3": { eco: "C54", name: "Italian Game: Classical Variation" },
  "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6": { eco: "C55", name: "Italian Game: Two Knights Defense" },
  "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.d4": { eco: "C55", name: "Italian Game: Two Knights, Open Variation" },
  "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5": { eco: "C57", name: "Italian Game: Two Knights, Knight Attack" },

  // C60-C99: Ruy Lopez (Spanish)
  "1.e4 e5 2.Nf3 Nc6 3.Bb5": { eco: "C60", name: "Ruy Lopez (Spanish Game)" },
  "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6": { eco: "C68", name: "Ruy Lopez: Exchange Variation" },
  "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4": { eco: "C70", name: "Ruy Lopez: Morphy Defense" },
  "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6": { eco: "C78", name: "Ruy Lopez: Morphy Defense" },
  "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O": { eco: "C78", name: "Ruy Lopez: Morphy, Main Line" },
  "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7": { eco: "C84", name: "Ruy Lopez: Closed Variation" },
  "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O": { eco: "C92", name: "Ruy Lopez: Closed, Flohr-Zaitsev" },
  "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Nxe4": { eco: "C81", name: "Ruy Lopez: Open Variation" },
  "1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6": { eco: "C65", name: "Ruy Lopez: Berlin Defense" },
  "1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4": { eco: "C67", name: "Ruy Lopez: Berlin Defense, Open" },
  "1.e4 e5 2.Nf3 Nc6 3.Bb5 d6": { eco: "C62", name: "Ruy Lopez: Old Steinitz Defense" },
  "1.e4 e5 2.Nf3 Nc6 3.Bb5 f5": { eco: "C63", name: "Ruy Lopez: Schliemann Defense" },

  // D00-D06: Queen's Pawn misc
  "1.d4": { eco: "D00", name: "Queen's Pawn Game" },
  "1.d4 d5": { eco: "D00", name: "Queen's Pawn Game" },
  "1.d4 d5 2.c4": { eco: "D06", name: "Queen's Gambit" },
  "1.d4 d5 2.Bf4": { eco: "D00", name: "Queen's Pawn: London System" },
  "1.d4 d5 2.Nf3 Nf6 3.Bf4": { eco: "D00", name: "Queen's Pawn: London System" },

  // D06-D09: QGD misc
  "1.d4 d5 2.c4 e5": { eco: "D06", name: "Queen's Gambit: Albin Countergambit" },
  "1.d4 d5 2.c4 dxc4": { eco: "D20", name: "Queen's Gambit Accepted" },
  "1.d4 d5 2.c4 dxc4 3.Nf3": { eco: "D25", name: "Queen's Gambit Accepted: Normal" },

  // D30-D69: QGD
  "1.d4 d5 2.c4 e6": { eco: "D30", name: "Queen's Gambit Declined" },
  "1.d4 d5 2.c4 e6 3.Nc3 Nf6": { eco: "D35", name: "Queen's Gambit Declined: Normal" },
  "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5": { eco: "D37", name: "Queen's Gambit Declined: Classical" },
  "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7": { eco: "D37", name: "Queen's Gambit Declined: Orthodox" },
  "1.d4 d5 2.c4 e6 3.Nc3 Be7": { eco: "D31", name: "Queen's Gambit Declined" },
  "1.d4 d5 2.c4 e6 3.Nf3 Nf6": { eco: "D30", name: "Queen's Gambit Declined" },

  // D10-D19: Slav
  "1.d4 d5 2.c4 c6": { eco: "D10", name: "Slav Defense" },
  "1.d4 d5 2.c4 c6 3.Nf3 Nf6": { eco: "D11", name: "Slav Defense" },
  "1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 dxc4": { eco: "D15", name: "Slav Defense: Main Line" },
  "1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 e6": { eco: "D13", name: "Semi-Slav Defense" },

  // D70-D99: Grunfeld
  "1.d4 Nf6 2.c4 g6 3.Nc3 d5": { eco: "D70", name: "Grunfeld Defense" },
  "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5": { eco: "D85", name: "Grunfeld Defense: Exchange Variation" },

  // E00-E09: Catalan
  "1.d4 Nf6 2.c4 e6 3.g3": { eco: "E00", name: "Catalan Opening" },
  "1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2": { eco: "E06", name: "Catalan Opening" },

  // E10-E19: Queen's Indian
  "1.d4 Nf6 2.c4 e6 3.Nf3 b6": { eco: "E15", name: "Queen's Indian Defense" },
  "1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3": { eco: "E15", name: "Queen's Indian Defense: Fianchetto" },

  // E20-E59: Nimzo-Indian
  "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4": { eco: "E20", name: "Nimzo-Indian Defense" },
  "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3": { eco: "E40", name: "Nimzo-Indian Defense: Rubinstein" },
  "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2": { eco: "E32", name: "Nimzo-Indian Defense: Classical" },
  "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.f3": { eco: "E20", name: "Nimzo-Indian Defense: Kmoch Variation" },

  // E60-E99: King's Indian
  "1.d4 Nf6 2.c4 g6": { eco: "E60", name: "King's Indian Defense" },
  "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7": { eco: "E61", name: "King's Indian Defense" },
  "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6": { eco: "E70", name: "King's Indian Defense: Normal" },
  "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O": { eco: "E90", name: "King's Indian Defense: Classical" },
  "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5": { eco: "E92", name: "King's Indian Defense: Classical, Main Line" },
  "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3": { eco: "E81", name: "King's Indian Defense: Samisch" },

  // Dutch
  "1.d4 f5": { eco: "A80", name: "Dutch Defense" },
  "1.d4 f5 2.c4 Nf6 3.g3 e6 4.Bg2": { eco: "A81", name: "Dutch Defense: Stonewall" },

  // Benoni / Benko
  "1.d4 Nf6 2.c4 c5": { eco: "A56", name: "Benoni Defense" },
  "1.d4 Nf6 2.c4 c5 3.d5 b5": { eco: "A57", name: "Benko Gambit" },
  "1.d4 Nf6 2.c4 c5 3.d5 e6": { eco: "A60", name: "Modern Benoni" },
};

// Find the longest matching opening for a sequence of moves
function findOpening(moves) {
  let best = null;
  let bestLen = 0;

  // Build move string progressively
  let moveStr = '';
  for (let i = 0; i < moves.length; i++) {
    const moveNum = Math.floor(i / 2) + 1;
    const isWhite = i % 2 === 0;
    if (isWhite) {
      moveStr += (i > 0 ? ' ' : '') + moveNum + '.' + moves[i].san;
    } else {
      moveStr += ' ' + moves[i].san;
    }

    if (OPENINGS[moveStr]) {
      best = OPENINGS[moveStr];
      bestLen = i + 1;
    }
  }

  return best;
}

// Check if a move index is still in "book" territory (first 15 moves approx)
function isBookMove(moves, moveIndex) {
  // Build the move string up to this index
  let moveStr = '';
  for (let i = 0; i <= moveIndex; i++) {
    const moveNum = Math.floor(i / 2) + 1;
    const isWhite = i % 2 === 0;
    if (isWhite) {
      moveStr += (i > 0 ? ' ' : '') + moveNum + '.' + moves[i].san;
    } else {
      moveStr += ' ' + moves[i].san;
    }
  }
  return !!OPENINGS[moveStr];
}

export { OPENINGS, findOpening, isBookMove };
