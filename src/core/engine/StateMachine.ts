import { GameStateType } from '../types/GameState';

type StateHandler = (from: GameStateType, to: GameStateType) => void;

const VALID_TRANSITIONS: Partial<Record<GameStateType, readonly GameStateType[]>> = {
  [GameStateType.IDLE]: [GameStateType.SPINNING],
  [GameStateType.SPINNING]: [GameStateType.REVEALING],
  [GameStateType.REVEALING]: [
    GameStateType.WIN_PRESENTATION,
    GameStateType.FREE_SPIN_INTRO,
    GameStateType.FREE_SPIN_IDLE,
    GameStateType.IDLE,
  ],
  [GameStateType.WIN_PRESENTATION]: [
    GameStateType.FREE_SPIN_INTRO,
    GameStateType.FREE_SPIN_IDLE,
    GameStateType.IDLE,
  ],
  [GameStateType.FREE_SPIN_INTRO]: [GameStateType.FREE_SPIN_IDLE],
  [GameStateType.FREE_SPIN_IDLE]: [GameStateType.SPINNING, GameStateType.FREE_SPIN_OUTRO],
  [GameStateType.FREE_SPIN_OUTRO]: [GameStateType.IDLE],
};

export class StateMachine {
  private _state: GameStateType = GameStateType.IDLE;
  private handlers: StateHandler[] = [];

  get state(): GameStateType {
    return this._state;
  }

  is(state: GameStateType): boolean {
    return this._state === state;
  }

  transition(next: GameStateType): boolean {
    const allowed = VALID_TRANSITIONS[this._state] ?? [];
    if (!(allowed as GameStateType[]).includes(next)) {
      console.warn(`[StateMachine] Invalid: ${this._state} → ${next}`);
      return false;
    }
    const prev = this._state;
    this._state = next;
    this.handlers.forEach(fn => fn(prev, next));
    return true;
  }

  onTransition(fn: StateHandler): () => void {
    this.handlers.push(fn);
    return () => {
      this.handlers = this.handlers.filter(h => h !== fn);
    };
  }
}
