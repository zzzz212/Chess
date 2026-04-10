// ============================================================
// ANALYSIS ENGINE - Real Stockfish WASM + move classification
// ============================================================

import { parseFEN, generateLegalMoves, makeMove, moveToSAN, boardToFEN, parseUCIMove, materialCount, isInCheck, PIECE_VALUES, cloneState } from './chessEngine';
import { isBookMove } from './openings';
import { analyzePosition, initStockfish } from './stockfish';

// ---- Eval Helpers ----

// Convert eval object to centipawns from white's perspective
function evalToCp(evalObj) {
  if (!evalObj || !evalObj.pvs || evalObj.pvs.length === 0) return 0;
  const pv = evalObj.pvs[0];
  if (pv.mate !== null && pv.mate !== undefined) {
    return pv.mate > 0 ? 10000 - Math.abs(pv.mate) : -10000 + Math.abs(pv.mate);
  }
  return pv.cp || 0;
}

// Format eval for display (always from white's perspective)
function formatEval(evalObj) {
  if (!evalObj || !evalObj.pvs || evalObj.pvs.length === 0) return '0.0';
  const pv = evalObj.pvs[0];
  if (pv.mate !== null && pv.mate !== undefined) {
    const sign = pv.mate > 0 ? '+' : '-';
    return `${sign}M${Math.abs(pv.mate)}`;
  }
  const cp = pv.cp || 0;
  const val = cp / 100;
  if (val > 0) return `+${val.toFixed(1)}`;
  if (val === 0) return '0.0';
  return val.toFixed(1);
}

// Format raw cp value
function formatEvalCp(cp) {
  if (Math.abs(cp) > 9000) {
    return cp > 0 ? '+M' : '-M';
  }
  const val = cp / 100;
  if (val > 0) return `+${val.toFixed(1)}`;
  if (val === 0) return '0.0';
  return val.toFixed(1);
}

// Eval bar percentage (0 = black winning fully, 100 = white winning fully)
function evalToBarPercent(evalObj) {
  if (!evalObj || !evalObj.pvs || evalObj.pvs.length === 0) return 50;
  const pv = evalObj.pvs[0];

  if (pv.mate !== null && pv.mate !== undefined) {
    return pv.mate > 0 ? 100 : 0;
  }

  const cp = pv.cp || 0;
  // Sigmoid mapping: ±500cp -> roughly 10-90%
  const percent = 50 + 50 * (2 / (1 + Math.exp(-0.005 * cp)) - 1);
  return Math.max(1, Math.min(99, percent));
}

