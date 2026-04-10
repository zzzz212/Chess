import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { parseFEN, INITIAL_FEN, generateLegalMoves, fileOf, rankOf, FILES, RANKS } from './chessEngine';
import { parsePGN } from './chessEngine';
import { findOpening } from './openings';
import { analyzeGame, CLASSIFICATIONS, evalToBarPercent, cpToBarPercent } from './analysis';
import PieceSVG from './PieceSVG';

const LIGHT_SQ = '#F0D9B5';
const DARK_SQ = '#B58863';
const HIGHLIGHT_FROM = 'rgba(255, 255, 50, 0.42)';
const HIGHLIGHT_TO = 'rgba(255, 255, 50, 0.42)';

const SAMPLE_PGN = `[Event "Casual Game"]
[Site "Chess.com"]
[Date "2024.01.15"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. Nbd2 Bb7 12. Bc2 Re8 13. Nf1 Bf8 14. Ng3 g6 15. Bg5 h6 16. Bd2 Bg7 17. a4 c5 18. d5 c4 19. b4 Nh5 20. Nxh5 gxh5 21. g3 Nf6 22. Nh4 Qd7 23. Qf3 Nh7 24. Qxh5 Qg4 25. Qxg4 hxg4 26. Nf5 Bc8 27. Nxg7 Kxg7 28. f3 gxf3 29. Rf1 Be6 30. Rxf3 Rh8 31. Be3 Nf6 32. Raf1 Raf8 33. Bg5 Kg6 34. Bxf6 Rxf6 35. Rxf6+ Kxf6 36. Rf1+ Kg7 37. Rf2 Rh5 38. Kf1 a5 39. Ke2 axb4 40. cxb4 Bg4+ 41. hxg4 Rh2 42. Kd1 Rxf2 43. g5 Rf1+ 44. Kd2 f5 45. gxf6+ Kxf6 46. exf5 1-0`;

