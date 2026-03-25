// ============================================================
// game-engine.ts — Pure game logic, no UI dependencies
// ============================================================

export const BOARD_SIZE = 10;

export type CellState = 'empty' | 'ship' | 'hit' | 'miss';
export type Orientation = 'horizontal' | 'vertical';
export type ShotResult = 'hit' | 'miss' | 'already_shot' | 'sunk';
export type GamePhase = 'placement' | 'playing' | 'won' | 'lost';

export interface Position {
  row: number;
  col: number;
}

export interface Ship {
  id: string;
  size: number;
  name: string;
  positions: Position[];
}

export type Board = CellState[][];

export interface ShipConfig {
  id: string;
  name: string;
  size: number;
}

export const SHIP_CONFIGS: ShipConfig[] = [
  { id: 'carrier',    name: 'Lotniskowiec', size: 5 },
  { id: 'battleship', name: 'Pancernik',    size: 4 },
  { id: 'cruiser',    name: 'Krążownik',    size: 3 },
  { id: 'submarine',  name: 'Okręt podwodny', size: 3 },
  { id: 'destroyer',  name: 'Niszczyciel',  size: 2 },
];

// ─── Board helpers ────────────────────────────────────────────

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 'empty' as CellState)
  );
}

export function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

// ─── Ship placement ───────────────────────────────────────────

export function getShipCells(
  position: Position,
  size: number,
  orientation: Orientation
): Position[] {
  const cells: Position[] = [];
  for (let i = 0; i < size; i++) {
    cells.push(
      orientation === 'horizontal'
        ? { row: position.row, col: position.col + i }
        : { row: position.row + i, col: position.col }
    );
  }
  return cells;
}

export function canPlaceShip(
  board: Board,
  position: Position,
  size: number,
  orientation: Orientation
): boolean {
  const cells = getShipCells(position, size, orientation);

  for (const cell of cells) {
    // Out of bounds
    if (
      cell.row < 0 || cell.row >= BOARD_SIZE ||
      cell.col < 0 || cell.col >= BOARD_SIZE
    ) {
      return false;
    }
    // Cell already occupied (also check adjacent cells to prevent touching)
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = cell.row + dr;
        const c = cell.col + dc;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          if (board[r][c] === 'ship') return false;
        }
      }
    }
  }
  return true;
}

export function placeShip(
  board: Board,
  position: Position,
  size: number,
  orientation: Orientation
): Board | null {
  if (!canPlaceShip(board, position, size, orientation)) return null;

  const next = cloneBoard(board);
  const cells = getShipCells(position, size, orientation);
  for (const c of cells) {
    next[c.row][c.col] = 'ship';
  }
  return next;
}

export function placeShipsRandom(configs: ShipConfig[]): { board: Board; ships: Ship[] } {
  let board = createEmptyBoard();
  const ships: Ship[] = [];

  for (const config of configs) {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 1000) {
      attempts++;
      const orientation: Orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
      const row = Math.floor(Math.random() * BOARD_SIZE);
      const col = Math.floor(Math.random() * BOARD_SIZE);
      const position: Position = { row, col };

      const next = placeShip(board, position, config.size, orientation);
      if (next !== null) {
        board = next;
        ships.push({
          id: config.id,
          name: config.name,
          size: config.size,
          positions: getShipCells(position, config.size, orientation),
        });
        placed = true;
      }
    }

    if (!placed) {
      // Shouldn't happen with 1000 attempts — reset and retry whole fleet
      return placeShipsRandom(configs);
    }
  }

  return { board, ships };
}

// ─── Shot logic ───────────────────────────────────────────────

export interface ShotOutcome {
  result: ShotResult;
  board: Board;
  sunkShip?: Ship;
}

export function makeShot(
  board: Board,
  ships: Ship[],
  position: Position
): ShotOutcome {
  const cell = board[position.row][position.col];

  if (cell === 'hit' || cell === 'miss') {
    return { result: 'already_shot', board };
  }

  const next = cloneBoard(board);

  if (cell === 'ship') {
    next[position.row][position.col] = 'hit';
    // Check if the ship at this position is now sunk
    const sunkShip = ships.find(ship =>
      ship.positions.some(p => p.row === position.row && p.col === position.col)
    );
    if (sunkShip && isSunk(sunkShip, next)) {
      return { result: 'sunk', board: next, sunkShip };
    }
    return { result: 'hit', board: next };
  }

  // cell === 'empty'
  next[position.row][position.col] = 'miss';
  return { result: 'miss', board: next };
}

export function isSunk(ship: Ship, board: Board): boolean {
  return ship.positions.every(p => board[p.row][p.col] === 'hit');
}

export function checkWinCondition(ships: Ship[], board: Board): boolean {
  return ships.every(ship => isSunk(ship, board));
}

// ─── Computer AI ─────────────────────────────────────────────

export function computerMove(
  board: Board,
  shotHistory: Set<string>
): Position {
  const available: Position[] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const key = `${row},${col}`;
      if (!shotHistory.has(key)) {
        available.push({ row, col });
      }
    }
  }

  if (available.length === 0) {
    // Fallback — shouldn't happen in normal game
    return { row: 0, col: 0 };
  }

  const idx = Math.floor(Math.random() * available.length);
  return available[idx];
}

// ─── Serialization helpers ────────────────────────────────────

export function positionKey(p: Position): string {
  return `${p.row},${p.col}`;
}