// Convert raw cp to bar percent (for positions without eval object)
function cpToBarPercent(cp) {
  if (Math.abs(cp) > 9000) return cp > 0 ? 100 : 0;
  const percent = 50 + 50 * (2 / (1 + Math.exp(-0.005 * cp)) - 1);
  return Math.max(1, Math.min(99, percent));
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
  cpBefore,      // eval from white's perspective BEFORE the move
  cpAfter,       // eval from white's perspective AFTER the move
  mateBefore,    // mate score before (from side to move's perspective)
  mateAfter,     // mate score after (from next side to move's perspective)
  isOnlyLegal,
  isBestMove,
  isBook,
  prevEval,      // full eval object before
  afterEval,     // full eval object after
  move,
  state,         // state before the move
}) {
  if (isOnlyLegal) return 'forced';
  if (isBook) return 'book';

  const turn = state.turn; // 'w' or 'b'

  // cpLoss from the moving player's perspective
  // If white moved: player wants cpAfter >= cpBefore (positive = good for white)
  // If black moved: player wants cpAfter <= cpBefore (negative = good for black)
  let cpLoss;
  if (turn === 'w') {
    cpLoss = cpBefore - cpAfter; // white wants eval to stay high
  } else {
    cpLoss = cpAfter - cpBefore; // black wants eval to stay low (negative)
  }

  // Missed win: had forced mate, now lost it
  if (mateBefore !== null && mateBefore !== undefined) {
    // mateBefore is from the side-to-move's perspective in the position BEFORE the move
    // Positive = side to move has mate
    const hadMateForUs = mateBefore > 0;
    if (hadMateForUs) {
      if (mateAfter === null || mateAfter === undefined) {
        return 'missedWin';
      }
      // mateAfter is from NEXT side-to-move perspective, so negative means the player who just moved still has mate
      if (mateAfter > 0) {
        // Opponent now has mate = we lost our mate advantage
        return 'missedWin';
      }
    }
  }

  // Brilliant: sacrifice that improves or maintains position
  if (move.captured) {
    const capturedValue = PIECE_VALUES[move.captured.toLowerCase()] || 0;
    const pieceValue = PIECE_VALUES[move.piece.toLowerCase()] || 0;
    if (pieceValue > capturedValue + 100 && cpLoss <= 0) {
      return 'brilliant';
    }
  }
  // Brilliant: move to a square where opponent can capture us (sacrifice)
  if (isBestMove && cpLoss <= 0) {
    const afterState = makeMove(state, move);
    const oppMoves = generateLegalMoves(afterState);
    const canCaptureUs = oppMoves.some(m => m.to === move.to && m.captured);
    if (canCaptureUs) {
      const ourPieceValue = PIECE_VALUES[move.piece.toLowerCase()] || 0;
      if (ourPieceValue >= 300) {
        return 'brilliant';
      }
    }
  }

  // Great: only good move, 2nd best is ≥100cp worse
  if (isBestMove && prevEval && prevEval.pvs && prevEval.pvs.length >= 2) {
    const pv0 = prevEval.pvs[0];
    const pv1 = prevEval.pvs[1];
    const cp0 = pv0.mate !== null ? (pv0.mate > 0 ? 10000 : -10000) : (pv0.cp || 0);
    const cp1 = pv1.mate !== null ? (pv1.mate > 0 ? 10000 : -10000) : (pv1.cp || 0);
    // These are from the side-to-move's perspective, so higher is better
    const diff = cp0 - cp1;
    if (diff >= 100) return 'great';
  }

  if (isBestMove || cpLoss <= 0) return 'best';
  if (cpLoss <= 10) return 'excellent';
  if (cpLoss <= 25) return 'good';
  if (cpLoss <= 50) return 'inaccuracy';
  if (cpLoss <= 100) return 'mistake';
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
  let cpLoss;
  if (turn === 'w') {
    cpLoss = cpBefore - cpAfter;
  } else {
    cpLoss = cpAfter - cpBefore;
  }
  const player = turn === 'w' ? 'Белые' : 'Чёрные';

  switch (classification) {
    case 'book':
      return openingName
        ? `Теоретический ход. ${openingName}.`
        : 'Теоретический дебютный ход.';

    case 'brilliant':
      return `Блестящий ход! ${player} жертвуют материал, получая решающее преимущество.${bestLine ? ' Линия: ' + bestLine : ''}`;

    case 'great':
      return `Отличный ход! Единственный ход, сохраняющий преимущество. Все альтернативы значительно хуже.`;

    case 'best':
      return `Лучший ход по мнению движка.`;

    case 'excellent':
      return `Очень хороший ход. Почти не уступает лучшему варианту.`;

    case 'good':
      return `Хороший ход.${bestMoveSAN ? ` Немного лучше было ${bestMoveSAN}.` : ''}`;

    case 'forced':
      return `Вынужденный ход — единственный легальный ход в позиции.`;

    case 'inaccuracy':
      return `Неточность (потеря ${Math.abs(cpLoss).toFixed(0)} cp).${bestMoveSAN ? ` Лучше было ${bestMoveSAN}.` : ''}${bestLine ? ' Линия: ' + bestLine : ''}`;

    case 'mistake':
      return `Ошибка! Потеря ${Math.abs(cpLoss).toFixed(0)} сотых пешки.${bestMoveSAN ? ` Нужно было ${bestMoveSAN}.` : ''}${bestLine ? ' Линия: ' + bestLine : ''}`;

    case 'blunder':
      return `Грубая ошибка! Потеря ${Math.abs(cpLoss).toFixed(0)} cp.${bestMoveSAN ? ` Нужно было ${bestMoveSAN}.` : ''}${bestLine ? ' Линия: ' + bestLine : ''}`;

    case 'missedWin':
      return `Упущена победа!${bestMoveSAN ? ` Выигрывало ${bestMoveSAN}.` : ''}${bestLine ? ' ' + bestLine : ''}`;

    default:
      return '';
  }
}

// ---- Full Game Analysis with real Stockfish WASM ----

