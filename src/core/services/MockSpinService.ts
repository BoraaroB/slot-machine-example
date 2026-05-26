import type { ISpinService } from './ISpinService';
import type { GameConfig } from '../types/GameConfig';
import type { SpinResult, WinLine } from '../types/SpinResult';
import { delay, weightedRandom } from '../utils';

export class MockSpinService implements ISpinService {
  private balance: number;

  constructor(private readonly config: GameConfig, initialBalance = 1000) {
    this.balance = initialBalance;
  }

  async spin(bet: number, isFree = false): Promise<SpinResult> {
    await delay(400 + Math.random() * 300);

    if (!isFree) this.balance = Math.max(0, this.balance - bet);

    const reels = this.generateReels();
    const winLines = this.calculateWins(reels, bet);
    const totalWin = winLines.reduce((acc, l) => acc + l.payout, 0);
    this.balance += totalWin;

    return {
      reels,
      winLines,
      totalWin,
      balance: this.balance,
      freeSpins: this.checkFreeSpins(reels),
    };
  }

  private generateReels(): string[][] {
    return Array.from({ length: this.config.reelCount }, () =>
      Array.from({ length: this.config.rowCount }, () => weightedRandom(this.config.symbols))
    );
  }

  private calculateWins(reels: string[][], bet: number): WinLine[] {
    const wins: WinLine[] = [];

    for (const payline of this.config.paylines) {
      const symbols = payline.rows.map((rowIdx, reelIdx) => reels[reelIdx][rowIdx]);
      const first = symbols[0];
      let matchCount = 1;

      for (let i = 1; i < symbols.length; i++) {
        if (symbols[i] === first) matchCount++;
        else break;
      }

      if (matchCount >= 3) {
        const multiplier = this.config.paytable[first]?.[matchCount] ?? 0;
        if (multiplier > 0) {
          wins.push({
            paylineId: payline.id,
            symbolId: first,
            count: matchCount,
            payout: bet * multiplier,
          });
        }
      }
    }

    return wins;
  }

  private checkFreeSpins(reels: string[][]): SpinResult['freeSpins'] {
    const cfg = this.config.freeSpins;
    if (!cfg) return null;

    let count = 0;
    for (const reel of reels) {
      for (const sym of reel) {
        if (sym === cfg.triggerSymbol) count++;
      }
    }

    if (count >= cfg.triggerCount) {
      return { awarded: cfg.spinsAwarded, remaining: cfg.spinsAwarded };
    }

    return null;
  }
}

