export interface SymbolConfig {
  id: string;
  label: string;
  color: number;
  weight: number;
}

export interface PaylineConfig {
  id: number;
  rows: number[]; // one row index per reel, e.g. [1,1,1] = middle row across all reels
}

export interface FreeSpinsConfig {
  triggerSymbol: string;
  triggerCount: number;
  spinsAwarded: number;
}

export interface UIThemeConfig {
  btnColorIdle: number;
  btnColorDisabled: number;
  btnColorFree: number;
  btnRadius: number;
  barHeight: number;
  barBgColor: number;
  barBgAlpha: number;
  barDividerColor: number;
  barDividerAlpha: number;
}

export interface GameConfig {
  gameId: string;
  reelCount: number;
  rowCount: number;
  symbols: SymbolConfig[];
  paylines: PaylineConfig[];
  paytable: Record<string, Record<number, number>>; // symbolId -> matchCount -> multiplier
  freeSpins?: FreeSpinsConfig;
  ui?: Partial<UIThemeConfig>;
}
