const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'noreply@azulpro.com';

  if (host && port && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: port === '465',
      auth: { user, pass },
    });
    console.log(`[EMAIL] Servicio configurado: ${host}:${port}`);
  } else {
    console.log('[EMAIL] SMTP no configurado - usando modo desarrollo (logs en consola)');
    transporter = null;
  }

  return transporter;
}

async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();
  const from = process.env.SMTP_FROM || 'noreply@azulpro.com';

  if (!transport) {
    console.log('========================================');
    console.log('[EMAIL MOCK] Destinatario:', to);
    console.log('[EMAIL MOCK] Asunto:', subject);
    console.log('[EMAIL MOCK] Contenido HTML:', html);
    console.log('========================================');
    return { success: true, mock: true };
  }

  try {
    const info = await transport.sendMail({ from, to, subject, html });
    console.log('[EMAIL] Enviado correctamente a:', to, 'MessageId:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Error al enviar:', error.message);
    return { success: false, error: error.message };
  }
}

function buildPasswordResetEmail(resetLink, userName) {
  return {
    subject: 'Recuperación de Contraseña - Azul PRO',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0369A1, #0EA5E9); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Azul <span style="color: #06B6D4;">PRO</span></h1>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1e293b; margin-top: 0;">Recuperación de Contraseña</h2>
          <p style="color: #475569; line-height: 1.6;">Hola${userName ? ' ' + userName : ''},</p>
          <p style="color: #475569; line-height: 1.6;">
            Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para continuar:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: #0EA5E9; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
              Restablecer Contraseña
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
            Este enlace expirará en 1 hora. Si no solicitaste este cambio, ignora este correo.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Azul PRO - Sistema de Facturación Electrónica<br/>
            &copy; ${new Date().getFullYear()} Todos los derechos reservados.
          </p>
        </div>
      </div>
    `
  };
}

function buildVerificationEmail(verifyLink, userName) {
  return {
    subject: 'Verifica tu cuenta - Azul PRO',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0369A1, #0EA5E9); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Azul <span style="color: #06B6D4;">PRO</span></h1>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1e293b; margin-top: 0;">Verifica tu Cuenta</h2>
          <p style="color: #475569; line-height: 1.6;">Hola${userName ? ' ' + userName : ''},</p>
          <p style="color: #475569; line-height: 1.6;">
            Gracias por registrarte en Azul PRO. Para activar tu cuenta, haz clic en el siguiente botón:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyLink}" style="background: #10B981; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
              Verificar Cuenta
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
            Este enlace expirará en 24 horas.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Azul PRO - Sistema de Facturación Electrónica<br/>
            &copy; ${new Date().getFullYear()} Todos los derechos reservados.
          </p>
        </div>
      </div>
    `
  };
}

module.exports = { sendEmail, buildPasswordResetEmail, buildVerificationEmail };
