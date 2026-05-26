import { Container, Graphics, Text, Application } from "pixi.js";
import type { TextStyleFontWeight } from "pixi.js";
import { DESIGN_W, DESIGN_H } from "./ScaleManager";
import type { GameContext } from "../types/GameState";
import type { GameConfig, UIThemeConfig } from "../types/GameConfig";

export interface LabelConfig {
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  fill?: number;
  fontWeight?: TextStyleFontWeight;
  letterSpacing?: number;
  anchorX?: number;
  anchorY?: number;
  visible?: boolean;
}

export type LabelStyleOverride = Partial<LabelConfig>;

export interface UILabelsConfig {
  betLabel?: LabelStyleOverride;
}

const DEFAULT_THEME: UIThemeConfig = {
  btnColorIdle: 0x22cc55,
  btnColorDisabled: 0x556655,
  btnColorFree: 0xffd700,
  btnRadius: 48,
  barHeight: 110,
  barBgColor: 0x000000,
  barBgAlpha: 0.55,
  barDividerColor: 0xffffff,
  barDividerAlpha: 0.15,
};

export class UISystem {
  readonly container: Container;
  private balanceLabel: Text;
  private betLabel: Text;
  private spinBtn: Container;
  private spinBtnBg: Graphics;
  private spinBtnLabel: Text;
  private freeSpinLabel: Text;
  private playAgainOverlay: Container;
  private spinCallback?: () => void;
  private betChangeCallback?: (delta: number) => void;
  private playAgainCallback?: () => void;
  private spinEnabled = true;
  private isFreeSpinMode = false;
  private readonly theme: UIThemeConfig;
  private readonly centerX: number;
  private readonly uiY: number;
  private readonly barTop: number;
  private readonly barCenterY: number;

  private balanceCurrent = 0;
  private balanceRafId = 0;

  constructor(
    app: Application,
    ctx: GameContext,
    gameConfig?: GameConfig,
    labelsConfig?: UILabelsConfig,
  ) {
    this.theme = { ...DEFAULT_THEME, ...gameConfig?.ui };
    this.container = new Container();
    this.centerX = DESIGN_W / 2;
    this.uiY = DESIGN_H - 90;
    this.barTop = DESIGN_H - this.theme.barHeight;
    this.barCenterY = this.barTop + this.theme.barHeight / 2;

    this.buildBackground();
    this.buildStaticLabels(labelsConfig);

    this.balanceCurrent = ctx.balance;
    this.balanceLabel = this.buildLabel({
      text: `$${ctx.balance.toFixed(0)}`,
      fontSize: 26,
      fill: 0xffffff,
      fontWeight: "bold",
      anchorX: 0,
      anchorY: 0.5,
      x: 30,
      y: this.barCenterY,
    });

    this.betLabel = this.buildLabel({
      text: `BET  $${ctx.bet}`,
      fontSize: 22,
      fill: 0xffffff,
      fontWeight: "bold",
      anchorX: 0.5,
      anchorY: 0.5,
      x: this.centerX,
      y: this.uiY + 8,
    });

    this.freeSpinLabel = this.buildLabel({
      text: "FREE SPINS: 0",
      fontSize: 16,
      fill: 0xffd700,
      fontWeight: "bold",
      anchorX: 0.5,
      anchorY: 0.5,
      x: this.centerX,
      y: this.uiY + 66,
      visible: false,
    });

    const { btn, bg, label } = this.buildSpinButton();
    this.spinBtn = btn;
    this.spinBtnBg = bg;
    this.spinBtnLabel = label;
    this.buildBetButtons();

    this.playAgainOverlay = this.buildPlayAgainOverlay();

    app.stage.addChild(this.container);
  }

  onSpin(cb: () => void): void {
    this.spinCallback = cb;
  }

  onBetChange(cb: (delta: number) => void): void {
    this.betChangeCallback = cb;
  }

  onPlayAgain(cb: () => void): void {
    this.playAgainCallback = cb;
  }

  showPlayAgain(): void {
    this.playAgainOverlay.visible = true;
  }

