// ============================================================
// FULL CHESS ENGINE - move generation, validation, FEN, PGN
// ============================================================

const PIECE_SYMBOLS = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const PIECE_UNICODE = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const FILES = 'abcdefgh';
const RANKS = '12345678';

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Square index: a1=0, b1=1, ... h8=63
function sq(file, rank) { return rank * 8 + file; }
function fileOf(s) { return s % 8; }
function rankOf(s) { return Math.floor(s / 8); }
function sqName(s) { return FILES[fileOf(s)] + RANKS[rankOf(s)]; }
function nameToSq(name) {
  if (!name || name.length < 2) return -1;
  const f = FILES.indexOf(name[0]);
  const r = RANKS.indexOf(name[1]);
  if (f < 0 || r < 0) return -1;
  return sq(f, r);
}

function isWhite(piece) { return piece >= 'A' && piece <= 'Z'; }
function isBlack(piece) { return piece >= 'a' && piece <= 'z'; }
function pieceColor(piece) { return isWhite(piece) ? 'w' : 'b'; }
function pieceLower(piece) { return piece.toLowerCase(); }

// Board is array of 64, null = empty, character = piece
function parseFEN(fen) {
  const parts = fen.split(' ');
  const board = new Array(64).fill(null);
  const rows = parts[0].split('/');
  for (let r = 7; r >= 0; r--) {
    let f = 0;
    for (const ch of rows[7 - r]) {
      if (ch >= '1' && ch <= '8') { f += parseInt(ch); }
      else { board[sq(f, r)] = ch; f++; }
    }
  }
  return {
    board,
    turn: parts[1] || 'w',
    castling: parts[2] || '-',
    enPassant: parts[3] || '-',
    halfmove: parseInt(parts[4]) || 0,
    fullmove: parseInt(parts[5]) || 1,
  };
}

function boardToFEN(state) {
  let fen = '';
  for (let r = 7; r >= 0; r--) {
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const p = state.board[sq(f, r)];
      if (!p) { empty++; }
      else {
        if (empty > 0) { fen += empty; empty = 0; }
        fen += p;
      }
    }
    if (empty > 0) fen += empty;
    if (r > 0) fen += '/';
  }
  return `${fen} ${state.turn} ${state.castling} ${state.enPassant} ${state.halfmove} ${state.fullmove}`;
}

function cloneState(state) {
  return {
    board: [...state.board],
    turn: state.turn,
    castling: state.castling,
    enPassant: state.enPassant,
    halfmove: state.halfmove,
    fullmove: state.fullmove,
  };
}

// Check if square is attacked by given color
function isAttackedBy(board, square, color) {
  const r = rankOf(square), f = fileOf(square);

  // Knight attacks
  const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  const knight = color === 'w' ? 'N' : 'n';
  for (const [dr, df] of knightMoves) {
    const nr = r + dr, nf = f + df;
    if (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) {
      if (board[sq(nf, nr)] === knight) return true;
    }
  }

  // King attacks
  const king = color === 'w' ? 'K' : 'k';
  for (let dr = -1; dr <= 1; dr++) {
    for (let df = -1; df <= 1; df++) {
      if (dr === 0 && df === 0) continue;
      const nr = r + dr, nf = f + df;
      if (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) {
        if (board[sq(nf, nr)] === king) return true;
      }
    }
  }

  // Pawn attacks
  const pawn = color === 'w' ? 'P' : 'p';
  const pawnDir = color === 'w' ? -1 : 1; // direction FROM which pawn attacks
  const pr = r + pawnDir;
  if (pr >= 0 && pr < 8) {
    if (f - 1 >= 0 && board[sq(f - 1, pr)] === pawn) return true;
    if (f + 1 < 8 && board[sq(f + 1, pr)] === pawn) return true;
  }

  // Sliding pieces: bishop/queen diagonals
  const bishop = color === 'w' ? 'B' : 'b';
  const queen = color === 'w' ? 'Q' : 'q';
  for (const [dr, df] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
    let nr = r + dr, nf = f + df;
    while (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) {
      const p = board[sq(nf, nr)];
      if (p) {
        if (p === bishop || p === queen) return true;
        break;
      }
      nr += dr; nf += df;
    }
  }

  // Sliding pieces: rook/queen straights
  const rook = color === 'w' ? 'R' : 'r';
  for (const [dr, df] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    let nr = r + dr, nf = f + df;
    while (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) {
      const p = board[sq(nf, nr)];
      if (p) {
        if (p === rook || p === queen) return true;
        break;
      }
      nr += dr; nf += df;
    }
  }

  return false;
}