export default function ChessAnalyzer() {
  const [pgnInput, setPgnInput] = useState(SAMPLE_PGN);
  const [gameData, setGameData] = useState(null);
  const [currentMove, setCurrentMove] = useState(0);
  const [analysisData, setAnalysisData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const [flipped, setFlipped] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoPlaySpeed] = useState(1500);
  const [showInput, setShowInput] = useState(true);
  const moveListRef = useRef(null);
  const autoPlayRef = useRef(null);

  const loadGame = useCallback(() => {
    try {
      const data = parsePGN(pgnInput);
      if (data.moves.length === 0) {
        alert('Не удалось распарсить PGN. Проверьте формат.');
        return;
      }
      const opening = findOpening(data.moves);
      data.opening = opening;
      data.moves._openingName = opening?.name || '';
      setGameData(data);
      setCurrentMove(0);
      setAnalysisData(null);
      setShowInput(false);
    } catch (e) {
      alert('Ошибка парсинга PGN: ' + e.message);
    }
  }, [pgnInput]);

  const runAnalysis = useCallback(async () => {
    if (!gameData) return;
    setAnalyzing(true);
    setAnalysisProgress({ current: 0, total: gameData.positions.length });
    try {
      const result = await analyzeGame(
        gameData.moves,
        gameData.positions,
        (current, total) => setAnalysisProgress({ current, total })
      );
      setAnalysisData(result);
    } catch (e) {
      console.error('Analysis error:', e);
      alert('Ошибка анализа: ' + e.message);
    }
    setAnalyzing(false);
  }, [gameData]);

  const goToMove = useCallback((idx) => {
    if (!gameData) return;
    setCurrentMove(Math.max(0, Math.min(idx, gameData.moves.length)));
  }, [gameData]);

  const goFirst = useCallback(() => goToMove(0), [goToMove]);
  const goPrev = useCallback(() => setCurrentMove(p => Math.max(0, p - 1)), []);
  const goNext = useCallback(() => {
    if (!gameData) return;
    setCurrentMove(p => Math.min(gameData.moves.length, p + 1));
  }, [gameData]);
  const goLast = useCallback(() => gameData && goToMove(gameData.moves.length), [gameData, goToMove]);

  useEffect(() => {
    const handler = (e) => {
      if (showInput) return;
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      if (e.key === 'Home') { e.preventDefault(); goFirst(); }
      if (e.key === 'End') { e.preventDefault(); goLast(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showInput, goPrev, goNext, goFirst, goLast]);

  useEffect(() => {
    if (autoPlay && gameData) {
      autoPlayRef.current = setInterval(() => {
        setCurrentMove(prev => {
          if (prev >= gameData.moves.length) { setAutoPlay(false); return prev; }
          return prev + 1;
        });
      }, autoPlaySpeed);
    }
    return () => clearInterval(autoPlayRef.current);
  }, [autoPlay, autoPlaySpeed, gameData]);

  useEffect(() => {
    if (moveListRef.current) {
      const el = moveListRef.current.querySelector('.move-active');
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentMove]);

  const currentPosition = useMemo(() => {
    if (!gameData) return parseFEN(INITIAL_FEN);
    return gameData.positions[currentMove]?.state || parseFEN(INITIAL_FEN);
  }, [gameData, currentMove]);

  const currentAnalysis = useMemo(() => {
    if (!analysisData || currentMove === 0) return null;
    return analysisData.moves[currentMove - 1];
  }, [analysisData, currentMove]);

  const lastMove = useMemo(() => {
    if (!gameData || currentMove === 0) return null;
    const m = gameData.moves[currentMove - 1];
    return { from: m.from, to: m.to };
  }, [gameData, currentMove]);

  // Eval bar percent — use initial eval for position 0
  const barPercent = useMemo(() => {
    if (!analysisData) return 50;
    if (currentMove === 0) {
      // Starting position
      if (analysisData.evalResults && analysisData.evalResults[0]) {
        return evalToBarPercent(analysisData.evalResults[0]);
      }
      return 50;
    }
    return currentAnalysis?.barPercent ?? 50;
  }, [analysisData, currentMove, currentAnalysis]);

  // Eval display text
  const evalDisplay = useMemo(() => {
    if (!analysisData) return '0.0';
    if (currentMove === 0) {
      return '+0.2'; // typical starting eval
    }
    return currentAnalysis?.evalDisplay || '0.0';
  }, [analysisData, currentMove, currentAnalysis]);

  const openingName = useMemo(() => {
    if (!gameData?.opening) return '';
    return `${gameData.opening.eco}: ${gameData.opening.name}`;
  }, [gameData]);

  const moveCounts = useMemo(() => {
    if (!analysisData) return null;
    const counts = { white: {}, black: {} };
    for (const m of analysisData.moves) {
      const side = m.moveIndex % 2 === 0 ? 'white' : 'black';
      counts[side][m.classification] = (counts[side][m.classification] || 0) + 1;
    }
    return counts;
  }, [analysisData]);

  // ---- INPUT SCREEN ----
  if (showInput) {
    return (
      <div className="min-h-screen bg-[#312e2b] flex items-center justify-center p-4">
        <div className="bg-[#272522] rounded-xl shadow-2xl w-full max-w-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">&#9823; Chess Analyzer</h1>
          <p className="text-gray-400 text-center mb-6">
            Анализ шахматных партий — Stockfish 18 WASM в браузере
          </p>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">Вставьте PGN партии:</label>
            <textarea
              className="w-full h-64 bg-[#1e1c1a] text-gray-200 border border-[#3d3a37] rounded-lg p-4 font-mono text-sm resize-none focus:outline-none focus:border-[#81b64c]"
              value={pgnInput}
              onChange={e => setPgnInput(e.target.value)}
              placeholder="1. e4 e5 2. Nf3 Nc6..."
              spellCheck={false}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={loadGame} className="flex-1 bg-[#81b64c] hover:bg-[#6fa33e] text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors cursor-pointer">
              Загрузить партию
            </button>
            <button onClick={() => setPgnInput(SAMPLE_PGN)} className="bg-[#3d3a37] hover:bg-[#4d4a47] text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer">
              Пример
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- MAIN SCREEN ----
  return (
    <div className="min-h-screen bg-[#312e2b] text-white">
      {/* Header */}
      <div className="bg-[#272522] border-b border-[#3d3a37] px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">&#9823; Chess Analyzer</h1>
          {openingName && <span className="text-sm text-gray-400 hidden md:inline">{openingName}</span>}
        </div>
        <div className="flex items-center gap-2">
          {!analysisData && !analyzing && (
            <button onClick={runAnalysis} className="bg-[#81b64c] hover:bg-[#6fa33e] text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer">
              &#9881; Анализировать (Stockfish 18)
            </button>
          )}
          {analyzing && (
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <span>Stockfish анализирует... {analysisProgress.current}/{analysisProgress.total}</span>
              <div className="w-32 h-2 bg-[#3d3a37] rounded overflow-hidden">
                <div className="h-2 bg-[#81b64c] rounded transition-all duration-300" style={{ width: `${(analysisProgress.current / Math.max(1, analysisProgress.total)) * 100}%` }} />
              </div>
            </div>
          )}
          {analysisData && (
            <span className="text-xs text-gray-500">Stockfish 18 &middot; depth 18</span>
          )}
          <button onClick={() => { setShowInput(true); setGameData(null); setAnalysisData(null); }} className="bg-[#3d3a37] hover:bg-[#4d4a47] text-gray-300 py-2 px-3 rounded-lg text-sm transition-colors cursor-pointer">
            Новая
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 max-w-[1400px] mx-auto">
        {/* Left: Eval bar + Board */}
        <div className="flex gap-2 justify-center items-start">
          {/* Eval bar */}
          <div className="w-8 flex-shrink-0 hidden sm:flex flex-col" style={{ height: '480px' }}>
            <EvalBar percent={barPercent} evalText={evalDisplay} />
          </div>

          {/* Board + controls */}
          <div className="flex-shrink-0" style={{ width: '480px', maxWidth: '90vw' }}>
            <ChessBoard
              position={currentPosition}
              flipped={flipped}
              lastMove={lastMove}
              currentAnalysis={currentAnalysis}
            />
            {/* Controls */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-1">
                <NavBtn onClick={goFirst}>&#9198;</NavBtn>
                <NavBtn onClick={goPrev}>&#9664;</NavBtn>
                <NavBtn onClick={goNext}>&#9654;</NavBtn>
                <NavBtn onClick={goLast}>&#9197;</NavBtn>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setAutoPlay(!autoPlay)} className={`px-3 py-1 rounded text-sm font-medium transition-colors cursor-pointer ${autoPlay ? 'bg-[#ca3431] text-white' : 'bg-[#3d3a37] text-gray-300 hover:bg-[#4d4a47]'}`}>
                  {autoPlay ? '&#9209;' : '&#9654; Авто'}
                </button>
                <button onClick={() => setFlipped(!flipped)} className="bg-[#3d3a37] text-gray-300 hover:bg-[#4d4a47] px-3 py-1 rounded text-sm transition-colors cursor-pointer">
                  &#128260;
                </button>
              </div>
            </div>
            {/* Mobile eval */}
            <div className="sm:hidden text-center mt-1 text-lg font-mono font-bold">{evalDisplay}</div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 lg:max-w-md">
          {/* Players + accuracy */}
          <div className="bg-[#272522] rounded-lg p-3">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm bg-white inline-block border border-gray-300" />
                <span className="font-medium">{gameData?.headers?.White || 'White'}</span>
                {analysisData && <span className="text-[#81b64c] font-bold ml-1">{analysisData.whiteAccuracy.toFixed(1)}%</span>}
              </div>
              <div className="flex items-center gap-2">
                {analysisData && <span className="text-[#81b64c] font-bold mr-1">{analysisData.blackAccuracy.toFixed(1)}%</span>}
                <span className="font-medium">{gameData?.headers?.Black || 'Black'}</span>
                <span className="w-4 h-4 rounded-sm bg-[#333] inline-block border border-gray-600" />
              </div>
            </div>
          </div>

          {/* Move list */}
          <div ref={moveListRef} className="bg-[#272522] rounded-lg p-3 overflow-y-auto" style={{ maxHeight: '260px' }}>
            <MoveList moves={gameData?.moves || []} currentMove={currentMove} onSelectMove={goToMove} analysisData={analysisData} />
          </div>

          {/* Analysis panel */}
          {currentAnalysis && (
            <div className="bg-[#272522] rounded-lg p-4">
              <AnalysisPanel analysis={currentAnalysis} moveNumber={currentMove} />
            </div>
          )}

          {/* Stats */}
          {analysisData && moveCounts && (
            <div className="bg-[#272522] rounded-lg p-3">
              <StatsPanel counts={moveCounts} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- NAV BUTTON ----
function NavBtn({ onClick, children }) {
  return (
    <button onClick={onClick} className="bg-[#3d3a37] hover:bg-[#4d4a47] text-white w-10 h-8 rounded flex items-center justify-center text-lg transition-colors cursor-pointer">
      {children}
    </button>
  );
}

// ---- CHESS BOARD with SVG pieces + classification emoji overlay ----
function ChessBoard({ position, flipped, lastMove, currentAnalysis }) {
  const board = position.board;
  const classEmoji = currentAnalysis?.classInfo?.emoji;
  const classification = currentAnalysis?.classification;
  // Only show emoji for notable classifications
  const showEmoji = classification && !['best', 'excellent', 'good', 'forced', 'book'].includes(classification);
  const emojiTarget = lastMove?.to; // show on destination square

  const rows = [];
  for (let r = 0; r < 8; r++) {
    const rank = flipped ? r : 7 - r;
    const cells = [];
    for (let c = 0; c < 8; c++) {
      const file = flipped ? 7 - c : c;
      const sqIdx = rank * 8 + file;
      const isLight = (rank + file) % 2 === 0;
      const piece = board[sqIdx];
      const bg = isLight ? LIGHT_SQ : DARK_SQ;
      const isHighlighted = lastMove && (sqIdx === lastMove.from || sqIdx === lastMove.to);
      const isEmojiSquare = showEmoji && sqIdx === emojiTarget;

      cells.push(
        <div
          key={sqIdx}
          className="relative select-none"
          style={{
            width: '12.5%',
            paddingBottom: '12.5%',
            background: isHighlighted ? `linear-gradient(${HIGHLIGHT_FROM}, ${HIGHLIGHT_TO}), ${bg}` : bg,
          }}
        >
          {/* Piece */}
          {piece && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 1 }}>
              <PieceSVG piece={piece} size={52} />
            </div>
          )}

          {/* Classification emoji overlay */}
          {isEmojiSquare && (
            <div
              className="absolute flex items-center justify-center pointer-events-none"
              style={{
                top: '-8px',
                right: '-4px',
                zIndex: 10,
                fontSize: '20px',
                background: currentAnalysis?.classInfo?.color || '#333',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                border: '2px solid rgba(0,0,0,0.5)',
                lineHeight: 1,
              }}
            >
              <span style={{ fontSize: '14px' }}>{classEmoji}</span>
            </div>
          )}

          {/* Rank label (left edge) */}
          {c === 0 && (
            <span className="absolute top-0.5 left-1 text-[10px] font-bold leading-none pointer-events-none" style={{ color: isLight ? DARK_SQ : LIGHT_SQ, zIndex: 2 }}>
              {RANKS[rank]}
            </span>
          )}
          {/* File label (bottom edge) */}
          {r === 7 && (
            <span className="absolute bottom-0.5 right-1 text-[10px] font-bold leading-none pointer-events-none" style={{ color: isLight ? DARK_SQ : LIGHT_SQ, zIndex: 2 }}>
              {FILES[file]}
            </span>
          )}
        </div>
      );
    }
    rows.push(<div key={rank} className="flex">{cells}</div>);
  }

  return (
    <div className="rounded-lg overflow-hidden shadow-lg border-2 border-[#1a1816]" style={{ width: '100%', aspectRatio: '1/1' }}>
      {rows}
    </div>
  );
}

// ---- EVAL BAR (vertical, fixed) ----
function EvalBar({ percent, evalText }) {
  // percent: 0 = black winning, 100 = white winning
  const clamped = Math.max(2, Math.min(98, percent));
  const isWhiteAdv = clamped >= 50;
  const isEqual = Math.abs(clamped - 50) < 2;

  return (
    <div className="w-full h-full rounded overflow-hidden flex flex-col bg-[#333] border border-[#555] relative">
      {/* Black (top) */}
      <div
        className="bg-[#403d39] flex items-start justify-center transition-all duration-700 ease-in-out relative"
        style={{ height: `${100 - clamped}%` }}
      >
        {!isWhiteAdv && !isEqual && (
          <span className="text-white text-[11px] font-bold mt-1.5 drop-shadow">{evalText}</span>
        )}
      </div>
      {/* White (bottom) */}
      <div
        className="bg-[#e8e6e1] flex items-end justify-center transition-all duration-700 ease-in-out relative"
        style={{ height: `${clamped}%` }}
      >
        {(isWhiteAdv || isEqual) && (
          <span className="text-[#333] text-[11px] font-bold mb-1.5">{evalText}</span>
        )}
      </div>
    </div>
  );
}

// ---- MOVE LIST ----
function MoveList({ moves, currentMove, onSelectMove, analysisData }) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const wMove = moves[i];
    const bMove = i + 1 < moves.length ? moves[i + 1] : null;
    const wAn = analysisData?.moves[i];
    const bAn = analysisData?.moves[i + 1];

    rows.push(
      <div key={moveNum} className="flex items-center gap-0 text-sm">
        <span className="text-gray-500 w-8 text-right mr-1 flex-shrink-0 font-mono text-xs">{moveNum}.</span>
        <MoveCell san={wMove.san} active={currentMove === i + 1} analysis={wAn} onClick={() => onSelectMove(i + 1)} />
        {bMove ? (
          <MoveCell san={bMove.san} active={currentMove === i + 2} analysis={bAn} onClick={() => onSelectMove(i + 2)} />
        ) : <span className="flex-1" />}
      </div>
    );
  }
  return <div className="space-y-0.5">{rows}</div>;
}

function MoveCell({ san, active, analysis, onClick }) {
  const ci = analysis?.classInfo;
  const cls = analysis?.classification;
  const showEmoji = ci && cls && !['best', 'excellent', 'good', 'forced'].includes(cls);

  return (
    <button
      onClick={onClick}
      className={`flex-1 text-left px-2 py-1 rounded cursor-pointer transition-colors font-mono text-sm flex items-center gap-1 ${active ? 'bg-[#4d4a47] move-active font-bold' : 'hover:bg-[#3d3a37]'}`}
    >
      {showEmoji && <span className="text-xs">{ci.emoji}</span>}
      <span style={ci ? { color: ci.color } : undefined}>{san}</span>
      {ci?.symbol && <span className="text-xs opacity-70" style={{ color: ci.color }}>{ci.symbol}</span>}
    </button>
  );
}

// ---- ANALYSIS PANEL ----
function AnalysisPanel({ analysis, moveNumber }) {
  const { classification, classInfo, san, evalDisplay, cpLoss, bestMoveSAN, bestLine, comment } = analysis;
  const moveNum = Math.ceil(moveNumber / 2);
  const isWhite = (moveNumber - 1) % 2 === 0;
  const moveLabel = `${moveNum}.${isWhite ? '' : '..'} ${san}`;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <span className="text-lg font-bold font-mono">{moveLabel}</span>
        <span className="px-2 py-0.5 rounded text-sm font-bold" style={{ backgroundColor: classInfo.color + '22', color: classInfo.color }}>
          {classInfo.emoji} {classInfo.label} {classInfo.symbol}
        </span>
        <span className="ml-auto font-mono text-gray-400 text-sm">{evalDisplay}</span>
      </div>
      {comment && <p className="text-sm text-gray-300 mb-2 leading-relaxed">{comment}</p>}
      {bestMoveSAN && (
        <div className="text-sm text-gray-400">
          <span className="text-gray-500">Лучший ход: </span>
          <span className="text-[#96BC4B] font-mono font-bold">{bestMoveSAN}</span>
        </div>
      )}
      {bestLine && (
        <div className="text-sm text-gray-400 mt-1">
          <span className="text-gray-500">Линия: </span>
          <span className="font-mono text-gray-300">{bestLine}</span>
        </div>
      )}
      {cpLoss > 0 && classification !== 'book' && classification !== 'forced' && (
        <div className="text-xs text-gray-500 mt-1.5">Потеря: {cpLoss.toFixed(0)} cp</div>
      )}
    </div>
  );
}

// ---- STATS PANEL ----
function StatsPanel({ counts }) {
  const cats = [
    ['brilliant', '💎'], ['great', '🌟'], ['best', '✅'], ['excellent', '👍'], ['good', '👌'],
    ['book', '📖'], ['inaccuracy', '⚠️'], ['mistake', '❓'], ['blunder', '❌'], ['missedWin', '💀'],
  ];

  return (
    <div>
      <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Статистика ходов</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0">
        <div className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-white inline-block" /> Белые
        </div>
        <div className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-[#333] inline-block border border-gray-600" /> Чёрные
        </div>
        {cats.map(([key, emoji]) => {
          const w = counts.white[key] || 0;
          const b = counts.black[key] || 0;
          if (w === 0 && b === 0) return null;
          const info = CLASSIFICATIONS[key];
          return (
            <div key={key} className="contents">
              <div className="flex items-center gap-1.5 text-xs py-0.5">
                <span>{emoji}</span>
                <span style={{ color: info.color }}>{info.label}</span>
                <span className="ml-auto font-bold text-white">{w}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs py-0.5">
                <span>{emoji}</span>
                <span style={{ color: info.color }}>{info.label}</span>
                <span className="ml-auto font-bold text-white">{b}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
