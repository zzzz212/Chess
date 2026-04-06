import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { parseFEN, boardToFEN, PIECE_UNICODE, INITIAL_FEN, generateLegalMoves, sqName, fileOf, rankOf, FILES, RANKS } from './chessEngine';
import { parsePGN } from './chessEngine';
import { findOpening } from './openings';
import { analyzeGame, CLASSIFICATIONS, evalToBarPercent, formatEval, formatEvalCp } from './analysis';

// ============================================================
// CHESS ANALYZER - Full Chess.com-style game review
// ============================================================

const LIGHT_SQ = '#F0D9B5';
const DARK_SQ = '#B58863';
const HIGHLIGHT_COLOR = 'rgba(255, 255, 0, 0.4)';
const BOARD_SIZE = 480;

const SAMPLE_PGN = `[Event "Casual Game"]
[Site "Chess.com"]
[Date "2024.01.15"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. Nbd2 Bb7 12. Bc2 Re8 13. Nf1 Bf8 14. Ng3 g6 15. Bg5 h6 16. Bd2 Bg7 17. a4 c5 18. d5 c4 19. b4 Nh5 20. Nxh5 gxh5 21. g3 Nf6 22. Nh4 Qd7 23. Qf3 Nh7 24. Qxh5 Qg4 25. Qxg4 hxg4 26. Nf5 Bc8 27. Nxg7 Kxg7 28. f3 gxf3 29. Rf1 Be6 30. Rxf3 Rh8 31. Be3 Nf6 32. Raf1 Raf8 33. Bg5 Kg6 34. Bxf6 Rxf6 35. Rxf6+ Kxf6 36. Rf1+ Kg7 37. Rf2 Rh5 38. Kf1 a5 39. Ke2 axb4 40. cxb4 Bg4+ 41. hxg4 Rh2 42. Kd1 Rxf2 43. g5 Rf1+ 44. Kd2 f5 45. gxf6+ Kxf6 46. exf5 1-0`;

