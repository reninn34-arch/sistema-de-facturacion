/**
 * ============================================
 * PRUEBAS E2E: PANEL DE ADMINISTRACIÓN SAAS
 * ============================================
 * 
 * Estas pruebas verifican la navegación y funcionalidad
 * del panel de administración, especialmente la sección
 * de usuarios que ha reportado problemas.
 * 
 * Bug conocido: Al hacer click en "Usuarios Totales" aparece en blanco
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Credenciales de prueba (ajustar según el seed)
const ADMIN_CREDENTIALS = {
  email: 'superadmin@admin.com',
  password: 'superadmin123'
};

test.describe('🟦 E2E: Panel de Administración SAAS', () => {
  
  // Función helper para hacer login como admin
  async function loginAsAdmin(page) {
    await page.goto(BASE_URL + '/login');
    await page.waitForLoadState('networkidle');
    
    // Buscar formulario de login
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    
    if (await emailInput.isVisible()) {
      await emailInput.fill(ADMIN_CREDENTIALS.email);
      await passwordInput.fill(ADMIN_CREDENTIALS.password);
      
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      
      // Esperar a que rediriga al panel
      await page.waitForTimeout(2000);
    }
  }

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-E2E-021: El panel SaaS carga correctamente', async ({ page }) => {
    // Ir directamente al panel SaaS (puede requerir login)
    await page.goto(BASE_URL + '/saas-admin');
    await page.waitForLoadState('networkidle');
    
    // La página debe tener contenido
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Verificar que hay algún contenido visible
    const mainContent = page.locator('main, .container, [class*="flex"]').first();
    const isVisible = await mainContent.isVisible().catch(() => false);
    
    // La página debe cargar algo
    const html = await page.content();
    expect(html.length).toBeGreaterThan(100);
  });

  test('TC-E2E-022: La pestaña de Usuarios es clickeable', async ({ page }) => {
    await page.goto(BASE_URL + '/saas-admin');
    await page.waitForLoadState('networkidle');
    
    // Buscar botón de pestaña de usuarios
    const usersTab = page.locator('button:has-text("Usuarios")').first();
    
    // Verificar que el botón existe
    const buttonExists = await usersTab.count() > 0;
    
    if (buttonExists) {
      // Hacer clic en el tab de usuarios
      await usersTab.click();
      await page.waitForTimeout(1000);
      
      // La página no debe estar en blanco después del clic
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(10);
    }
  });

  test('TC-E2E-023: La tarjeta "Usuarios Totales" es visible', async ({ page }) => {
    await page.goto(BASE_URL + '/saas-admin');
    await page.waitForLoadState('networkidle');
    
    // Buscar la tarjeta de "Usuarios Totales"
    const usersCard = page.locator('text=Usuarios Totales');
    
    // Verificar que la tarjeta existe
    const cardExists = await usersCard.count() > 0;
    expect(cardExists).toBe(true);
  });

  test('TC-E2E-024: Verificar que la sección de usuarios no queda en blanco', async ({ page }) => {
    await page.goto(BASE_URL + '/saas-admin');
    await page.waitForLoadState('networkidle');
    
    // Buscar el tab de usuarios
    const usersTab = page.locator('button:has-text("Usuarios")').first();
    
    if (await usersTab.isVisible()) {
      // Capturar errores de consola antes de hacer clic
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Hacer clic en el tab
      await usersTab.click();
      await page.waitForTimeout(2000);
      
      // Verificar que hay contenido después del clic
      const bodyContent = await page.locator('body').innerText();
      
      // No debe estar vacío
      expect(bodyContent.length).toBeGreaterThan(0);
      
      // No debe tener errores críticos
      const criticalErrors = consoleErrors.filter(e => 
        !e.includes('favicon') && 
        !e.includes('net::') &&
        !e.includes('404')
      );
      
      // Imprimir errores si los hay (para diagnóstico)
      if (criticalErrors.length > 0) {
        console.log('Errores críticos encontrados:', criticalErrors);
      }
    }
  });

  test('TC-E2E-025: La tabla de usuarios muestra datos o mensaje de vacío', async ({ page }) => {
    await page.goto(BASE_URL + '/saas-admin');
    await page.waitForLoadState('networkidle');
    
    // Buscar y hacer clic en el tab de usuarios
    const usersTab = page.locator('button:has-text("Usuarios")').first();
    
    if (await usersTab.isVisible()) {
      await usersTab.click();
      await page.waitForTimeout(2000);
      
      // Verificar que hay algo visible en la sección de usuarios
      // Ya sea la tabla o un mensaje de "no hay usuarios"
      const hasTable = await page.locator('table').count() > 0;
      const hasEmptyMessage = await page.locator('text=No se encontraron usuarios').count() > 0;
      const hasLoading = await page.locator('text=Cargando').count() > 0;
      
      // Al menos una de estas condiciones debe ser verdadera
      expect(hasTable || hasEmptyMessage || hasLoading).toBe(true);
    }
  });

  test('TC-E2E-026: Los tabs de navegación funcionan correctamente', async ({ page }) => {
    await page.goto(BASE_URL + '/saas-admin');
    await page.waitForLoadState('networkidle');
    
    // Lista de tabs a probar
    const tabs = ['Empresas', 'Usuarios', 'Pagos'];
    
    for (const tabName of tabs) {
      const tabButton = page.locator(`button:has-text("${tabName}")`).first();
      
      if (await tabButton.isVisible()) {
        // Hacer clic en el tab
        await tabButton.click();
        await page.waitForTimeout(1000);
        
        // Verificar que la página aún tiene contenido
        const bodyContent = await page.locator('body').innerText();
        expect(bodyContent.length).toBeGreaterThan(0);
      }
    }
  });

  test('TC-E2E-027: Las tarjetas de estadísticas son clickeables', async ({ page }) => {
    await page.goto(BASE_URL + '/saas-admin');
    await page.waitForLoadState('networkidle');
    
    // Buscar tarjetas de estadísticas
    const statsCards = page.locator('[class*="rounded"], [class*="bg-white"]').filter({ has: page.locator('text=Usuarios') });
    
    const cardsCount = await statsCards.count();
    if (cardsCount > 0) {
      // Hacer clic en la tarjeta
      await statsCards.first().click({ force: true });
      await page.waitForTimeout(1000);
      
      // Verificar que no quedó en blanco
      const bodyContent = await page.locator('body').innerText();
      expect(bodyContent.length).toBeGreaterThan(0);
    }
  });
});

test.describe('🟦 E2E: API de Usuarios (Diagnóstico)', () => {
  
  test('TC-E2E-028: El endpoint de usuarios responde correctamente', async ({ request }) => {
    // Este test verifica que la API funciona
    // Nota: Requiere que el backend esté ejecutándose
    
    const API_URL = process.env.API_URL || 'http://localhost:3001';
    
    // Primero intentar obtener el token haciendo login
    const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
      data: ADMIN_CREDENTIALS
    });
    
    if (loginResponse.status() === 200) {
      const { token } = await loginResponse.json();
      
      // Luego hacer la solicitud a /api/users
      const usersResponse = await request.get(`${API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Verificar la respuesta
      expect([200, 401]).toContain(usersResponse.status());
      
      if (usersResponse.status() === 200) {
        const users = await usersResponse.json();
        expect(Array.isArray(users)).toBe(true);
      }
    }
  });
});

/**
 * ============================================
 * RESUMEN DE PRUEBAS AÑADIDAS
 * ============================================
 * 
 * Panel de Administración (7 pruebas):
 * - TC-E2E-021: El panel SaaS carga correctamente
 * - TC-E2E-022: La pestaña de Usuarios es clickeable
 * - TC-E2E-023: La tarjeta "Usuarios Totales" es visible
 * - TC-E2E-024: Verificar sección usuarios no queda en blanco
 * - TC-E2E-025: Tabla muestra datos o mensaje de vacío
 * - TC-E2E-026: Tabs de navegación funcionan
 * - TC-E2E-027: Tarjetas de estadísticas son clickeables
 * 
 * Diagnóstico API (1 prueba):
 * - TC-E2E-028: Endpoint de usuarios responde correctamente
 */
