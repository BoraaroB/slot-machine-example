import { Container, Graphics, Text, Application, BlurFilter } from 'pixi.js';
import { DESIGN_W } from './ScaleManager';
import { weightedRandom } from '../utils';
import type { GameConfig, SymbolConfig } from '../types/GameConfig';

const SYMBOL_W = 150;
const SYMBOL_H = 150;
const REEL_GAP       = 10;
const STRIP_SIZE     = 5;
const BASE_VELOCITY  = 28;
const MIN_STOP_VELOCITY = 6;
const DECELERATION   = 1.2;
const ANTICIPATION_DECEL    = 0.28;
const ANTICIPATION_VEL_CAP  = 10;
const OVERSHOOT_PX   = 14;
const BOUNCE_DOWN    = 5;
const BOUNCE_UP      = 7.5;

type ReelPhase = 'idle' | 'spinning' | 'braking' | 'overshoot' | 'returning';

// ─── SymbolTile ──────────────────────────────────────────────────────────────

class SymbolTile {
  readonly container: Container;
  private bg: Graphics;
  private label: Text;

  constructor() {
    this.container = new Container();
    this.bg = new Graphics();
    this.label = new Text({
      text: '',
      style: { fontSize: 40, fill: 0xffffff, fontWeight: 'bold', dropShadow: true },
    });
    this.label.anchor.set(0.5);
    this.label.x = SYMBOL_W / 2;
    this.label.y = SYMBOL_H / 2;
    this.container.addChild(this.bg);
    this.container.addChild(this.label);
  }

  setSymbol(cfg: SymbolConfig): void {
    this.bg.clear();
    this.bg.roundRect(4, 4, SYMBOL_W - 8, SYMBOL_H - 8, 14);
    this.bg.fill(cfg.color);
    this.bg.roundRect(4, 4, SYMBOL_W - 8, SYMBOL_H - 8, 14);
    this.bg.stroke({ color: 0xffffff, width: 2, alpha: 0.25 });
    this.label.text = cfg.label;
  }
}

// ─── ReelView ────────────────────────────────────────────────────────────────

class ReelView {
  readonly container: Container;
  private strip: Container;
  private tiles: SymbolTile[];
  private symbolIds: string[];
  private readonly symbolMap: Map<string, SymbolConfig>;
  private readonly weightedSymbols: ReadonlyArray<{ id: string; weight: number }>;
  private readonly blurFilter: BlurFilter;

  private scrollY    = 0;
  private velocity   = 0;
  private decelRate  = DECELERATION;
  private decelerating = false;
  private pendingStop  = false;
  private targetSymbols: string[] = [];
  private stopResolve: (() => void) | null = null;
  private phase: ReelPhase = 'idle';
  private overshootY = 0;

  constructor(symbolMap: Map<string, SymbolConfig>, allIds: string[]) {
    this.symbolMap       = symbolMap;
    this.weightedSymbols = allIds.map(id => ({ id, weight: symbolMap.get(id)?.weight ?? 1 }));

    this.container = new Container();
    this.strip     = new Container();
    this.blurFilter = new BlurFilter({ strength: 0, quality: 3 });

    this.tiles = Array.from({ length: STRIP_SIZE }, (_, i) => {
      const tile = new SymbolTile();
      tile.container.y = (i - 1) * SYMBOL_H;
      this.strip.addChild(tile.container);
      return tile;
    });

    this.symbolIds = Array.from({ length: STRIP_SIZE }, () => this.randomId());
    this.refreshTiles();

    const mask = new Graphics();
    mask.rect(0, 0, SYMBOL_W, SYMBOL_H * 3);
    mask.fill(0xffffff);
    this.container.addChild(mask);
    this.container.addChild(this.strip);
    this.container.mask = mask;
  }

  startSpin(): void {
    this.velocity    = BASE_VELOCITY;
    this.decelRate   = DECELERATION;
    this.phase       = 'spinning';
    this.decelerating = false;
    this.pendingStop  = false;
    this.scrollY     = 0;
    this.strip.y     = 0;
    this.blurFilter.strength = 10;
    this.strip.filters       = [this.blurFilter];
  }

  stopSpin(targetSymbols: string[], slowDecel = false): Promise<void> {
    this.targetSymbols = [...targetSymbols];
    this.pendingStop   = true;
    this.decelerating  = true;
    this.phase         = 'braking';

    if (slowDecel) {
      this.velocity  = Math.min(this.velocity, ANTICIPATION_VEL_CAP);
      this.decelRate = ANTICIPATION_DECEL;
    } else {
      this.decelRate = DECELERATION;
    }

    return new Promise(resolve => { this.stopResolve = resolve; });
  }