function isInCheck(board, color) {
  const king = color === 'w' ? 'K' : 'k';
  let kingSq = -1;
  for (let i = 0; i < 64; i++) {
    if (board[i] === king) { kingSq = i; break; }
  }
  if (kingSq === -1) return false;
  const opponent = color === 'w' ? 'b' : 'w';
  return isAttackedBy(board, kingSq, opponent);
}

// Generate all pseudo-legal moves, then filter for legality
function generateLegalMoves(state) {
  const moves = [];
  const { board, turn, castling, enPassant } = state;
  const opponent = turn === 'w' ? 'b' : 'w';

  for (let from = 0; from < 64; from++) {
    const piece = board[from];
    if (!piece) continue;
    if (pieceColor(piece) !== turn) continue;

    const r = rankOf(from), f = fileOf(from);
    const type = pieceLower(piece);

    const addMove = (to, promotion = null, flag = null) => {
      moves.push({ from, to, piece, promotion, flag, captured: board[to] });
    };

    if (type === 'p') {
      const dir = turn === 'w' ? 1 : -1;
      const startRank = turn === 'w' ? 1 : 6;
      const promoRank = turn === 'w' ? 7 : 0;

      // Forward
      const fwd = sq(f, r + dir);
      if (r + dir >= 0 && r + dir < 8 && !board[fwd]) {
        if (r + dir === promoRank) {
          for (const pr of ['q', 'r', 'b', 'n']) addMove(fwd, turn === 'w' ? pr.toUpperCase() : pr, 'promotion');
        } else {
          addMove(fwd);
        }
        // Double push
        if (r === startRank) {
          const fwd2 = sq(f, r + 2 * dir);
          if (!board[fwd2]) addMove(fwd2, null, 'double');
        }
      }

      // Captures
      for (const df of [-1, 1]) {
        const nf = f + df, nr = r + dir;
        if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
        const to = sq(nf, nr);
        const target = board[to];
        if (target && pieceColor(target) === opponent) {
          if (nr === promoRank) {
            for (const pr of ['q', 'r', 'b', 'n']) moves.push({ from, to, piece, promotion: turn === 'w' ? pr.toUpperCase() : pr, flag: 'promotion', captured: target });
          } else {
            moves.push({ from, to, piece, promotion: null, flag: null, captured: target });
          }
        }
        // En passant
        if (enPassant !== '-') {
          const epSq = nameToSq(enPassant);
          if (to === epSq) {
            const capturedSq = sq(nf, r);
            moves.push({ from, to, piece, promotion: null, flag: 'enpassant', captured: board[capturedSq] });
          }
        }
      }
    }
    else if (type === 'n') {
      for (const [dr, df] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nr = r + dr, nf = f + df;
        if (nr < 0 || nr > 7 || nf < 0 || nf > 7) continue;
        const to = sq(nf, nr);
        const target = board[to];
        if (!target || pieceColor(target) === opponent) addMove(to);
      }
    }
    else if (type === 'k') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let df = -1; df <= 1; df++) {
          if (dr === 0 && df === 0) continue;
          const nr = r + dr, nf = f + df;
          if (nr < 0 || nr > 7 || nf < 0 || nf > 7) continue;
          const to = sq(nf, nr);
          const target = board[to];
          if (!target || pieceColor(target) === opponent) addMove(to);
        }
      }
      // Castling
      if (turn === 'w') {
        if (castling.includes('K') && !board[sq(5,0)] && !board[sq(6,0)] && board[sq(7,0)] === 'R') {
          if (!isAttackedBy(board, sq(4,0), 'b') && !isAttackedBy(board, sq(5,0), 'b') && !isAttackedBy(board, sq(6,0), 'b')) {
            moves.push({ from, to: sq(6, 0), piece, promotion: null, flag: 'castle-k', captured: null });
          }
        }
        if (castling.includes('Q') && !board[sq(3,0)] && !board[sq(2,0)] && !board[sq(1,0)] && board[sq(0,0)] === 'R') {
          if (!isAttackedBy(board, sq(4,0), 'b') && !isAttackedBy(board, sq(3,0), 'b') && !isAttackedBy(board, sq(2,0), 'b')) {
            moves.push({ from, to: sq(2, 0), piece, promotion: null, flag: 'castle-q', captured: null });
          }
        }
      } else {
        if (castling.includes('k') && !board[sq(5,7)] && !board[sq(6,7)] && board[sq(7,7)] === 'r') {
          if (!isAttackedBy(board, sq(4,7), 'w') && !isAttackedBy(board, sq(5,7), 'w') && !isAttackedBy(board, sq(6,7), 'w')) {
            moves.push({ from, to: sq(6, 7), piece, promotion: null, flag: 'castle-k', captured: null });
          }
        }
        if (castling.includes('q') && !board[sq(3,7)] && !board[sq(2,7)] && !board[sq(1,7)] && board[sq(0,7)] === 'r') {
          if (!isAttackedBy(board, sq(4,7), 'w') && !isAttackedBy(board, sq(3,7), 'w') && !isAttackedBy(board, sq(2,7), 'w')) {
            moves.push({ from, to: sq(2, 7), piece, promotion: null, flag: 'castle-q', captured: null });
          }
        }
      }
    }
    else {
      // Sliding pieces
      let directions = [];
      if (type === 'b' || type === 'q') directions.push([-1,-1],[-1,1],[1,-1],[1,1]);
      if (type === 'r' || type === 'q') directions.push([-1,0],[1,0],[0,-1],[0,1]);
      for (const [dr, df] of directions) {
        let nr = r + dr, nf = f + df;
        while (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) {
          const to = sq(nf, nr);
          const target = board[to];
          if (target) {
            if (pieceColor(target) === opponent) addMove(to);
            break;
          }
          addMove(to);
          nr += dr; nf += df;
        }
      }
    }
  }

  // Filter: only legal moves (don't leave own king in check)
  return moves.filter(move => {
    const newBoard = [...board];
    newBoard[move.to] = move.promotion || move.piece;
    newBoard[move.from] = null;
    if (move.flag === 'enpassant') {
      const epCapSq = sq(fileOf(move.to), rankOf(move.from));
      newBoard[epCapSq] = null;
    }
    if (move.flag === 'castle-k') {
      const r = turn === 'w' ? 0 : 7;
      newBoard[sq(5, r)] = newBoard[sq(7, r)];
      newBoard[sq(7, r)] = null;
    }
    if (move.flag === 'castle-q') {
      const r = turn === 'w' ? 0 : 7;
      newBoard[sq(3, r)] = newBoard[sq(0, r)];
      newBoard[sq(0, r)] = null;
    }
    return !isInCheck(newBoard, turn);
  });
}

