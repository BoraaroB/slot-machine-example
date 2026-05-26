import { GameStateType } from '../types/GameState';
import type { GameContext } from '../types/GameState';
import type { StateMachine } from './StateMachine';
import type { UISystem } from '../systems/UISystem';

export const BET_OPTIONS = [10, 20, 50, 70, 100] as const;
const INITIAL_BET_INDEX = 0;

export class BetController {
  private betIndex = INITIAL_BET_INDEX;

  constructor(
    private readonly ctx: GameContext,
    private readonly sm: StateMachine,
    private readonly uiSystem: UISystem,
  ) {}

  get initialBet(): number { return BET_OPTIONS[INITIAL_BET_INDEX]; }
  get minBet(): number { return BET_OPTIONS[0]; }

  change(delta: number): void {
    if (!this.sm.is(GameStateType.IDLE)) return;
    let maxIndex = BET_OPTIONS.length - 1;
    while (maxIndex > 0 && BET_OPTIONS[maxIndex] > this.ctx.balance) maxIndex--;
    if (maxIndex < 0) return;
    this.betIndex = Math.min(maxIndex, Math.max(0, this.betIndex + delta));
    this.ctx.bet = BET_OPTIONS[this.betIndex];
    this.uiSystem.updateBet(this.ctx.bet);
  }

  syncToBalance(): void {
    if (this.ctx.balance < BET_OPTIONS[0]) {
      this.betIndex = 0;
      this.ctx.bet = BET_OPTIONS[0];
      this.uiSystem.updateBet(this.ctx.bet);
      this.uiSystem.setSpinEnabled(false);
      this.uiSystem.showPlayAgain();
      return;
    }
    let maxIndex = BET_OPTIONS.length - 1;
    while (maxIndex > 0 && BET_OPTIONS[maxIndex] > this.ctx.balance) maxIndex--;
    if (this.betIndex > maxIndex) {
      this.betIndex = maxIndex;
      this.ctx.bet = BET_OPTIONS[this.betIndex];
      this.uiSystem.updateBet(this.ctx.bet);
    }
  }

  handlePlayAgain(): void {
    this.ctx.balance = 1000;
    this.betIndex = INITIAL_BET_INDEX;
    this.ctx.bet = BET_OPTIONS[this.betIndex];
    this.uiSystem.hidePlayAgain();
    this.uiSystem.updateBalance(this.ctx.balance);
    this.uiSystem.updateBet(this.ctx.bet);
    this.uiSystem.setSpinEnabled(true);
    this.sm.transition(GameStateType.IDLE);
  }
}
