import { useState, useCallback, useEffect } from 'react';

const ROWS = 9;
const COLS = 9;
const MINES = 10;

function createBoard() {
  const board = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ mine: false, revealed: false, flagged: false, count: 0 }))
  );
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (!board[r][c].mine) {
      board[r][c].mine = true;
      placed++;
    }
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].mine) count++;
        }
      }
      board[r][c].count = count;
    }
  }
  return board;
}

function reveal(board, r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
  const cell = board[r][c];
  if (cell.revealed || cell.flagged) return;
  cell.revealed = true;
  if (cell.count === 0 && !cell.mine) {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        reveal(board, r + dr, c + dc);
  }
}

const NUM_COLORS = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080'];

export default function Minesweeper({ onClose }) {
  const [board, setBoard] = useState(createBoard);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started || gameOver || won) return;
    const id = setInterval(() => setTime((t) => Math.min(t + 1, 999)), 1000);
    return () => clearInterval(id);
  }, [started, gameOver, won]);

  const flagCount = board.flat().filter((c) => c.flagged).length;

  const checkWin = useCallback((b) => {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (!b[r][c].mine && !b[r][c].revealed) return false;
    return true;
  }, []);

  const handleClick = (r, c) => {
    if (gameOver || won) return;
    const cell = board[r][c];
    if (cell.flagged || cell.revealed) return;
    if (!started) setStarted(true);
    const next = board.map((row) => row.map((cl) => ({ ...cl })));
    if (next[r][c].mine) {
      next.forEach((row) => row.forEach((cl) => { if (cl.mine) cl.revealed = true; }));
      setBoard(next);
      setGameOver(true);
      return;
    }
    reveal(next, r, c);
    setBoard(next);
    if (checkWin(next)) setWon(true);
  };

  const handleRightClick = (e, r, c) => {
    e.preventDefault();
    if (gameOver || won) return;
    const cell = board[r][c];
    if (cell.revealed) return;
    const next = board.map((row) => row.map((cl) => ({ ...cl })));
    next[r][c].flagged = !next[r][c].flagged;
    setBoard(next);
  };

  const reset = () => {
    setBoard(createBoard());
    setGameOver(false);
    setWon(false);
    setTime(0);
    setStarted(false);
  };

  const renderCell = (cell, r, c) => {
    let content = '';
    let style = {};

    if (cell.revealed) {
      if (cell.mine) {
        content = '💣';
        style.background = '#ff0000';
      } else if (cell.count > 0) {
        content = cell.count;
        style.color = NUM_COLORS[cell.count];
        style.fontWeight = 700;
      }
      style.borderColor = '#808080 #808080 #808080 #808080';
      style.boxShadow = 'none';
      style.background = style.background || '#c0c0c0';
    } else if (cell.flagged) {
      content = '🚩';
    }

    return (
      <button
        key={`${r}-${c}`}
        className="ms-cell"
        style={style}
        onClick={() => handleClick(r, c)}
        onContextMenu={(e) => handleRightClick(e, r, c)}
      >
        {content}
      </button>
    );
  };

  const face = gameOver ? '😵' : won ? '😎' : '🙂';

  return (
    <div className="ms-window">
      <div className="ms-titlebar">
        <span>💣 지뢰찾기</span>
        <button className="ms-close" onClick={onClose}>✕</button>
      </div>
      <div className="ms-body">
        <div className="ms-toolbar">
          <div className="ms-counter">{String(MINES - flagCount).padStart(3, '0')}</div>
          <button className="ms-face" onClick={reset}>{face}</button>
          <div className="ms-counter">{String(time).padStart(3, '0')}</div>
        </div>
        <div className="ms-board">
          {board.map((row, r) => (
            <div key={r} className="ms-row">
              {row.map((cell, c) => renderCell(cell, r, c))}
            </div>
          ))}
        </div>
        {(gameOver || won) && (
          <div className="ms-result">
            {won ? '🏆 승리! ElastAlert 마스터!' : '💥 GAME OVER'}
          </div>
        )}
      </div>
    </div>
  );
}