function makeMove(state, move) {
  const newState = cloneState(state);
  const { board } = newState;
  const type = pieceLower(move.piece);

  // Halfmove clock
  if (type === 'p' || move.captured) {
    newState.halfmove = 0;
  } else {
    newState.halfmove++;
  }

  // Move piece
  board[move.to] = move.promotion || move.piece;
  board[move.from] = null;

  // En passant capture
  if (move.flag === 'enpassant') {
    const epCapSq = sq(fileOf(move.to), rankOf(move.from));
    board[epCapSq] = null;
  }

  // Castling move rook
  if (move.flag === 'castle-k') {
    const r = state.turn === 'w' ? 0 : 7;
    board[sq(5, r)] = board[sq(7, r)];
    board[sq(7, r)] = null;
  }
  if (move.flag === 'castle-q') {
    const r = state.turn === 'w' ? 0 : 7;
    board[sq(3, r)] = board[sq(0, r)];
    board[sq(0, r)] = null;
  }

  // En passant square
  if (move.flag === 'double') {
    const epRank = state.turn === 'w' ? rankOf(move.from) + 1 : rankOf(move.from) - 1;
    newState.enPassant = sqName(sq(fileOf(move.from), epRank));
  } else {
    newState.enPassant = '-';
  }

  // Update castling rights
  let c = newState.castling;
  if (move.piece === 'K') c = c.replace('K', '').replace('Q', '');
  if (move.piece === 'k') c = c.replace('k', '').replace('q', '');
  if (move.from === sq(0, 0) || move.to === sq(0, 0)) c = c.replace('Q', '');
  if (move.from === sq(7, 0) || move.to === sq(7, 0)) c = c.replace('K', '');
  if (move.from === sq(0, 7) || move.to === sq(0, 7)) c = c.replace('q', '');
  if (move.from === sq(7, 7) || move.to === sq(7, 7)) c = c.replace('k', '');
  newState.castling = c || '-';

  // Turn
  if (state.turn === 'b') newState.fullmove++;
  newState.turn = state.turn === 'w' ? 'b' : 'w';

  return newState;
}

