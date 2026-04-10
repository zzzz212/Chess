// ============================================================
// STOCKFISH WEB WORKER WRAPPER
// Loads Stockfish 16 WASM from CDN (no large local files)
// ============================================================

// CDN URL for stockfish.js (single-threaded WASM build, ~2MB)
const STOCKFISH_CDN = 'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js';

let engine = null;
let isReady = false;
let messageQueue = [];
let resolveReady = null;
let currentResolve = null;
let currentLines = [];

function createStockfish() {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(STOCKFISH_CDN);

      worker.onmessage = (e) => {
        const line = typeof e.data === 'string' ? e.data : e.data?.data || '';
        handleMessage(line);
      };

      worker.onerror = (e) => {
        console.error('Stockfish worker error:', e);
        reject(e);
      };

      engine = worker;
      resolveReady = resolve;

      // Initialize
      sendCommand('uci');
    } catch (err) {
      reject(err);
    }
  });
}

function handleMessage(line) {
  if (line === 'uciok') {
    sendCommand('isready');
    return;
  }

  if (line === 'readyok') {
    if (!isReady) {
      isReady = true;
      if (resolveReady) {
        resolveReady();
        resolveReady = null;
      }
    }
    // Process queued messages
    if (messageQueue.length > 0) {
      const next = messageQueue.shift();
      next();
    }
    return;
  }

  // Collect info lines for analysis
  if (currentResolve) {
    currentLines.push(line);
    if (line.startsWith('bestmove')) {
      const resolve = currentResolve;
      const lines = [...currentLines];
      currentResolve = null;
      currentLines = [];
      resolve(lines);
    }
  }
}

function sendCommand(cmd) {
  if (engine) {
    engine.postMessage(cmd);
  }
}

// Analyze a position - returns parsed eval info
async function analyzePosition(fen, depth = 20, multiPv = 3) {
  if (!engine || !isReady) {
    await createStockfish();
  }

  return new Promise((resolve) => {
    const doAnalysis = () => {
      currentLines = [];
      currentResolve = (lines) => {
        const result = parseStockfishOutput(lines, multiPv);
        resolve(result);
      };

      sendCommand('ucinewgame');
      sendCommand(`setoption name MultiPV value ${multiPv}`);
      sendCommand(`setoption name Hash value 32`);
      sendCommand(`position fen ${fen}`);
      sendCommand(`go depth ${depth}`);
    };

    if (isReady) {
      doAnalysis();
    } else {
      messageQueue.push(doAnalysis);
    }
  });
}

// Parse Stockfish UCI output into structured data
function parseStockfishOutput(lines, multiPv) {
  const pvData = new Map(); // pvIndex -> best info line

  for (const line of lines) {
    if (!line.startsWith('info') || !line.includes(' pv ')) continue;

    const depthMatch = line.match(/depth (\d+)/);
    const pvIdxMatch = line.match(/multipv (\d+)/);
    const cpMatch = line.match(/score cp (-?\d+)/);
    const mateMatch = line.match(/score mate (-?\d+)/);
    const pvMatch = line.match(/ pv (.+)/);

    if (!pvMatch) continue;

    const depth = depthMatch ? parseInt(depthMatch[1]) : 0;
    const pvIdx = pvIdxMatch ? parseInt(pvIdxMatch[1]) : 1;
    const moves = pvMatch[1].trim().split(/\s+/);

    const info = {
      depth,
      pvIndex: pvIdx,
      cp: cpMatch ? parseInt(cpMatch[1]) : null,
      mate: mateMatch ? parseInt(mateMatch[1]) : null,
      moves,
    };

    // Keep the deepest info for each PV
    const existing = pvData.get(pvIdx);
    if (!existing || depth >= existing.depth) {
      pvData.set(pvIdx, info);
    }
  }

  // Build result sorted by PV index
  const pvs = [];
  for (let i = 1; i <= multiPv; i++) {
    if (pvData.has(i)) {
      const d = pvData.get(i);
      pvs.push({
        cp: d.cp,
        mate: d.mate,
        moves: d.moves,
        depth: d.depth,
      });
    }
  }

  // Best move from bestmove line
  let bestMove = null;
  for (const line of lines) {
    if (line.startsWith('bestmove')) {
      const parts = line.split(/\s+/);
      bestMove = parts[1];
      break;
    }
  }

  return {
    depth: pvs.length > 0 ? pvs[0].depth : 0,
    pvs,
    bestMove,
  };
}

// Initialize stockfish eagerly
async function initStockfish() {
  if (!engine) {
    await createStockfish();
  }
}

// Destroy engine
function destroyStockfish() {
  if (engine) {
    sendCommand('quit');
    engine.terminate();
    engine = null;
    isReady = false;
  }
}

export { initStockfish, destroyStockfish, analyzePosition };
