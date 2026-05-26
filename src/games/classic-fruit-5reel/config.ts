import type { GameConfig } from "../../core/types/GameConfig";

export const classicFruit5ReelConfig: GameConfig = {
  gameId: "classic-fruit-5reel",
  reelCount: 5,
  rowCount: 3,

  symbols: [
    { id: "seven", label: "7", color: 0xdd2222, weight: 1 },
    { id: "bar", label: "BAR", color: 0x2255cc, weight: 3 },
    { id: "bell", label: "🔔", color: 0xcc8800, weight: 5 },
    { id: "cherry", label: "🍒", color: 0xdd3366, weight: 7 },
    { id: "lemon", label: "🍋", color: 0xddbb00, weight: 9 },
    { id: "plum", label: "🍇", color: 0x772299, weight: 11 },
  ],

  // 9 paylines for a 5×3 grid (one row index per reel):
  //   0: middle row       [1,1,1,1,1]
  //   1: top row          [0,0,0,0,0]
  //   2: bottom row       [2,2,2,2,2]
  //   3: mountain (∧)     [0,1,2,1,0]  — left/right edges high, dips to bottom centre
  //   4: valley  (∨)      [2,1,0,1,2]  — left/right edges low, peaks to top centre
  //   5: diagonal ↘       [0,0,1,2,2]
  //   6: diagonal ↗       [2,2,1,0,0]
  //   7: zigzag up-down   [1,0,1,2,1]
  //   8: zigzag down-up   [1,2,1,0,1]
  paylines: [
    { id: 0, rows: [1, 1, 1, 1, 1] },
    { id: 1, rows: [0, 0, 0, 0, 0] },
    { id: 2, rows: [2, 2, 2, 2, 2] },
    { id: 3, rows: [0, 1, 2, 1, 0] },
    { id: 4, rows: [2, 1, 0, 1, 2] },
    { id: 5, rows: [0, 0, 1, 2, 2] },
    { id: 6, rows: [2, 2, 1, 0, 0] },
    { id: 7, rows: [1, 0, 1, 2, 1] },
    { id: 8, rows: [1, 2, 1, 0, 1] },
  ],

  // multiplier × bet; supports 3-, 4-, and 5-of-a-kind
  paytable: {
    seven: { 3: 10, 4: 25, 5: 50 },
    bar: { 3: 5, 4: 10, 5: 20 },
    bell: { 3: 4, 4: 8, 5: 10 },
    cherry: { 3: 3, 4: 5, 5: 8 },
    lemon: { 3: 2, 4: 4, 5: 6 },
    plum: { 3: 1, 4: 2, 5: 3 },
  },

  freeSpins: {
    triggerSymbol: "bell",
    triggerCount: 3,
    spinsAwarded: 10,
  },

  ui: {
    btnColorIdle: 0x22cc55,
    btnColorDisabled: 0x556655,
    btnColorFree: 0xffd700,
    btnRadius: 48,
    barHeight: 110,
    barBgColor: 0x000000,
    barBgAlpha: 0.55,
    barDividerColor: 0xffffff,
    barDividerAlpha: 0.15,
  },
};
