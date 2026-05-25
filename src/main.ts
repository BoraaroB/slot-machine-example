import { GameEngine } from './core/engine/GameEngine';
import { MockSpinService } from './core/services/MockSpinService';
import { classicFruitConfig } from './games/classic-fruit/config';

const spinService = new MockSpinService(classicFruitConfig, 1000);
const engine = new GameEngine(classicFruitConfig, spinService);

engine.init().catch(console.error);
