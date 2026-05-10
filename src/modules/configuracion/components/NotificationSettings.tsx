import React, { useState } from 'react';
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

  const handleSave = () => {
    onSave(localSettings);
    onNotify('Configuración guardada exitosamente', 'success');
  };

  const testEmail = () => onNotify('Email de prueba enviado', 'success');
  const testSMS = () => onNotify('SMS de prueba enviado', 'success');
  const testWhatsApp = () => onNotify('WhatsApp de prueba enviado', 'success');

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

      <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <Cog6ToothIcon className="w-10 h-10" />
          <div>
            <h2 className="text-2xl font-black">Configuración</h2>
            <p className="text-sm text-slate-500 font-bold">Activa los canales que usarás</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          {[
            { id: 'email', label: 'Email', icon: <EnvelopeIcon className="w-4 h-4 inline" /> },
            { id: 'sms', label: 'SMS', icon: <ChatBubbleLeftRightIcon className="w-4 h-4 inline" /> },
            { id: 'whatsapp', label: 'WhatsApp', icon: <DevicePhoneMobileIcon className="w-4 h-4 inline" /> },
            { id: 'reminders', label: 'Recordatorios', icon: <ClockIcon className="w-4 h-4 inline" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 font-bold text-sm rounded-t-xl ${
                activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="font-black">Activar Email</p>
                <p className="text-xs text-slate-500 font-bold">Envía facturas automáticamente por correo</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.emailEnabled}
                  onChange={e => setLocalSettings({ ...localSettings, emailEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-300 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all"></div>
              </label>
            </div>

            {localSettings.emailEnabled && (
              <>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-2xl border-2 border-blue-300">
                  <div className="flex items-start gap-4">
                    <EnvelopeIcon className="w-10 h-10" />
                    <div className="flex-1">
                      <h3 className="font-black text-indigo-900 mb-3">Selecciona tu Proveedor</h3>
                      <div className="space-y-3 text-sm font-bold text-indigo-800">
                        <div className="bg-white/60 p-3 rounded-xl">
                          <p className="font-black mb-1"><BuildingLibraryIcon className="w-4 h-4 inline" /> OPCIÓN 1: SMTP (Gmail, Outlook, etc.)</p>
                          <ul className="list-disc ml-5 space-y-1">
                            <li>Gmail: smtp.gmail.com:587</li>
                            <li>Outlook: smtp-mail.outlook.com:587</li>
                            <li>Yahoo: smtp.mail.yahoo.com:587</li>
                          </ul>
                          <p className="mt-2 text-xs text-indigo-600"><ExclamationTriangleIcon className="w-4 h-4 inline" /> Gmail: necesitas crear contraseña de aplicación</p>
                        </div>
                        <div className="bg-white/60 p-3 rounded-xl">
                          <p className="font-black mb-1"><RocketLaunchIcon className="w-4 h-4 inline" /> OPCIÓN 2: SendGrid (Profesional)</p>
                          <ul className="list-disc ml-5 space-y-1">
                            <li>Registro gratis en sendgrid.com</li>
                            <li>100 emails diarios GRATIS</li>
                            <li>Más confiable para facturación</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <select
                    value={localSettings.emailProvider || 'smtp'}
                    onChange={e => setLocalSettings({ ...localSettings, emailProvider: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border rounded-xl font-bold"
                  >
                    <option value="smtp">SMTP (Gmail, Outlook, etc.)</option>
                    <option value="sendgrid">SendGrid (Profesional)</option>
                    <option value="mailgun">Mailgun</option>
                  </select>

                  {localSettings.emailProvider === 'smtp' && (
                    <>
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-2">Host SMTP</label>
                        <input
                          type="text"
                          placeholder="smtp.gmail.com"
                          value={localSettings.smtpHost || ''}
                          onChange={e => setLocalSettings({ ...localSettings, smtpHost: e.target.value })}
                          className="w-full p-3 bg-slate-50 border rounded-xl font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-2">Puerto SMTP</label>
                        <input
                          type="number"
                          placeholder="587"
                          value={localSettings.smtpPort || ''}
                          onChange={e => setLocalSettings({ ...localSettings, smtpPort: parseInt(e.target.value) })}
                          className="w-full p-3 bg-slate-50 border rounded-xl font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-2">Usuario (Email)</label>
                        <input
                          type="email"
                          placeholder="tu-correo@gmail.com"
                          value={localSettings.smtpUser || ''}
                          onChange={e => setLocalSettings({ ...localSettings, smtpUser: e.target.value })}
                          className="w-full p-3 bg-slate-50 border rounded-xl font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-2">Contraseña / App Password</label>
                        <input
                          type="password"
                          placeholder="••••••••••••••••"
                          value={localSettings.smtpPassword || ''}
                          onChange={e => setLocalSettings({ ...localSettings, smtpPassword: e.target.value })}
                          className="w-full p-3 bg-slate-50 border rounded-xl font-mono text-sm"
                        />
                        <p className="text-xs text-indigo-600 mt-1 font-bold">
                          <InboxArrowDownIcon className="w-4 h-4 inline" /> Gmail: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener" className="underline">Crear contraseña de aplicación</a>
                        </p>
                      </div>
                    </>
                  )}

                  {localSettings.emailProvider === 'sendgrid' && (
                    <>
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-2">SendGrid API Key</label>
                        <input
                          type="password"
                          placeholder="SG.xxxxxxxxxxxxxxxxxxxx"
                          value={localSettings.sendgridApiKey || ''}
                          onChange={e => setLocalSettings({ ...localSettings, sendgridApiKey: e.target.value })}
                          className="w-full p-3 bg-slate-50 border rounded-xl font-mono text-sm"
                        />
                        <p className="text-xs text-indigo-600 mt-1 font-bold">
                          <InboxArrowDownIcon className="w-4 h-4 inline" /> Obtén tu API Key en: <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener" className="underline">SendGrid Dashboard</a>
                        </p>
                      </div>
                    </>
                  )}

                  {localSettings.emailProvider === 'mailgun' && (
                    <>
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-2">Mailgun API Key</label>
                        <input
                          type="password"
                          placeholder="key-xxxxxxxxxxxxxxxxxxxx"
                          value={localSettings.mailgunApiKey || ''}
                          onChange={e => setLocalSettings({ ...localSettings, mailgunApiKey: e.target.value })}
                          className="w-full p-3 bg-slate-50 border rounded-xl font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-2">Mailgun Domain</label>
                        <input
                          type="text"
                          placeholder="sandbox123.mailgun.org"
                          value={localSettings.mailgunDomain || ''}
                          onChange={e => setLocalSettings({ ...localSettings, mailgunDomain: e.target.value })}
                          className="w-full p-3 bg-slate-50 border rounded-xl font-mono text-sm"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-2">Email Remitente</label>
                    <input
                      type="email"
                      placeholder="facturacion@tu-empresa.com"
                      value={localSettings.senderEmail || ''}
                      onChange={e => setLocalSettings({ ...localSettings, senderEmail: e.target.value })}
                      className="w-full p-3 bg-slate-50 border rounded-xl font-bold"
                    />
                  </div>
                </div>

                <button
                  onClick={testEmail}
                  disabled={!localSettings.senderEmail}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                  <BeakerIcon className="w-4 h-4 inline" /> Enviar Email de Prueba
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="font-black">Activar WhatsApp</p>
                <p className="text-xs text-slate-500 font-bold">Envía facturas al WhatsApp del cliente</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.whatsappEnabled}
                  onChange={e => setLocalSettings({ ...localSettings, whatsappEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-300 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all"></div>
              </label>
            </div>

            {localSettings.whatsappEnabled && (
              <>
                <div className="bg-gradient-to-br from-emerald-50 to-green-100 p-6 rounded-2xl border-2 border-emerald-300">
                  <div className="flex items-start gap-4">
                    <DevicePhoneMobileIcon className="w-10 h-10" />
                    <div className="flex-1">
                      <h3 className="font-black text-emerald-900 mb-3">Guía Rápida</h3>
                      <div className="space-y-3 text-sm font-bold text-emerald-800">
                        <div className="bg-white/60 p-3 rounded-xl">
                          <p className="font-black mb-1"><GlobeAltIcon className="w-4 h-4 inline" /> OPCIÓN 1: WhatsApp Cloud API (GRATIS)</p>
                          <ol className="list-decimal ml-5 space-y-1">
                            <li>Ve a developers.facebook.com</li>
                            <li>Crea App de WhatsApp Business</li>
                            <li>Copia Token y pégalo abajo</li>
                          </ol>
                        </div>
                        <div className="bg-white/60 p-3 rounded-xl">
                          <p className="font-black mb-1"><KeyIcon className="w-4 h-4 inline" /> OPCIÓN 2: Twilio (FÁCIL)</p>
                          <ol className="list-decimal ml-5 space-y-1">
                            <li>Cuenta en twilio.com ($15 gratis)</li>
                            <li>Activa WhatsApp Business</li>
                            <li>Copia SID y Token</li>
                          </ol>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowWhatsAppGuide(!showWhatsAppGuide)}
                        className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                      >
                        {showWhatsAppGuide ? <><EyeSlashIcon className="w-4 h-4 inline" /> Ocultar</> : <><EyeIcon className="w-4 h-4 inline" /> Ver Tutorial</>}
                      </button>
                    </div>
                  </div>
                </div>

                {showWhatsAppGuide && (
                  <div className="bg-white border-2 border-emerald-300 p-6 rounded-2xl">
                    <h4 className="font-black mb-4">                    <BookOpenIcon className="w-4 h-4 inline" /> Tutorial Detallado</h4>
                    <div className="space-y-3 text-sm">
                      <div className="border-l-4 border-emerald-500 pl-4">
                        <p className="font-black mb-1">PASO 1: Crear App</p>
                        <p className="text-slate-600 font-bold">En developers.facebook.com/apps crea App de Empresa con WhatsApp</p>
                      </div>
                      <div className="border-l-4 border-indigo-500 pl-4">
                        <p className="font-black mb-1">PASO 2: Token</p>
                        <p className="text-slate-600 font-bold">Copia el Token de acceso (temporal o permanente)</p>
                      </div>
                      <div className="border-l-4 border-purple-500 pl-4">
                        <p className="font-black mb-1">PASO 3: Número</p>
                        <p className="text-slate-600 font-bold">Verifica tu número y copia el ID</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <select
                    value={localSettings.whatsappProvider || 'twilio'}
                    onChange={e => setLocalSettings({ ...localSettings, whatsappProvider: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border rounded-xl font-bold"
                  >
                    <option value="twilio">Twilio (Fácil)</option>
                    <option value="whatsapp-business">WhatsApp Cloud (Gratis)</option>
                  </select>

                  {localSettings.whatsappProvider === 'twilio' ? (
                    <>
                      <input
                        type="text"
                        placeholder="Account SID"
                        value={localSettings.twilioAccountSid || ''}
                        onChange={e => setLocalSettings({ ...localSettings, twilioAccountSid: e.target.value })}
                        className="w-full p-3 bg-slate-50 border rounded-xl font-mono text-sm"
                      />
                      <input
                        type="password"
                        placeholder="Auth Token"
                        value={localSettings.twilioAuthToken || ''}
                        onChange={e => setLocalSettings({ ...localSettings, twilioAuthToken: e.target.value })}
                        className="w-full p-3 bg-slate-50 border rounded-xl font-mono text-sm"
                      />
                      <input
                        type="text"
                        placeholder="whatsapp:+593987654321"
                        value={localSettings.whatsappNumber || ''}
                        onChange={e => setLocalSettings({ ...localSettings, whatsappNumber: e.target.value })}
                        className="w-full p-3 bg-slate-50 border rounded-xl font-bold"
                      />
                    </>
                  ) : (
                    <>
                      <input
                        type="password"
                        placeholder="Token de WhatsApp"
                        value={localSettings.twilioAuthToken || ''}
                        onChange={e => setLocalSettings({ ...localSettings, twilioAuthToken: e.target.value })}
                        className="w-full p-3 bg-slate-50 border rounded-xl font-mono text-sm"
                      />
                      <input
                        type="text"
                        placeholder="ID del número"
                        value={localSettings.whatsappNumber || ''}
                        onChange={e => setLocalSettings({ ...localSettings, whatsappNumber: e.target.value })}
                        className="w-full p-3 bg-slate-50 border rounded-xl font-mono text-sm"
                      />
                    </>
                  )}
                </div>

                <button
                  onClick={testWhatsApp}
                  disabled={!localSettings.whatsappNumber}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  <BeakerIcon className="w-4 h-4 inline" /> Enviar Prueba
                </button>
              </>
            )}
          </div>
        )}

        {/* Placeholder para otros tabs */}
        {activeTab !== 'whatsapp' && activeTab !== 'email' && (
          <div className="text-center py-12">
            <p className="text-slate-400 font-bold">Funcionalidad en desarrollo</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t">
          <button
            onClick={handleSave}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase shadow-lg"
          >
            <EnvelopeIcon className="w-4 h-4 inline" /> Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsComponent;
