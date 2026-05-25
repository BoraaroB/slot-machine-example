import type { Application } from 'pixi.js';

export const DESIGN_W = 800;
export const DESIGN_H = 600;

export class ScaleManager {
  private app: Application;
  private onResizeCb?: () => void;
  private boundResize: () => void;

  constructor(app: Application) {
    this.app = app;
    this.boundResize = () => this.resize();
    window.addEventListener('resize', this.boundResize);
    this.resize();
  }

  onResize(cb: () => void): void {
    this.onResizeCb = cb;
  }

  destroy(): void {
    window.removeEventListener('resize', this.boundResize);
  }

  private resize(): void {
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;

    const scale = Math.min(windowW / DESIGN_W, windowH / DESIGN_H);

    this.app.renderer.resize(windowW, windowH);

    this.app.stage.scale.set(scale);
    this.app.stage.x = Math.round((windowW - DESIGN_W * scale) / 2);
    this.app.stage.y = Math.round((windowH - DESIGN_H * scale) / 2);

    this.onResizeCb?.();
  }
}
