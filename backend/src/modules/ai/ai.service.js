const { GoogleGenerativeAI } = require("@google/generative-ai");

class AiService {
  constructor(repository) {
    this.repository = repository;
  }

  async chat(message, context) {
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyASFiaKmJ_5vOy8sPYhhzl86ag4GexX7rM';

    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY no configurada');
      return {
        reply: "El servicio de IA no está configurado correctamente en el servidor. Por favor configura la variable GEMINI_API_KEY."
      };
    }

    const systemPrompt = `Eres Ecuafact AI, un asistente experto en facturación electrónica del SRI (Ecuador).
    
    CONTEXTO DEL NEGOCIO:
    Nombre: ${context?.name || 'Usuario'}
    RUC: ${context?.ruc || 'N/A'}
    Régimen: ${context?.regime || 'General'}
    
    TU OBJETIVO:
    Ayudar con dudas sobre impuestos (IVA 15%), retenciones, fechas de vencimiento y uso del sistema.
    Responde de forma breve, amigable y profesional. Si no sabes algo, sugiere consultar a un contador.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `${systemPrompt}\n\nPregunta del usuario: ${message}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const reply = response.text();

    return { reply };
  }

  async insights(salesData) {
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyASFiaKmJ_5vOy8sPYhhzl86ag4GexX7rM';

    if (!apiKey) {
      return {
        insights: "El servicio de IA no está configurado en el servidor (falta GEMINI_API_KEY)."
      };
    }

    const systemPrompt = `Eres un asesor financiero experto para negocios en Ecuador. Analiza los siguientes datos y genera 3 recomendaciones cortas y accionables en formato de lista de viñetas (markdown). Sé directo y profesional.
    
    DATOS:
    - Total Ventas: ${salesData.totalVentas}
    - Cantidad de Documentos: ${salesData.documentos}
    - Inventario: ${salesData.inventario.length} productos.
    
    Ejemplo de respuesta:
    - **Optimizar Stock:** Se detectan X productos con bajo inventario. Revisa tus niveles de compra para evitar quiebres de stock.
    - **Incentivar Ventas:** El ticket promedio es de . Considera crear combos o promociones para aumentarlo.
    - **Revisión Fiscal:** Has emitido Z facturas. Asegúrate de tener todo listo para tu próxima declaración del IVA.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const insights = response.text();

    return { insights };
  }

  async audit(userId, role, businessId) {
    if (!businessId) {
      throw Object.assign(new Error('Se requiere businessId'), { statusCode: 400 });
    }

    const business = await this.repository.findBusiness(businessId);

    if (!business) {
      throw Object.assign(new Error('Empresa no encontrada'), { statusCode: 404 });
    }

    if (role !== 'SUPERADMIN') {
      const planRecord = await this.repository.findPlanByCode(business.plan);

      if (!planRecord || !planRecord.hasAudit) {
        throw Object.assign(
          new Error('Acceso denegado'),
          {
            statusCode: 403,
            details: {
              error: 'Acceso denegado',
              message: 'Tu plan actual no incluye Auditoría en Tiempo Real. Actualiza tu suscripción para acceder a esta funcionalidad.',
              plan: business.plan,
              hasAudit: false
            }
          }
        );
      }
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const issues = [];

    const docs = await this.repository.findDocuments(businessId);

    const documentosEsteMes = docs.filter(d => new Date(d.issueDate) >= startOfMonth && new Date(d.issueDate) <= endOfMonth);
    const documentosMesAnterior = docs.filter(d => new Date(d.issueDate) >= lastMonthStart && new Date(d.issueDate) <= lastMonthEnd);

    const totalDocuments = docs.length;
    const authorizedDocs = docs.filter(d => d.status === 'AUTHORIZED' || d.status === 'AUTORIZADA').length;
    const pendingDocs = docs.filter(d => d.status === 'PENDING' || d.status === 'PENDIENTE' || d.status === 'RECIBIDA').length;
    const rejectedDocs = docs.filter(d => d.status === 'REJECTED' || d.status === 'RECHAZADA').length;

    if (rejectedDocs > 0) {
      const names = docs.filter(d => d.status === 'REJECTED' || d.status === 'RECHAZADA').slice(0, 5).map(d => d.number).join(', ');
      issues.push({
        severity: 'high',
        category: 'SRI',
        title: `${rejectedDocs} documento(s) rechazado(s) por el SRI`,
        description: `Los documentos ${names} fueron rechazados. Debes corregirlos y reenviarlos.`,
        action: 'Corregir documentos',
        actionTab: 'invoices'
      });
    }

    if (pendingDocs > 0) {
      issues.push({
        severity: 'medium',
        category: 'SRI',
        title: `${pendingDocs} documento(s) pendientes de autorización`,
        description: 'Hay documentos que aún no han recibido respuesta del SRI. Verifica su estado.',
        action: 'Revisar pendientes',
        actionTab: 'invoices'
      });
    }

    const numberCount = {};
    docs.forEach(d => { if (d.number) { numberCount[d.number] = (numberCount[d.number] || 0) + 1; } });
    const duplicates = Object.entries(numberCount).filter(([_, c]) => c > 1);
    if (duplicates.length > 0) {
      issues.push({
        severity: 'high',
        category: 'Documentos',
        title: `${duplicates.length} número(s) de documento duplicado(s)`,
        description: `Se encontraron documentos con el mismo número: ${duplicates.slice(0, 3).map(([n]) => n).join(', ')}. Esto puede causar rechazo del SRI.`,
        action: 'Revisar duplicados',
        actionTab: 'invoices'
      });
    }

    const pendingCreditNotes = docs.filter(d => (d.type === '04' || d.type === 'CREDIT_NOTE') && d.status !== 'CANCELLED' && d.status !== 'AUTHORIZED' && d.status !== 'AUTORIZADA');
    if (pendingCreditNotes.length > 0) {
      issues.push({
        severity: 'medium',
        category: 'Documentos',
        title: `${pendingCreditNotes.length} nota(s) de crédito sin finalizar`,
        description: 'Hay notas de crédito que no han sido autorizadas. Las facturas relacionadas siguen apareciendo como activas.',
        action: 'Finalizar notas de crédito',
        actionTab: 'credit-notes'
      });
    }

    const lowStockProducts = await this.repository.findLowStockProducts(businessId);

    const productsBelowMin = lowStockProducts.filter(p => p.minStock && p.stock <= p.minStock);
    const productsNearZero = lowStockProducts.filter(p => p.stock <= 2 && p.stock > 0);

    if (productsBelowMin.length > 0) {
      const names = productsBelowMin.slice(0, 5).map(p => `${p.description} (${p.stock}/${p.minStock})`).join(', ');
      issues.push({
        severity: 'medium',
        category: 'Inventario',
        title: `${productsBelowMin.length} producto(s) bajo el stock mínimo`,
        description: `Los siguientes productos están bajo su nivel mínimo: ${names}.`,
        action: 'Gestionar inventario',
        actionTab: 'products'
      });
    }

    if (productsNearZero.length > 0) {
      const names = productsNearZero.map(p => p.description).join(', ');
      issues.push({
        severity: 'high',
        category: 'Inventario',
        title: `${productsNearZero.length} producto(s) a punto de agotarse`,
        description: `Stock crítico (≤2 unidades): ${names}.`,
        action: 'Reabastecer ahora',
        actionTab: 'products'
      });
    }

    if (business) {
      const daysRemaining = business.subscriptionEnd
        ? Math.ceil((new Date(business.subscriptionEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      if (daysRemaining <= 7 && daysRemaining > 0) {
        issues.push({
          severity: 'medium',
          category: 'Suscripción',
          title: `Suscripción vence en ${daysRemaining} día(s)`,
          description: `Tu suscripción vence el ${new Date(business.subscriptionEnd).toLocaleDateString('es-EC')}. Renueva para evitar interrupción.`,
          action: 'Renovar suscripción',
          actionTab: 'pago-interno'
        });
      } else if (daysRemaining <= 0) {
        issues.push({
          severity: 'high',
          category: 'Suscripción',
          title: 'Suscripción vencida',
          description: 'Tu suscripción ha expirado. No puedes emitir nuevos documentos hasta renovar.',
          action: 'Renovar ahora',
          actionTab: 'pago-interno'
        });
      }

      if (!business.sriEnabled || !business.electronicSignature) {
        issues.push({
          severity: 'medium',
          category: 'SRI',
          title: 'Firma electrónica no configurada',
          description: 'No podrás enviar facturas al SRI sin una firma electrónica válida.',
          action: 'Configurar firma',
          actionTab: 'config'
        });
      }
    }

    const currentMonthCount = documentosEsteMes.filter(d => d.type === '01' || d.type === 'INVOICE').length;
    const lastMonthCount = documentosMesAnterior.filter(d => d.type === '01' || d.type === 'INVOICE').length;
    if (lastMonthCount > 0) {
      const variation = ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100;
      if (variation < -50) {
        issues.push({
          severity: 'medium',
          category: 'Documentos',
          title: `Facturación bajó ${Math.abs(variation).toFixed(0)}% vs. mes anterior`,
          description: `Este mes llevas ${currentMonthCount} facturas vs. ${lastMonthCount} del mes pasado. Revisa tu operación.`,
          action: 'Ver reportes',
          actionTab: 'reports'
        });
      }
    }

    const clients = await this.repository.findClients(businessId);

    if (clients.length >= 5) {
      const clientsWithRecentDocs = await this.repository.findDocumentsGroupedByEntityRuc(businessId);

      const activeClientsSet = new Set(clientsWithRecentDocs.map(c => c.entityRuc));
      const inactiveClients = clients.filter(c => !activeClientsSet.has(c.ruc)).slice(0, 5);
      if (inactiveClients.length >= 3) {
        issues.push({
          severity: 'low',
          category: 'Documentos',
          title: `${inactiveClients.length} cliente(s) sin actividad en 60 días`,
          description: `Clientes sin facturas recientes: ${inactiveClients.map(c => c.name).join(', ')}.`,
          action: 'Contactar clientes',
          actionTab: 'clients'
        });
      }
    }

    const sequences = await this.repository.findSequences(businessId);

    const requiredTypes = ['01', '04', '07'];
    const missingSequences = requiredTypes.filter(t => !sequences.find(s => s.type === t));
    if (missingSequences.length > 0) {
      issues.push({
        severity: 'medium',
        category: 'Documentos',
        title: `Faltan secuenciales para: ${missingSequences.join(', ')}`,
        description: 'No podrás emitir estos tipos de documento hasta crear sus secuenciales.',
        action: 'Configurar secuenciales',
        actionTab: 'config'
      });
    }

    const severityOrder = { high: 0, medium: 1, low: 2 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const summary = {
      totalDocuments,
      authorizedDocuments: authorizedDocs,
      pendingDocuments: pendingDocs,
      rejectedDocuments: rejectedDocs,
      totalIssues: issues.length,
      highIssues: issues.filter(i => i.severity === 'high').length,
      mediumIssues: issues.filter(i => i.severity === 'medium').length,
      lowIssues: issues.filter(i => i.severity === 'low').length
    };

    const stats = {
      currentMonthInvoices: currentMonthCount,
      lastMonthInvoices: lastMonthCount,
      totalClients: clients.length,
      lowStockProducts: productsNearZero.length + productsBelowMin.length,
      subscriptionDaysRemaining: business?.subscriptionEnd
        ? Math.ceil((new Date(business.subscriptionEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null
    };

    const recommendations = [];
    if (issues.length === 0) {
      recommendations.push('Tu negocio está en orden. Todos los documentos están autorizados y el inventario está estable.');
      recommendations.push('Considera usar el Asistente IA para optimizar tus precios o planificar promociones.');
    } else {
      const highCount = issues.filter(i => i.severity === 'high').length;
      if (highCount > 0) {
        recommendations.push(`Atiende las ${highCount} alerta(s) críticas lo antes posible para evitar problemas con el SRI.`);
      }
      if (productsNearZero.length > 0) {
        recommendations.push('Planifica tus compras de inventario esta semana para reponer productos agotados.');
      }
      if (rejectedDocs > 0) {
        recommendations.push('Corrige y reenvía los documentos rechazados antes del cierre fiscal.');
      }
    }

    return { summary, issues, stats, recommendations, generatedAt: now.toISOString() };
  }
}

module.exports = AiService;