function ChessAnalyzer() {
  const [pgnInput, setPgnInput] = useState(SAMPLE_PGN);
  const [gameData, setGameData] = useState(null);
  const [currentMove, setCurrentMove] = useState(0);
  const [analysisData, setAnalysisData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const [flipped, setFlipped] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(1500);
  const [showInput, setShowInput] = useState(true);
  const moveListRef = useRef(null);
  const autoPlayRef = useRef(null);

  // Parse PGN
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

  // Run analysis
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
      alert('Ошибка анализа. Возможно, Lichess API недоступен.');
    }
    setAnalyzing(false);
  }, [gameData]);

  // Navigation
  const goToMove = useCallback((idx) => {
    if (!gameData) return;
    setCurrentMove(Math.max(0, Math.min(idx, gameData.moves.length)));
  }, [gameData]);

  const goFirst = () => goToMove(0);
  const goPrev = () => goToMove(currentMove - 1);
  const goNext = () => goToMove(currentMove + 1);
  const goLast = () => gameData && goToMove(gameData.moves.length);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (showInput) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      if (e.key === 'Home') { e.preventDefault(); goFirst(); }
      if (e.key === 'End') { e.preventDefault(); goLast(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // Auto-play
  useEffect(() => {
    if (autoPlay && gameData) {
      autoPlayRef.current = setInterval(() => {
        setCurrentMove(prev => {
          if (prev >= gameData.moves.length) {
            setAutoPlay(false);
            return prev;
          }
          return prev + 1;
        });
      }, autoPlaySpeed);
    }
    return () => clearInterval(autoPlayRef.current);
  }, [autoPlay, autoPlaySpeed, gameData]);

  // Scroll move list to current move
  useEffect(() => {
    if (moveListRef.current) {
      const active = moveListRef.current.querySelector('.move-active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentMove]);

  // Current position
  const currentPosition = useMemo(() => {
    if (!gameData) return parseFEN(INITIAL_FEN);
    return gameData.positions[currentMove]?.state || parseFEN(INITIAL_FEN);
  }, [gameData, currentMove]);

  const currentAnalysis = useMemo(() => {
    if (!analysisData || currentMove === 0) return null;
    return analysisData.moves[currentMove - 1];
  }, [analysisData, currentMove]);

  // Last move highlight
  const lastMove = useMemo(() => {
    if (!gameData || currentMove === 0) return null;
    const move = gameData.moves[currentMove - 1];
    return { from: move.from, to: move.to };
  }, [gameData, currentMove]);

  // Eval bar
  const barPercent = useMemo(() => {
    if (currentAnalysis) return currentAnalysis.barPercent;
    return 50;
  }, [currentAnalysis]);

  // Opening name
  const openingName = useMemo(() => {
    if (!gameData || !gameData.opening) return '';
    return `${gameData.opening.eco}: ${gameData.opening.name}`;
  }, [gameData]);

  // Move counts by classification
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
          <h1 className="text-3xl font-bold text-white mb-2 text-center">
            ♟ Chess Analyzer
          </h1>
          <p className="text-gray-400 text-center mb-6">
            Анализ шахматных партий в стиле Chess.com
          </p>

          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Вставьте PGN партии:
            </label>
            <textarea
              className="w-full h-64 bg-[#1e1c1a] text-gray-200 border border-[#3d3a37] rounded-lg p-4 font-mono text-sm resize-none focus:outline-none focus:border-[#81b64c]"
              value={pgnInput}
              onChange={e => setPgnInput(e.target.value)}
              placeholder="1. e4 e5 2. Nf3 Nc6..."
              spellCheck={false}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={loadGame}
              className="flex-1 bg-[#81b64c] hover:bg-[#6fa33e] text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors cursor-pointer"
            >
              Загрузить партию
            </button>
            <button
              onClick={() => { setPgnInput(SAMPLE_PGN); }}
              className="bg-[#3d3a37] hover:bg-[#4d4a47] text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer"
            >
              Пример
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- MAIN ANALYSIS SCREEN ----
  return (
    <div className="min-h-screen bg-[#312e2b] text-white">
      {/* Header */}
      <div className="bg-[#272522] border-b border-[#3d3a37] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">♟ Chess Analyzer</h1>
          {openingName && (
            <span className="text-sm text-gray-400 hidden md:inline">{openingName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!analysisData && !analyzing && (
            <button
              onClick={runAnalysis}
              className="bg-[#81b64c] hover:bg-[#6fa33e] text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
            >
              Анализировать
            </button>
          )}
          {analyzing && (
            <div className="text-sm text-gray-400">
              Анализ... {analysisProgress.current}/{analysisProgress.total}
              <div className="w-32 h-1 bg-[#3d3a37] rounded mt-1">
                <div
                  className="h-1 bg-[#81b64c] rounded transition-all"
                  style={{ width: `${(analysisProgress.current / Math.max(1, analysisProgress.total)) * 100}%` }}
                />
              </div>
            </div>
          )}
          <button
            onClick={() => { setShowInput(true); setGameData(null); setAnalysisData(null); }}
            className="bg-[#3d3a37] hover:bg-[#4d4a47] text-gray-300 py-2 px-3 rounded-lg text-sm transition-colors cursor-pointer"
          >
            Новая партия
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 max-w-[1400px] mx-auto">
        {/* Left: Eval Bar + Board */}
        <div className="flex gap-2 justify-center">
          {/* Eval bar */}
          <div className="w-8 flex-shrink-0 hidden sm:block">
            <EvalBar percent={barPercent} eval={currentAnalysis?.evalDisplay || '0.0'} />
          </div>

          {/* Board */}
          <div className="flex-shrink-0">
            <ChessBoard
              position={currentPosition}
              flipped={flipped}
              lastMove={lastMove}
              classification={currentAnalysis?.classification}
              classColor={currentAnalysis?.classInfo?.color}
            />
            {/* Controls under board */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-1">
                <NavButton onClick={goFirst} title="В начало">⏮</NavButton>
                <NavButton onClick={goPrev} title="Назад">◀</NavButton>
                <NavButton onClick={goNext} title="Вперёд">▶</NavButton>
                <NavButton onClick={goLast} title="В конец">⏭</NavButton>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoPlay(!autoPlay)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors cursor-pointer ${
                    autoPlay ? 'bg-[#ca3431] text-white' : 'bg-[#3d3a37] text-gray-300 hover:bg-[#4d4a47]'
                  }`}
                >
                  {autoPlay ? '⏸' : '▶ Авто'}
                </button>
                <button
                  onClick={() => setFlipped(!flipped)}
                  className="bg-[#3d3a37] text-gray-300 hover:bg-[#4d4a47] px-3 py-1 rounded text-sm transition-colors cursor-pointer"
                >
                  🔄
                </button>
              </div>
            </div>
            {/* Mobile eval display */}
            <div className="sm:hidden text-center mt-1 text-lg font-mono">
              {currentAnalysis?.evalDisplay || '0.0'}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 max-w-md">
          {/* Players */}
          <div className="bg-[#272522] rounded-lg p-3">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-white inline-block" />
                <span className="font-medium">{gameData?.headers?.White || 'White'}</span>
                {analysisData && (
                  <span className="text-[#81b64c] font-bold ml-1">
                    {analysisData.whiteAccuracy.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {analysisData && (
                  <span className="text-[#81b64c] font-bold mr-1">
                    {analysisData.blackAccuracy.toFixed(1)}%
                  </span>
                )}
                <span className="font-medium">{gameData?.headers?.Black || 'Black'}</span>
                <span className="w-3 h-3 rounded-full bg-[#1e1c1a] border border-gray-500 inline-block" />
              </div>
            </div>
          </div>

          {/* Move list */}
          <div
            ref={moveListRef}
            className="bg-[#272522] rounded-lg p-3 overflow-y-auto flex-1"
            style={{ maxHeight: '240px' }}
          >
            <MoveList
              moves={gameData?.moves || []}
              currentMove={currentMove}
              onSelectMove={goToMove}
              analysisData={analysisData}
            />
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

// ============================================================
// SUB-COMPONENTS
// ============================================================

function NavButton({ onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="bg-[#3d3a37] hover:bg-[#4d4a47] text-white w-10 h-8 rounded flex items-center justify-center text-lg transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}

// ---- CHESS BOARD ----
function ChessBoard({ position, flipped, lastMove, classification, classColor }) {
  const board = position.board;

  const rows = [];
  for (let r = 0; r < 8; r++) {
    const rank = flipped ? r : 7 - r;
    const cells = [];
    for (let c = 0; c < 8; c++) {
      const file = flipped ? 7 - c : c;
      const sq = rank * 8 + file;
      const isLight = (rank + file) % 2 === 0;
      const piece = board[sq];

      let bg = isLight ? LIGHT_SQ : DARK_SQ;
      let highlight = false;

      if (lastMove && (sq === lastMove.from || sq === lastMove.to)) {
        highlight = true;
      }

      cells.push(
        <div
          key={sq}
          className="relative flex items-center justify-center select-none"
          style={{
            width: '12.5%',
            paddingBottom: '12.5%',
            background: highlight
              ? `linear-gradient(${HIGHLIGHT_COLOR}, ${HIGHLIGHT_COLOR}), ${bg}`
              : bg,
          }}
        >
          {/* Piece */}
          {piece && (
            <span
              className="absolute inset-0 flex items-center justify-center"
              style={{ fontSize: 'min(5.5vw, 44px)', lineHeight: 1, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
            >
              {PIECE_UNICODE[piece]}
            </span>
          )}
          {/* Coordinates */}
          {c === 0 && (
            <span
              className="absolute top-0.5 left-0.5 text-[10px] font-bold leading-none"
              style={{ color: isLight ? DARK_SQ : LIGHT_SQ }}
            >
              {RANKS[rank]}
            </span>
          )}
          {r === 7 && (
            <span
              className="absolute bottom-0.5 right-1 text-[10px] font-bold leading-none"
              style={{ color: isLight ? DARK_SQ : LIGHT_SQ }}
            >
              {FILES[file]}
            </span>
          )}
        </div>
      );
    }
    rows.push(
      <div key={rank} className="flex">
        {cells}
      </div>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden shadow-lg border-2 border-[#1a1816]"
      style={{ width: '100%', maxWidth: `${BOARD_SIZE}px`, aspectRatio: '1/1' }}
    >
      {rows}
    </div>
  );
}

// ---- EVAL BAR ----
function EvalBar({ percent, eval: evalStr }) {
  const whiteHeight = `${percent}%`;
  const isWhiteAdvantage = percent > 50;

  return (
    <div className="h-full rounded-md overflow-hidden flex flex-col relative bg-[#1e1c1a] border border-[#3d3a37]"
      style={{ minHeight: `${BOARD_SIZE}px` }}>
      {/* Black section (top) */}
      <div
        className="bg-[#1e1c1a] transition-all duration-500 flex items-start justify-center"
        style={{ height: `${100 - percent}%` }}
      >
        {!isWhiteAdvantage && (
          <span className="text-white text-[10px] font-bold mt-1 leading-none">
            {evalStr}
          </span>
        )}
      </div>
      {/* White section (bottom) */}
      <div
        className="bg-[#e8e6e1] transition-all duration-500 flex items-end justify-center"
        style={{ height: whiteHeight }}
      >
        {isWhiteAdvantage && (
          <span className="text-[#1e1c1a] text-[10px] font-bold mb-1 leading-none">
            {evalStr}
          </span>
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
    const whiteMove = moves[i];
    const blackMove = i + 1 < moves.length ? moves[i + 1] : null;
    const whiteAnalysis = analysisData?.moves[i];
    const blackAnalysis = analysisData?.moves[i + 1];

    rows.push(
      <div key={moveNum} className="flex items-center gap-0 text-sm">
        <span className="text-gray-500 w-8 text-right mr-2 flex-shrink-0 font-mono text-xs">
          {moveNum}.
        </span>
        <MoveCell
          san={whiteMove.san}
          active={currentMove === i + 1}
          analysis={whiteAnalysis}
          onClick={() => onSelectMove(i + 1)}
        />
        {blackMove ? (
          <MoveCell
            san={blackMove.san}
            active={currentMove === i + 2}
            analysis={blackAnalysis}
            onClick={() => onSelectMove(i + 2)}
          />
        ) : (
          <span className="flex-1" />
        )}
      </div>
    );
  }

  return <div className="space-y-0.5">{rows}</div>;
}

function MoveCell({ san, active, analysis, onClick }) {
  const classInfo = analysis?.classInfo;
  let bgClass = 'hover:bg-[#3d3a37]';
  if (active) bgClass = 'bg-[#4d4a47]';

  return (
    <button
      onClick={onClick}
      className={`flex-1 text-left px-2 py-1 rounded cursor-pointer transition-colors font-mono text-sm flex items-center gap-1 ${bgClass} ${active ? 'move-active font-bold' : ''}`}
    >
      {classInfo && classInfo.emoji && analysis.classification !== 'best' && analysis.classification !== 'excellent' && analysis.classification !== 'good' && analysis.classification !== 'forced' && (
        <span className="text-xs" title={classInfo.label}>{classInfo.emoji}</span>
      )}
      <span style={classInfo ? { color: classInfo.color } : undefined}>{san}</span>
      {classInfo && classInfo.symbol && (
        <span className="text-xs" style={{ color: classInfo.color }}>{classInfo.symbol}</span>
      )}
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
      {/* Move + classification */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-lg font-bold font-mono">{moveLabel}</span>
        <span
          className="px-2 py-0.5 rounded text-sm font-bold"
          style={{ backgroundColor: classInfo.color + '22', color: classInfo.color }}
        >
          {classInfo.emoji} {classInfo.label} {classInfo.symbol}
        </span>
        <span className="ml-auto font-mono text-gray-400">{evalDisplay}</span>
      </div>

      {/* Comment */}
      {comment && (
        <p className="text-sm text-gray-300 mb-2">{comment}</p>
      )}

      {/* Best move */}
      {bestMoveSAN && (
        <div className="text-sm text-gray-400">
          <span className="text-gray-500">Лучший ход: </span>
          <span className="text-[#96BC4B] font-mono font-bold">{bestMoveSAN}</span>
        </div>
      )}

      {/* Best line */}
      {bestLine && (
        <div className="text-sm text-gray-400 mt-1">
          <span className="text-gray-500">Линия: </span>
          <span className="font-mono">{bestLine}</span>
        </div>
      )}

      {/* Centipawn loss */}
      {cpLoss > 0 && classification !== 'book' && classification !== 'forced' && (
        <div className="text-xs text-gray-500 mt-1">
          Потеря: {cpLoss.toFixed(0)} cp
        </div>
      )}
    </div>
  );
}

// ---- STATS PANEL ----
function StatsPanel({ counts }) {
  const categories = [
    ['brilliant', '💎'],
    ['great', '🌟'],
    ['best', '✅'],
    ['excellent', '👍'],
    ['good', '👌'],
    ['book', '📖'],
    ['inaccuracy', '⚠️'],
    ['mistake', '❓'],
    ['blunder', '❌'],
    ['missedWin', '💀'],
  ];

  return (
    <div>
      <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Статистика ходов</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0">
        <div className="text-xs text-gray-400 font-medium mb-1">Белые</div>
        <div className="text-xs text-gray-400 font-medium mb-1">Чёрные</div>
        {categories.map(([key, emoji]) => {
          const w = counts.white[key] || 0;
          const b = counts.black[key] || 0;
          if (w === 0 && b === 0) return null;
          const info = CLASSIFICATIONS[key];
          return (
            <div key={key} className="contents">
              <div className="flex items-center gap-1 text-xs py-0.5">
                <span>{emoji}</span>
                <span style={{ color: info.color }}>{info.label}</span>
                <span className="ml-auto font-bold">{w}</span>
              </div>
              <div className="flex items-center gap-1 text-xs py-0.5">
                <span>{emoji}</span>
                <span style={{ color: info.color }}>{info.label}</span>
                <span className="ml-auto font-bold">{b}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ChessAnalyzer;
