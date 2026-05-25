import type { SpinResult } from './SpinResult';

export enum GameStateType {
  IDLE = 'IDLE',
  SPINNING = 'SPINNING',
  REVEALING = 'REVEALING',
  WIN_PRESENTATION = 'WIN_PRESENTATION',
  FREE_SPIN_INTRO = 'FREE_SPIN_INTRO',
  FREE_SPIN_IDLE = 'FREE_SPIN_IDLE',
  FREE_SPIN_OUTRO = 'FREE_SPIN_OUTRO',
}

export interface GameContext {
  balance: number;
  bet: number;
  lastResult: SpinResult | null;
  freeSpinsRemaining: number;
  isFreeSpinMode: boolean;
}