// Convert move to SAN (Standard Algebraic Notation)
function moveToSAN(state, move) {
  const type = pieceLower(move.piece);

  if (move.flag === 'castle-k') return 'O-O';
  if (move.flag === 'castle-q') return 'O-O-O';

  let san = '';

  if (type !== 'p') {
    san += type.toUpperCase();

    // Disambiguation
    const legalMoves = generateLegalMoves(state);
    const ambiguous = legalMoves.filter(m =>
      m.to === move.to && pieceLower(m.piece) === type && m.from !== move.from
    );
    if (ambiguous.length > 0) {
      const sameFile = ambiguous.some(m => fileOf(m.from) === fileOf(move.from));
      const sameRank = ambiguous.some(m => rankOf(m.from) === rankOf(move.from));
      if (!sameFile) {
        san += FILES[fileOf(move.from)];
      } else if (!sameRank) {
        san += RANKS[rankOf(move.from)];
      } else {
        san += sqName(move.from);
      }
    }
  }

  if (move.captured || move.flag === 'enpassant') {
    if (type === 'p') san += FILES[fileOf(move.from)];
    san += 'x';
  }

  san += sqName(move.to);

  if (move.promotion) {
    san += '=' + move.promotion.toUpperCase();
  }

  // Check/checkmate
  const newState = makeMove(state, move);
  const opponentMoves = generateLegalMoves(newState);
  if (isInCheck(newState.board, newState.turn)) {
    san += opponentMoves.length === 0 ? '#' : '+';
  }

  return san;
}

