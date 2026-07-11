import React, { useState, useEffect } from 'react';
import { DocumentTextIcon, ArrowLeftIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import CookieBanner from '../../../components/CookieBanner';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface AyudaContent {
  title: string;
  subtitle: string;
  faqs: Array<{ question: string; answer: string }>;
}

interface LandingContact {
  phone: string;
  email: string;
  hours: string;
}

const defaultAyudaContent: AyudaContent = {
  title: 'Centro de Ayuda',
  subtitle: 'Encuentra respuestas a las preguntas más comunes sobre Azul.',
  faqs: [
    { question: '¿Qué tipos de negocio soportan?', answer: 'Soportamos panaderías, restaurantes, tiendas, servicios profesionales, distribuidoras, y cualquier tipo de comercio. Cada tipo activa los módulos que realmente necesita: recetas para gastronomía, inventario para tiendas, caja rápida para retail, entre otros.' },
    { question: '¿Cómo funciona el control de recetas?', answer: 'Puedes crear recetas vinculando productos terminados con sus ingredientes (materia prima). Cada receta define las cantidades exactas de insumos necesarios. Al registrar una producción, el sistema descuenta automáticamente los ingredientes del inventario y calcula el costo unitario de cada producto elaborado.' },
    { question: '¿Las facturas son válidas para el SRI?', answer: 'Sí. Azul genera facturas electrónicas con todas las especificaciones técnicas exigidas por el Servicio de Rentas Internas del Ecuador: clave de acceso de 49 dígitos, firma electrónica con certificado digital P12, y archivo XML con la estructura oficial. Puedes enviarlas al SRI y entregarlas a tus clientes.' },
    { question: '¿Puedo cambiar de plan después?', answer: 'Sí, puedes actualizar o cambiar de plan en cualquier momento desde el panel de suscripción. El upgrade es inmediato y solo pagas la diferencia proporcional. Si bajas de plan, el cambio se aplica al siguiente ciclo de facturación.' },
    { question: '¿Mis datos están seguros?', answer: 'Tus datos se almacenan encriptados en servidores seguros en la nube (AWS). Usamos cifrado SSL/TLS de 256 bits para todas las comunicaciones. Las contraseñas se almacenan con hash y salt. Solo tú y los usuarios que autorices tienen acceso a tu información. Realizamos backups automáticos diarios.' },
    { question: '¿Ofrecen soporte técnico?', answer: 'Sí. El plan Básico incluye acceso a nuestra base de conocimiento y soporte por email en horario laboral. El plan Pro incluye soporte prioritario por chat en vivo y email con respuesta en menos de 2 horas. El plan Enterprise tiene soporte 24/7 con gerente de cuenta asignado.' },
    { question: '¿Cómo emito mi primera factura?', answer: 'Después de registrarte y configurar tu empresa (RUC, dirección, logo), ve a la sección Facturación. Agrega un cliente, selecciona los productos o servicios, y haz clic en Autorizar. Si tienes firma electrónica configurada, la factura se firmará y quedará lista para enviar al SRI.' },
    { question: '¿Qué métodos de pago aceptan?', answer: 'Aceptamos PayPal, tarjetas de crédito y débito (Visa, Mastercard), y transferencia bancaria para planes anuales. Todos los pagos se procesan de forma segura. Las suscripciones mensuales se renuevan automáticamente y puedes cancelar en cualquier momento.' },
  ],
};

const defaultContact: LandingContact = {
  phone: '+593 99 999 9999',
  email: 'info@Azul.pro',
  hours: 'Lun - Vie: 08:00 - 18:00',
};

const AyudaPage: React.FC = () => {
  const [content, setContent] = useState<AyudaContent>(defaultAyudaContent);
  const [contact, setContact] = useState<LandingContact>(defaultContact);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [landingLogo, setLandingLogo] = useState<string | null | false>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLandingLogo('/api/settings/landing-logo');
    img.onerror = () => setLandingLogo(false);
    img.src = '/api/settings/landing-logo';
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/landing-content`)
      .then(r => r.json())
      .then(data => {
        if (data.landingContent) {
          if (data.landingContent.ayudaPage && data.landingContent.ayudaPage.faqs) {
            setContent(prev => ({
              ...prev,
              ...data.landingContent.ayudaPage,
            }));
          }
          if (data.landingContent.contact) {
            setContact(prev => ({ ...prev, ...data.landingContent.contact }));
          }
        }
      })
      .catch(() => {});
  }, []);

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
            {landingLogo && (
              <img src={landingLogo} className="h-12 w-auto max-w-[220px] object-contain object-left" alt="Logo" />
            )}
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
            {content.title}
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto font-medium">
            {content.subtitle}
          </p>
        </div>
      </section>

      {/* ===== FAQ CONTENT ===== */}
      <section className="flex-1 py-16 lg:py-20 bg-[#F8F9FC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-3">
            {content.faqs.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <button type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 lg:p-6 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="text-base font-bold text-slate-800 pr-4">{faq.question}</span>
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full bg-[#F8F9FC] flex items-center justify-center text-[#0EA5E9] font-extrabold text-lg transition-transform duration-300 ${openFaq === idx ? 'rotate-45' : ''}`}>+</span>
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-6">
                    <p className="text-slate-500 leading-relaxed font-medium">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
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

export default AyudaPage;
