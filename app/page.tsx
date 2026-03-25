'use client';

import { useReducer, useCallback } from 'react';
import Board from '@/components/Board';
import {
  createEmptyBoard,
  placeShipsRandom,
  makeShot,
  checkWinCondition,
  computerMove,
  placeShip,
  getShipCells,
  positionKey,
  SHIP_CONFIGS,
  type Board as GameBoard,
  type Ship,
  type ShipConfig,
  type Position,
  type Orientation,
  type GamePhase,
} from '@/lib/game-engine';

// ─── State ────────────────────────────────────────────────────

interface PlacementState {
  phase: 'placement';
  playerBoard: GameBoard;
  playerShips: Ship[];
  placedConfigs: ShipConfig[];
  remainingConfigs: ShipConfig[];
  currentOrientation: Orientation;
  computerBoard: GameBoard;
  computerShips: Ship[];
  computerShotHistory: Set<string>;
}

interface PlayingState {
  phase: 'playing';
  playerBoard: GameBoard;
  playerShips: Ship[];
  computerBoard: GameBoard;
  computerShips: Ship[];
  computerShotHistory: Set<string>;
  lastMessage: string;
  isComputerThinking: boolean;
}

interface EndState {
  phase: 'won' | 'lost';
  playerBoard: GameBoard;
  computerBoard: GameBoard;
  playerShips: Ship[];
  computerShips: Ship[];
}

type GameState = PlacementState | PlayingState | EndState;

// ─── Actions ─────────────────────────────────────────────────

type Action =
  | { type: 'PLACE_SHIP'; position: Position }
  | { type: 'AUTO_PLACE_ALL' }
  | { type: 'ROTATE_SHIP' }
  | { type: 'PLAYER_SHOOT'; position: Position }
  | { type: 'RESET' };

// ─── Reducer ─────────────────────────────────────────────────