// Parse SAN move string to move object
function parseSANMove(state, san) {
  const legalMoves = generateLegalMoves(state);

  // Clean SAN
  let s = san.replace(/[+#!?]+$/, '').trim();

  // Castling
  if (s === 'O-O' || s === '0-0') {
    return legalMoves.find(m => m.flag === 'castle-k') || null;
  }
  if (s === 'O-O-O' || s === '0-0-0') {
    return legalMoves.find(m => m.flag === 'castle-q') || null;
  }

  let promotion = null;
  if (s.includes('=')) {
    const parts = s.split('=');
    promotion = state.turn === 'w' ? parts[1][0].toUpperCase() : parts[1][0].toLowerCase();
    s = parts[0];
  }

  // Determine piece type
  let pieceType = 'p';
  if (s[0] >= 'A' && s[0] <= 'Z' && s[0] !== 'O') {
    pieceType = s[0].toLowerCase();
    s = s.substring(1);
  }

  // Remove captures
  s = s.replace('x', '');

  // Target square is last 2 chars
  const targetName = s.slice(-2);
  const target = nameToSq(targetName);
  if (target === -1) return null;

  // Disambiguation
  const disambig = s.slice(0, -2);

  // Find matching move
  for (const move of legalMoves) {
    if (move.to !== target) continue;
    if (pieceLower(move.piece) !== pieceType) continue;
    if (promotion && (!move.promotion || move.promotion.toLowerCase() !== promotion.toLowerCase())) continue;
    if (!promotion && move.promotion && move.promotion.toLowerCase() !== 'q') continue; // default queen promotion

    if (disambig.length === 0) return move;
    if (disambig.length === 1) {
      if (disambig[0] >= 'a' && disambig[0] <= 'h') {
        if (FILES[fileOf(move.from)] === disambig[0]) return move;
      } else if (disambig[0] >= '1' && disambig[0] <= '8') {
        if (RANKS[rankOf(move.from)] === disambig[0]) return move;
      }
    }
    if (disambig.length === 2) {
      if (sqName(move.from) === disambig) return move;
    }
  }

  // Fallback for pawn promotions without = sign
  if (pieceType === 'p' && !promotion) {
    const promoMove = legalMoves.find(m =>
      m.to === target && pieceLower(m.piece) === 'p' && m.promotion
    );
    if (promoMove) return promoMove;
  }

  return null;
}

// Parse PGN text
function parsePGN(pgn) {
  const headers = {};
  const lines = pgn.split('\n');
  let moveText = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[')) {
      const match = trimmed.match(/\[(\w+)\s+"(.*)"\]/);
      if (match) headers[match[1]] = match[2];
    } else {
      moveText += ' ' + trimmed;
    }
  }

  // Remove comments, variations, NAGs
  moveText = moveText.replace(/\{[^}]*\}/g, '');
  moveText = moveText.replace(/\([^)]*\)/g, '');
  moveText = moveText.replace(/\$\d+/g, '');
  moveText = moveText.replace(/\d+\.{3}/g, ''); // 1...
  moveText = moveText.replace(/\d+\./g, ''); // 1.

  // Remove result
  moveText = moveText.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '');

  const tokens = moveText.trim().split(/\s+/).filter(t => t.length > 0);

  // Parse moves
  let state = parseFEN(INITIAL_FEN);
  const positions = [{ fen: boardToFEN(state), state: cloneState(state) }];
  const moves = [];

  for (const token of tokens) {
    if (token === '1-0' || token === '0-1' || token === '1/2-1/2' || token === '*') break;
    const move = parseSANMove(state, token);
    if (!move) {
      console.warn('Failed to parse move:', token, 'in position:', boardToFEN(state));
      break;
    }
    const san = moveToSAN(state, move);
    const prevFen = boardToFEN(state);
    state = makeMove(state, move);
    const newFen = boardToFEN(state);
    moves.push({ ...move, san, fenBefore: prevFen, fenAfter: newFen });
    positions.push({ fen: newFen, state: cloneState(state) });
  }

  return { headers, moves, positions };
}

// Get game result
function getGameResult(state) {
  const legal = generateLegalMoves(state);
  if (legal.length === 0) {
    if (isInCheck(state.board, state.turn)) {
      return state.turn === 'w' ? '0-1' : '1-0'; // checkmate
    }
    return '1/2-1/2'; // stalemate
  }
  if (state.halfmove >= 100) return '1/2-1/2'; // 50-move rule
  return null; // game continues
}

// Material count for a position
function materialCount(board) {
  let white = 0, black = 0;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    const val = PIECE_VALUES[p.toLowerCase()] || 0;
    if (isWhite(p)) white += val;
    else black += val;
  }
  return { white, black };
}

// Convert UCI move (e.g. "e2e4") to move object
function parseUCIMove(state, uci) {
  if (!uci || uci.length < 4) return null;
  const from = nameToSq(uci.substring(0, 2));
  const to = nameToSq(uci.substring(2, 4));
  if (from === -1 || to === -1) return null;

  const legalMoves = generateLegalMoves(state);
  let promo = uci.length > 4 ? uci[4] : null;
  if (promo) promo = state.turn === 'w' ? promo.toUpperCase() : promo.toLowerCase();

  return legalMoves.find(m => {
    if (m.from !== from || m.to !== to) return false;
    if (promo && m.promotion && m.promotion.toLowerCase() !== promo.toLowerCase()) return false;
    return true;
  }) || null;
}

export {
  INITIAL_FEN, PIECE_UNICODE, PIECE_VALUES, FILES, RANKS,
  sq, fileOf, rankOf, sqName, nameToSq,
  isWhite, isBlack, pieceColor, pieceLower,
  parseFEN, boardToFEN, cloneState,
  isAttackedBy, isInCheck,
  generateLegalMoves, makeMove,
  moveToSAN, parseSANMove, parsePGN, parseUCIMove,
  getGameResult, materialCount,
};
