import type { GameConfig } from '../../core/types/GameConfig';

export const classicFruitConfig: GameConfig = {
  gameId: 'classic-fruit',
  reelCount: 3,
  rowCount: 3,

  symbols: [
    { id: 'seven',  label: '7',      color: 0xdd2222, weight: 1  },
    { id: 'bar',    label: 'BAR',    color: 0x2255cc, weight: 3  },
    { id: 'bell',   label: '🔔',     color: 0xcc8800, weight: 5  },
    { id: 'cherry', label: '🍒',     color: 0xdd3366, weight: 7  },
    { id: 'lemon',  label: '🍋',     color: 0xddbb00, weight: 9  },
    { id: 'plum',   label: '🍇',     color: 0x772299, weight: 11 },
    // { id: 'blank',  label: '—',      color: 0x222222, weight: 28 },
  ],

  // 5 paylines for a 3x3 grid:
  //   0: top row      [0,0,0]
  //   1: middle row   [1,1,1]
  //   2: bottom row   [2,2,2]
  //   3: diagonal ↘   [0,1,2]
  //   4: diagonal ↗   [2,1,0]
  paylines: [
    { id: 0, rows: [0, 0, 0] },
    { id: 1, rows: [1, 1, 1] },
    { id: 2, rows: [2, 2, 2] },
    { id: 3, rows: [0, 1, 2] },
    { id: 4, rows: [2, 1, 0] },
  ],

  // multiplier × bet for each symbol with 3 matches
  paytable: {
    seven:  { 3: 50 },
    bar:    { 3: 20 },
    bell:   { 3: 10 },
    cherry: { 3: 5  },
    lemon:  { 3: 3  },
    plum:   { 3: 2  },
  },

  freeSpins: {
    triggerSymbol: 'bell',
    triggerCount: 3,
    spinsAwarded: 10,
  },

  ui: {
    btnColorIdle:     0x22cc55,
    btnColorDisabled: 0x556655,
    btnColorFree:     0xffd700,
    btnRadius:        48,
    barHeight:        110,
    barBgColor:       0x000000,
    barBgAlpha:       0.55,
    barDividerColor:  0xffffff,
    barDividerAlpha:  0.15,
  },
};
