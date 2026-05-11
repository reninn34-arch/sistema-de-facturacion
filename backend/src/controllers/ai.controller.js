const { GoogleGenerativeAI } = require("@google/generative-ai");
const prisma = require('../../prisma/client');

const aiController = {
  chat: async (req, res) => {
    try {
      const { message, context } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyASFiaKmJ_5vOy8sPYhhzl86ag4GexX7rM';

      if (!apiKey) {
        console.warn('⚠️ GEMINI_API_KEY no configurada');
        return res.json({
          reply: "El servicio de IA no está configurado correctamente en el servidor. Por favor configura la variable GEMINI_API_KEY."
        });
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

      res.json({ reply });

    } catch (error) {
      console.error('❌ Error AI:', error.message);
      res.json({ reply: `Error de IA: ${error.message}. (Verifica tu API Key o cuota)` });
    }
  },

  insights: async (req, res) => {
    try {
      const { salesData } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyASFiaKmJ_5vOy8sPYhhzl86ag4GexX7rM';

      if (!apiKey) {
        return res.json({
          insights: "El servicio de IA no está configurado en el servidor (falta GEMINI_API_KEY)."
        });
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

      res.json({ insights });

    } catch (error) {
      console.error('❌ Error AI Insights:', error.message);
      res.json({ insights: `No se pudieron generar recomendaciones: ${error.message}` });
    }
  },

  // NUEVO: Auditoría real de documentos y negocio
  audit: async (req, res) => {
    try {
      const businessId = req.user.businessId;
      if (!businessId) {
        return res.status(400).json({ error: 'Se requiere businessId' });
      }

      // Verificar que el plan tenga auditoría habilitada
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { plan: true, subscriptionEnd: true, subscriptionStatus: true, isActive: true, sriEnabled: true, electronicSignature: true }
      });

      if (!business) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }

      if (req.user.role !== 'SUPERADMIN') {
        const planRecord = await prisma.subscriptionPlan.findUnique({
          where: { code: business.plan },
          select: { hasAudit: true }
        });

        if (!planRecord || !planRecord.hasAudit) {
          return res.status(403).json({
            error: 'Acceso denegado',
            message: 'Tu plan actual no incluye Auditoría en Tiempo Real. Actualiza tu suscripción para acceder a esta funcionalidad.',
            plan: business.plan,
            hasAudit: false
          });
        }
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      const issues = [];

      // 1. Documentos por estado
      const docs = await prisma.document.findMany({
        where: { businessId },
        select: { id: true, type: true, number: true, status: true, total: true, issueDate: true, accessKey: true },
        orderBy: { issueDate: 'desc' }
      });

      const documentosEsteMes = docs.filter(d => new Date(d.issueDate) >= startOfMonth && new Date(d.issueDate) <= endOfMonth);
      const documentosMesAnterior = docs.filter(d => new Date(d.issueDate) >= lastMonthStart && new Date(d.issueDate) <= lastMonthEnd);

      const totalDocuments = docs.length;
      const authorizedDocs = docs.filter(d => d.status === 'AUTHORIZED' || d.status === 'AUTORIZADA').length;
      const pendingDocs = docs.filter(d => d.status === 'PENDING' || d.status === 'PENDIENTE' || d.status === 'RECIBIDA').length;
      const rejectedDocs = docs.filter(d => d.status === 'REJECTED' || d.status === 'RECHAZADA').length;

      // 2. Facturas rechazadas o pendientes del SRI
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

      // 3. Duplicados de número de documento
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

      // 4. Notas de crédito pendientes
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

      // 5. Inventario bajo
      const lowStockProducts = await prisma.product.findMany({
        where: {
          businessId,
          type: 'FISICO',
          stock: { lte: 5 }
        },
        select: { id: true, description: true, stock: true, minStock: true },
        orderBy: { stock: 'asc' },
        take: 10
      });

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

      // 6. Suscripción por vencer
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

      // 7. Variación anormal de facturación mensual
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

      // 8. Clientes inactivos (sin documentos en 60 días) - solo si hay varios clientes
      const clients = await prisma.client.findMany({
        where: { businessId },
        select: { id: true, name: true }
      });

      if (clients.length >= 5) {
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const clientsWithRecentDocs = await prisma.document.groupBy({
          by: ['entityRuc'],
          where: {
            businessId,
            issueDate: { gte: sixtyDaysAgo },
            entityRuc: { not: null }
          },
          _count: { id: true }
        });

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

      // 9. Verificar existencia de secuenciales para todos los tipos de documento
      const sequences = await prisma.sequence.findMany({
        where: { businessId },
        select: { type: true, currentValue: true }
      });

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

      // Ordenar por severidad
      const severityOrder = { high: 0, medium: 1, low: 2 };
      issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      // Generar resumen
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

      res.json({ summary, issues, stats, recommendations, generatedAt: now.toISOString() });

    } catch (error) {
      console.error('❌ Error en auditoría:', error.message);
      res.status(500).json({ error: 'Error al ejecutar auditoría', details: error.message });
    }
  }
};

module.exports = aiController;
