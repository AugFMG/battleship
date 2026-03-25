'use client';

import { BOARD_SIZE, type CellState, type Position } from '@/lib/game-engine';

interface BoardProps {
  board: CellState[][];
  /** If true, ship cells are shown as visible (player's own board) */
  showShips: boolean;
  /** If provided, cells are clickable and this is called on click */
  onCellClick?: (position: Position) => void;
  /** Highlight cells where a ship is being previewed during placement */
  previewCells?: Position[];
  previewValid?: boolean;
  disabled?: boolean;
  label: string;
}

const COLUMN_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

function cellClass(
  state: CellState,
  showShips: boolean,
  isPreview: boolean,
  previewValid: boolean
): string {
  const base =
    'w-8 h-8 border border-slate-600 text-xs flex items-center justify-center cursor-pointer select-none transition-colors';

  if (isPreview) {
    return `${base} ${previewValid ? 'bg-green-400/70' : 'bg-red-400/70'}`;
  }

  switch (state) {
    case 'hit':
      return `${base} bg-red-500 text-white`;
    case 'miss':
      return `${base} bg-blue-300/40 text-slate-400`;
    case 'ship':
      return showShips
        ? `${base} bg-slate-400`
        : `${base} bg-slate-800 hover:bg-slate-700`;
    case 'empty':
    default:
      return `${base} bg-slate-800 hover:bg-slate-700`;
  }
}

function cellSymbol(state: CellState, showShips: boolean): string {
  switch (state) {
    case 'hit':
      return '✕';
    case 'miss':
      return '·';
    case 'ship':
      return showShips ? '▪' : '';
    default:
      return '';
  }
}

export default function Board({
  board,
  showShips,
  onCellClick,
  previewCells = [],
  previewValid = true,
  disabled = false,
  label,
}: BoardProps) {
  const previewSet = new Set(previewCells.map(p => `${p.row},${p.col}`));

  return (
    <div className="flex flex-col items-center gap-2">
      <h2 className="text-slate-200 font-semibold text-sm uppercase tracking-widest">
        {label}
      </h2>
      <div className="flex flex-col">
        {/* Column headers */}
        <div className="flex ml-6">
          {COLUMN_LABELS.map(col => (
            <div
              key={col}
              className="w-8 h-5 flex items-center justify-center text-xs text-slate-400 font-mono"
            >
              {col}
            </div>
          ))}
        </div>

        {/* Rows */}
        {board.map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-center">
            {/* Row number */}
            <div className="w-6 text-xs text-slate-400 font-mono text-right pr-1">
              {rowIdx + 1}
            </div>
            {row.map((cell, colIdx) => {
              const key = `${rowIdx},${colIdx}`;
              const isPreview = previewSet.has(key);
              const isClickable =
                !disabled &&
                onCellClick &&
                (cell === 'empty' || cell === 'ship') &&
                !isPreview;

              return (
                <div
                  key={colIdx}
                  className={cellClass(cell, showShips, isPreview, previewValid)}
                  style={{ cursor: disabled ? 'not-allowed' : isClickable ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (!disabled && onCellClick) {
                      onCellClick({ row: rowIdx, col: colIdx });
                    }
                  }}
                >
                  {cellSymbol(cell, showShips)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