function initState(): GameState {
  const { board: computerBoard, ships: computerShips } = placeShipsRandom(SHIP_CONFIGS);
  return {
    phase: 'placement',
    playerBoard: createEmptyBoard(),
    playerShips: [],
    placedConfigs: [],
    remainingConfigs: [...SHIP_CONFIGS],
    currentOrientation: 'horizontal',
    computerBoard,
    computerShips,
    computerShotHistory: new Set(),
  };
}

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'RESET':
      return initState();

    case 'ROTATE_SHIP': {
      if (state.phase !== 'placement') return state;
      return {
        ...state,
        currentOrientation:
          state.currentOrientation === 'horizontal' ? 'vertical' : 'horizontal',
      };
    }

    case 'AUTO_PLACE_ALL': {
      if (state.phase !== 'placement') return state;
      const { board, ships } = placeShipsRandom(SHIP_CONFIGS);
      const { board: computerBoard, ships: computerShips } = placeShipsRandom(SHIP_CONFIGS);
      return {
        phase: 'playing',
        playerBoard: board,
        playerShips: ships,
        computerBoard,
        computerShips,
        computerShotHistory: new Set(),
        lastMessage: 'Gra rozpoczęta! Twój ruch.',
        isComputerThinking: false,
      };
    }

    case 'PLACE_SHIP': {
      if (state.phase !== 'placement') return state;
      if (state.remainingConfigs.length === 0) return state;

      const current = state.remainingConfigs[0];
      const nextBoard = placeShip(
        state.playerBoard,
        action.position,
        current.size,
        state.currentOrientation
      );
      if (nextBoard === null) return state; // invalid placement

      const positions = getShipCells(
        action.position,
        current.size,
        state.currentOrientation
      );
      const newShip: Ship = {
        id: current.id,
        name: current.name,
        size: current.size,
        positions,
      };

      const newRemaining = state.remainingConfigs.slice(1);

      if (newRemaining.length === 0) {
        // All ships placed — start game
        return {
          phase: 'playing',
          playerBoard: nextBoard,
          playerShips: [...state.playerShips, newShip],
          computerBoard: state.computerBoard,
          computerShips: state.computerShips,
          computerShotHistory: state.computerShotHistory,
          lastMessage: 'Gra rozpoczęta! Twój ruch.',
          isComputerThinking: false,
        };
      }

      return {
        ...state,
        playerBoard: nextBoard,
        playerShips: [...state.playerShips, newShip],
        placedConfigs: [...state.placedConfigs, current],
        remainingConfigs: newRemaining,
      };
    }

    case 'PLAYER_SHOOT': {
      if (state.phase !== 'playing') return state;
      if (state.isComputerThinking) return state;

      const { result, board: newComputerBoard, sunkShip } = makeShot(
        state.computerBoard,
        state.computerShips,
        action.position
      );

      if (result === 'already_shot') {
        return { ...state, lastMessage: 'Już tu strzelałeś!' };
      }

      let message = '';
      if (result === 'sunk') {
        message = `Zatopiony! ${sunkShip?.name ?? 'Okręt'} wroga zniszczony!`;
      } else if (result === 'hit') {
        message = 'Trafiony!';
      } else {
        message = 'Pudło!';
      }

      // Check win
      if (checkWinCondition(state.computerShips, newComputerBoard)) {
        return {
          phase: 'won',
          playerBoard: state.playerBoard,
          computerBoard: newComputerBoard,
          playerShips: state.playerShips,
          computerShips: state.computerShips,
        };
      }

      // Computer's turn — compute immediately
      const compPos = computerMove(state.playerBoard, state.computerShotHistory);
      const compKey = positionKey(compPos);
      const newHistory = new Set(state.computerShotHistory);
      newHistory.add(compKey);

      const {
        result: compResult,
        board: newPlayerBoard,
        sunkShip: compSunk,
      } = makeShot(state.playerBoard, state.playerShips, compPos);

      let compMessage = '';
      if (compResult === 'sunk') {
        compMessage = ` Komputer zatopił Twój ${compSunk?.name ?? 'okręt'}!`;
      } else if (compResult === 'hit') {
        compMessage = ' Komputer trafił!';
      } else {
        compMessage = ' Komputer pudłował.';
      }

      // Check lose
      if (checkWinCondition(state.playerShips, newPlayerBoard)) {
        return {
          phase: 'lost',
          playerBoard: newPlayerBoard,
          computerBoard: newComputerBoard,
          playerShips: state.playerShips,
          computerShips: state.computerShips,
        };
      }

      return {
        ...state,
        computerBoard: newComputerBoard,
        playerBoard: newPlayerBoard,
        computerShotHistory: newHistory,
        lastMessage: message + compMessage,
        isComputerThinking: false,
      };
    }

    default:
      return state;
  }
}

// ─── Status badge ─────────────────────────────────────────────

function StatusBadge({ phase }: { phase: GamePhase }) {
  if (phase === 'won') {
    return (
      <div className="text-center py-4 px-8 bg-green-700/80 rounded-xl border border-green-500">
        <p className="text-2xl font-bold text-green-200">Wygrałeś!</p>
        <p className="text-green-300 text-sm mt-1">Wszystkie okręty wroga zatopione.</p>
      </div>
    );
  }
  if (phase === 'lost') {
    return (
      <div className="text-center py-4 px-8 bg-red-800/80 rounded-xl border border-red-500">
        <p className="text-2xl font-bold text-red-200">Przegrałeś!</p>
        <p className="text-red-300 text-sm mt-1">Twoja flota została zatopiona.</p>
      </div>
    );
  }
  return null;
}

// ─── Ship status panel ────────────────────────────────────────

