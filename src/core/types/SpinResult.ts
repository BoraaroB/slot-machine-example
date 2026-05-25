export interface WinLine {
  paylineId: number;
  symbolId: string;
  count: number;
  payout: number;
}

export interface FreeSpinsData {
  awarded: number;
  remaining: number;
}

export interface SpinResult {
  reels: string[][];       // [reelIndex][rowIndex] = symbolId
  winLines: WinLine[];
  totalWin: number;
  balance: number;
  freeSpins: FreeSpinsData | null;
}
