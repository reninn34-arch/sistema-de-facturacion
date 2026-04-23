const { GoogleGenerativeAI } = require("@google/generative-ai");

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

      // Prompt del sistema con contexto
      const systemPrompt = `Eres Ecuafact AI, un asistente experto en facturación electrónica del SRI (Ecuador).
      
      CONTEXTO DEL NEGOCIO:
      Nombre: ${context?.name || 'Usuario'}
      RUC: ${context?.ruc || 'N/A'}
      Régimen: ${context?.regime || 'General'}
      
      TU OBJETIVO:
      Ayudar con dudas sobre impuestos (IVA 15%), retenciones, fechas de vencimiento y uso del sistema.
      Responde de forma breve, amigable y profesional. Si no sabes algo, sugiere consultar a un contador.`;

      console.log('🤖 Enviando consulta a Gemini 1.5 Pro...');

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      const prompt = `\n\nPregunta del usuario: `;
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

      console.log('📊 Generando insights con Gemini 1.5 Pro...');

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
  }
};

module.exports = aiController;
