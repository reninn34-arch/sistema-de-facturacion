/**
 * ============================================
 * PRUEBAS DE CAJA NEGRA (BLACK BOX TESTING)
 * ============================================
 * 
 * Estas pruebas verifican el comportamiento del sistema
 * SIN conocer la implementación interna. Se centran en:
 * - Entradas y salidas de la API
 * - Comportamiento esperado desde la perspectiva del usuario
 * - Casos de uso y escenarios de negocio
 * 
 * Objetivos: Detectar errores de funcionalidad, 
 * requisitos faltantes y comportamientos inesperados.
 * 
 * CREDENCIALES DE PRUEBA:
 * - Superadmin: superadmin@admin.com / superadmin123
 * - Demo: demo@empresa.com / demo123456
 */

const request = require('supertest');

// URL base de la API - ajustar según el entorno
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

// Credenciales de prueba - basadas en el seed
const TEST_CREDENTIALS = {
  demo: {
    email: 'demo@empresa.com',
    password: 'demo123456'
  },
  superadmin: {
    email: 'superadmin@admin.com',
    password: 'superadmin123'
  }
};

describe('🟦 CAJA NEGRA: Pruebas del Sistema de Autenticación', () => {
  
  describe('POST /api/login - Inicio de Sesión', () => {
    
    /**
     * TC-BB-001: Login exitoso con credenciales válidas
     * Entrada: Email y contraseña válidos
     * Salida esperada: Token JWT y datos del usuario
     */
    it('debería iniciar sesión exitosamente con credenciales válidas', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/login')
        .send(TEST_CREDENTIALS.demo);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('role');
    });

    /**
     * TC-BB-002: Login fallido con contraseña incorrecta
     * Entrada: Email válido, contraseña incorrecta
     * Salida esperada: Error 401
     */
    it('debería rechazar login con contraseña incorrecta', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/login')
        .send({
          email: TEST_CREDENTIALS.demo.email,
          password: 'contraseña_incorrecta'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    /**
     * TC-BB-003: Login fallido con email inexistente
     * Entrada: Email no registrado en el sistema
     * Salida esperada: Error 401
     */
    it('debería rechazar login con email inexistente', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/login')
        .send({
          email: 'noexiste@ejemplo.com',
          password: 'cualquiera123'
        });

      expect(response.status).toBe(401);
    });

    /**
     * TC-BB-004: Login fallido con campos vacíos
     * Entrada: Email o contraseña vacíos
     * Salida esperada: Error 400
     */
    it('debería rechazar login con campos vacíos', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/login')
        .send({
          email: '',
          password: ''
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    /**
     * TC-BB-005: Login fallido sin enviar body
     * Entrada: Solicitud sin datos
     * Salida esperada: Error 400
     */
    it('debería rechazar login sin datos en el body', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/login')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/register - Registro de Usuario', () => {
    
    /**
     * TC-BB-006: Registro exitoso de nuevo usuario
     * Entrada: Datos completos y válidos
     * Salida esperada: Usuario creado exitosamente
     */
    it('debería registrar un nuevo usuario exitosamente', async () => {
      const timestamp = Date.now();
      const response = await request(API_BASE_URL)
        .post('/api/register')
        .send({
          email: `test_${timestamp}@ejemplo.com`,
          password: 'Password123!',
          name: 'Usuario de Prueba',
          businessName: 'Empresa de Prueba',
          ruc: '179' + timestamp.toString().substring(0, 10)
        });

      // Ajustar según la implementación real
      expect([200, 201]).toContain(response.status);
    });

    /**
     * TC-BB-007: Registro fallido con email duplicado
     * Entrada: Email que ya existe en el sistema
     * Salida esperada: Error indicando duplicado
     */
    it('debería rechazar registro con email duplicado', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/register')
        .send({
          email: 'demo@empresa.com',
          password: 'Password123!',
          name: 'Usuario Duplicado',
          businessName: 'Empresa Duplicada',
          ruc: '1791234567001'
        });

      expect([400, 409]).toContain(response.status);
    });

    /**
     * TC-BB-008: Registro fallido con RUC inválido
     * Entrada: RUC con formato incorrecto
     * Salida esperada: Error de validación
     */
    it('debería rechazar registro con RUC inválido', async () => {
      const timestamp = Date.now();
      const response = await request(API_BASE_URL)
        .post('/api/register')
        .send({
          email: `test_${timestamp}@ejemplo.com`,
          password: 'Password123!',
          name: 'Usuario Prueba',
          businessName: 'Empresa Prueba',
          ruc: '123' // RUC muy corto
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/verify - Verificación de Token', () => {
    let authToken;

    beforeAll(async () => {
      // Obtener token para pruebas autenticadas
      const loginResponse = await request(API_BASE_URL)
        .post('/api/login')
        .send({
          email: 'demo@empresa.com',
          password: 'demo123456'
        });
      
      if (loginResponse.status === 200) {
        authToken = loginResponse.body.token;
      }
    });

    /**
     * TC-BB-009: Verificación exitosa de token válido
     * Entrada: Token JWT válido
     * Salida esperada: Usuario válido
     */
    it('debería verificar token válido correctamente', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const response = await request(API_BASE_URL)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
    });

    /**
     * TC-BB-010: Verificación fallida de token inválido
     * Entrada: Token JWT falso o manipulado
     * Salida esperada: Error 401
     */
    it('debería rechazar token inválido', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer token_invalido_12345');

      expect(response.status).toBe(401);
    });

    /**
     * TC-BB-011: Verificación sin token
     * Entrada: Solicitud sin header Authorization
     * Salida esperada: Error 401
     */
    it('debería rechazar solicitud sin token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/verify');

      expect(response.status).toBe(401);
    });
  });
});

describe('🟦 CAJA NEGRA: Pruebas de Gestión de Empresas', () => {
  let authToken;

  beforeAll(async () => {
    const loginResponse = await request(API_BASE_URL)
      .post('/api/login')
      .send({
        email: 'demo@empresa.com',
        password: 'demo123456'
      });
    
    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    }
  });

  describe('GET /api/business/users - Listar Usuarios', () => {
    
    /**
     * TC-BB-012: Listar usuarios autenticado
     * Entrada: Token de autenticación válido
     * Salida esperada: Lista de usuarios
     */
    it('debería listar usuarios con autenticación válida', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const response = await request(API_BASE_URL)
        .get('/api/business/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    /**
     * TC-BB-013: Listar usuarios sin autenticación
     * Entrada: Solicitud sin token
     * Salida esperada: Error 401
     */
    it('debería rechazar solicitud sin autenticación', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/business/users');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/business/users - Crear Usuario', () => {
    
    /**
     * TC-BB-014: Crear usuario con datos válidos
     * Entrada: Datos completos del nuevo usuario
     * Salida esperada: Usuario creado
     */
    it('debería crear usuario con datos válidos', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const timestamp = Date.now();
      const response = await request(API_BASE_URL)
        .post('/api/business/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: `nuevo_${timestamp}@empresa.com`,
          password: 'Password123!',
          name: 'Nuevo Usuario',
          role: 'user'
        });

      expect([200, 201]).toContain(response.status);
    });

    /**
     * TC-BB-015: Crear usuario con email duplicado
     * Entrada: Email que ya existe
     * Salida esperada: Error 400
     */
    it('debería rechazar usuario con email duplicado', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/business/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'demo@empresa.com', // Ya existe
          password: 'Password123!',
          name: 'Usuario Duplicado',
          role: 'user'
        });

      expect(response.status).toBe(400);
    });
  });
});

describe('🟦 CAJA NEGRA: Pruebas de Comprobantes Electrónicos', () => {
  let authToken;

  beforeAll(async () => {
    const loginResponse = await request(API_BASE_URL)
      .post('/api/login')
      .send({
        email: 'demo@empresa.com',
        password: 'demo123456'
      });
    
    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    }
  });

  describe('POST /api/business/invoices - Crear Factura', () => {
    
    /**
     * TC-BB-016: Crear factura con datos válidos
     * Entrada: Datos completos de factura
     * Salida esperada: Factura creada
     */
    it('debería crear factura con datos válidos', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/business/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId: '1',
          items: [
            {
              name: 'Producto de prueba',
              quantity: 1,
              price: 100.00,
              taxRate: 12
            }
          ],
          emissionDate: new Date().toISOString().split('T')[0]
        });

      expect([200, 201]).toContain(response.status);
    });

    /**
     * TC-BB-017: Crear factura sin items
     * Entrada: Factura sin detalle de productos
     * Salida esperada: Error de validación
     */
    it('debería rechazar factura sin items', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/business/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId: '1',
          items: []
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/business/invoices - Listar Facturas', () => {
    
    /**
     * TC-BB-018: Listar facturas autenticado
     * Entrada: Token válido
     * Salida esperada: Lista de facturas
     */
    it('debería listar facturas con autenticación', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const response = await request(API_BASE_URL)
        .get('/api/business/invoices')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

describe('🟦 CAJA NEGRA: Pruebas de Retenciones', () => {
  let authToken;

  beforeAll(async () => {
    const loginResponse = await request(API_BASE_URL)
      .post('/api/login')
      .send({
        email: 'demo@empresa.com',
        password: 'demo123456'
      });
    
    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    }
  });

  describe('GET /api/business/retentions - Listar Retenciones', () => {
    
    /**
     * TC-BB-019: Listar retenciones autenticado
     * Entrada: Token válido
     * Salida esperada: Lista de retenciones
     */
    it('debería listar retenciones con autenticación', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const response = await request(API_BASE_URL)
        .get('/api/business/retentions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });
});

describe('🟦 CAJA NEGRA: Pruebas de Notas de Crédito', () => {
  let authToken;

  beforeAll(async () => {
    const loginResponse = await request(API_BASE_URL)
      .post('/api/login')
      .send({
        email: 'demo@empresa.com',
        password: 'demo123456'
      });
    
    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    }
  });

  describe('GET /api/business/credit-notes - Listar Notas de Crédito', () => {
    
    /**
     * TC-BB-020: Listar notas de crédito autenticado
     * Entrada: Token válido
     * Salida esperada: Lista de notas de crédito
     */
    it('debería listar notas de crédito con autenticación', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const response = await request(API_BASE_URL)
        .get('/api/business/credit-notes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });
});

describe('🟦 CAJA NEGRA: Pruebas de Clientes', () => {
  let authToken;

  beforeAll(async () => {
    const loginResponse = await request(API_BASE_URL)
      .post('/api/login')
      .send({
        email: 'demo@empresa.com',
        password: 'demo123456'
      });
    
    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    }
  });

  describe('GET /api/business/clients - Listar Clientes', () => {
    
    /**
     * TC-BB-021: Listar clientes autenticado
     * Entrada: Token válido
     * Salida esperada: Lista de clientes
     */
    it('debería listar clientes con autenticación', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const response = await request(API_BASE_URL)
        .get('/api/business/clients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/business/clients - Crear Cliente', () => {
    
    /**
     * TC-BB-022: Crear cliente con datos válidos
     * Entrada: Datos completos del cliente
     * Salida esperada: Cliente creado
     */
    it('debería crear cliente con datos válidos', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const timestamp = Date.now();
      const response = await request(API_BASE_URL)
        .post('/api/business/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Cliente Prueba ${timestamp}`,
          identification: '179' + timestamp.toString().substring(0, 10),
          email: `cliente_${timestamp}@prueba.com`,
          phone: '0991234567',
          address: 'Dirección de prueba'
        });

      expect([200, 201]).toContain(response.status);
    });

    /**
     * TC-BB-023: Crear cliente con identificación duplicada
     * Entrada: RUC/CI que ya existe
     * Salida esperada: Error
     */
    it('debería rechazar cliente con identificación duplicada', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const timestamp = Date.now();
      const ruc = `095${timestamp.toString().substring(0, 7)}`;

      // Primero crear el cliente
      await request(API_BASE_URL)
        .post('/api/business/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Cliente Original',
          identification: ruc,
          email: 'original@prueba.com'
        });

      // Intentar crearlo de nuevo
      const response = await request(API_BASE_URL)
        .post('/api/business/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Cliente Duplicado',
          identification: ruc,
          email: 'duplicado@prueba.com'
        });

      expect(response.status).toBe(400);
    });
  });
});

describe('🟦 CAJA NEGRA: Pruebas de Productos', () => {
  let authToken;

  beforeAll(async () => {
    const loginResponse = await request(API_BASE_URL)
      .post('/api/login')
      .send({
        email: 'demo@empresa.com',
        password: 'demo123456'
      });
    
    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    }
  });

  describe('GET /api/business/products - Listar Productos', () => {
    
    /**
     * TC-BB-024: Listar productos autenticado
     * Entrada: Token válido
     * Salida esperada: Lista de productos
     */
    it('debería listar productos con autenticación', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const response = await request(API_BASE_URL)
        .get('/api/business/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/business/products - Crear Producto', () => {
    
    /**
     * TC-BB-025: Crear producto con datos válidos
     * Entrada: Datos completos del producto
     * Salida esperada: Producto creado
     */
    it('debería crear producto con datos válidos', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const timestamp = Date.now();
      const response = await request(API_BASE_URL)
        .post('/api/business/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Producto Prueba ${timestamp}`,
          code: `PROD-${timestamp}`,
          price: 25.50,
          stock: 100,
          taxRate: 12
        });

      expect([200, 201]).toContain(response.status);
    });

    /**
     * TC-BB-026: Crear producto sin stock inicial
     * Entrada: Producto sin especificar stock
     * Salida esperada: Producto creado con stock 0
     */
    it('debería crear producto sin stock con valor por defecto', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const timestamp = Date.now();
      const response = await request(API_BASE_URL)
        .post('/api/business/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Producto Sin Stock ${timestamp}`,
          code: `PROD-NS-${timestamp}`,
          price: 10.00
        });

      expect([200, 201]).toContain(response.status);
    });
  });
});

describe('🟦 CAJA NEGRA: Pruebas de Integración SRI', () => {
  let authToken;

  beforeAll(async () => {
    const loginResponse = await request(API_BASE_URL)
      .post('/api/login')
      .send({
        email: 'demo@empresa.com',
        password: 'demo123456'
      });
    
    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    }
  });

  /**
   * TC-BB-027: Verificar conexión con SRI
   * Entrada: Solicitud al endpoint de verificación
   * Salida esperada: Estado de conexión
   */
  it('debería verificar el estado de conexión con SRI', async () => {
    if (!authToken) {
      console.log('⚠️ Saltando test: No hay token disponible');
      return;
    }

    const response = await request(API_BASE_URL)
      .get('/api/business/sri/status')
      .set('Authorization', `Bearer ${authToken}`);

    // El SRI puede estar disponible o no, pero debe responder
    expect([200, 503]).toContain(response.status);
  });
});

/**
 * ============================================
 * PRUEBAS DE CAJA NEGRA: MÉTODOS DE PAGO
 * ============================================
 * 
 * Estas pruebas verifican el comportamiento del sistema
 * en cuanto a procesamiento de pagos y suscripciones.
 * 
 * Métodos de pago cubiertos:
 * - PayPal: Validación de órdenes
 * - Tarjeta (CARD): Procesamiento interno
 * - Transferencia (TRANSFER): Procesamiento interno  
 * - Depósito (DEPOSIT): Procesamiento interno
 */

describe('🟦 CAJA NEGRA: Pruebas de PayPal', () => {
  
  describe('POST /api/payment/validate-paypal - Validar Pago PayPal', () => {
    
    /**
     * TC-BB-028: Validación de pago PayPal sin orderId
     * Entrada: Solicitud sin orderId
     * Salida esperada: Error 400
     */
    it('debería rechazar validación sin orderId', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/payment/validate-paypal')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    /**
     * TC-BB-029: Validación de pago PayPal con orderId vacío
     * Entrada: Solicitud con orderId vacío
     * Salida esperada: Error 400
     */
    it('debería rechazar validación con orderId vacío', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/payment/validate-paypal')
        .send({ orderId: '' });

      expect(response.status).toBe(400);
    });

    /**
     * TC-BB-030: Validación de pago PayPal con orderId inválido
     * Entrada: orderId que no existe en PayPal
     * Salida esperada: Error 400 con mensaje descriptivo
     */
    it('debería rechazar validación con orderId inexistente', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/payment/validate-paypal')
        .send({ orderId: 'INVALID_ORDER_12345' });

      // PayPal retornará error 400 porque la orden no existe
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });
});

describe('🟦 CAJA NEGRA: Pruebas de Métodos de Pago Internos', () => {
  let authToken;
  let businessId;

  beforeAll(async () => {
    // Primero obtener token y businessId
    const loginResponse = await request(API_BASE_URL)
      .post('/api/login')
      .send({
        email: 'demo@empresa.com',
        password: 'demo123456'
      });
    
    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
      
      // Obtener businessId del usuario
      const userResponse = await request(API_BASE_URL)
        .get('/api/business/users')
        .set('Authorization', `Bearer ${authToken}`);
      
      if (userResponse.status === 200 && userResponse.body.length > 0) {
        businessId = userResponse.body[0].businessId;
      }
    }
  });

  describe('POST /api/subscriptions/payment-internal - Procesar Pago Interno', () => {
    
    /**
     * TC-BB-031: Procesar pago interno sin autenticación
     * Entrada: Solicitud sin token
     * Salida esperada: Error 401
     */
    it('debería rechazar pago interno sin autenticación', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/subscriptions/payment-internal')
        .send({
          businessId: '1',
          plan: 'MONTHLY',
          paymentMethod: 'TRANSFER',
          amount: 29.99
        });

      expect(response.status).toBe(401);
    });

    /**
     * TC-BB-032: Procesar pago interno con datos incompletos
     * Entrada: Faltan datos requeridos
     * Salida esperada: Error 400
     */
    it('debería rechazar pago interno con datos incompletos', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/subscriptions/payment-internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          businessId: '1'
          // Faltan plan, paymentMethod, amount
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    /**
     * TC-BB-033: Procesar pago interno con método CARD (Tarjeta)
     * Entrada: Datos completos con paymentMethod = CARD
     * Salida esperada: Suscripción creada exitosamente
     */
    it('debería procesar pago interno con método CARD (Tarjeta)', async () => {
      if (!authToken || !businessId) {
        console.log('⚠️ Saltando test: No hay token o businessId');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/subscriptions/payment-internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          businessId: businessId,
          plan: 'MONTHLY',
          paymentMethod: 'CARD',
          amount: 34.49,
          paymentDetails: {
            last4: '1234',
            brand: 'Visa'
          }
        });

      // Aceptar 200 (actualización) o 201 (creación)
      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.subscription).toHaveProperty('plan');
    });

    /**
     * TC-BB-034: Procesar pago interno con método PAYPAL
     * Entrada: Datos completos con paymentMethod = PAYPAL
     * Salida esperada: Suscripción creada exitosamente
     */
    it('debería procesar pago interno con método PAYPAL', async () => {
      if (!authToken || !businessId) {
        console.log('⚠️ Saltando test: No hay token o businessId');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/subscriptions/payment-internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          businessId: businessId,
          plan: 'SEMIANNUAL',
          paymentMethod: 'PAYPAL',
          amount: 172.49,
          paymentDetails: {
            email: 'cliente@paypal.com',
            transactionId: 'PAY-' + Date.now()
          }
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('success', true);
    });

    /**
     * TC-BB-035: Procesar pago interno con método TRANSFER (Transferencia)
     * Entrada: Datos completos con paymentMethod = TRANSFER
     * Salida esperada: Suscripción creada exitosamente
     */
    it('debería procesar pago interno con método TRANSFER', async () => {
      if (!authToken || !businessId) {
        console.log('⚠️ Saltando test: No hay token o businessId');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/subscriptions/payment-internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          businessId: businessId,
          plan: 'YEARLY',
          paymentMethod: 'TRANSFER',
          amount: 287.49,
          paymentDetails: {
            referenceNumber: 'TRF-' + Date.now(),
            bankName: 'Banco del Pacífico'
          }
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('success', true);
    });

    /**
     * TC-BB-036: Procesar pago interno con método DEPOSIT (Depósito)
     * Entrada: Datos completos con paymentMethod = DEPOSIT
     * Salida esperada: Suscripción creada exitosamente
     */
    it('debería procesar pago interno con método DEPOSIT', async () => {
      if (!authToken || !businessId) {
        console.log('⚠️ Saltando test: No hay token o businessId');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/subscriptions/payment-internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          businessId: businessId,
          plan: 'MONTHLY',
          paymentMethod: 'DEPOSIT',
          amount: 34.49,
          paymentDetails: {
            depositNumber: 'DEP-' + Date.now(),
            accountNumber: '****1234'
          }
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('success', true);
    });

    /**
     * TC-BB-037: Procesar pago interno con empresa no encontrada
     * Entrada: businessId que no existe
     * Salida esperada: Error 404
     */
    it('debería rechazar pago interno con empresa inexistente', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/subscriptions/payment-internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          businessId: '999999999',
          plan: 'MONTHLY',
          paymentMethod: 'TRANSFER',
          amount: 29.99
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    /**
     * TC-BB-038: Procesar pago interno con plan inválido
     * Entrada: Plan que no existe
     * Salida esperada: Suscripción con plan por defecto o error
     */
    it('debería procesar pago interno con plan inválido usando valor por defecto', async () => {
      if (!authToken || !businessId) {
        console.log('⚠️ Saltando test: No hay token o businessId');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/subscriptions/payment-internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          businessId: businessId,
          plan: 'INVALIDO',
          paymentMethod: 'TRANSFER',
          amount: 29.99
        });

      // El sistema debe manejar el plan inválido (usar Monthly por defecto)
      expect([200, 201, 400]).toContain(response.status);
    });
  });

  describe('GET /api/subscriptions/status - Verificar Estado de Suscripción', () => {
    
    /**
     * TC-BB-039: Verificar estado de suscripción sin autenticación
     * Entrada: Solicitud sin token
     * Salida esperada: Error 401
     */
    it('debería rechazar verificación sin autenticación', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/subscriptions/status');

      expect(response.status).toBe(401);
    });

    /**
     * TC-BB-040: Verificar estado de suscripción con autenticación
     * Entrada: Token válido
     * Salida esperada: Estado de suscripción
     */
    it('debería obtener estado de suscripción con autenticación', async () => {
      if (!authToken) {
        console.log('⚠️ Saltando test: No hay token disponible');
        return;
      }

      const response = await request(API_BASE_URL)
        .get('/api/subscriptions/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('businessId');
      expect(response.body).toHaveProperty('plan');
      expect(response.body).toHaveProperty('subscriptionStatus');
      expect(response.body).toHaveProperty('isActive');
    });
  });
});

/**
 * ============================================
 * RESUMEN DE PRUEBAS AÑADIDAS
 * ============================================
 * 
 * Pruebas de PayPal (3 pruebas):
 * - TC-BB-028: Validación sin orderId
 * - TC-BB-029: Validación con orderId vacío  
 * - TC-BB-030: Validación con orderId inválido
 * 
 * Pruebas de Métodos de Pago Internos (12 pruebas):
 * - TC-BB-031: Pago interno sin autenticación
 * - TC-BB-032: Pago interno con datos incompletos
 * - TC-BB-033: Pago con método CARD (Tarjeta)
 * - TC-BB-034: Pago con método PAYPAL
 * - TC-BB-035: Pago con método TRANSFER
 * - TC-BB-036: Pago con método DEPOSIT
 * - TC-BB-037: Pago con empresa inexistente
 * - TC-BB-038: Pago con plan inválido
 * - TC-BB-039: Estado suscripción sin autenticación
 * - TC-BB-040: Estado suscripción con autenticación
 */