  hidePlayAgain(): void {
    this.playAgainOverlay.visible = false;
  }

  setSpinEnabled(enabled: boolean): void {
    this.spinEnabled = enabled;
    const color = !enabled
      ? this.theme.btnColorDisabled
      : this.isFreeSpinMode
        ? this.theme.btnColorFree
        : this.theme.btnColorIdle;
    this.spinBtnBg.tint = color;
    this.spinBtn.eventMode = enabled ? "static" : "none";
    this.spinBtnLabel.text = enabled
      ? this.isFreeSpinMode
        ? "AUTO"
        : "SPIN"
      : "...";
  }

  updateBalance(balance: number): void {
    if (this.balanceRafId) {
      cancelAnimationFrame(this.balanceRafId);
      this.balanceRafId = 0;
    }

    const from = this.balanceCurrent;
    if (from === balance) {
      this.balanceLabel.text = `$${balance}`;
      return;
    }

    const duration = 900;
    const start = performance.now();

    const step = () => {
      const t = Math.min((performance.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      this.balanceCurrent = Math.round(from + (balance - from) * eased);
      this.balanceLabel.text = `$${this.balanceCurrent}`;
      if (t < 1) {
        this.balanceRafId = requestAnimationFrame(step);
      } else {
        this.balanceCurrent = balance;
        this.balanceRafId = 0;
      }
    };

    this.balanceRafId = requestAnimationFrame(step);
  }

  updateBet(bet: number): void {
    this.betLabel.text = `BET  $${bet}`;
  }

  updateFreeSpins(remaining: number): void {
    this.freeSpinLabel.text = `FREE SPINS: ${remaining}`;
    this.freeSpinLabel.visible = remaining > 0;
  }

  setFreeSpinMode(active: boolean): void {
    this.isFreeSpinMode = active;
    this.freeSpinLabel.visible = active;
    if (this.spinEnabled) {
      this.spinBtnBg.tint = active
        ? this.theme.btnColorFree
        : this.theme.btnColorIdle;
    }
  }

  // ─── private builders ──────────────────────────────────────────────────────

  private addHoverScale(container: Container, hoverScale = 1.07): void {
    container.on("pointerover", () => container.scale.set(hoverScale));
    container.on("pointerout", () => container.scale.set(1));
  }

  private buildLabel(config: LabelConfig): Text {
    const style = {
      ...(config.fontSize !== undefined && { fontSize: config.fontSize }),
      ...(config.fill !== undefined && { fill: config.fill }),
      ...(config.fontWeight !== undefined && { fontWeight: config.fontWeight }),
      ...(config.letterSpacing !== undefined && {
        letterSpacing: config.letterSpacing,
      }),
    };

    const label = new Text({ text: config.text, style });
    label.anchor.set(config.anchorX ?? 0, config.anchorY ?? 0);
    label.x = config.x;
    label.y = config.y;
    if (config.visible !== undefined) label.visible = config.visible;
    this.container.addChild(label);
    return label;
  }

  private buildStaticLabels(labelsConfig?: UILabelsConfig): void {
    this.buildLabel({
      text: "BALANCE",
      fontSize: 11,
      fill: 0x88aacc,
      letterSpacing: 2,
      x: 30,
      y: this.uiY - 18,
    });

    this.buildLabel({
      text: "BET",
      fontSize: 11,
      fill: 0x88aacc,
      letterSpacing: 2,
      anchorX: 0.5,
      anchorY: 0,
      x: this.centerX,
      y: this.uiY - 18,
      ...labelsConfig?.betLabel,
    });
  }

  private buildBackground(): void {
    const bg = new Graphics();
    bg.rect(0, this.barTop, DESIGN_W, this.theme.barHeight);
    bg.fill({ color: this.theme.barBgColor, alpha: this.theme.barBgAlpha });
    bg.moveTo(0, this.barTop);
    bg.lineTo(DESIGN_W, this.barTop);
    bg.stroke({
      color: this.theme.barDividerColor,
      width: 1,
      alpha: this.theme.barDividerAlpha,
    });
    this.container.addChild(bg);
  }

  private buildSpinButton(): { btn: Container; bg: Graphics; label: Text } {
    const btn = new Container();
    btn.x = DESIGN_W - 30 - this.theme.btnRadius;
    btn.y = this.barCenterY;
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.circle(0, 0, this.theme.btnRadius);
    bg.fill(0xffffff);
    bg.circle(0, 0, this.theme.btnRadius);
    bg.stroke({ color: 0xffffff, width: 3, alpha: 0.4 });
    bg.tint = this.theme.btnColorIdle;
    btn.addChild(bg);

    const label = new Text({
      text: "SPIN",
      style: {
        fontSize: 16,
        fill: 0xffffff,
        fontWeight: "bold",
        letterSpacing: 1,
      },
    });
    label.anchor.set(0.5);
    btn.addChild(label);

    btn.on("pointerdown", () => {
      if (this.spinEnabled) this.spinCallback?.();
    });
    btn.on("pointerover", () => {
      if (this.spinEnabled) btn.scale.set(1.07);
    });
    btn.on("pointerout", () => {
      btn.scale.set(1);
    });

    this.container.addChild(btn);
    return { btn, bg, label };
  }

  private buildPlayAgainOverlay(): Container {
    const overlay = new Container();
    overlay.visible = false;

    const backdrop = new Graphics();
    backdrop.rect(0, 0, DESIGN_W, DESIGN_H);
    backdrop.fill({ color: 0x000000, alpha: 0.65 });
    overlay.addChild(backdrop);

    const cx = DESIGN_W / 2;
    const cy = DESIGN_H / 2;

    const panel = new Graphics();
    panel.roundRect(cx - 160, cy - 80, 320, 160, 20);
    panel.fill({ color: 0x1a1a2e, alpha: 1 });
    panel.stroke({ color: 0xffd700, width: 3, alpha: 0.9 });
    overlay.addChild(panel);

    const msg = new Text({
      text: "OUT OF FUNDS",
      style: {
        fontSize: 22,
        fill: 0xffd700,
        fontWeight: "bold",
        letterSpacing: 2,
      },
    });
    msg.anchor.set(0.5);
    msg.x = cx;
    msg.y = cy - 32;
    overlay.addChild(msg);

    const btnBg = new Graphics();
    btnBg.roundRect(-90, -22, 180, 44, 12);
    btnBg.fill(0x22cc55);
    btnBg.stroke({ color: 0xffffff, width: 2, alpha: 0.4 });

    const btnLabel = new Text({
      text: "PLAY AGAIN",
      style: {
        fontSize: 18,
        fill: 0xffffff,
        fontWeight: "bold",
        letterSpacing: 1,
      },
    });
    btnLabel.anchor.set(0.5);

    const btn = new Container();
    btn.x = cx;
    btn.y = cy + 30;
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.addChild(btnBg);
    btn.addChild(btnLabel);

    btn.on("pointerdown", () => this.playAgainCallback?.());
    this.addHoverScale(btn);

    overlay.addChild(btn);
    this.container.addChild(overlay);
    return overlay;
  }

  private buildBetButtons(): void {
    const makeBtn = (text: string, x: number, delta: number) => {
      const btn = new Container();
      btn.x = x;
      btn.y = this.uiY + 36;
      btn.eventMode = "static";
      btn.cursor = "pointer";

      const bg = new Graphics();
      bg.roundRect(-18, -16, 36, 32, 8);
      bg.fill(0x334455);
      bg.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
      btn.addChild(bg);

      const label = new Text({
        text,
        style: { fontSize: 18, fill: 0xffffff, fontWeight: "bold" },
      });
      label.anchor.set(0.5);
      btn.addChild(label);

      btn.on("pointerdown", () => this.betChangeCallback?.(delta));
      this.addHoverScale(btn, 1.1);

      this.container.addChild(btn);
    };

    makeBtn("−", this.centerX - 60, -1);
    makeBtn("+", this.centerX + 60, 1);
  }
}
