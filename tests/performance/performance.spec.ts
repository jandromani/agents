import { describe, expect, it } from 'vitest';

const TARGET = process.env.PERF_BASE_URL || process.env.E2E_BASE_URL || process.env.SMOKE_BASE_URL;

const measure = async <T>(fn: () => Promise<T>) => {
  const start = performance.now();
  const result = await fn();
  return { result, duration: performance.now() - start };
};

describe('Pruebas de rendimiento', () => {
  if (!TARGET) {
    it('se omite por no tener un host objetivo', () => {
      expect(true).toBe(true);
    });
    return;
  }

  it('responde rápido bajo carga moderada', async () => {
    const { duration, result } = await measure(async () =>
      Promise.all(Array.from({ length: 5 }).map(() => fetch(`${TARGET}/`)))
    );

    result.forEach(response => expect(response.ok).toBeTruthy());
    expect(duration).toBeLessThan(3000);
  });

  it('mantiene la latencia en rutas críticas', async () => {
    const critical = ['/', '/payments', '/onboarding'];

    for (const path of critical) {
      const { duration, result } = await measure(() => fetch(`${TARGET}${path}`));
      expect(result.ok).toBeTruthy();
      expect(duration).toBeLessThan(1500);
    }
  });
});
