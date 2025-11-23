import { expect, test } from '@playwright/test';

const appEnv = (process.env.VITE_APP_ENV || process.env.NODE_ENV || '').toLowerCase();
const isProdLike = appEnv === 'production' || appEnv === 'prod';

test.describe('Observability smoke checks', () => {
  test('@smoke requiere Sentry DSN en entornos productivos', async () => {
    test.skip(!isProdLike, 'Solo se valida en entornos productivos');

    expect(
      process.env.VITE_SENTRY_DSN,
      'Define VITE_SENTRY_DSN en CI para builds productivas',
    ).toBeTruthy();
  });
});
