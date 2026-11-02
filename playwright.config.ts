import {defineConfig, devices} from '@playwright/test';

const PUERTO = 3100;
const CI = Boolean(process.env.CI);

/**
 * Los E2E corren contra el build servido (`docusaurus serve`), no contra el servidor de desarrollo:
 * es lo mismo que se publica. Hay que correr `npm run build` antes.
 * No hay login ni storageState: el sitio es público y el estado vive en localStorage de cada contexto.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  // Un test que pasa solo al reintentar es un test inestable: se reintenta para tener el trace
  // (on-first-retry) y igual falla el job, en lugar de taparlo.
  retries: 2,
  failOnFlakyTests: true,
  workers: CI ? 2 : undefined,
  reporter: [['list'], ['html', {open: 'never'}]],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    trace: 'on-first-retry',
    screenshot: 'off',
    video: 'off',
    locale: 'es-AR',
    colorScheme: 'light',
  },
  projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}],
  webServer: {
    command: `npm run serve -- --port ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !CI,
    timeout: 60_000,
  },
});