function ShipStatus({
  ships,
  board,
  label,
  reveal = true,
}: {
  ships: Ship[];
  board: GameBoard;
  label: string;
  reveal?: boolean;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 min-w-48">
      <p className="text-slate-300 font-medium mb-2">{label}</p>
      <ul className="space-y-1">
        {ships.map(ship => {
          const sunk = ship.positions.every(p => board[p.row][p.col] === 'hit');
          const hits = ship.positions.filter(p => board[p.row][p.col] === 'hit').length;
          return (
            <li key={ship.id} className="flex justify-between gap-4">
              <span className={sunk ? 'line-through text-slate-600' : ''}>
                {reveal || sunk ? ship.name : '???'}
              </span>
              <span className={sunk ? 'text-red-400' : 'text-slate-400'}>
                {sunk ? 'Zatopiony' : `${hits}/${ship.size}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

export default function GamePage() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initState);

  const handlePlayerShoot = useCallback(
    (position: Position) => {
      dispatch({ type: 'PLAYER_SHOOT', position });
    },
    []
  );

  const handlePlaceShip = useCallback(
    (position: Position) => {
      dispatch({ type: 'PLACE_SHIP', position });
    },
    []
  );

  const isPlacement = state.phase === 'placement';
  const isPlaying = state.phase === 'playing';
  const isEnded = state.phase === 'won' || state.phase === 'lost';

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-8 px-4 gap-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">
          Bitwa Morska
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {isPlacement
            ? 'Rozmieść swoje okręty'
            : isPlaying
            ? 'Gra w toku'
            : state.phase === 'won'
            ? 'Zwycięstwo!'
            : 'Koniec gry'}
        </p>
      </div>

      {/* End screen */}
      {isEnded && <StatusBadge phase={state.phase} />}

      {/* Message bar */}
      {isPlaying && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg px-6 py-2 text-sm text-slate-300 min-w-64 text-center">
          {state.lastMessage}
        </div>
      )}

      {/* Placement controls */}
      {isPlacement && (
        <div className="flex flex-col items-center gap-3">
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-6 py-3 text-center">
            <p className="text-slate-300 text-sm">
              Umieszczasz:{' '}
              <span className="font-semibold text-white">
                {state.remainingConfigs[0]?.name}
              </span>{' '}
              (rozmiar: {state.remainingConfigs[0]?.size})
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Orientacja:{' '}
              <span className="text-slate-200">
                {state.currentOrientation === 'horizontal'
                  ? 'Pozioma'
                  : 'Pionowa'}
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => dispatch({ type: 'ROTATE_SHIP' })}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
            >
              Obróć
            </button>
            <button
              onClick={() => dispatch({ type: 'AUTO_PLACE_ALL' })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Rozstaw automatycznie
            </button>
          </div>
          <div className="text-xs text-slate-500">
            Pozostałe: {state.remainingConfigs.map(c => c.name).join(', ')}
          </div>
        </div>
      )}

      {/* Boards */}
      <div className="flex flex-col lg:flex-row gap-10 items-start justify-center">
        {/* Player board */}
        <Board
          board={state.playerBoard}
          showShips={true}
          label="Twoja plansza"
          onCellClick={isPlacement ? handlePlaceShip : undefined}
          disabled={!isPlacement}
        />

        {/* Divider */}
        <div className="hidden lg:block w-px bg-slate-700 self-stretch" />

        {/* Computer board */}
        <Board
          board={state.computerBoard}
          showShips={isEnded}
          label="Plansza przeciwnika"
          onCellClick={isPlaying ? handlePlayerShoot : undefined}
          disabled={!isPlaying}
        />
      </div>

      {/* Ship status */}
      {(isPlaying || isEnded) && (
        <div className="flex flex-col sm:flex-row gap-6 text-xs text-slate-400">
          <ShipStatus
            ships={state.playerShips}
            board={state.playerBoard}
            label="Twoje okręty"
          />
          <ShipStatus
            ships={state.computerShips}
            board={state.computerBoard}
            label="Okręty wroga"
            reveal={isEnded}
          />
        </div>
      )}

      {/* Reset */}
      <button
        onClick={() => dispatch({ type: 'RESET' })}
        className="mt-2 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors border border-slate-600"
      >
        Nowa gra
      </button>
    </main>
  );
}