async function analyzeGame(moves, positions, onProgress) {
  // Initialize Stockfish
  await initStockfish();

  const analysis = [];
  const evalResults = [];

  // Analyze all positions with real Stockfish at depth 18
  const DEPTH = 18;

  for (let i = 0; i < positions.length; i++) {
    if (onProgress) onProgress(i, positions.length);

    const fen = positions[i].fen;
    const result = await analyzePosition(fen, DEPTH, 3);
    evalResults.push(result);
  }

  if (onProgress) onProgress(positions.length, positions.length);

  // Classify each move
  let whiteCpLossTotal = 0, whiteMoveCount = 0;
  let blackCpLossTotal = 0, blackMoveCount = 0;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const state = positions[i].state;
    const prevEval = evalResults[i];   // eval BEFORE this move
    const afterEval = evalResults[i + 1]; // eval AFTER this move

    // Stockfish returns eval from the side-to-move's perspective
    // We need to convert to white's perspective for consistency
    const turnBefore = state.turn;
    const turnAfter = turnBefore === 'w' ? 'b' : 'w';

    // Convert to white's perspective
    const rawCpBefore = evalToCpRaw(prevEval);  // from side-to-move's perspective
    const rawCpAfter = evalToCpRaw(afterEval);   // from side-to-move's perspective

    const cpBefore = turnBefore === 'w' ? rawCpBefore : -rawCpBefore;
    const cpAfter = turnAfter === 'w' ? rawCpAfter : -rawCpAfter;

    // Mate scores from side-to-move perspective
    const mateBefore = prevEval?.pvs?.[0]?.mate ?? null;
    const mateAfter = afterEval?.pvs?.[0]?.mate ?? null;

    const legalMoves = generateLegalMoves(state);
    const isOnlyLegal = legalMoves.length === 1;

    // Check if this was the best move
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

          // Handle promotion comparison
          if (move.promotion && engineBestMove.promotion) {
            isBestMove = isBestMove && (move.promotion.toLowerCase() === engineBestMove.promotion.toLowerCase());
          }

          // Build best line string (SAN notation)
          if (prevEval.pvs[0].moves.length > 0) {
            let lineState = cloneState(state);
            const lineMoves = [];
            for (let j = 0; j < Math.min(7, prevEval.pvs[0].moves.length); j++) {
              const uciMove = prevEval.pvs[0].moves[j];
              const parsed = parseUCIMove(lineState, uciMove);
              if (!parsed) break;
              try {
                const san = moveToSAN(lineState, parsed);
                lineMoves.push(san);
                lineState = makeMove(lineState, parsed);
              } catch {
                break;
              }
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

    // Centipawn loss for accuracy
    let cpLoss;
    if (turnBefore === 'w') {
      cpLoss = Math.max(0, cpBefore - cpAfter);
    } else {
      cpLoss = Math.max(0, cpAfter - cpBefore);
    }

    if (classification !== 'book' && classification !== 'forced') {
      if (turnBefore === 'w') { whiteCpLossTotal += cpLoss; whiteMoveCount++; }
      else { blackCpLossTotal += cpLoss; blackMoveCount++; }
    }

    const openingName = isBook ? (moves._openingName || '') : '';

    const comment = generateComment(
      classification, move, cpBefore, cpAfter,
      isBestMove ? '' : bestMoveSAN, bestLineStr, state, openingName
    );

    // Build eval display and bar using the AFTER position eval
    const evalDisplay = formatEvalFromWhite(cpAfter, mateAfter, turnAfter);
    const barPct = afterEval ? evalToBarPercent(afterEval) : cpToBarPercent(cpAfter);

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
      evalDisplay,
      barPercent: barPct,
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

// Get raw cp from eval object (from the side-to-move's perspective)
function evalToCpRaw(evalObj) {
  if (!evalObj || !evalObj.pvs || evalObj.pvs.length === 0) return 0;
  const pv = evalObj.pvs[0];
  if (pv.mate !== null && pv.mate !== undefined) {
    return pv.mate > 0 ? 10000 - Math.abs(pv.mate) : -10000 + Math.abs(pv.mate);
  }
  return pv.cp || 0;
}

// Format eval from white's perspective for display
function formatEvalFromWhite(cpWhite, mateRaw, turn) {
  // If there's a mate, show it
  if (mateRaw !== null && mateRaw !== undefined) {
    // mateRaw is from side-to-move perspective
    // Convert to white perspective
    const mateWhite = turn === 'w' ? mateRaw : -mateRaw;
    const sign = mateWhite > 0 ? '+' : '-';
    return `${sign}M${Math.abs(mateRaw)}`;
  }
  const val = cpWhite / 100;
  if (val > 0) return `+${val.toFixed(1)}`;
  if (val === 0) return '0.0';
  return val.toFixed(1);
}

export {
  evalToCp, formatEval, evalToBarPercent, cpToBarPercent,
  CLASSIFICATIONS, classifyMove, calculateAccuracy,
  generateComment, analyzeGame, formatEvalCp, formatEvalFromWhite,
};