  update(deltaTime: number): void {
    if (this.phase === 'overshoot') {
      this.overshootY += BOUNCE_DOWN * deltaTime;
      this.strip.y = this.overshootY;
      if (this.overshootY >= OVERSHOOT_PX) this.phase = 'returning';
      return;
    }

    if (this.phase === 'returning') {
      this.overshootY = Math.max(0, this.overshootY - BOUNCE_UP * deltaTime);
      this.strip.y    = this.overshootY;
      if (this.overshootY <= 0) {
        this.strip.y = 0;
        this.phase   = 'idle';
        this.stopResolve?.();
        this.stopResolve = null;
      }
      return;
    }

    if (this.velocity <= 0) {
      if (this.pendingStop) this.applyTargetAndBounce();
      return;
    }

    if (this.decelerating) {
      this.velocity = Math.max(0, this.velocity - this.decelRate * deltaTime);
      this.blurFilter.strength = this.velocity * 0.38;
    }

    this.scrollY += this.velocity * deltaTime;

    while (this.scrollY >= SYMBOL_H) {
      this.scrollY -= SYMBOL_H;
      if (this.pendingStop && this.velocity <= MIN_STOP_VELOCITY) {
        this.applyTargetAndBounce();
        return;
      }
      this.advanceStrip();
    }

    this.strip.y = this.scrollY;
  }

  getRowY(rowIdx: number): number {
    return rowIdx * SYMBOL_H;
  }

  getTileAtRow(rowIdx: number): SymbolTile {
    return this.tiles[rowIdx + 1];
  }

  // ─── private ─────────────────────────────────────────────────────────────

  private applyTargetAndBounce(): void {
    this.symbolIds[0] = this.randomId();
    this.symbolIds[1] = this.targetSymbols[0];
    this.symbolIds[2] = this.targetSymbols[1];
    this.symbolIds[3] = this.targetSymbols[2];
    this.symbolIds[4] = this.randomId();
    this.refreshTiles();

    this.velocity    = 0;
    this.scrollY     = 0;
    this.strip.y     = 0;
    this.pendingStop = false;
    this.decelerating = false;

    this.strip.filters        = [];
    this.blurFilter.strength  = 0;

    this.phase      = 'overshoot';
    this.overshootY = 0;
  }

  private advanceStrip(): void {
    this.symbolIds.pop();
    this.symbolIds.unshift(this.randomId());
    this.refreshTiles();
  }

  private refreshTiles(): void {
    for (let i = 0; i < STRIP_SIZE; i++) {
      const cfg = this.symbolMap.get(this.symbolIds[i]);
      if (cfg) this.tiles[i].setSymbol(cfg);
    }
  }

  private randomId(): string {
    return weightedRandom(this.weightedSymbols);
  }
}

// ─── ReelSystem ──────────────────────────────────────────────────────────────

export class ReelSystem {
  readonly container: Container;
  private reelViews: ReelView[];
  private reelStartX: number;
  private reelStartY: number;

  constructor(app: Application, config: GameConfig) {
    this.container = new Container();

    const totalW = config.reelCount * SYMBOL_W + (config.reelCount - 1) * REEL_GAP;
    this.reelStartX = Math.round((DESIGN_W - totalW) / 2);
    this.reelStartY = 30;

    const panel = new Graphics();
    panel.roundRect(
      this.reelStartX - 12,
      this.reelStartY - 12,
      totalW + 24,
      config.rowCount * SYMBOL_H + 24,
      16,
    );
    panel.fill({ color: 0x000000, alpha: 0.4 });
    panel.stroke({ color: 0xffffff, width: 2, alpha: 0.15 });
    this.container.addChild(panel);

    const symbolMap = new Map<string, SymbolConfig>(config.symbols.map(s => [s.id, s]));
    const allIds    = config.symbols.map(s => s.id);

    this.reelViews = config.symbols.length > 0
      ? Array.from({ length: config.reelCount }, (_, i) => {
          const reel = new ReelView(symbolMap, allIds);
          reel.container.x = this.reelStartX + i * (SYMBOL_W + REEL_GAP);
          reel.container.y = this.reelStartY;
          this.container.addChild(reel.container);
          return reel;
        })
      : [];

    app.stage.addChild(this.container);
  }

  startSpin(): void {
    this.reelViews.forEach(r => r.startSpin());
  }

  stopSpin(reelResults: string[][]): Promise<void> {
    const anticipate = this.shouldAnticipate(reelResults);

    const promises = this.reelViews.map((reel, i) => {
      const isLast     = i === this.reelViews.length - 1;
      const baseDelay  = i * 550;
      const extraDelay = isLast && anticipate ? 1200 : 0;

      return new Promise<void>(resolve => {
        setTimeout(() => {
          reel.stopSpin(reelResults[i], isLast && anticipate).then(resolve);
        }, baseDelay + extraDelay);
      });
    });

    return Promise.all(promises).then(() => undefined);
  }

  update(deltaTime: number): void {
    this.reelViews.forEach(r => r.update(deltaTime));
  }

  getCellBounds(reelIdx: number, rowIdx: number): { x: number; y: number; w: number; h: number } {
    return {
      x: this.reelStartX + reelIdx * (SYMBOL_W + REEL_GAP),
      y: this.reelStartY + rowIdx * SYMBOL_H,
      w: SYMBOL_W,
      h: SYMBOL_H,
    };
  }

  // Anticipation: last reel slows if first two share a non-blank middle symbol
  private shouldAnticipate(reelResults: string[][]): boolean {
    if (reelResults.length < 3) return false;
    const sym0 = reelResults[0][1];
    const sym1 = reelResults[1][1];
    return sym0 === sym1 && sym0 !== 'blank';
  }
}
