# Slot Machine (PixiJS)

Interactive HTML5 slot machine game built with PixiJS v8 and TypeScript.

## Features

- **Reel animations** — physics-based spin with velocity, motion blur, deceleration, overshoot bounce
- **Weighted symbol randomization** — each symbol has a configurable probability weight
- **Win detection** — evaluates 5 paylines (top row, middle row, bottom row, both diagonals)
- **Win presentation** — pulsing highlight overlay with connector lines and win banner
- **Anticipation effect** — last reel slows dramatically when first two reels match
- **Free spins** — triggered by 3 bells; 10 free spins awarded with dedicated UI mode
- **Bet system** — 5 bet levels ($10 / $20 / $50 / $70 / $100), constrained by balance
- **Balance management** — animated balance counter, play-again flow when funds run out
- **Responsive scaling** — fixed design canvas scaled to fit any viewport via `ScaleManager`
- **Game state machine** — deterministic transitions (IDLE → SPINNING → REVEALING → WIN_PRESENTATION → ...)

## Symbols & Paytable

| Symbol | Label | 3-of-a-kind payout |
| ------ | ----- | ------------------ |
| Seven  | 7     | 50× bet            |
| Bar    | BAR   | 20× bet            |
| Bell   | 🔔    | 10× bet            |
| Cherry | 🍒    | 5× bet             |
| Lemon  | 🍋    | 3× bet             |
| Plum   | 🍇    | 2× bet             |

## Tech Stack

| Tool       | Version |
| ---------- | ------- |
| PixiJS     | ^8.0    |
| TypeScript | ^5.5    |
| Vite       | ^5.4    |

## Architecture

```
src/
├── main.ts                        # Entry point
├── core/
│   ├── engine/
│   │   ├── GameEngine.ts          # Orchestrates all systems + spin flow
│   │   └── StateMachine.ts        # Game state transitions
│   ├── systems/
│   │   ├── ReelSystem.ts          # Reel views, animations, physics
│   │   ├── WinSystem.ts           # Win line rendering, banners
│   │   ├── UISystem.ts            # HUD, spin button, bet controls
│   │   └── ScaleManager.ts        # Responsive canvas scaling
│   ├── services/
│   │   ├── ISpinService.ts        # Spin service interface
│   │   └── MockSpinService.ts     # Client-side spin logic (no backend needed)
│   └── types/
│       ├── GameConfig.ts
│       ├── GameState.ts
│       └── SpinResult.ts
└── games/
    └── classic-fruit/
        └── config.ts              # Symbols, paylines, paytable, UI theme
```

## How to Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Other Scripts

```bash
npm run build    # TypeScript check + production build
npm run preview  # Preview the production build locally
```

## Adding a New Game Theme

Create a new config file following the `GameConfig` interface and pass it to `GameEngine`:

```ts
import { GameEngine } from "./core/engine/GameEngine";
import { MockSpinService } from "./core/services/MockSpinService";
import { myThemeConfig } from "./games/my-theme/config";

const engine = new GameEngine(
  myThemeConfig,
  new MockSpinService(myThemeConfig),
);
await engine.init();
```
