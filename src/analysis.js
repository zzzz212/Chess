// ============================================================
// ANALYSIS ENGINE - Lichess cloud eval + move classification
// ============================================================

import { parseFEN, generateLegalMoves, makeMove, moveToSAN, boardToFEN, parseUCIMove, materialCount, isInCheck, PIECE_VALUES } from './chessEngine';
import { isBookMove } from './openings';

// ---- Lichess Cloud Eval API ----

const EVAL_CACHE = new Map();

async function fetchCloudEval(fen, multiPv = 3) {
  const cacheKey = fen + '|' + multiPv;
  if (EVAL_CACHE.has(cacheKey)) return EVAL_CACHE.get(cacheKey);

  const encodedFen = encodeURIComponent(fen);
  const url = `https://lichess.org/api/cloud-eval?fen=${encodedFen}&multiPv=${multiPv}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    EVAL_CACHE.set(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

// Parse Lichess eval response into normalized format
function parseEvalData(data) {
  if (!data || !data.pvs || data.pvs.length === 0) return null;

  const pvs = data.pvs.map(pv => {
    if (pv.mate !== undefined && pv.mate !== null) {
      return { cp: null, mate: pv.mate, moves: pv.moves ? pv.moves.split(' ') : [] };
    }
    return { cp: pv.cp || 0, mate: null, moves: pv.moves ? pv.moves.split(' ') : [] };
  });

  return { depth: data.depth || 0, knodes: data.knodes || 0, pvs };
}

// Convert eval to centipawns from white's perspective
function evalToCp(evalObj) {
  if (!evalObj) return 0;
  const pv = evalObj.pvs[0];
  if (pv.mate !== null) {
    return pv.mate > 0 ? 10000 - pv.mate : -10000 - pv.mate;
  }
  return pv.cp;
}

// Format eval for display
function formatEval(evalObj, turn) {
  if (!evalObj || !evalObj.pvs || evalObj.pvs.length === 0) return '0.0';
  const pv = evalObj.pvs[0];
  if (pv.mate !== null) {
    return `M${Math.abs(pv.mate)}`;
  }
  const cp = pv.cp || 0;
  const val = cp / 100;
  if (val > 0) return `+${val.toFixed(1)}`;
  return val.toFixed(1);
}

// Eval bar percentage (0 = black winning, 100 = white winning)
function evalToBarPercent(evalObj) {
  if (!evalObj || !evalObj.pvs || evalObj.pvs.length === 0) return 50;
  const pv = evalObj.pvs[0];
  if (pv.mate !== null) {
    return pv.mate > 0 ? 100 : 0;
  }
  const cp = pv.cp || 0;
  // Sigmoid-like mapping: ±1000cp -> 0-100%
  const percent = 50 + 50 * (2 / (1 + Math.exp(-0.004 * cp)) - 1);
  return Math.max(0, Math.min(100, percent));
}

// ---- Move Classification ----

const CLASSIFICATIONS = {
  brilliant:   { label: 'Brilliant',   symbol: '!!', color: '#1BADA6', emoji: '💎' },
  great:       { label: 'Great',       symbol: '!',  color: '#5C8BB0', emoji: '🌟' },
  best:        { label: 'Best',        symbol: '✓',  color: '#96BC4B', emoji: '✅' },
  excellent:   { label: 'Excellent',   symbol: '',   color: '#96BC4B', emoji: '👍' },
  good:        { label: 'Good',        symbol: '',   color: '#A8D15F', emoji: '👌' },
  book:        { label: 'Book',        symbol: '📖',  color: '#A0A0A0', emoji: '📖' },
  inaccuracy:  { label: 'Inaccuracy',  symbol: '?!', color: '#F7C631', emoji: '⚠️' },
  mistake:     { label: 'Mistake',     symbol: '?',  color: '#FFA459', emoji: '❓' },
  blunder:     { label: 'Blunder',     symbol: '??', color: '#CA3431', emoji: '❌' },
  missedWin:   { label: 'Missed Win',  symbol: '??', color: '#CA3431', emoji: '💀' },
  forced:      { label: 'Forced',      symbol: '',   color: '#A0A0A0', emoji: '🔒' },
};

function classifyMove({
  cpBefore,      // eval before move (from side-to-move perspective)
  cpAfter,       // eval after move (from side-to-move perspective, negated)
  mateBefore,
  mateAfter,
  isOnlyLegal,
  isBestMove,
  isBook,
  prevEval,      // full eval object before
  afterEval,     // full eval object after
  move,
  state,         // state before the move
}) {
  // Forced (only one legal move)
  if (isOnlyLegal) return 'forced';

  // Book move
  if (isBook) return 'book';

  // Compute centipawn loss from the moving player's perspective
  // cpBefore = eval from white's perspective before the move
  // cpAfter = eval from white's perspective after the move
  const turn = state.turn; // 'w' or 'b'
  const signedBefore = turn === 'w' ? cpBefore : -cpBefore;
  const signedAfter = turn === 'w' ? cpAfter : -cpAfter;
  const cpLoss = signedBefore - signedAfter;

  // Missed win: had mate, now doesn't
  if (mateBefore !== null && mateBefore !== undefined) {
    const hadMateForUs = (turn === 'w' && mateBefore > 0) || (turn === 'b' && mateBefore < 0);
    if (hadMateForUs) {
      if (mateAfter === null || mateAfter === undefined) {
        return 'missedWin';
      }
      const stillMateForUs = (turn === 'w' && mateAfter > 0) || (turn === 'b' && mateAfter < 0);
      if (!stillMateForUs) return 'missedWin';
    }
  }

  // Check for brilliant: material sacrifice that improves position significantly
  if (move.captured) {
    const capturedValue = PIECE_VALUES[move.captured.toLowerCase()] || 0;
    const pieceValue = PIECE_VALUES[move.piece.toLowerCase()] || 0;
    // Sacrifice = we traded a higher value piece for a lower one or gave material
    if (pieceValue > capturedValue + 50 && cpLoss <= 0 && signedAfter > signedBefore) {
      // We sacrificed material but position improved
      if (signedAfter - signedBefore >= 150) return 'brilliant';
    }
  }
  // Also check brilliant for non-captures where we allow captures next move
  if (isBestMove && cpLoss <= 0) {
    // Check if the best move allows the opponent to capture our piece
    const afterState = makeMove(state, move);
    const oppMoves = generateLegalMoves(afterState);
    const canCaptureUs = oppMoves.some(m => m.to === move.to && m.captured);
    if (canCaptureUs) {
      const ourPieceValue = PIECE_VALUES[move.piece.toLowerCase()] || 0;
      if (ourPieceValue >= 300 && signedAfter >= signedBefore + 100) {
        return 'brilliant';
      }
    }
  }

  // Great: only good move, all alternatives lose ≥100cp
  if (isBestMove && prevEval && prevEval.pvs && prevEval.pvs.length >= 2) {
    const bestCp = prevEval.pvs[0].mate !== null
      ? (prevEval.pvs[0].mate > 0 ? 10000 : -10000)
      : (prevEval.pvs[0].cp || 0);
    const secondCp = prevEval.pvs[1].mate !== null
      ? (prevEval.pvs[1].mate > 0 ? 10000 : -10000)
      : (prevEval.pvs[1].cp || 0);
    const diff = turn === 'w' ? bestCp - secondCp : secondCp - bestCp;
    if (diff >= 100) return 'great';
  }

  // Best move
  if (isBestMove || cpLoss <= 0) return 'best';

  // Excellent: 0-10 cp loss
  if (cpLoss <= 10) return 'excellent';

  // Good: 10-25 cp loss
  if (cpLoss <= 25) return 'good';

  // Inaccuracy: 25-50 cp loss
  if (cpLoss <= 50) return 'inaccuracy';

  // Mistake: 50-100 cp loss
  if (cpLoss <= 100) return 'mistake';

  // Blunder: >100 cp loss
  return 'blunder';
}

// ---- Accuracy Calculation ----

function calculateAccuracy(acpl) {
  if (acpl <= 0) return 100;
  const accuracy = 103.1668 * Math.exp(-0.04354 * acpl) - 3.1668;
  return Math.max(0, Math.min(100, accuracy));
}

// ---- Generate Comments ----

function generateComment(classification, move, cpBefore, cpAfter, bestMoveSAN, bestLine, state, openingName) {
  const turn = state.turn;
  const signedBefore = turn === 'w' ? cpBefore : -cpBefore;
  const signedAfter = turn === 'w' ? cpAfter : -cpAfter;
  const cpLoss = signedBefore - signedAfter;
  const player = turn === 'w' ? 'Белые' : 'Чёрные';

  switch (classification) {
    case 'book':
      return openingName
        ? `Теоретический ход. ${openingName}.`
        : 'Теоретический дебютный ход.';

    case 'brilliant':
      return `Блестящий ход! ${player} жертвуют материал, получая решающее преимущество. ${bestLine ? 'Линия: ' + bestLine : ''}`;

    case 'great':
      return `Отличный ход! Единственный ход, сохраняющий преимущество. Все альтернативы значительно хуже.`;

    case 'best':
      return `Лучший ход по мнению движка.`;

    case 'excellent':
      return `Очень хороший ход. Почти не уступает лучшему варианту.`;

    case 'good':
      return `Хороший ход, хотя немного уступает лучшему варианту.${bestMoveSAN ? ` Лучше было ${bestMoveSAN}.` : ''}`;

    case 'forced':
      return `Вынужденный ход — единственный легальный ход в позиции.`;

    case 'inaccuracy':
      return `Неточность (потеря ${cpLoss.toFixed(0)} cp).${bestMoveSAN ? ` Лучше было ${bestMoveSAN}.` : ''}${bestLine ? ' Линия: ' + bestLine : ''}`;

    case 'mistake':
      return `Ошибка! Потеря ${cpLoss.toFixed(0)} сотых пешки.${bestMoveSAN ? ` Нужно было ${bestMoveSAN}.` : ''}${bestLine ? ' Линия: ' + bestLine : ''}`;

    case 'blunder':
      return `Грубая ошибка! Потеря ${cpLoss.toFixed(0)} cp.${bestMoveSAN ? ` Нужно было ${bestMoveSAN}.` : ''}${bestLine ? ' Линия: ' + bestLine : ''}`;

    case 'missedWin':
      return `Упущена победа!${bestMoveSAN ? ` Выигрывало ${bestMoveSAN}.` : ''}${bestLine ? ' ' + bestLine : ''}`;

    default:
      return '';
  }
}

// ---- Full Game Analysis ----

async function analyzeGame(moves, positions, onProgress) {
  const analysis = [];
  const evalResults = [];

  // Fetch evals for all positions
  for (let i = 0; i < positions.length; i++) {
    if (onProgress) onProgress(i, positions.length);

    const fen = positions[i].fen;
    const data = await fetchCloudEval(fen, 3);
    const parsed = parseEvalData(data);

    evalResults.push(parsed);

    // Small delay to avoid rate limiting
    if (i % 3 === 0 && i > 0) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // Now classify each move
  let whiteCpLossTotal = 0, whiteMoveCount = 0;
  let blackCpLossTotal = 0, blackMoveCount = 0;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const state = positions[i].state;
    const prevEval = evalResults[i];
    const afterEval = evalResults[i + 1];

    const cpBefore = prevEval ? evalToCp(prevEval) : 0;
    const cpAfter = afterEval ? evalToCp(afterEval) : 0;
    const mateBefore = prevEval?.pvs?.[0]?.mate ?? null;
    const mateAfter = afterEval?.pvs?.[0]?.mate ?? null;

    const legalMoves = generateLegalMoves(state);
    const isOnlyLegal = legalMoves.length === 1;

    // Check if this was the best move (matches engine's top choice)
    let isBestMove = false;
    let bestMoveSAN = '';
    let bestLineStr = '';

    if (prevEval && prevEval.pvs && prevEval.pvs.length > 0) {
      const engineBestUci = prevEval.pvs[0].moves[0];
      if (engineBestUci) {
        const engineBestMove = parseUCIMove(state, engineBestUci);
        if (engineBestMove) {
          bestMoveSAN = moveToSAN(state, engineBestMove);
          isBestMove = (move.from === engineBestMove.from && move.to === engineBestMove.to);

          // Build best line string
          if (prevEval.pvs[0].moves.length > 1) {
            let lineState = { ...state, board: [...state.board] };
            const lineMoves = [];
            for (let j = 0; j < Math.min(6, prevEval.pvs[0].moves.length); j++) {
              const uciMove = prevEval.pvs[0].moves[j];
              const parsed = parseUCIMove(lineState, uciMove);
              if (!parsed) break;
              const san = moveToSAN(lineState, parsed);
              lineMoves.push(san);
              lineState = makeMove(lineState, parsed);
            }
            bestLineStr = lineMoves.join(' ');
          }
        }
      }
    }

    const isBook = isBookMove(moves, i);

    const classification = classifyMove({
      cpBefore, cpAfter, mateBefore, mateAfter,
      isOnlyLegal, isBestMove, isBook,
      prevEval, afterEval, move, state,
    });

    // Compute centipawn loss for accuracy
    const turn = state.turn;
    const signedBefore = turn === 'w' ? cpBefore : -cpBefore;
    const signedAfter = turn === 'w' ? cpAfter : -cpAfter;
    const cpLoss = Math.max(0, signedBefore - signedAfter);

    if (classification !== 'book' && classification !== 'forced') {
      if (turn === 'w') { whiteCpLossTotal += cpLoss; whiteMoveCount++; }
      else { blackCpLossTotal += cpLoss; blackMoveCount++; }
    }

    const openingName = isBook ? (moves._openingName || '') : '';

    const comment = generateComment(
      classification, move, cpBefore, cpAfter,
      isBestMove ? '' : bestMoveSAN, bestLineStr, state, openingName
    );

    analysis.push({
      moveIndex: i,
      san: move.san,
      classification,
      classInfo: CLASSIFICATIONS[classification],
      cpBefore,
      cpAfter,
      cpLoss,
      mateBefore,
      mateAfter,
      isBestMove,
      bestMoveSAN: isBestMove ? '' : bestMoveSAN,
      bestLine: bestLineStr,
      comment,
      eval: afterEval,
      evalDisplay: afterEval ? formatEval(afterEval) : formatEvalCp(cpAfter),
      barPercent: afterEval ? evalToBarPercent(afterEval) : 50,
    });
  }

  const whiteACPL = whiteMoveCount > 0 ? whiteCpLossTotal / whiteMoveCount : 0;
  const blackACPL = blackMoveCount > 0 ? blackCpLossTotal / blackMoveCount : 0;

  return {
    moves: analysis,
    whiteAccuracy: calculateAccuracy(whiteACPL),
    blackAccuracy: calculateAccuracy(blackACPL),
    whiteACPL,
    blackACPL,
    evalResults,
  };
}

function formatEvalCp(cp) {
  if (Math.abs(cp) > 9000) return cp > 0 ? 'M' : '-M';
  const val = cp / 100;
  return val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
}

export {
  fetchCloudEval, parseEvalData, evalToCp, formatEval, evalToBarPercent,
  CLASSIFICATIONS, classifyMove, calculateAccuracy,
  generateComment, analyzeGame, formatEvalCp,
};
