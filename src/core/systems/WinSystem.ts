import { Container, Graphics, BitmapText, Application, Ticker } from 'pixi.js';
import type { GameConfig } from '../types/GameConfig';
import type { WinLine } from '../types/SpinResult';
import type { ReelSystem } from './ReelSystem';

const LINE_COLORS = [0xffff00, 0x00ffff, 0xff00ff, 0x00ff88, 0xff8800];

export class WinSystem {
  readonly container: Container;
  private overlay: Container;
  private winBanner: Container;
  private readonly config: GameConfig;
  private readonly reelSystem: ReelSystem;
  private readonly app: Application;

  private pulseListener: ((ticker: Ticker) => void) | null = null;
  private pulseTime = 0;

  constructor(app: Application, config: GameConfig, reelSystem: ReelSystem) {
    this.app         = app;
    this.config      = config;
    this.reelSystem  = reelSystem;

    this.container  = new Container();
    this.overlay    = new Container();
    this.winBanner  = new Container();
    this.winBanner.visible = false;

    this.container.addChild(this.overlay);
    this.container.addChild(this.winBanner);
    app.stage.addChild(this.container);
  }

  show(winLines: WinLine[], totalWin: number): void {
    this.clear();

    winLines.forEach((line, lineIdx) => {
      const payline = this.config.paylines.find(p => p.id === line.paylineId);
      if (!payline) return;

      const color = LINE_COLORS[lineIdx % LINE_COLORS.length];

      for (let reelIdx = 0; reelIdx < line.count; reelIdx++) {
        const rowIdx = payline.rows[reelIdx];
        const bounds = this.reelSystem.getCellBounds(reelIdx, rowIdx);

        const cell = new Graphics();
        cell.roundRect(bounds.x + 3, bounds.y + 3, bounds.w - 6, bounds.h - 6, 14);
        cell.stroke({ color, width: 5 });
        cell.roundRect(bounds.x + 3, bounds.y + 3, bounds.w - 6, bounds.h - 6, 14);
        cell.fill({ color, alpha: 0.18 });
        this.overlay.addChild(cell);
      }

      if (line.count >= 2) {
        const points = Array.from({ length: line.count }, (_, reelIdx) => {
          const rowIdx = payline.rows[reelIdx];
          const b = this.reelSystem.getCellBounds(reelIdx, rowIdx);
          return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
        });

        const connector = new Graphics();
        connector.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) connector.lineTo(points[i].x, points[i].y);
        connector.stroke({ color, width: 3, alpha: 0.7 });
        this.overlay.addChild(connector);
      }
    });

    // Pulse the overlay alpha using the ticker
    this.pulseTime = 0;
    this.pulseListener = (ticker) => {
      this.pulseTime += ticker.deltaMS / 1000;
      this.overlay.alpha = 0.55 + 0.45 * Math.abs(Math.sin(this.pulseTime * Math.PI * 2.4));
    };
    this.app.ticker.add(this.pulseListener);

    this.showWinBanner(totalWin);
  }

  clear(): void {
    if (this.pulseListener) {
      this.app.ticker.remove(this.pulseListener);
      this.pulseListener = null;
    }
    this.pulseTime = 0;
    this.overlay.alpha = 1;
    this.overlay.removeChildren();
    this.winBanner.visible = false;
    this.winBanner.removeChildren();
  }

  destroy(): void {
    this.clear();
    this.container.destroy({ children: true });
  }

  showFreeSpinBanner(spinsAwarded: number): Promise<void> {
    this.winBanner.removeChildren();
    this.winBanner.visible = true;

    const bg = new Graphics();
    bg.roundRect(-220, -50, 440, 100, 20);
    bg.fill({ color: 0x1a1a5e, alpha: 0.95 });
    bg.stroke({ color: 0xffd700, width: 3 });
    this.winBanner.addChild(bg);

    const title = new BitmapText({
      text: `FREE SPINS x${spinsAwarded}!`,
      style: { fontFamily: 'Arial', fontSize: 32, fill: 0xffd700, fontWeight: 'bold' },
    });
    title.anchor.set(0.5);
    this.winBanner.addChild(title);

    return new Promise(resolve => setTimeout(resolve, 2500));
  }

  showFreeSpinOutro(): Promise<void> {
    this.winBanner.removeChildren();
    this.winBanner.visible = true;

    const bg = new Graphics();
    bg.roundRect(-200, -40, 400, 80, 20);
    bg.fill({ color: 0x1a1a5e, alpha: 0.95 });
    bg.stroke({ color: 0xffd700, width: 3 });
    this.winBanner.addChild(bg);

    const title = new BitmapText({
      text: 'FREE SPINS ENDED',
      style: { fontFamily: 'Arial', fontSize: 28, fill: 0xffd700, fontWeight: 'bold' },
    });
    title.anchor.set(0.5);
    this.winBanner.addChild(title);

    return new Promise(resolve =>
      setTimeout(() => {
        this.winBanner.visible = false;
        resolve();
      }, 2000)
    );
  }

  positionBanner(x: number, y: number): void {
    this.winBanner.x = x;
    this.winBanner.y = y;
  }

  private showWinBanner(totalWin: number): void {
    this.winBanner.removeChildren();
    this.winBanner.visible = true;

    const bg = new Graphics();
    bg.roundRect(-160, -35, 320, 70, 16);
    bg.fill({ color: 0x1a1a2e, alpha: 0.92 });
    bg.stroke({ color: 0xffff00, width: 3 });
    this.winBanner.addChild(bg);

    const label = new BitmapText({
      text: `WIN  $${totalWin}`,
      style: { fontFamily: 'Arial', fontSize: 30, fill: 0xffff00, fontWeight: 'bold' },
    });
    label.anchor.set(0.5);
    this.winBanner.addChild(label);
  }
}
