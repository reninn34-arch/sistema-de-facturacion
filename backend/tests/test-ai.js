const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const AiRepository = require('../src/modules/ai/ai.repository');
const AiService = require('../src/modules/ai/ai.service');
const repository = new AiRepository();
const aiService = new AiService(repository);

async function testConnection(provider) {
  console.log(`\n======================================================`);
  console.log(`🤖 PROBANDO PROVEEDOR: ${provider}`);
  console.log(`======================================================`);
  
  try {
    const result = await aiService.generateChat({
      provider,
      systemPrompt: 'Responde de forma muy concisa en español.',
      userMessage: `Hola, confirma conexión con ${provider}`
    });
    
    console.log(`✅ Conexión Exitosa con ${provider}!`);
    console.log(`🤖 Modelo Resolvido: ${result.model}`);
    console.log(`💬 Respuesta de la IA:\n"${result.reply.trim()}"`);
  } catch (error) {
    console.error(`❌ Error al conectar con ${provider}:`, error.message);
  }
}

async function runTests() {
  console.log('📋 Iniciando pruebas de conectividad de Inteligencia Artificial...');
  
  // Imprimir estado de configuración
  console.log(`- DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? 'CONFIGURADA (OK)' : 'NO CONFIGURADA'}`);
  console.log(`- OPENCODE_GO_API_KEY: ${process.env.OPENCODE_GO_API_KEY ? 'CONFIGURADA (OK)' : 'NO CONFIGURADA'}`);
  console.log(`- GROQ_API_KEY: ${process.env.GROQ_API_KEY ? 'CONFIGURADA (OK)' : 'NO CONFIGURADA'}`);
  console.log(`- AI_DEFAULT_PROVIDER: ${process.env.AI_DEFAULT_PROVIDER || 'google (por defecto)'}`);

  // Test DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    await testConnection('deepseek');
  } else {
    console.log('\n⚠️ Saltando prueba de DeepSeek: DEEPSEEK_API_KEY no configurada en .env');
  }

  // Test OpenCode
  if (process.env.OPENCODE_GO_API_KEY) {
    await testConnection('opencode');
  } else {
    console.log('\n⚠️ Saltando prueba de OpenCode: OPENCODE_GO_API_KEY no configurada en .env');
  }

  // Test Groq
  if (process.env.GROQ_API_KEY) {
    await testConnection('groq');
  } else {
    console.log('\n⚠️ Saltando prueba de Groq: GROQ_API_KEY no configurada en .env');
  }

  console.log('\n🎉 Pruebas finalizadas.');
}

runTests();
