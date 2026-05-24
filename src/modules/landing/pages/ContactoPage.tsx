import React, { useState, useEffect } from 'react';
import { DocumentTextIcon, ArrowLeftIcon, PhoneIcon, EnvelopeIcon, ClockIcon, MapPinIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import CookieBanner from '../../../components/CookieBanner';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface ContactInfo {
  phone: string;
  email: string;
  address?: string;
  hours: string;
}

const defaultContact: ContactInfo = {
  phone: '+593 99 999 9999',
  email: 'info@Azul.pro',
  address: 'Av. Amazonas y Naciones Unidas, Edificio Las Cámaras, Piso 4, Quito - Ecuador',
  hours: 'Lun - Vie: 08:00 - 18:00',
};

const ContactoPage: React.FC = () => {
  const [contact, setContact] = useState<ContactInfo>(defaultContact);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/landing-content`)
      .then(r => r.json())
      .then(data => {
        if (data.landingContent?.contact) {
          setContact(prev => ({ ...prev, ...data.landingContent.contact }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* ===== TOP INFO BAR ===== */}
      <div className="bg-[#0369A1] text-white text-xs font-medium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-9">
          <div className="flex items-center gap-6">
            <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-white/80 transition-colors">
              <PhoneIcon className="w-3.5 h-3.5" /> {contact.phone}
            </a>
            <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:text-white/80 transition-colors">
              <EnvelopeIcon className="w-3.5 h-3.5" /> {contact.email}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span>{contact.hours}</span>
          </div>
        </div>
      </div>

      {/* ===== MINIMAL HEADER ===== */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" className="h-12 w-auto max-w-[220px] object-contain object-left" alt="Azul PRO" />
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0EA5E9] transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Volver al inicio
          </a>
        </div>
      </header>

      {/* ===== HERO BAR (Blue Gradient) ===== */}
      <section className="bg-gradient-to-br from-[#0369A1] via-[#0369A1] to-[#0EA5E9] py-12 lg:py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Contacto
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto font-medium">
            Estamos aquí para ayudarte. Contáctanos por cualquiera de nuestros canales.
          </p>
        </div>
      </section>

      {/* ===== CONTACT CONTENT ===== */}
      <section className="flex-1 py-16 lg:py-20 bg-[#F8F9FC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10">
            {/* Contact Info */}
            <div className="space-y-8">
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <h2 className="text-xl font-extrabold text-slate-800 mb-6">Información de Contacto</h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#0EA5E9]/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <PhoneIcon className="w-6 h-6 text-[#0EA5E9]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Teléfono</p>
                      <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="text-lg font-extrabold text-slate-800 hover:text-[#0EA5E9] transition-colors">{contact.phone}</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#0EA5E9]/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <EnvelopeIcon className="w-6 h-6 text-[#0EA5E9]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Email</p>
                      <a href={`mailto:${contact.email}`} className="text-lg font-extrabold text-slate-800 hover:text-[#0EA5E9] transition-colors">{contact.email}</a>
                    </div>
                  </div>
                  {contact.address && (
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[#0EA5E9]/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <MapPinIcon className="w-6 h-6 text-[#0EA5E9]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Dirección</p>
                        <p className="text-base font-semibold text-slate-800 leading-relaxed">{contact.address}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#0EA5E9]/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <ClockIcon className="w-6 h-6 text-[#0EA5E9]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Horario de Atención</p>
                      <p className="text-base font-semibold text-slate-800">{contact.hours}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Placeholder */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="bg-slate-200 h-64 flex items-center justify-center">
                  <div className="text-center">
                    <MapPinIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-500">Ubicación</p>
                    <p className="text-xs text-slate-400 mt-1">{contact.address || 'Quito, Ecuador'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <h2 className="text-xl font-extrabold text-slate-800 mb-6">Enviar Mensaje</h2>
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800 mb-2">¡Mensaje Enviado!</h3>
                  <p className="text-slate-500 font-medium">Gracias por contactarnos. Te responderemos a la brevedad posible.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Tu nombre completo"
                      className="w-full p-4 bg-[#F8F9FC] rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#0EA5E9] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="tu@email.com"
                      className="w-full p-4 bg-[#F8F9FC] rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#0EA5E9] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mensaje</label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Escribe tu mensaje aquí..."
                      className="w-full p-4 bg-[#F8F9FC] rounded-2xl font-medium text-sm outline-none border-2 border-transparent focus:border-[#0EA5E9] transition-colors resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-4 bg-[#0EA5E9] text-white rounded-2xl font-bold text-sm hover:bg-[#0369A1] transition-all shadow-lg shadow-[#0EA5E9]/25 hover:-translate-y-0.5"
                  >
                    Enviar Mensaje
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#1E293B] text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>{new Date().getFullYear()} Azul. Todos los derechos reservados.</p>
        </div>
      </footer>
      <CookieBanner />
    </div>
  );
};

export default ContactoPage;
