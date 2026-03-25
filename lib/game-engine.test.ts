import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  placeShip,
  placeShipsRandom,
  makeShot,
  isSunk,
  checkWinCondition,
  computerMove,
  canPlaceShip,
  SHIP_CONFIGS,
  BOARD_SIZE,
  type Ship,
  type Board,
} from './game-engine';

// ─── createEmptyBoard ─────────────────────────────────────────

describe('createEmptyBoard', () => {
  it('creates 10x10 board', () => {
    const board = createEmptyBoard();
    expect(board.length).toBe(10);
    board.forEach(row => expect(row.length).toBe(10));
  });

  it('all cells are empty', () => {
    const board = createEmptyBoard();
    board.forEach(row => row.forEach(cell => expect(cell).toBe('empty')));
  });
});

// ─── canPlaceShip ─────────────────────────────────────────────

describe('canPlaceShip', () => {
  it('allows placing ship in empty board', () => {
    const board = createEmptyBoard();
    expect(canPlaceShip(board, { row: 0, col: 0 }, 3, 'horizontal')).toBe(true);
  });

  it('rejects placement out of bounds (horizontal)', () => {
    const board = createEmptyBoard();
    expect(canPlaceShip(board, { row: 0, col: 8 }, 3, 'horizontal')).toBe(false);
  });

  it('rejects placement out of bounds (vertical)', () => {
    const board = createEmptyBoard();
    expect(canPlaceShip(board, { row: 9, col: 0 }, 3, 'vertical')).toBe(false);
  });

  it('rejects overlapping ships', () => {
    const board = createEmptyBoard();
    const after = placeShip(board, { row: 2, col: 2 }, 3, 'horizontal');
    expect(after).not.toBeNull();
    // Try to place right on top
    expect(canPlaceShip(after!, { row: 2, col: 2 }, 2, 'horizontal')).toBe(false);
  });

  it('rejects adjacent ship placement', () => {
    const board = createEmptyBoard();
    const after = placeShip(board, { row: 2, col: 2 }, 3, 'horizontal');
    // One row below, same column — should be rejected (touching)
    expect(canPlaceShip(after!, { row: 3, col: 2 }, 2, 'horizontal')).toBe(false);
  });
});

// ─── placeShip ────────────────────────────────────────────────

describe('placeShip', () => {
  it('places ship and marks cells as ship', () => {
    const board = createEmptyBoard();
    const result = placeShip(board, { row: 0, col: 0 }, 3, 'horizontal');
    expect(result).not.toBeNull();
    expect(result![0][0]).toBe('ship');
    expect(result![0][1]).toBe('ship');
    expect(result![0][2]).toBe('ship');
    expect(result![0][3]).toBe('empty');
  });

  it('does not mutate original board', () => {
    const board = createEmptyBoard();
    placeShip(board, { row: 0, col: 0 }, 3, 'horizontal');
    expect(board[0][0]).toBe('empty');
  });

  it('returns null for invalid placement', () => {
    const board = createEmptyBoard();
    expect(placeShip(board, { row: 0, col: 9 }, 3, 'horizontal')).toBeNull();
  });
});

// ─── makeShot ─────────────────────────────────────────────────

describe('makeShot — miss', () => {
  it('returns miss on empty cell', () => {
    const board = createEmptyBoard();
    const { result, board: next } = makeShot(board, [], { row: 5, col: 5 });
    expect(result).toBe('miss');
    expect(next[5][5]).toBe('miss');
  });

  it('does not mutate original board', () => {
    const board = createEmptyBoard();
    makeShot(board, [], { row: 5, col: 5 });
    expect(board[5][5]).toBe('empty');
  });
});

describe('makeShot — hit', () => {
  it('returns hit on ship cell', () => {
    const board = createEmptyBoard();
    const withShip = placeShip(board, { row: 3, col: 3 }, 3, 'horizontal')!;
    const ships: Ship[] = [{
      id: 'test',
      name: 'Test',
      size: 3,
      positions: [
        { row: 3, col: 3 },
        { row: 3, col: 4 },
        { row: 3, col: 5 },
      ],
    }];
    const { result, board: next } = makeShot(withShip, ships, { row: 3, col: 3 });
    expect(result).toBe('hit');
    expect(next[3][3]).toBe('hit');
  });
});

describe('makeShot — already_shot', () => {
  it('returns already_shot on previously hit cell', () => {
    const board = createEmptyBoard();
    const withShip = placeShip(board, { row: 1, col: 1 }, 2, 'horizontal')!;
    const ships: Ship[] = [{
      id: 's1',
      name: 'S1',
      size: 2,
      positions: [{ row: 1, col: 1 }, { row: 1, col: 2 }],
    }];
    const { board: after1 } = makeShot(withShip, ships, { row: 1, col: 1 });
    const { result } = makeShot(after1, ships, { row: 1, col: 1 });
    expect(result).toBe('already_shot');
  });

  it('returns already_shot on previously missed cell', () => {
    const board = createEmptyBoard();
    const { board: after1 } = makeShot(board, [], { row: 0, col: 0 });
    const { result } = makeShot(after1, [], { row: 0, col: 0 });
    expect(result).toBe('already_shot');
  });
});

