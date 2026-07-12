import React, { useState, useEffect } from 'react';
import { DocumentTextIcon, ArrowLeftIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import CookieBanner from '../../../components/CookieBanner';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface LegalContent {
  title: string;
  terms: { title: string; content: string };
  privacy: { title: string; content: string };
  cookies: { title: string; content: string };
}

interface LandingContact {
  phone: string;
  email: string;
  hours: string;
}

const defaultLegalContent: LegalContent = {
  title: 'Información Legal',
  terms: {
    title: 'Términos y Condiciones',
    content: `<h3>1. Aceptación de los Términos</h3>
<p>Al acceder y utilizar el sistema Azul, usted acepta expresamente los presentes Términos y Condiciones. Si no está de acuerdo con alguno de estos términos, le recomendamos no utilizar nuestros servicios.</p>

<h3>2. Descripción del Servicio</h3>
<p>Azul es un sistema de facturación electrónica que permite a personas naturales y jurídicas en Ecuador emitir comprobantes electrónicos autorizados por el Servicio de Rentas Internas (SRI). El servicio incluye la generación de facturas, notas de crédito, retenciones, guías de remisión y liquidaciones de compra, así como módulos de inventario, producción y reportes tributarios.</p>

<h3>3. Registro y Cuenta</h3>
<p>Para utilizar nuestros servicios, debe crear una cuenta proporcionando información veraz, precisa y completa. Usted es responsable de mantener la confidencialidad de su contraseña y de todas las actividades que ocurran bajo su cuenta. Azul no se hace responsable por pérdidas o daños derivados del uso no autorizado de su cuenta.</p>

<h3>4. Planes y Pagos</h3>
<p>Ofrecemos diferentes planes de suscripción con características y precios variables. Los precios están expresados en dólares estadounidenses e incluyen IVA cuando corresponda. Las suscripciones se renuevan automáticamente al final de cada período, salvo cancelación previa. Nos reservamos el derecho de modificar los precios con notificación previa de al menos 30 días.</p>

<h3>5. Uso Aceptable</h3>
<p>Usted se compromete a utilizar Azul únicamente para fines lícitos y de conformidad con la legislación ecuatoriana vigente. Está prohibido: (a) utilizar el sistema para emitir comprobantes falsos o fraudulentos; (b) intentar acceder a datos de otros usuarios; (c) realizar ingeniería inversa sobre el software; (d) utilizar el sistema para fines que violen derechos de terceros.</p>

<h3>6. Propiedad Intelectual</h3>
<p>Todo el contenido, software, diseño, marcas y derechos de propiedad intelectual relacionados con Azul son de nuestra exclusiva propiedad o están debidamente licenciados. El uso de nuestros servicios no le otorga ningún derecho de propiedad sobre los mismos.</p>

<h3>7. Limitación de Responsabilidad</h3>
<p>Azul se proporciona "tal cual" y "según disponibilidad". No garantizamos que el servicio sea ininterrumpido o libre de errores. Nuestra responsabilidad total por cualquier reclamo relacionado con el servicio no excederá el monto pagado por usted en los últimos 12 meses. No seremos responsables por pérdidas indirectas, incidentales o consecuentes.</p>

<h3>8. Legislación Aplicable</h3>
<p>Estos Términos y Condiciones se rigen por las leyes de la República del Ecuador. Cualquier controversia derivada de los mismos será sometida a los tribunales competentes de la ciudad de Quito.</p>`,
  },
  privacy: {
    title: 'Política de Privacidad',
    content: `<h3>1. Información que Recopilamos</h3>
<p>Para proporcionar nuestros servicios de facturación electrónica, recopilamos la siguiente información: (a) datos de identificación del titular (nombre, RUC, dirección); (b) datos de contacto (correo electrónico, teléfono); (c) información fiscal y tributaria requerida por el SRI; (d) datos de facturación y transacciones comerciales; (e) datos de uso del sistema con fines de mejora del servicio.</p>

<h3>2. Finalidad del Tratamiento</h3>
<p>Utilizamos sus datos para: (a) generar y firmar electrónicamente los comprobantes exigidos por el SRI; (b) gestionar su cuenta y proporcionar soporte técnico; (c) procesar pagos de suscripción; (d) enviar notificaciones relacionadas con el servicio; (e) cumplir con obligaciones legales aplicables.</p>

<h3>3. Base Legal del Tratamiento</h3>
<p>El tratamiento de sus datos personales se fundamenta en: (a) la ejecución del contrato de servicios; (b) el cumplimiento de obligaciones legales (Ley de Comercio Electrónico, Ley del SRI); (c) su consentimiento expreso para fines específicos; (d) nuestro interés legítimo en mejorar y proteger nuestros servicios.</p>

<h3>4. Derechos del Titular</h3>
<p>De conformidad con la Ley Orgánica de Protección de Datos Personales del Ecuador, usted tiene derecho a: (a) acceder a sus datos personales; (b) solicitar la rectificación de datos inexactos; (c) solicitar la eliminación de datos cuando ya no sean necesarios; (d) oponerse al tratamiento; (e) solicitar la portabilidad de sus datos. Para ejercer estos derechos, contáctenos a través de los canales indicados.</p>

<h3>5. Conservación de Datos</h3>
<p>Conservamos sus datos personales durante el tiempo que mantenga una relación contractual con nosotros y, posteriormente, durante los plazos legales de prescripción aplicables (generalmente 7 años para documentos tributarios según la legislación ecuatoriana).</p>

<h3>6. Seguridad de los Datos</h3>
<p>Implementamos medidas técnicas y organizativas para proteger sus datos: cifrado SSL/TLS de 256 bits, almacenamiento en servidores AWS con certificación ISO 27001, controles de acceso basados en roles, y monitoreo continuo de seguridad. Sus datos fiscales y certificados digitales reciben protección reforzada.</p>

<h3>7. Transferencias Internacionales</h3>
<p>Sus datos pueden ser almacenados en servidores ubicados fuera del Ecuador (AWS us-east-1). En tales casos, nos aseguramos de que existan garantías adecuadas conforme a la legislación ecuatoriana de protección de datos.</p>

<h3>8. Cookies y Tecnologías Similares</h3>
<p>Utilizamos cookies y tecnologías similares para el funcionamiento del sistema. Para más detalles, consulte nuestra Política de Cookies.</p>

<h3>9. Contacto DPO</h3>
<p>Para cualquier consulta sobre privacidad o para ejercer sus derechos, contacte a nuestro Delegado de Protección de Datos en: privacidad@Azul.pro</p>`,
  },
  cookies: {
    title: 'Política de Cookies',
    content: `<h3>1. ¿Qué son las Cookies?</h3>
<p>Las cookies son pequeños archivos de texto que los sitios web almacenan en su dispositivo cuando los visita. Permiten que el sitio recuerde información sobre su visita, como su idioma preferido y otras configuraciones, lo que puede facilitar su próxima visita y hacer que el sitio le resulte más útil.</p>

<h3>2. Tipos de Cookies que Utilizamos</h3>
<p><strong>Cookies Esenciales (Técnicas):</strong> Son necesarias para el funcionamiento del sistema de facturación. Permiten la autenticación de usuarios, el mantenimiento de sesiones seguras y la protección contra accesos no autorizados. Sin estas cookies, Azul no puede funcionar correctamente.</p>
<p><strong>Cookies de Preferencias:</strong> Recuerdan sus elecciones, como el idioma, el modo claro/oscuro, y otras configuraciones de personalización de la interfaz.</p>
<p><strong>Cookies de Análisis:</strong> Nos ayudan a entender cómo los usuarios interactúan con el sistema (páginas visitadas, tiempo de uso) para mejorar la experiencia. Utilizamos herramientas propias de análisis, sin compartir datos con terceros.</p>
<p><strong>Cookies de Sesión:</strong> Son temporales y se eliminan al cerrar el navegador. Se utilizan para mantener su sesión activa mientras usa el sistema.</p>

<h3>3. Cookies de Terceros</h3>
<p>Azul no utiliza cookies de terceros para publicidad ni para seguimiento con fines comerciales. Las únicas cookies de terceros presentes son las necesarias para el procesamiento de pagos (PayPal) cuando usted realiza una suscripción.</p>

<h3>4. Duración de las Cookies</h3>
<p>Según su duración, las cookies pueden ser: (a) de sesión: se eliminan al cerrar el navegador; (b) persistentes: permanecen en su dispositivo por un período definido (generalmente 30 días para preferencias, 24 horas para tokens de sesión).</p>

<h3>5. Gestión de Cookies</h3>
<p>Usted puede configurar su navegador para rechazar todas o algunas cookies, o para que le avise cuando se envía una cookie. Tenga en cuenta que si desactiva las cookies esenciales, no podrá iniciar sesión ni utilizar las funciones principales de Azul.</p>
<p>Para gestionar las cookies en los navegadores más comunes:</p>
<ul>
<li><strong>Chrome:</strong> Configuración > Privacidad y seguridad > Cookies y otros datos de sitios</li>
<li><strong>Firefox:</strong> Opciones > Privacidad y Seguridad > Cookies y datos del sitio</li>
<li><strong>Safari:</strong> Preferencias > Privacidad > Cookies y datos de sitios web</li>
<li><strong>Edge:</strong> Configuración > Cookies y permisos del sitio</li>
</ul>

<h3>6. Actualizaciones de esta Política</h3>
<p>Podemos actualizar esta Política de Cookies periódicamente para reflejar cambios en nuestras prácticas o en la legislación aplicable. Le notificaremos cualquier cambio significativo a través de nuestro sitio web o por correo electrónico.</p>

<h3>7. Contacto</h3>
<p>Si tiene preguntas sobre nuestra política de cookies, contáctenos en: privacidad@Azul.pro</p>`,
  },
};

const defaultContact: LandingContact = {
  phone: '+593 99 999 9999',
  email: 'info@Azul.pro',
  hours: 'Lun - Vie: 08:00 - 18:00',
};

type TabKey = 'terms' | 'privacy' | 'cookies';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'terms', label: 'Términos y Condiciones' },
  { key: 'privacy', label: 'Privacidad' },
  { key: 'cookies', label: 'Cookies' },
];

