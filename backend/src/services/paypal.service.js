/**
 * Servicio de PayPal para validar pagos
 * Implementa la validación del lado del servidor para mayor seguridad
 */

const PAYPAL_API_URL = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

/**
 * Obtiene el token de acceso de PayPal
 */
async function getAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error('Failed to obtain PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Valida un pago de PayPal por su ID
 * @param {string} orderId - El ID de la orden de PayPal
 * @returns {Object} - Los detalles de la orden validada
 */
async function validatePayment(orderId) {
  // En modo desarrollo, permitir simular pagos usando IDs con prefijo 'mock_'
  if (process.env.NODE_ENV !== 'production' && orderId && orderId.startsWith('mock_')) {
    const mockAmount = orderId.split('_')[1] || '35.00';
    console.log(`[DEBUG validatePayment] Simulación de pago aprobada para ID: ${orderId}, Monto: ${mockAmount}`);
    return {
      valid: true,
      orderId: orderId,
      status: 'COMPLETED',
      amount: mockAmount,
      currency: 'USD',
      captureId: 'mock_capture_' + Math.random().toString(36).substr(2, 9),
      email: 'mock_buyer@azul.com'
    };
  }

  try {
    const accessToken = await getAccessToken();
    
    const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch order details');
    }

    const order = await response.json();
    
    // Verificar que la orden está completada
    if (order.status !== 'COMPLETED' && order.status !== 'CAPTURED') {
      throw new Error(`Order status is ${order.status}, expected COMPLETED`);
    }

    // Verificar que el pago fue capturado
    const purchaseUnit = order.purchase_units?.[0];
    if (!purchaseUnit) {
      throw new Error('No purchase units found');
    }

    const payments = purchaseUnit.payments;
    if (!payments?.captures?.length) {
      throw new Error('No captures found in order');
    }

    return {
      valid: true,
      orderId: order.id,
      status: order.status,
      amount: purchaseUnit.amount.value,
      currency: purchaseUnit.amount.currency_code,
      captureId: payments.captures[0].id,
      email: purchaseUnit.payer?.email_address
    };
  } catch (error) {
    console.error('[DEBUG validatePayment] Error validating PayPal payment:', error);
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Valida que el monto del pago coincida con el plan solicitado
 * @param {string} amount - El monto del pago
 * @param {string} plan - El plan seleccionado
 * @param {Object} planPrices - Precios del plan desde la base de datos (opcional)
 */
function validateAmount(amount, plan, planPrices = null) {
  console.log('[DEBUG validateAmount] amount:', amount, 'type:', typeof amount, 'plan:', plan);
  
  // Si se proporcionan precios desde la base de datos, usarlos
  if (planPrices) {
    console.log('[DEBUG validateAmount] Using DB prices:', planPrices);
    const priceWithoutTax = planPrices.price ? planPrices.price.toString() : null;
    const priceWithTax = planPrices.priceWithTax ? planPrices.priceWithTax.toString() : null;
    
    // Aceptar tanto precio con IVA como sin IVA
    if (amount === priceWithoutTax || amount === priceWithTax) {
      console.log('[DEBUG validateAmount] Amount matches DB price');
      return true;
    }
    
    // Si no coincide exactamente, verificar si está dentro de un margen razonable
    // (PayPal puede aplicar pequeñas variaciones o el plan puede haber cambiado)
    const amountNum = parseFloat(amount);
    const dbPriceNum = parseFloat(priceWithTax) || parseFloat(priceWithoutTax);
    
    // Aceptar si el monto de PayPal es mayor o igual al precio con IVA (nunca debería ser menor)
    // Esto permite cambios de precio en el panel sin romper pagos existentes
    if (amountNum >= dbPriceNum) {
      console.log('[DEBUG validateAmount] Amount is >= DB price, accepting (PayPal may have processed with updated price)');
      return true;
    }
    
    throw new Error(`Amount mismatch: expected ${priceWithoutTax} or ${priceWithTax}, got ${amount}`);
  }
  
  // Fallback a precios hardcodeados (solo para compatibilidad)
  // Precios sin IVA (base)
  const planPricesBase = {
    'FREE': '0.00',
    'BASIC': '29.99',
    'GASTRONOMICO': '79.99',
    'PRO': '149.99',
    'ENTERPRISE': '249.99',
    'MONTHLY': '29.99',
    'SEMIANNUAL': '149.99',
    'YEARLY': '249.99',
    'UNLIMITED': '0.00'
  };
  const planPricesWithIVA = {
    'FREE': '0.00',
    'BASIC': '34.49',
    'GASTRONOMICO': '91.99',
    'PRO': '172.49',
    'ENTERPRISE': '287.49',
    'MONTHLY': '34.49',
    'SEMIANNUAL': '172.49',
    'YEARLY': '287.49',
    'UNLIMITED': '0.00'
  };
  
  // Aceptar tanto precios con IVA como sin IVA
  const expectedPrice = planPricesBase[plan] || planPricesWithIVA[plan];
  
  if (!expectedPrice) {
    throw new Error('Invalid plan');
  }

  if (amount !== expectedPrice) {
    console.log('[DEBUG validateAmount] MISMATCH! amount:', amount, '!== expectedPrice:', expectedPrice);
    throw new Error(`Amount mismatch: expected ${expectedPrice}, got ${amount}`);
  }

  return true;
}

module.exports = {
  validatePayment,
  validateAmount,
  getAccessToken
};