describe('makeShot — sunk', () => {
  it('returns sunk when last ship cell is hit', () => {
    const board = createEmptyBoard();
    const withShip = placeShip(board, { row: 0, col: 0 }, 2, 'horizontal')!;
    const ships: Ship[] = [{
      id: 's1',
      name: 'S1',
      size: 2,
      positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
    }];
    const { board: b1 } = makeShot(withShip, ships, { row: 0, col: 0 });
    const { result } = makeShot(b1, ships, { row: 0, col: 1 });
    expect(result).toBe('sunk');
  });
});

// ─── isSunk ───────────────────────────────────────────────────

describe('isSunk', () => {
  it('returns false when not all cells hit', () => {
    const board = createEmptyBoard();
    const withShip = placeShip(board, { row: 0, col: 0 }, 3, 'horizontal')!;
    const ship: Ship = {
      id: 's',
      name: 'S',
      size: 3,
      positions: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
    };
    const { board: b1 } = makeShot(withShip, [ship], { row: 0, col: 0 });
    const { board: b2 } = makeShot(b1, [ship], { row: 0, col: 1 });
    expect(isSunk(ship, b2)).toBe(false);
  });

  it('returns true when all cells hit', () => {
    const board = createEmptyBoard();
    const withShip = placeShip(board, { row: 0, col: 0 }, 2, 'horizontal')!;
    const ship: Ship = {
      id: 's',
      name: 'S',
      size: 2,
      positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
    };
    const { board: b1 } = makeShot(withShip, [ship], { row: 0, col: 0 });
    const { board: b2 } = makeShot(b1, [ship], { row: 0, col: 1 });
    expect(isSunk(ship, b2)).toBe(true);
  });
});

// ─── checkWinCondition ────────────────────────────────────────

describe('checkWinCondition', () => {
  it('returns false when ships remain', () => {
    const board = createEmptyBoard();
    const withShip = placeShip(board, { row: 0, col: 0 }, 2, 'horizontal')!;
    const ships: Ship[] = [{
      id: 's1',
      name: 'S1',
      size: 2,
      positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
    }];
    expect(checkWinCondition(ships, withShip)).toBe(false);
  });

  it('returns true when all ships sunk', () => {
    const board = createEmptyBoard();
    const withShip = placeShip(board, { row: 0, col: 0 }, 2, 'horizontal')!;
    const ships: Ship[] = [{
      id: 's1',
      name: 'S1',
      size: 2,
      positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
    }];
    const { board: b1 } = makeShot(withShip, ships, { row: 0, col: 0 });
    const { board: b2 } = makeShot(b1, ships, { row: 0, col: 1 });
    expect(checkWinCondition(ships, b2)).toBe(true);
  });

  it('returns true for empty ships array', () => {
    const board = createEmptyBoard();
    expect(checkWinCondition([], board)).toBe(true);
  });
});

// ─── computerMove ─────────────────────────────────────────────

describe('computerMove', () => {
  it('returns a valid position', () => {
    const board = createEmptyBoard();
    const shot = computerMove(board, new Set());
    expect(shot.row).toBeGreaterThanOrEqual(0);
    expect(shot.row).toBeLessThan(BOARD_SIZE);
    expect(shot.col).toBeGreaterThanOrEqual(0);
    expect(shot.col).toBeLessThan(BOARD_SIZE);
  });

  it('never returns an already-shot position', () => {
    const board = createEmptyBoard();
    // Fill all positions except (9,9) in history
    const history = new Set<string>();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!(r === 9 && c === 9)) {
          history.add(`${r},${c}`);
        }
      }
    }
    const shot = computerMove(board, history);
    expect(shot.row).toBe(9);
    expect(shot.col).toBe(9);
  });

  it('does not repeat position from history', () => {
    const board = createEmptyBoard();
    const history = new Set<string>();
    // Simulate 50 moves, none should repeat
    for (let i = 0; i < 50; i++) {
      const pos = computerMove(board, history);
      const key = `${pos.row},${pos.col}`;
      expect(history.has(key)).toBe(false);
      history.add(key);
    }
  });
});

// ─── placeShipsRandom ─────────────────────────────────────────

describe('placeShipsRandom', () => {
  it('places all ships without overlap', () => {
    const { board, ships } = placeShipsRandom(SHIP_CONFIGS);
    expect(ships.length).toBe(SHIP_CONFIGS.length);
    // Count ship cells on board
    let shipCellCount = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === 'ship') shipCellCount++;
      }
    }
    const expectedCells = SHIP_CONFIGS.reduce((sum, s) => sum + s.size, 0);
    expect(shipCellCount).toBe(expectedCells);
  });

  it('each ship has correct number of positions', () => {
    const { ships } = placeShipsRandom(SHIP_CONFIGS);
    ships.forEach(ship => {
      const config = SHIP_CONFIGS.find(c => c.id === ship.id);
      expect(ship.positions.length).toBe(config!.size);
    });
  });
});
