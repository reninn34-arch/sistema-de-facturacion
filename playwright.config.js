import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para pruebas E2E
 * 
 * Este archivo define la configuración base para las pruebas
 * de extremo a extremo del sistema de facturación.
 */
export default defineConfig({
  // Directorio donde se encuentran los archivos de prueba
  testDir: './tests/e2e',
  
  // Tiempo máximo por prueba (30 segundos)
  timeout: 30000,
  
  // No stopper las pruebas cuando una falla (continue)
  fullyParallel: false,
  
  // Permitir reintentar pruebas fallidas
  retries: 0,
  
  // Workers para ejecutar pruebas en paralelo
  workers: 1,
  
  // Reporteros de resultados
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  
  // Configuración de los proyectos/navegadores
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  
  // Configuración del servidor web para pruebas
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  // Configuración de trazas (para depuración)
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    baseURL: 'http://localhost:5173',
  },
});
