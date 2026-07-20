const logger = require('../../utils/logger');
const prisma = require('../../../prisma/client');
const { resolveMaskedSettings } = require('../../utils/maskedCredentials');

const notificationController = {
  sendEmail: async (req, res) => {
    const { to, subject, message, html, rideBase64, documentNumber, attachments } = req.body;
    let settings = req.body.settings;

    if (!to || !settings) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros requeridos: to, settings'
      });
    }

    try {
    // La API devuelve las credenciales enmascaradas (••••), así que las que llegan
    // del frontend pueden ser la máscara: se resuelven con las guardadas del
    // negocio. Sin esto se intentaría autenticar literalmente con "••••" y fallaría.
    if (req.user?.businessId) {
      const business = await prisma.business.findUnique({
        where: { id: req.user.businessId },
        select: { notificationSettings: true }
      });
      settings = resolveMaskedSettings(settings, business?.notificationSettings);
    }

    logger.info(`📧 Enviando email a ${to}...`);

    const emailHtml = html || `<p>${message || 'Adjunto encontrará su comprobante electrónico'}</p>`;
    const emailText = message || 'Adjunto encontrará su comprobante electrónico';

    if (settings.emailProvider === 'sendgrid' && settings.sendgridApiKey) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(settings.sendgridApiKey);

      const mailData = {
        to,
        from: settings.senderEmail || 'noreply@ecuafact.com',
        subject: subject || 'Comprobante Electrónico Autorizado',
        text: emailText,
        html: emailHtml,
      };

      if (rideBase64 && documentNumber) {
        mailData.attachments = [{
          content: rideBase64,
          filename: `RIDE_${documentNumber}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }];
      }
      if (attachments && Array.isArray(attachments)) {
        if (!mailData.attachments) mailData.attachments = [];
        attachments.forEach(att => {
          const cleanBase64 = att.content.replace(/^data:[^;]+;base64,/, '');
          mailData.attachments.push({
            content: cleanBase64,
            filename: att.filename,
            type: att.type || 'application/octet-stream',
            disposition: 'attachment'
          });
        });
      }

      await sgMail.send(mailData);
      return res.json({ success: true, message: 'Email enviado exitosamente', provider: 'sendgrid' });

    } else if (settings.emailProvider === 'mailgun' && settings.mailgunApiKey && settings.mailgunDomain) {
      const formData = require('form-data');
      const Mailgun = require('mailgun.js');
      const mailgun = new Mailgun(formData);
      const mg = mailgun.client({ username: 'api', key: settings.mailgunApiKey });

      const mailData = {
        from: settings.senderEmail || 'noreply@ecuafact.com',
        to,
        subject: subject || 'Comprobante Electrónico Autorizado',
        text: emailText,
        html: emailHtml,
      };

      if (rideBase64 && documentNumber) {
        mailData.attachment = [{
          data: Buffer.from(rideBase64, 'base64'),
          filename: `RIDE_${documentNumber}.pdf`
        }];
      }
      if (attachments && Array.isArray(attachments)) {
        if (!mailData.attachment) mailData.attachment = [];
        attachments.forEach(att => {
          const cleanBase64 = att.content.replace(/^data:[^;]+;base64,/, '');
          mailData.attachment.push({
            data: Buffer.from(cleanBase64, 'base64'),
            filename: att.filename
          });
        });
      }

      await mg.messages.create(settings.mailgunDomain, mailData);
      return res.json({ success: true, message: 'Email enviado exitosamente', provider: 'mailgun' });

    } else {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: settings.smtpHost || 'smtp.gmail.com',
        port: settings.smtpPort || 587,
        secure: settings.smtpPort === 465,
        auth: { user: settings.smtpUser, pass: settings.smtpPassword }
      });

      const mailData = {
        from: settings.senderEmail || settings.smtpUser || 'noreply@ecuafact.com',
        to,
        subject: subject || 'Comprobante Electrónico Autorizado',
        text: emailText,
        html: emailHtml,
      };
      const mailAttachments = [];
      if (rideBase64 && documentNumber) {
        mailAttachments.push({ filename: `RIDE_${documentNumber}.pdf`, content: rideBase64, encoding: 'base64' });
      }
      if (attachments && Array.isArray(attachments)) {
        attachments.forEach(att => {
          const cleanBase64 = (att.content || '').replace(/^data:[^;]+;base64,/, '');
          mailAttachments.push({ filename: att.filename, content: cleanBase64, encoding: 'base64' });
        });
      }
      if (mailAttachments.length) mailData.attachments = mailAttachments;

      // Antes esta rama NO enviaba (devolvía "SMTP simulado"): ahora sí envía.
      const info = await transporter.sendMail(mailData);
      return res.json({ success: true, message: 'Email enviado exitosamente', provider: 'smtp', messageId: info.messageId });
    }
    } catch (error) {
      logger.error(`❌ Error enviando email a ${to}`, error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = notificationController;
