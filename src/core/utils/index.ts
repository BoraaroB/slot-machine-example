export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function weightedRandom(symbols: ReadonlyArray<{ id: string; weight: number }>): string {
  const total = symbols.reduce((sum, s) => sum + s.weight, 0);
  let rng = Math.random() * total;
  for (const s of symbols) {
    rng -= s.weight;
    if (rng <= 0) return s.id;
  }
  return symbols[symbols.length - 1].id;
}
