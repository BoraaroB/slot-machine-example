import { Application } from "pixi.js";
import { StateMachine } from "./StateMachine";
import { ReelSystem } from "../systems/ReelSystem";
import { WinSystem } from "../systems/WinSystem";
import { UISystem } from "../systems/UISystem";
import { ScaleManager, DESIGN_W, DESIGN_H } from "../systems/ScaleManager";
import { GameStateType } from "../types/GameState";
import type { GameConfig } from "../types/GameConfig";
import type { ISpinService } from "../services/ISpinService";
import type { GameContext } from "../types/GameState";

const BET_OPTIONS = [10, 20, 50, 70, 100];
const INITIAL_BET_INDEX = 0;

interface Systems {
  app: Application;
  scaleManager: ScaleManager;
  reelSystem: ReelSystem;
  winSystem: WinSystem;
  uiSystem: UISystem;
}

export class GameEngine {
  private systems: Systems | null = null;
  private sm: StateMachine;
  private ctx: GameContext;
  private betIndex = INITIAL_BET_INDEX;

  private get sys(): Systems {
    if (!this.systems) throw new Error("GameEngine.init() has not been called");
    return this.systems;
  }

  constructor(
    private readonly config: GameConfig,
    private readonly spinService: ISpinService,
  ) {
    this.sm = new StateMachine();
    this.ctx = {
      balance: 1000,
      bet: BET_OPTIONS[INITIAL_BET_INDEX],
      lastResult: null,
      freeSpinsRemaining: 0,
      isFreeSpinMode: false,
    };
  }

  async init(): Promise<void> {
    const app = new Application();
    await app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    document.body.appendChild(app.canvas);

    const scaleManager = new ScaleManager(app);
    const reelSystem = new ReelSystem(app, this.config);
    const winSystem = new WinSystem(app, this.config, reelSystem);
    const uiSystem = new UISystem(app, this.ctx, this.config);

    this.systems = { app, scaleManager, reelSystem, winSystem, uiSystem };

    winSystem.positionBanner(DESIGN_W / 2, DESIGN_H / 2);

    uiSystem.onSpin(() => void this.handleSpin());
    uiSystem.onBetChange((delta) => {
      console.log("Bet change requested, delta:", delta);
      this.changeBet(delta);
    });
    uiSystem.onPlayAgain(() => this.handlePlayAgain());

    app.ticker.add((ticker) => {
      this.sys.reelSystem.update(ticker.deltaTime);
    });

    uiSystem.updateBalance(this.ctx.balance);
    uiSystem.updateBet(this.ctx.bet);
  }

  // ─── spin flow ─────────────────────────────────────────────────────────────

  private async handleSpin(): Promise<void> {
    if (
      !this.sm.is(GameStateType.IDLE) &&
      !this.sm.is(GameStateType.FREE_SPIN_IDLE)
    )
      return;
    if (this.ctx.balance < BET_OPTIONS[0] || this.ctx.balance < this.ctx.bet)
      return;

    const { uiSystem, winSystem } = this.sys;
    uiSystem.setSpinEnabled(false);

    const result = await this.executeSpin(false, 2200);

    if (result.freeSpins) {
      this.ctx.freeSpinsRemaining = result.freeSpins.remaining;
      this.ctx.isFreeSpinMode = true;

      this.sm.transition(GameStateType.FREE_SPIN_INTRO);
      uiSystem.setFreeSpinMode(true);
      uiSystem.updateFreeSpins(this.ctx.freeSpinsRemaining);
      await winSystem.showFreeSpinBanner(result.freeSpins.awarded);

      await this.runFreeSpins();
      return;
    }

    this.sm.transition(GameStateType.IDLE);
    this.syncBetToBalance();
    if (this.ctx.balance >= BET_OPTIONS[0]) uiSystem.setSpinEnabled(true);
  }

  private async runFreeSpins(): Promise<void> {
    const { uiSystem, winSystem } = this.sys;

    this.sm.transition(GameStateType.FREE_SPIN_IDLE);

    while (this.ctx.freeSpinsRemaining > 0) {
      this.ctx.freeSpinsRemaining--;
      uiSystem.updateFreeSpins(this.ctx.freeSpinsRemaining);

      await this.executeSpin(true, 1800);
      this.sm.transition(GameStateType.FREE_SPIN_IDLE);
      await delay(500);
    }

    this.ctx.isFreeSpinMode = false;
    uiSystem.setFreeSpinMode(false);
    await winSystem.showFreeSpinOutro();

    this.sm.transition(GameStateType.FREE_SPIN_OUTRO);
    this.sm.transition(GameStateType.IDLE);
    this.syncBetToBalance();
    if (this.ctx.balance >= BET_OPTIONS[0]) uiSystem.setSpinEnabled(true);
  }

  private async executeSpin(isFree: boolean, winDelay: number) {
    const { uiSystem, winSystem, reelSystem } = this.sys;

    this.sm.transition(GameStateType.SPINNING);
    winSystem.clear();

    const requestPromise = this.spinService.spin(this.ctx.bet, isFree);
    reelSystem.startSpin();

    const [result] = await Promise.all([requestPromise, delay(800)]);
    this.ctx.lastResult = result;
    this.ctx.balance = result.balance;

    await reelSystem.stopSpin(result.reels);

    this.sm.transition(GameStateType.REVEALING);
    uiSystem.updateBalance(result.balance);

    if (result.winLines.length > 0) {
      this.sm.transition(GameStateType.WIN_PRESENTATION);
      winSystem.show(result.winLines, result.totalWin);
      await delay(winDelay);
      winSystem.clear();
    }

    return result;
  }

  destroy(): void {
    this.sys.scaleManager.destroy();
    this.sys.app.destroy(true);
    this.systems = null;
  }

  // ─── bet controls ──────────────────────────────────────────────────────────

  private changeBet(delta: number): void {
    if (!this.sm.is(GameStateType.IDLE)) return;
    let maxIndex = BET_OPTIONS.length - 1;
    while (maxIndex > 0 && BET_OPTIONS[maxIndex] > this.ctx.balance) maxIndex--;
    if (maxIndex < 0) return;
    this.betIndex = Math.min(maxIndex, Math.max(0, this.betIndex + delta));
    this.ctx.bet = BET_OPTIONS[this.betIndex];
    this.sys.uiSystem.updateBet(this.ctx.bet);
  }

  private handlePlayAgain(): void {
    this.ctx.balance = 1000;
    this.betIndex = INITIAL_BET_INDEX;
    this.ctx.bet = BET_OPTIONS[this.betIndex];
    const { uiSystem } = this.sys;
    uiSystem.hidePlayAgain();
    uiSystem.updateBalance(this.ctx.balance);
    uiSystem.updateBet(this.ctx.bet);
    uiSystem.setSpinEnabled(true);
    this.sm.transition(GameStateType.IDLE);
  }

  private syncBetToBalance(): void {
    const { uiSystem } = this.sys;
    if (this.ctx.balance < BET_OPTIONS[0]) {
      this.betIndex = 0;
      this.ctx.bet = BET_OPTIONS[0];
      uiSystem.updateBet(this.ctx.bet);
      uiSystem.setSpinEnabled(false);
      uiSystem.showPlayAgain();
      return;
    }
    let maxIndex = BET_OPTIONS.length - 1;
    while (maxIndex > 0 && BET_OPTIONS[maxIndex] > this.ctx.balance) maxIndex--;
    if (this.betIndex > maxIndex) {
      this.betIndex = maxIndex;
      this.ctx.bet = BET_OPTIONS[this.betIndex];
      uiSystem.updateBet(this.ctx.bet);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
