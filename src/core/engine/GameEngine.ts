import { Application } from "pixi.js";
import { StateMachine } from "./StateMachine";
import { BetController, BET_OPTIONS } from "./BetController";
import { ReelSystem } from "../systems/ReelSystem";
import { WinSystem } from "../systems/WinSystem";
import { UISystem } from "../systems/UISystem";
import { ScaleManager, DESIGN_W, DESIGN_H } from "../systems/ScaleManager";
import { GameStateType } from "../types/GameState";
import { delay } from "../utils";
import type { GameConfig } from "../types/GameConfig";
import type { ISpinService } from "../services/ISpinService";
import type { GameContext } from "../types/GameState";

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
  private betController!: BetController;

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
      bet: BET_OPTIONS[0],
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
    this.betController = new BetController(this.ctx, this.sm, uiSystem);

    winSystem.positionBanner(DESIGN_W / 2, DESIGN_H / 2);

    uiSystem.onSpin(() => void this.handleSpin());
    uiSystem.onBetChange(delta => this.betController.change(delta));
    uiSystem.onPlayAgain(() => this.betController.handlePlayAgain());

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
    if (this.ctx.balance < this.betController.minBet || this.ctx.balance < this.ctx.bet)
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
    this.betController.syncToBalance();
    if (this.ctx.balance >= this.betController.minBet) uiSystem.setSpinEnabled(true);
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
    this.betController.syncToBalance();
    if (this.ctx.balance >= this.betController.minBet) uiSystem.setSpinEnabled(true);
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
    this.sys.winSystem.destroy();
    this.sys.scaleManager.destroy();
    this.sys.app.destroy(true);
    this.systems = null;
  }
}
