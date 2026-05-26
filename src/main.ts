import { GameEngine } from "./core/engine/GameEngine";
import { MockSpinService } from "./core/services/MockSpinService";
import { classicFruitConfig } from "./games/classic-fruit/config";
// import { classicFruit5ReelConfig } from './games/classic-fruit-5reel/config';

const spinService = new MockSpinService(classicFruitConfig, 1000);
const engine = new GameEngine(classicFruitConfig, spinService);

(async () => {
  try {
    await engine.init();
  } catch (err) {
    console.error("[GameEngine] Fatal:", err);
  }
})();