const LegalPage: React.FC = () => {
  const [content, setContent] = useState<LegalContent>(defaultLegalContent);
  const [contact, setContact] = useState<LandingContact>(defaultContact);
  const [activeTab, setActiveTab] = useState<TabKey>('terms');
  const [landingLogo, setLandingLogo] = useState<string | null | false>(null);

  // Página pública solo con tema claro: limpiar la clase "dark" residual.
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

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
          if (data.landingContent.legalPage) {
            setContent(prev => ({
              ...prev,
              ...data.landingContent.legalPage,
            }));
          }
          if (data.landingContent.contact) {
            setContact(prev => ({ ...prev, ...data.landingContent.contact }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const activeContent = content[activeTab];

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
        </div>
      </section>

      {/* ===== TABS ===== */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0 overflow-x-auto">
            {tabs.map(tab => (
              <button type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-5 py-4 text-sm font-bold transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'text-[#0EA5E9]'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0EA5E9]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TAB CONTENT ===== */}
      <section className="flex-1 py-12 lg:py-16 bg-[#F8F9FC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-8 lg:p-10 border border-slate-100 shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-800 mb-6">{activeContent.title}</h2>
            <div
              className="legal-content prose prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: activeContent.content }}
            />
          </div>
        </div>
      </section>

      {/* Inline styles for legal HTML content */}
      <style>{`
        .legal-content h3 {
          font-size: 1.125rem;
          font-weight: 800;
          color: #1e293b;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
        }
        .legal-content h3:first-child {
          margin-top: 0;
        }
        .legal-content p {
          font-size: 0.9375rem;
          color: #64748b;
          line-height: 1.7;
          margin-bottom: 1rem;
          font-weight: 500;
        }
        .legal-content strong {
          color: #334155;
          font-weight: 700;
        }
        .legal-content ul {
          list-style: disc;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .legal-content ul li {
          font-size: 0.9375rem;
          color: #64748b;
          line-height: 1.7;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
      `}</style>

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

export default LegalPage;
