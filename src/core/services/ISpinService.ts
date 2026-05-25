import type { SpinResult } from '../types/SpinResult';

export interface ISpinService {
  spin(bet: number, isFree?: boolean): Promise<SpinResult>;
}
