// ============================================================
// SVG Chess Pieces - proper white/black coloring
// ============================================================

// Each piece is an SVG path with fill/stroke for clear distinction
const PIECE_PATHS = {
  K: { // White King
    paths: [
      { d: "M22.5 11.63V6M20 8h5", stroke: true, fill: false },
      { d: "M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5", fill: true },
      { d: "M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7", fill: true },
      { d: "M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0", stroke: true, fill: false },
    ],
    fillColor: '#fff',
    strokeColor: '#000',
  },
  Q: { // White Queen
    paths: [
      { d: "M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z", fill: true },
      { d: "M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1 2.5-1 2.5-1.5 1.5 0 2.5 0 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z", fill: true },
      { d: "M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0", stroke: true, fill: false },
      { type: 'circle', cx: 6, cy: 12, r: 2, fill: true },
      { type: 'circle', cx: 14, cy: 9, r: 2, fill: true },
      { type: 'circle', cx: 22.5, cy: 8, r: 2, fill: true },
      { type: 'circle', cx: 31, cy: 9, r: 2, fill: true },
      { type: 'circle', cx: 39, cy: 12, r: 2, fill: true },
    ],
    fillColor: '#fff',
    strokeColor: '#000',
  },
  R: { // White Rook
    paths: [
      { d: "M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5", fill: true },
      { d: "M34 14l-3 3H14l-3-3", fill: true },
      { d: "M15 17v7h15v-7M14 29.5v-13h17v13H14z", fill: true },
      { d: "M14 29.5v2.5h17v-2.5", fill: true },
      { d: "M11 14h23M12 36h21M12 32h21M14 29.5h17M14 24.5h17M11 14l3 3h17l3-3", stroke: true, fill: false },
    ],
    fillColor: '#fff',
    strokeColor: '#000',
  },
  B: { // White Bishop
    paths: [
      { d: "M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z", fill: true },
      { d: "M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z", fill: true },
      { d: "M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z", fill: true },
      { d: "M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5", stroke: true, fill: false },
    ],
    fillColor: '#fff',
    strokeColor: '#000',
  },
  N: { // White Knight
    paths: [
      { d: "M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21", fill: true },
      { d: "M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3", fill: true },
      { d: "M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z", fill: 'dark' },
      { d: "M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z", fill: 'dark' },
    ],
    fillColor: '#fff',
    strokeColor: '#000',
  },
  P: { // White Pawn
    paths: [
      { d: "M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5H34c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z", fill: true },
    ],
    fillColor: '#fff',
    strokeColor: '#000',
  },
  // BLACK PIECES
  k: { // Black King
    paths: [
      { d: "M22.5 11.63V6M20 8h5", stroke: true, fill: false },
      { d: "M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5", fill: true },
      { d: "M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7", fill: true },
      { d: "M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0", stroke: true, fill: false, strokeWhite: true },
    ],
    fillColor: '#333',
    strokeColor: '#000',
  },
  q: { // Black Queen
    paths: [
      { d: "M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z", fill: true },
      { d: "M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1 2.5-1 2.5-1.5 1.5 0 2.5 0 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z", fill: true },
      { d: "M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0", stroke: true, fill: false, strokeWhite: true },
      { type: 'circle', cx: 6, cy: 12, r: 2, fill: true },
      { type: 'circle', cx: 14, cy: 9, r: 2, fill: true },
      { type: 'circle', cx: 22.5, cy: 8, r: 2, fill: true },
      { type: 'circle', cx: 31, cy: 9, r: 2, fill: true },
      { type: 'circle', cx: 39, cy: 12, r: 2, fill: true },
    ],
    fillColor: '#333',
    strokeColor: '#000',
  },
  r: { // Black Rook
    paths: [
      { d: "M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5", fill: true },
      { d: "M34 14l-3 3H14l-3-3", fill: true },
      { d: "M15 17v7h15v-7M14 29.5v-13h17v13H14z", fill: true },
      { d: "M14 29.5v2.5h17v-2.5", fill: true },
      { d: "M11 14h23M12 36h21M12 32h21M14 29.5h17M14 24.5h17M11 14l3 3h17l3-3", stroke: true, fill: false, strokeWhite: true },
    ],
    fillColor: '#333',
    strokeColor: '#000',
  },
  b: { // Black Bishop
    paths: [
      { d: "M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z", fill: true },
      { d: "M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z", fill: true },
      { d: "M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z", fill: true },
      { d: "M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5", stroke: true, fill: false, strokeWhite: true },
    ],
    fillColor: '#333',
    strokeColor: '#000',
  },
  n: { // Black Knight
    paths: [
      { d: "M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21", fill: true },
      { d: "M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3", fill: true },
      { d: "M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z", fill: 'light' },
      { d: "M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z", fill: 'light' },
    ],
    fillColor: '#333',
    strokeColor: '#000',
  },
  p: { // Black Pawn
    paths: [
      { d: "M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5H34c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z", fill: true },
    ],
    fillColor: '#333',
    strokeColor: '#000',
  },
};

export default function PieceSVG({ piece, size = 45 }) {
  const data = PIECE_PATHS[piece];
  if (!data) return null;

  return (
    <svg viewBox="0 0 45 45" width={size} height={size} style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}>
      {data.paths.map((p, i) => {
        if (p.type === 'circle') {
          let fill = data.fillColor;
          if (p.fill === 'light') fill = '#fff';
          else if (p.fill === 'dark') fill = '#333';
          else if (p.fill === true) fill = data.fillColor;
          return (
            <circle
              key={i}
              cx={p.cx}
              cy={p.cy}
              r={p.r}
              fill={fill}
              stroke={data.strokeColor}
              strokeWidth="1.5"
            />
          );
        }

        let fill = 'none';
        if (p.fill === true) fill = data.fillColor;
        else if (p.fill === 'dark') fill = '#333';
        else if (p.fill === 'light') fill = '#fff';

        let strokeCol = data.strokeColor;
        if (p.strokeWhite) strokeCol = '#fff';

        return (
          <path
            key={i}
            d={p.d}
            fill={fill}
            stroke={p.stroke || p.strokeWhite ? strokeCol : data.strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}
