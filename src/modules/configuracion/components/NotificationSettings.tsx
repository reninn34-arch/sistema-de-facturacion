import React, { useState, useId } from 'react';
import {
  RocketLaunchIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  Cog6ToothIcon,
  BeakerIcon,
  GlobeAltIcon,
  BuildingLibraryIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  BookOpenIcon,
  ExclamationTriangleIcon,
  InboxArrowDownIcon,
  PencilIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { NotificationSettings } from '../../../types/types';

interface NotificationSettingsProps {
  settings: NotificationSettings;
  onSave: (settings: NotificationSettings) => void;
  onNotify: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

const NotificationSettingsComponent: React.FC<NotificationSettingsProps> = ({ settings, onSave, onNotify }) => {
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);
  const [activeTab, setActiveTab] = useState<'email' | 'sms' | 'whatsapp' | 'reminders'>('email');
  const [showWhatsAppGuide, setShowWhatsAppGuide] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingSMS, setEditingSMS] = useState(false);
  const [editingWhatsApp, setEditingWhatsApp] = useState(false);
  const fieldId = useId();

  const emailProvider = localSettings.emailProvider || 'smtp';
  const whatsappProvider = localSettings.whatsappProvider || 'twilio';
  const smsProvider = localSettings.smsProvider || 'twilio';

  const isEmailConfigured = localSettings.emailEnabled && Boolean(localSettings.senderEmail);
  const isSMSConfigured = localSettings.smsEnabled && Boolean(localSettings.twilioPhoneNumber || (localSettings as any).nexmoApiKey);
  const isWhatsAppConfigured = localSettings.whatsappEnabled && Boolean(localSettings.whatsappNumber);

  const handleSave = async () => {
    await onSave(localSettings);
    setEditingEmail(false);
    setEditingSMS(false);
    setEditingWhatsApp(false);
  };

  const testEmail = async () => {
    if (!localSettings.senderEmail) {
      onNotify('Ingresa primero el Email Remitente', 'warning');
      return;
    }
    onNotify('Enviando email de prueba...', 'info');
    try {
      const res = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          to: localSettings.senderEmail,
          subject: 'Email de prueba - Azul',
          settings: localSettings,
          html: '<p>✅ Si recibes este correo, tu configuración de email funciona correctamente.</p>',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        onNotify(`Email de prueba enviado a ${localSettings.senderEmail}. Revisa tu bandeja.`, 'success');
      } else {
        onNotify(`No se pudo enviar: ${data.error || 'revisa la configuración del proveedor'}`, 'warning');
      }
    } catch {
      onNotify('Error de conexión al enviar el email de prueba', 'warning');
    }
  };

  const testSMS = async () => {
    if (!localSettings.twilioPhoneNumber && !(localSettings as any).nexmoApiKey) {
      onNotify('Ingresa primero el número de teléfono o credenciales de SMS', 'warning');
      return;
    }
    onNotify('Enviando SMS de prueba...', 'info');
    try {
      const res = await fetch('/api/notifications/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          to: localSettings.twilioPhoneNumber || '+593999999999',
          message: 'SMS de prueba de Azul Facturación Electrónica.',
          settings: localSettings,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        onNotify(`SMS enviado exitosamente (${data.provider || 'sms'}).`, 'success');
      } else {
        onNotify(`No se pudo enviar SMS: ${data.error || 'revisa las credenciales'}`, 'warning');
      }
    } catch {
      onNotify('Error de conexión al enviar SMS de prueba', 'warning');
    }
  };

  const testWhatsApp = async () => {
    if (!localSettings.whatsappNumber) {
      onNotify('Ingresa primero el número de WhatsApp', 'warning');
      return;
    }
    onNotify('Enviando WhatsApp de prueba...', 'info');
    try {
      const res = await fetch('/api/notifications/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          to: localSettings.whatsappNumber,
          message: 'Mensaje de prueba por WhatsApp de Azul Facturación Electrónica.',
          settings: localSettings,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        onNotify(`WhatsApp enviado exitosamente (${data.provider || 'whatsapp'}).`, 'success');
      } else {
        onNotify(`No se pudo enviar WhatsApp: ${data.error || 'revisa la configuración de Twilio'}`, 'warning');
      }
    } catch {
      onNotify('Error de conexión al enviar WhatsApp de prueba', 'warning');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Banner informativo */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-8 rounded-[2.5rem] text-white shadow-xl">
        <div className="flex items-start gap-4">
          <RocketLaunchIcon className="w-12 h-12" />
          <div>
            <h2 className="text-2xl font-black mb-3">¿Para qué sirven las Notificaciones?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-bold">
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <EnvelopeIcon className="w-5 h-5 inline" />
                  <span className="font-black">Email con RIDE</span>
                </div>
                <p className="text-white/90">Envía el PDF automáticamente cuando se autoriza</p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <ChatBubbleLeftRightIcon className="w-5 h-5 inline" />
                  <span className="font-black">SMS Instantáneo</span>
                </div>
                <p className="text-white/90">Notifica al cliente por texto</p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <DevicePhoneMobileIcon className="w-5 h-5 inline" />
                  <span className="font-black">WhatsApp Directo</span>
                </div>
                <p className="text-white/90">Envía RIDE por WhatsApp - ¡el más usado!</p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <ClockIcon className="w-5 h-5 inline" />
                  <span className="font-black">Recordatorios</span>
                </div>
                <p className="text-white/90">Cobra a tiempo con avisos automáticos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <Cog6ToothIcon className="w-10 h-10 text-sky-500" />
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Configuración de Notificaciones</h2>
            <p className="text-sm text-slate-500 font-bold">Activa y gestiona los canales de comunicación de tu empresa</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-800">
          {[
            { id: 'email', label: 'Email', icon: <EnvelopeIcon className="w-4 h-4 inline" />, configured: isEmailConfigured },
            { id: 'sms', label: 'SMS', icon: <ChatBubbleLeftRightIcon className="w-4 h-4 inline" />, configured: isSMSConfigured },
            { id: 'whatsapp', label: 'WhatsApp', icon: <DevicePhoneMobileIcon className="w-4 h-4 inline" />, configured: isWhatsAppConfigured },
            { id: 'reminders', label: 'Recordatorios', icon: <ClockIcon className="w-4 h-4 inline" />, configured: localSettings.paymentRemindersEnabled }
          ].map(tab => (
            <button type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {tab.icon} {tab.label}
              {tab.configured && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Configurado y Activo"></span>
              )}
            </button>
          ))}
        </div>

        {/* Tab EMAIL */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-black text-slate-900 dark:text-slate-100">Activar Email</p>
                <p className="text-xs text-slate-500 font-bold">Envía comprobantes de facturación automáticamente por correo</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.emailEnabled}
                  onChange={e => setLocalSettings({ ...localSettings, emailEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <span className="sr-only">Activar Email</span>
                <div className="w-14 h-7 bg-slate-300 rounded-full peer peer-checked:bg-sky-600 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all"></div>
              </label>
            </div>

            {localSettings.emailEnabled && (
              <>
                {/* MODO PROTEGIDO / RESUMEN */}
                {isEmailConfigured && !editingEmail ? (
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold flex items-center gap-1.5">
                          <CheckCircleIcon className="w-4 h-4" />
                          Configuración Guardada & Activa
                        </span>
                        <span className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Proveedor: {emailProvider.toUpperCase()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingEmail(true)}
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <PencilIcon className="w-4 h-4" />
                        Editar Configuración
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 font-bold block mb-1">Email Remitente</span>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100">{localSettings.senderEmail}</span>
                      </div>
                      {emailProvider === 'smtp' ? (
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 font-bold block mb-1">Servidor SMTP</span>
                          <span className="font-extrabold text-slate-900 dark:text-slate-100">
                            {localSettings.smtpHost || 'smtp.gmail.com'}:{localSettings.smtpPort || 587} ({localSettings.smtpUser || 'Usuario SMTP'})
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 font-bold block mb-1">API Key</span>
                          <span className="font-mono text-slate-500">••••••••••••••••</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={testEmail}
                        className="w-full py-3 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 rounded-xl font-bold text-xs hover:bg-sky-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <BeakerIcon className="w-4 h-4" />
                        Enviar Email de Prueba
                      </button>
                    </div>
                  </div>
                ) : (
                  /* MODO EDICIÓN FORMULARIO */
                  <div className="space-y-6">
                    {isEmailConfigured && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingEmail(false)}
                          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer font-bold"
                        >
                          <XMarkIcon className="w-4 h-4" /> Cancelar Edición
                        </button>
                      </div>
                    )}
                    <div className="bg-gradient-to-br from-sky-50 to-sky-100 dark:from-slate-800 dark:to-slate-800/80 p-6 rounded-2xl border-2 border-sky-300 dark:border-slate-700">
                      <div className="flex items-start gap-4">
                        <EnvelopeIcon className="w-10 h-10 text-sky-600" />
                        <div className="flex-1">
                          <h3 className="font-black text-sky-900 dark:text-sky-300 mb-3">Selecciona tu Proveedor</h3>
                          <div className="space-y-3 text-sm font-bold text-sky-800 dark:text-sky-200">
                            <div className="bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl">
                              <p className="font-black mb-1"><BuildingLibraryIcon className="w-4 h-4 inline" /> OPCIÓN 1: SMTP (Gmail, Outlook, etc.)</p>
                              <ul className="list-disc ml-5 space-y-1">
                                <li>Gmail: smtp.gmail.com:587</li>
                                <li>Outlook: smtp-mail.outlook.com:587</li>
                              </ul>
                              <p className="mt-2 text-xs text-sky-600 dark:text-sky-400"><ExclamationTriangleIcon className="w-4 h-4 inline" /> Gmail requiere Contraseña de Aplicación de 16 caracteres</p>
                            </div>
                            <div className="bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl">
                              <p className="font-black mb-1"><RocketLaunchIcon className="w-4 h-4 inline" /> OPCIÓN 2: SendGrid / Mailgun</p>
                              <ul className="list-disc ml-5 space-y-1">
                                <li>Servicios transaccionales para envíos masivos</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <select
                        aria-label="Proveedor de email"
                        value={emailProvider}
                        onChange={e => setLocalSettings({ ...localSettings, emailProvider: e.target.value as any })}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold dark:text-slate-100"
                      >
                        <option value="smtp">SMTP (Gmail, Outlook, etc.)</option>
                        <option value="sendgrid">SendGrid (Profesional)</option>
                        <option value="mailgun">Mailgun</option>
                      </select>

                      {emailProvider === 'smtp' && (
                        <>
                          <div>
                            <label htmlFor={`${fieldId}-smtpHost`} className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">Host SMTP</label>
                            <input
                              id={`${fieldId}-smtpHost`}
                              type="text"
                              placeholder="smtp.gmail.com"
                              value={localSettings.smtpHost || ''}
                              onChange={e => setLocalSettings({ ...localSettings, smtpHost: e.target.value })}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm dark:text-slate-100"
                            />
                          </div>
                          <div>
                            <label htmlFor={`${fieldId}-smtpPort`} className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">Puerto SMTP</label>
                            <input
                              id={`${fieldId}-smtpPort`}
                              type="number"
                              placeholder="587"
                              value={localSettings.smtpPort || ''}
                              onChange={e => setLocalSettings({ ...localSettings, smtpPort: parseInt(e.target.value) })}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm dark:text-slate-100"
                            />
                          </div>
                          <div>
                            <label htmlFor={`${fieldId}-smtpUser`} className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">Usuario (Email)</label>
                            <input
                              id={`${fieldId}-smtpUser`}
                              type="email"
                              placeholder="tu-correo@gmail.com"
                              value={localSettings.smtpUser || ''}
                              onChange={e => setLocalSettings({ ...localSettings, smtpUser: e.target.value })}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold dark:text-slate-100"
                            />
                          </div>
                          <div>
                            <label htmlFor={`${fieldId}-smtpPassword`} className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">Contraseña / App Password</label>
                            <input
                              id={`${fieldId}-smtpPassword`}
                              type="password"
                              placeholder="••••••••••••••••"
                              value={localSettings.smtpPassword || ''}
                              onChange={e => setLocalSettings({ ...localSettings, smtpPassword: e.target.value })}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm dark:text-slate-100"
                            />
                            <p className="text-xs text-sky-500 mt-1 font-bold">
                              <InboxArrowDownIcon className="w-4 h-4 inline" /> Gmail: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline">Crear contraseña de aplicación</a>
                            </p>
                          </div>
                        </>
                      )}

                      {emailProvider === 'sendgrid' && (
                        <div>
                          <label htmlFor={`${fieldId}-sendgridKey`} className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">SendGrid API Key</label>
                          <input
                            id={`${fieldId}-sendgridKey`}
                            type="password"
                            placeholder="SG.xxxxxxxxxxxxxxxxxxxx"
                            value={localSettings.sendgridApiKey || ''}
                            onChange={e => setLocalSettings({ ...localSettings, sendgridApiKey: e.target.value })}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm dark:text-slate-100"
                          />
                        </div>
                      )}

                      {emailProvider === 'mailgun' && (
                        <>
                          <div>
                            <label htmlFor={`${fieldId}-mailgunKey`} className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">Mailgun API Key</label>
                            <input
                              id={`${fieldId}-mailgunKey`}
                              type="password"
                              placeholder="key-xxxxxxxxxxxxxxxxxxxx"
                              value={localSettings.mailgunApiKey || ''}
                              onChange={e => setLocalSettings({ ...localSettings, mailgunApiKey: e.target.value })}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm dark:text-slate-100"
                            />
                          </div>
                          <div>
                            <label htmlFor={`${fieldId}-mailgunDomain`} className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">Mailgun Domain</label>
                            <input
                              id={`${fieldId}-mailgunDomain`}
                              type="text"
                              placeholder="sandbox123.mailgun.org"
                              value={localSettings.mailgunDomain || ''}
                              onChange={e => setLocalSettings({ ...localSettings, mailgunDomain: e.target.value })}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm dark:text-slate-100"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label htmlFor={`${fieldId}-senderEmail`} className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">Email Remitente</label>
                        <input
                          id={`${fieldId}-senderEmail`}
                          type="email"
                          placeholder="facturacion@tu-empresa.com"
                          value={localSettings.senderEmail || ''}
                          onChange={e => setLocalSettings({ ...localSettings, senderEmail: e.target.value })}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={testEmail}
                        disabled={!localSettings.senderEmail}
                        className="flex-1 py-3 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded-xl font-bold hover:bg-sky-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <BeakerIcon className="w-4 h-4" /> Probar Configuración
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                      >
                        Guardar Email
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab SMS */}
        {activeTab === 'sms' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-black text-slate-900 dark:text-slate-100">Activar SMS</p>
                <p className="text-xs text-slate-500 font-bold">Notifica a clientes vía mensaje de texto directo al celular</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.smsEnabled}
                  onChange={e => setLocalSettings({ ...localSettings, smsEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <span className="sr-only">Activar SMS</span>
                <div className="w-14 h-7 bg-slate-300 rounded-full peer peer-checked:bg-purple-600 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all"></div>
              </label>
            </div>

            {localSettings.smsEnabled && (
              <>
                {isSMSConfigured && !editingSMS ? (
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold flex items-center gap-1.5">
                          <CheckCircleIcon className="w-4 h-4" />
                          Configuración Guardada & Activa
                        </span>
                        <span className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Proveedor: {smsProvider.toUpperCase()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingSMS(true)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <PencilIcon className="w-4 h-4" />
                        Editar Configuración
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 font-bold block mb-1">Teléfono Remitente / ID</span>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100">{localSettings.twilioPhoneNumber || 'Registrado'}</span>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 font-bold block mb-1">Token de Autenticación</span>
                        <span className="font-mono text-slate-500">••••••••••••••••</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={testSMS}
                        className="w-full py-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 rounded-xl font-bold text-xs hover:bg-purple-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <BeakerIcon className="w-4 h-4" />
                        Enviar SMS de Prueba
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {isSMSConfigured && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingSMS(false)}
                          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer font-bold"
                        >
                          <XMarkIcon className="w-4 h-4" /> Cancelar Edición
                        </button>
                      </div>
                    )}
                    <div className="space-y-4">
                      <select
                        aria-label="Proveedor SMS"
                        value={smsProvider}
                        onChange={e => setLocalSettings({ ...localSettings, smsProvider: e.target.value as any })}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold dark:text-slate-100"
                      >
                        <option value="twilio">Twilio SMS</option>
                        <option value="nexmo">Vonage / Nexmo</option>
                      </select>

                      {smsProvider === 'twilio' ? (
                        <>
                          <input
                            type="text"
                            placeholder="Twilio Account SID"
                            value={localSettings.twilioAccountSid || ''}
                            onChange={e => setLocalSettings({ ...localSettings, twilioAccountSid: e.target.value })}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm dark:text-slate-100"
                          />
                          <input
                            type="password"
                            placeholder="Twilio Auth Token"
                            value={localSettings.twilioAuthToken || ''}
                            onChange={e => setLocalSettings({ ...localSettings, twilioAuthToken: e.target.value })}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm dark:text-slate-100"
                          />
                          <input
                            type="text"
                            placeholder="Número de teléfono Twilio (+593...)"
                            value={localSettings.twilioPhoneNumber || ''}
                            onChange={e => setLocalSettings({ ...localSettings, twilioPhoneNumber: e.target.value })}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold dark:text-slate-100"
                          />
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            placeholder="Vonage API Key"
                            value={(localSettings as any).nexmoApiKey || ''}
                            onChange={e => setLocalSettings({ ...localSettings, nexmoApiKey: e.target.value } as any)}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm dark:text-slate-100"
                          />
                          <input
                            type="password"
                            placeholder="Vonage API Secret"
                            value={(localSettings as any).nexmoApiSecret || ''}
                            onChange={e => setLocalSettings({ ...localSettings, nexmoApiSecret: e.target.value } as any)}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm dark:text-slate-100"
                          />
                        </>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={testSMS}
                        className="flex-1 py-3 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-xl font-bold hover:bg-purple-200 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <BeakerIcon className="w-4 h-4" /> Probar SMS
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                      >
                        Guardar SMS
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab WHATSAPP */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-black text-slate-900 dark:text-slate-100">Activar WhatsApp</p>
                <p className="text-xs text-slate-500 font-bold">Envía facturas y RIDE automáticamente al WhatsApp del cliente</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.whatsappEnabled}
                  onChange={e => setLocalSettings({ ...localSettings, whatsappEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <span className="sr-only">Activar WhatsApp</span>
                <div className="w-14 h-7 bg-slate-300 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all"></div>
              </label>
            </div>

            {localSettings.whatsappEnabled && (
              <>
                {isWhatsAppConfigured && !editingWhatsApp ? (
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold flex items-center gap-1.5">
                          <CheckCircleIcon className="w-4 h-4" />
                          Configuración Guardada & Activa
                        </span>
                        <span className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Proveedor: {whatsappProvider.toUpperCase()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingWhatsApp(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <PencilIcon className="w-4 h-4" />
                        Editar Configuración
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 font-bold block mb-1">Número Registrado</span>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100">{localSettings.whatsappNumber}</span>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 font-bold block mb-1">Token de Autenticación</span>
                        <span className="font-mono text-slate-500">••••••••••••••••</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={testWhatsApp}
                        className="w-full py-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <BeakerIcon className="w-4 h-4" />
                        Enviar WhatsApp de Prueba
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {isWhatsAppConfigured && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingWhatsApp(false)}
                          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer font-bold"
                        >
                          <XMarkIcon className="w-4 h-4" /> Cancelar Edición
                        </button>
                      </div>
                    )}
                    <div className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-slate-800 dark:to-slate-800/80 p-6 rounded-2xl border-2 border-emerald-300 dark:border-slate-700">
                      <div className="flex items-start gap-4">
                        <DevicePhoneMobileIcon className="w-10 h-10 text-emerald-600" />
                        <div className="flex-1">
                          <h3 className="font-black text-emerald-900 dark:text-emerald-300 mb-3">Guía Rápida</h3>
                          <div className="space-y-3 text-sm font-bold text-emerald-800 dark:text-emerald-200">
                            <div className="bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl">
                              <p className="font-black mb-1"><GlobeAltIcon className="w-4 h-4 inline" /> OPCIÓN 1: WhatsApp Cloud API (GRATIS)</p>
                              <ol className="list-decimal ml-5 space-y-1">
                                <li>Ve a developers.facebook.com</li>
                                <li>Crea App de WhatsApp Business y copia Token</li>
                              </ol>
                            </div>
                            <div className="bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl">
                              <p className="font-black mb-1"><KeyIcon className="w-4 h-4 inline" /> OPCIÓN 2: Twilio (FÁCIL)</p>
                              <ol className="list-decimal ml-5 space-y-1">
                                <li>Copia Account SID y Auth Token de Twilio</li>
                              </ol>
                            </div>
                          </div>
                          <button type="button"
                            onClick={() => setShowWhatsAppGuide(!showWhatsAppGuide)}
                            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 cursor-pointer"
                          >
                            {showWhatsAppGuide ? <><EyeSlashIcon className="w-4 h-4 inline" /> Ocultar</> : <><EyeIcon className="w-4 h-4 inline" /> Ver Tutorial</>}
                          </button>
                        </div>
                      </div>
                    </div>

                    {showWhatsAppGuide && (
                      <div className="bg-white dark:bg-slate-900 border-2 border-emerald-300 p-6 rounded-2xl">
                        <h4 className="font-black mb-4 dark:text-slate-100"> <BookOpenIcon className="w-4 h-4 inline" /> Tutorial Detallado</h4>
                        <div className="space-y-3 text-sm">
                          <div className="border-l-4 border-emerald-500 pl-4">
                            <p className="font-black mb-1 dark:text-slate-100">PASO 1: Crear App</p>
                            <p className="text-slate-600 dark:text-slate-400 font-bold">En developers.facebook.com/apps crea App de Empresa con WhatsApp</p>
                          </div>
                          <div className="border-l-4 border-sky-500 pl-4">
                            <p className="font-black mb-1 dark:text-slate-100">PASO 2: Token</p>
                            <p className="text-slate-600 dark:text-slate-400 font-bold">Copia el Token de acceso de WhatsApp</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <select
                        aria-label="Proveedor de WhatsApp"
                        value={whatsappProvider}
                        onChange={e => setLocalSettings({ ...localSettings, whatsappProvider: e.target.value as any })}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold dark:text-slate-100"
                      >
                        <option value="twilio">Twilio (Fácil)</option>
                        <option value="whatsapp-business">WhatsApp Cloud (Gratis)</option>
                      </select>

                      {whatsappProvider === 'twilio' ? (
                        <>
                          <input
                            type="text"
                            placeholder="Account SID"
                            value={localSettings.twilioAccountSid || ''}
                            onChange={e => setLocalSettings({ ...localSettings, twilioAccountSid: e.target.value })}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm dark:text-slate-100"
                          />
                          <input
                            type="password"
                            placeholder="Auth Token"
                            value={localSettings.twilioAuthToken || ''}
                            onChange={e => setLocalSettings({ ...localSettings, twilioAuthToken: e.target.value })}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm dark:text-slate-100"
                          />
                          <input
                            type="text"
                            placeholder="whatsapp:+593987654321"
                            value={localSettings.whatsappNumber || ''}
                            onChange={e => setLocalSettings({ ...localSettings, whatsappNumber: e.target.value })}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold dark:text-slate-100"
                          />
                        </>
                      ) : (
                        <>
                          <input
                            type="password"
                            placeholder="Token de WhatsApp"
                            value={localSettings.twilioAuthToken || ''}
                            onChange={e => setLocalSettings({ ...localSettings, twilioAuthToken: e.target.value })}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm dark:text-slate-100"
                          />
                          <input
                            type="text"
                            placeholder="ID del número de WhatsApp"
                            value={localSettings.whatsappNumber || ''}
                            onChange={e => setLocalSettings({ ...localSettings, whatsappNumber: e.target.value })}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm dark:text-slate-100"
                          />
                        </>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={testWhatsApp}
                        disabled={!localSettings.whatsappNumber}
                        className="flex-1 py-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold hover:bg-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <BeakerIcon className="w-4 h-4" /> Probar WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                      >
                        Guardar WhatsApp
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab REMINDERS */}
        {activeTab === 'reminders' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-black text-slate-900 dark:text-slate-100">Recordatorios Automáticos de Cobro</p>
                <p className="text-xs text-slate-500 font-bold">Envía alertas a clientes antes del vencimiento de facturas pendientes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.paymentRemindersEnabled}
                  onChange={e => setLocalSettings({ ...localSettings, paymentRemindersEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <span className="sr-only">Activar Recordatorios</span>
                <div className="w-14 h-7 bg-slate-300 rounded-full peer peer-checked:bg-sky-600 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all"></div>
              </label>
            </div>

            {localSettings.paymentRemindersEnabled && (
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h4 className="font-black text-sm text-slate-800 dark:text-slate-200">Días previos al vencimiento para notificar</h4>
                <div className="flex gap-4">
                  {[1, 3, 5, 7].map(day => (
                    <label key={day} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={localSettings.reminderDaysBefore?.includes(day)}
                        onChange={e => {
                          const current = localSettings.reminderDaysBefore || [];
                          const updated = e.target.checked
                            ? [...current, day]
                            : current.filter(d => d !== day);
                          setLocalSettings({ ...localSettings, reminderDaysBefore: updated });
                        }}
                        className="rounded text-sky-600 focus:ring-sky-500"
                      />
                      {day} {day === 1 ? 'día antes' : 'días antes'}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <button type="submit"
            onClick={handleSave}
            className="w-full py-4 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-black uppercase shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <EnvelopeIcon className="w-5 h-5" /> Guardar Toda la Configuración
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsComponent;
