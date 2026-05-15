import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bars3Icon,
  XMarkIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  StarIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ChartBarIcon,
  CubeIcon,
  DocumentTextIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CalculatorIcon,
  ArrowTrendingUpIcon,
  PhoneIcon,
  EnvelopeIcon,
  LockClosedIcon,
  FireIcon,
  BuildingStorefrontIcon,
  ShoppingBagIcon,
  WrenchScrewdriverIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import CookieBanner from '../../../components/CookieBanner';
import { BUSINESS_TYPES, BusinessType } from '../../../types/types';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface ApiPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  period: string;
  durationDays: number;
  features: string[];
  isActive: boolean;
  highlighted?: boolean;
}

interface LandingContent {
  hero: { badge: string; headline: string; subheadline: string; primaryCta: string; secondaryCta: string };
  stats: Array<{ value: number; label: string; suffix: string }>;
  painPoints: Array<{ title: string; description: string }>;
  why: Array<{ title: string; description: string }>;
  features: Array<{ title: string; description: string }>;
  howItWorks: Array<{ step: string; title: string; description: string }>;
  testimonials: Array<{ name: string; business: string; quote: string; rating: number }>;
  faq: Array<{ question: string; answer: string }>;
  finalCta: { headline: string; subheadline: string; primaryCta: string; secondaryCta: string };
  contact: { phone: string; email: string; hours: string };
  footer: { tagline: string; facebook: string; twitter: string; instagram: string; linkedin: string };
  ayudaPage: { title: string; subtitle: string; faqs: Array<{ question: string; answer: string }> };
  contactoPage: { title: string; subtitle: string };
  legalPage: { title: string; terms: { title: string; content: string }; privacy: { title: string; content: string }; cookies: { title: string; content: string } };
  cookieBanner: { message: string };
}

const featureIcons = [DocumentTextIcon, CubeIcon, SparklesIcon, ChartBarIcon, UserGroupIcon, ShieldCheckIcon];
const painPointIcons = [ExclamationTriangleIcon, CalculatorIcon, ClockIcon];
const whyIcons = [ShieldCheckIcon, StarIcon, UserGroupIcon, ChartBarIcon];

const businessTypeIcons: Record<string, { Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; bg: string }> = {
  BAKERY:     { Icon: FireIcon,               color: 'text-amber-600',   bg: 'bg-amber-50 group-hover:bg-amber-100' },
  RESTAURANT: { Icon: BuildingStorefrontIcon, color: 'text-rose-600',    bg: 'bg-rose-50 group-hover:bg-rose-100' },
  STORE:      { Icon: ShoppingBagIcon,        color: 'text-violet-600',  bg: 'bg-violet-50 group-hover:bg-violet-100' },
  SERVICE:    { Icon: WrenchScrewdriverIcon,  color: 'text-sky-600',     bg: 'bg-sky-50 group-hover:bg-sky-100' },
  GENERAL:    { Icon: BuildingOffice2Icon,    color: 'text-[#0057FF]',   bg: 'bg-blue-50 group-hover:bg-blue-100' },
};

const getDefaultContent = (): LandingContent => ({
  hero: {
    badge: 'Recetas y control de producción',
    headline: 'Factura, produce\ny haz crecer tu negocio',
    subheadline: 'El sistema de facturación electrónica líder en Ecuador. Panadería, restaurante, tienda o servicios — activa solo lo que necesitas y empieza hoy.',
    primaryCta: 'Probar Gratis 14 Días',
    secondaryCta: 'Ver Funcionalidades',
  },
  stats: [
    { value: 450, label: 'Negocios Activos', suffix: '' },
    { value: 50000, label: 'Facturas Emitidas', suffix: '' },
    { value: 49, label: 'Calificación', suffix: '/5' },
    { value: 999, label: 'Uptime Garantizado', suffix: '' },
  ],
  painPoints: [
    { title: 'Inventario fuera de control', description: 'Sin saber que tienes ni cuando comprar. Quiebres de stock o sobreinventario que drenan tu flujo de caja.' },
    { title: 'Costos a ciegas', description: 'Sin saber cuánto te cuesta producir cada receta. Tomas decisiones de precio sin datos reales de rentabilidad.' },
    { title: 'Horas en papeleo', description: 'Facturas manuales, Excel interminables, cálculos repetitivos. Tiempo que deberías invertir en hacer crecer tu negocio.' },
  ],
  why: [
    { title: '100% Cumplimiento SRI', description: 'Facturación electrónica autorizada y válida ante el Servicio de Rentas Internas. XML firmados electrónicamente con clave de acceso.' },
    { title: 'Disenado para Ecuador', description: 'Adaptado a las necesidades de negocios ecuatorianos. Soporte para todos los tipos de comprobantes exigidos por la ley.' },
    { title: 'Soporte en Español 24/7', description: 'Equipo de soporte local que entiende tu negocio. Chat en vivo, email y teléfono para ayudarte cuando lo necesites.' },
    { title: 'Crece Sin Límites', description: 'Empieza con el plan que necesitas y escala cuando tu negocio crezca. Cambia de plan en cualquier momento sin penalización.' },
  ],
  features: [
    { title: 'Facturación Electrónica SRI', description: 'Emite facturas, notas de crédito, retenciones y guías de remisión en cumplimiento con el SRI Ecuador.' },
    { title: 'Inventario Inteligente', description: 'Controla tu stock en tiempo real con Kardex. Alertas de stock mínimo y movimientos de inventario.' },
    { title: 'Recetas y Produccion', description: 'Crea recetas con ingredientes y unidades de medida. Registra producción y calcula costos automáticamente.' },
    { title: 'Reportes Tributarios', description: 'Genera ATS, Formulario 104, Libro de Ventas y análisis de rentabilidad por producto.' },
    { title: 'Multi-usuario', description: 'Administradores, vendedores y contadores con permisos específicos según su rol.' },
    { title: 'Respaldo en la Nube', description: 'Tus datos seguros en la nube. Accede desde cualquier dispositivo, en cualquier momento.' },
  ],
  howItWorks: [
    { step: '01', title: 'Crea tu cuenta', description: 'Elige tu tipo de negocio y plan. Registro en menos de 2 minutos.' },
    { step: '02', title: 'Configura tu empresa', description: 'Ingresa los datos de tu negocio: RUC, dirección y logo.' },
    { step: '03', title: 'Empieza a facturar', description: 'Crea productos, recetas y emite tu primera factura electrónica.' },
  ],
  testimonials: [
    { name: 'Maria Elena G.', business: 'Panadería Dulce Hogar', quote: 'Desde que uso Ecuafact Pro puedo saber exactamente cuánta harina gasto por cada lote de pan. El control de recetas me cambió el negocio.', rating: 5 },
    { name: 'Carlos R.', business: 'Restaurante El Sabor', quote: 'Las recetas y el control de producción me permiten calcular el costo real de cada plato. Ahora sé cuánto gano por cada venta.', rating: 5 },
    { name: 'Patricia M.', business: 'Tienda MultiStock', quote: 'El kardex y la facturación electrónica me ahorran horas de trabajo. Mis contadores están felices con los reportes.', rating: 5 },
  ],
  faq: [
    { question: 'Que tipos de negocio soportan?', answer: 'Soportamos panaderías, restaurantes, tiendas, servicios profesionales y cualquier tipo de comercio. Cada tipo activa los módulos que realmente necesita.' },
    { question: 'Como funciona el control de recetas?', answer: 'Puedes crear recetas vinculando productos terminados con sus ingredientes (materia prima). Al registrar una producción, el sistema descuenta automáticamente los insumos del inventario y calcula el costo.' },
    { question: 'Las facturas son validas para el SRI?', answer: 'Si. Ecuafact Pro genera facturas electrónicas con todas las especificaciones del SRI Ecuador, incluyendo clave de acceso, firma electrónica y envio de XML.' },
    { question: 'Puedo cambiar de plan después?', answer: 'Si, puedes actualizar o cambiar de plan en cualquier momento desde el panel de suscripción. Los cambios se aplican al siguiente ciclo de facturación.' },
    { question: 'Mis datos están seguros?', answer: 'Tus datos se almacenan encriptados en servidores seguros AWS. Nadie más que tú y tus usuarios autorizados tiene acceso a tu información.' },
    { question: 'Ofrecen soporte técnico?', answer: 'Si. El plan Pro incluye soporte prioritario por chat y email. El plan Enterprise tiene soporte 24/7. Todos los planes tienen acceso a nuestra base de conocimiento.' },
  ],
  finalCta: {
    headline: 'Listo para transformar tu negocio?',
    subheadline: 'Únete a +450 negocios que ya facturan y controlan su producción con Ecuafact Pro. Empieza gratis hoy, sin compromiso.',
    primaryCta: 'Comenzar Gratis Ahora',
    secondaryCta: 'Ya tengo cuenta',
  },
  contact: {
    phone: '+593 99 999 9999',
    email: 'info@ecuafact.pro',
    hours: 'Lun - Vie: 08:00 - 18:00',
  },
  footer: {
    tagline: 'Sistema de facturación electrónica y control de producción líder en Ecuador. Autorizado por el SRI para facturación electrónica.',
    facebook: '',
    twitter: '',
    instagram: '',
    linkedin: '',
  },
  ayudaPage: {
    title: 'Centro de Ayuda',
    subtitle: 'Encuentra respuestas a las preguntas mas frecuentes sobre Ecuafact Pro.',
    faqs: [
      { question: '¿Qué tipos de negocio soportan?', answer: 'Soportamos panaderías, restaurantes, tiendas, servicios profesionales y cualquier tipo de comercio. Cada tipo activa los módulos que realmente necesita.' },
      { question: '¿Cómo funciona el control de recetas?', answer: 'Puedes crear recetas vinculando productos terminados con sus ingredientes (materia prima). Al registrar una producción, el sistema descuenta automáticamente los insumos del inventario y calcula el costo.' },
      { question: '¿Las facturas son válidas para el SRI?', answer: 'Sí. Ecuafact Pro genera facturas electrónicas con todas las especificaciones del SRI Ecuador, incluyendo clave de acceso, firma electrónica y envío de XML.' },
      { question: '¿Puedo cambiar de plan después?', answer: 'Sí, puedes actualizar o cambiar de plan en cualquier momento desde el panel de suscripción. Los cambios se aplican al siguiente ciclo de facturación.' },
      { question: '¿Mis datos están seguros?', answer: 'Tus datos se almacenan encriptados en servidores seguros AWS. Nadie más que tú y tus usuarios autorizados tiene acceso a tu información.' },
      { question: '¿Ofrecen soporte técnico?', answer: 'Sí. El plan Pro incluye soporte prioritario por chat y email. El plan Enterprise tiene soporte 24/7. Todos los planes tienen acceso a nuestra base de conocimiento.' },
      { question: '¿Cómo emito mi primera factura?', answer: 'Después de registrarte y configurar tu empresa, ve al panel de administración, sección Emisión. Selecciona el cliente, agrega productos y haz clic en Emitir Factura. El sistema genera el XML y lo envía al SRI automáticamente.' },
      { question: '¿Qué métodos de pago aceptan?', answer: 'Aceptamos PayPal, tarjetas de crédito/débito (Visa, Mastercard) a través de PayPal, y transferencia bancaria. Los pagos con PayPal se activan inmediatamente; las transferencias requieren validación manual (24-48h).' },
    ],
  },
  contactoPage: {
    title: 'Contacto',
    subtitle: 'Estamos aquí para ayudarte. Contáctanos por cualquiera de estos medios.',
  },
  legalPage: {
    title: 'Información Legal',
    terms: {
      title: 'Términos y Condiciones',
      content: '<h3>1. Aceptación de los Términos</h3><p>Al utilizar Ecuafact Pro, usted acepta estos términos y condiciones. Si no está de acuerdo, no utilice el servicio.</p><h3>2. Descripción del Servicio</h3><p>Ecuafact Pro es un sistema de facturación electrónica autorizado por el SRI Ecuador. Permite emitir facturas, notas de crédito, retenciones, guías de remisión y liquidaciones de compra.</p><h3>3. Obligaciones del Usuario</h3><p>El usuario es responsable de mantener la confidencialidad de sus credenciales y de toda actividad que ocurra bajo su cuenta.</p><h3>4. Facturación y Pagos</h3><p>Los planes se facturan mensualmente. El usuario puede cancelar en cualquier momento, pero no se realizan reembolsos por períodos parciales.</p><h3>5. Limitación de Responsabilidad</h3><p>Ecuafact Pro no se hace responsable por interrupciones del servicio causadas por factores externos, incluyendo fallos del SRI.</p>',
    },
    privacy: {
      title: 'Política de Privacidad',
      content: '<h3>1. Información que Recopilamos</h3><p>Recopilamos información de registro (RUC, razón social, email, teléfono) y datos de facturación electrónica requeridos por el SRI.</p><h3>2. Uso de la Información</h3><p>Utilizamos sus datos exclusivamente para proveer el servicio de facturación electrónica y cumplir con obligaciones legales ante el SRI.</p><h3>3. Protección de Datos</h3><p>Sus datos se almacenan encriptados en servidores seguros AWS. No compartimos su información con terceros sin su consentimiento, excepto cuando sea requerido por ley.</p><h3>4. Retención de Datos</h3><p>Conservamos sus datos de facturación durante el período requerido por la legislación tributaria ecuatoriana (7 años).</p><h3>5. Sus Derechos</h3><p>Usted tiene derecho a acceder, rectificar y cancelar sus datos personales. Para ejercer estos derechos, contáctenos a través de nuestros canales de soporte.</p>',
    },
    cookies: {
      title: 'Política de Cookies',
      content: '<h3>1. ¿Qué son las Cookies?</h3><p>Las cookies son pequeños archivos de texto que se almacenan en su navegador cuando visita nuestro sitio web.</p><h3>2. Cookies que Utilizamos</h3><p>Utilizamos cookies esenciales para el funcionamiento de la plataforma (sesión, autenticación) y cookies de análisis para mejorar el servicio.</p><h3>3. Cookies de Terceros</h3><p>PayPal puede utilizar cookies propias cuando procesa pagos a través de nuestra plataforma.</p><h3>4. Control de Cookies</h3><p>Puede configurar su navegador para rechazar cookies, pero algunas funciones de la plataforma podrían no estar disponibles.</p><h3>5. Actualizaciones</h3><p>Esta política puede actualizarse periódicamente. Le notificaremos sobre cambios significativos.</p>',
    },
  },
  cookieBanner: {
    message: 'Utilizamos cookies propias y de terceros para mejorar tu experiencia, analizar el tráfico y mostrarte contenido personalizado. Al hacer clic en "Aceptar", consientes el uso de todas las cookies.',
  },
});

const deepMerge = (target: any, source: any): any => {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
};

const normalizeUrl = (url: string): string => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
};

const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [statsVisible, setStatsVisible] = useState(false);
  const [landingContent, setLandingContent] = useState<LandingContent>(getDefaultContent());
  const landingContentRef = useRef(landingContent);
  const ctaSectionRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const [countNegocios, setCountNegocios] = useState(0);
  const [countFacturas, setCountFacturas] = useState(0);
  const [countRating, setCountRating] = useState(0);
  const [countUptime, setCountUptime] = useState(0);

  useEffect(() => { landingContentRef.current = landingContent; }, [landingContent]);

  useEffect(() => {
    fetch(`${API_URL}/api/landing-content`)
      .then(r => r.json())
      .then(data => {
        if (data.landingContent && Object.keys(data.landingContent).length > 0) {
          setLandingContent(prev => deepMerge(prev, data.landingContent));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      if (ctaSectionRef.current) {
        const rect = ctaSectionRef.current.getBoundingClientRect();
        setCtaVisible(rect.top < window.innerHeight && rect.bottom > 0);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStatsVisible(true);
      },
      { threshold: 0.3 }
    );
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!statsVisible) return;
    const statSetters = [setCountNegocios, setCountFacturas, setCountRating, setCountUptime];
    const durations = [1800, 2000, 1200, 1500];
    const targets = landingContentRef.current.stats.map((stat, i) => ({
      setter: statSetters[i] || (() => {}),
      target: stat.value,
      duration: durations[i] || 1500,
    }));
    const startTime = Date.now();
    const timers: number[] = [];
    targets.forEach(({ setter, target, duration }) => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setter(Math.floor(target * eased));
        if (progress < 1) {
          timers.push(requestAnimationFrame(animate) as unknown as number);
        }
      };
      timers.push(requestAnimationFrame(animate) as unknown as number);
    });
    return () => timers.forEach(id => cancelAnimationFrame(id));
  }, [statsVisible]);

  useEffect(() => {
    fetch(`${API_URL}/api/subscription-plans`)
      .then(r => r.json())
      .then(data => {
        const rawPlans: ApiPlan[] = data.plans || data || [];
        const filtered = rawPlans.filter((p) => p.isActive);
        const withHighlight = filtered.map((p, i) => ({
          ...p,
          highlighted: i === 1
        }));
        setPlans(withHighlight);
      })
      .catch(() => {
        setPlans([
          { id: '1', code: 'FREE', name: 'Gratuito', description: 'Para pruebas y micro-emprendedores', price: 0, period: 'mensual', durationDays: 30, features: ['1 empresa', '10 facturas/mes'], isActive: true, highlighted: false },
          { id: '2', code: 'BASIC', name: 'Básico', description: 'Para pequenas empresas', price: 34.49, period: 'mensual', durationDays: 30, features: ['1 empresa', '100 facturas/mes', 'Reportes básicos'], isActive: true, highlighted: true },
          { id: '3', code: 'GASTRONOMICO', name: 'Gastronómico', description: 'Para restaurantes, panaderías y cafeterías', price: 91.99, period: 'mensual', durationDays: 30, features: ['1 empresa', '300 facturas/mes', 'Caja POS', 'Recetas', 'Asistente IA'], isActive: true, highlighted: false },
          { id: '4', code: 'PRO', name: 'Profesional', description: 'Para negocios en crecimiento', price: 172.49, period: 'mensual', durationDays: 30, features: ['3 empresas', '500 facturas/mes', 'Asistente IA', 'Soporte prioritario'], isActive: true, highlighted: false },
          { id: '5', code: 'ENTERPRISE', name: 'Empresarial', description: 'Para grandes organizaciones', price: 287.49, period: 'mensual', durationDays: 30, features: ['10 empresas', '2000 facturas/mes', 'API Access', 'Soporte 24/7'], isActive: true, highlighted: false },
        ]);
      })
      .finally(() => setLoadingPlans(false));
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll('.scroll-fade-up, .scroll-slide-left, .scroll-slide-right');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const businessTypeCards = Object.entries(BUSINESS_TYPES).map(([key, value]) => ({
    id: key as BusinessType,
    ...value,
  }));

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* ===== TOP INFO BAR ===== */}
      <div className="hidden lg:block bg-[#003ACC] text-white text-xs font-medium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-9">
          <div className="flex items-center gap-6">
            <a href={`tel:${landingContent.contact.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-white/80 transition-colors">
              <PhoneIcon className="w-3.5 h-3.5" /> {landingContent.contact.phone}
            </a>
            <a href={`mailto:${landingContent.contact.email}`} className="flex items-center gap-1.5 hover:text-white/80 transition-colors">
              <EnvelopeIcon className="w-3.5 h-3.5" /> {landingContent.contact.email}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span>{landingContent.contact.hours}</span>
            <span className="opacity-50">|</span>
            <a href="/ayuda" className="hover:text-white/80 transition-colors">Centro de Ayuda</a>
          </div>
        </div>
      </div>

      {/* ===== MAIN NAV ===== */}
      <nav className={`fixed top-0 lg:top-9 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg shadow-slate-200/30'
          : 'bg-transparent lg:bg-white/80 lg:backdrop-blur-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[72px]">
            <div className="flex items-center gap-2.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                scrolled
                  ? 'bg-[#0057FF] shadow-[#0057FF]/30'
                  : 'bg-white/20 shadow-white/10 lg:bg-[#0057FF] lg:shadow-[#0057FF]/30'
              }`}>
                <DocumentTextIcon className="w-5 h-5 text-white" />
              </div>
              <span className={`text-xl font-extrabold tracking-tight transition-colors duration-300 ${
                scrolled ? 'text-slate-900' : 'text-white lg:text-slate-900'
              }`}>
                ECUAFACT <span className={`transition-colors duration-300 ${
                  scrolled ? 'text-[#0057FF]' : 'text-white/90 lg:text-[#0057FF]'
                }`}>PRO</span>
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-8">
              <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-[#0057FF] transition-colors">Funcionalidades</a>
              <a href="#why" className="text-sm font-semibold text-slate-600 hover:text-[#0057FF] transition-colors">Por qué Ecuafact</a>
              <a href="#business-types" className="text-sm font-semibold text-slate-600 hover:text-[#0057FF] transition-colors">Negocios</a>
              <a href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-[#0057FF] transition-colors">Planes</a>
              <a href="#testimonials" className="text-sm font-semibold text-slate-600 hover:text-[#0057FF] transition-colors">Testimonios</a>
              <a
                href="/login"
                className="text-sm font-bold text-slate-700 hover:text-[#0057FF] transition-colors px-3 py-2"
              >
                Iniciar Sesión
              </a>
              <a
                href="/suscripcion"
                className="text-sm font-bold bg-[#0057FF] text-white px-6 py-2.5 rounded-xl hover:bg-[#003ACC] transition-all shadow-lg shadow-[#0057FF]/25 hover:shadow-[#0057FF]/40 hover:-translate-y-0.5"
              >
                Comenzar Gratis
              </a>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2 rounded-xl transition-all duration-300 ${
                scrolled
                  ? 'text-slate-800 hover:bg-slate-100'
                  : 'text-white hover:bg-white/15'
              }`}
            >
              {mobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 shadow-2xl">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block py-3 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl" onClick={() => setMobileMenuOpen(false)}>Funcionalidades</a>
              <a href="#why" className="block py-3 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl" onClick={() => setMobileMenuOpen(false)}>Por qué Ecuafact</a>
              <a href="#business-types" className="block py-3 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl" onClick={() => setMobileMenuOpen(false)}>Negocios</a>
              <a href="#pricing" className="block py-3 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl" onClick={() => setMobileMenuOpen(false)}>Planes</a>
              <a href="/login" className="block py-3 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl">Iniciar Sesión</a>
              <a href="/suscripcion" className="block py-3 px-4 text-sm font-bold bg-[#0057FF] text-white text-center rounded-xl">Comenzar Gratis</a>
            </div>
          </div>
        )}
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#003ACC] via-[#003ACC] to-[#0057FF]" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '80px', paddingBottom: 'clamp(100px, 14vw, 150px)' }}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#0057FF]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#003ACC]/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-full mb-5 border border-white/10">
                <SparklesIcon className="w-4 h-4" />
                <span className="flex items-center gap-1">
                  <span className="bg-[#FF6B35] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">NUEVO</span>
                  {landingContent.hero.badge}
                </span>
              </div>

              {/* Headline — directo y corto */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.08] tracking-tight">
                Factura electrónico<br />
                <span className="text-[#FF6B35]">desde el día uno.</span>
              </h1>

              {/* Subheadline — una línea */}
              <p className="mt-4 text-base sm:text-lg text-white/75 max-w-md mx-auto lg:mx-0 font-medium leading-snug">
                Sistema de facturación electrónica para Ecuador. Autorizado por el SRI. Simple, rápido y 100% en la nube.
              </p>

              {/* CTAs */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <a
                  href="/suscripcion"
                  className="inline-flex items-center justify-center gap-2 bg-[#FF6B35] text-white px-7 py-3.5 rounded-2xl font-bold text-base hover:bg-[#e55a2b] transition-all shadow-2xl shadow-[#FF6B35]/30 hover:-translate-y-0.5"
                >
                  {landingContent.hero.primaryCta}
                  <ArrowRightIcon className="w-5 h-5" />
                </a>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white px-7 py-3.5 rounded-2xl font-bold text-base hover:bg-white/20 transition-all border border-white/20"
                >
                  {landingContent.hero.secondaryCta}
                </a>
              </div>

              {/* Trust badge — honesto */}
              <div className="mt-5 inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 border border-white/10">
                <ShieldCheckIcon className="w-4 h-4 text-emerald-300" />
                <span className="text-xs font-semibold text-white/80">Autorizado por el SRI · 100% legal en Ecuador</span>
              </div>
            </div>

            {/* Dashboard card — desktop only, rediseñada para empresa nueva */}
            <div className="relative hidden lg:block">
              <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-6 border border-slate-100">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-[#0057FF] rounded-xl flex items-center justify-center">
                    <DocumentTextIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">Panel de Facturación</p>
                    <p className="text-xs text-slate-400 font-medium">Ecuafact Pro</p>
                  </div>
                  <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-full">Autorizado SRI</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-red-50 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">Sin sistema</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2"><ExclamationTriangleIcon className="w-4 h-4 text-red-400" /><span className="text-xs text-red-700 font-semibold">Facturas manuales</span></div>
                      <div className="flex items-center gap-2"><ClockIcon className="w-4 h-4 text-red-400" /><span className="text-xs text-red-700 font-semibold">Horas de papeleo</span></div>
                      <div className="flex items-center gap-2"><CalculatorIcon className="w-4 h-4 text-red-400" /><span className="text-xs text-red-700 font-semibold">Errores frecuentes</span></div>
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2">Con Ecuafact</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-emerald-500" /><span className="text-xs text-emerald-700 font-semibold">XML al SRI al instante</span></div>
                      <div className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-emerald-500" /><span className="text-xs text-emerald-700 font-semibold">2 min por factura</span></div>
                      <div className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-emerald-500" /><span className="text-xs text-emerald-700 font-semibold">100% SRI válido</span></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#F8F9FC] rounded-2xl p-3 text-center">
                    <p className="text-xl font-extrabold text-[#0057FF]">SRI</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Autorizado</p>
                  </div>
                  <div className="bg-amber-50 rounded-2xl p-3 text-center">
                    <p className="text-xl font-extrabold text-amber-700">24/7</p>
                    <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider mt-0.5">en la nube</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-3 text-center">
                    <p className="text-xl font-extrabold text-emerald-700">$0</p>
                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mt-0.5">Para empezar</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Wave Divider */}
        <div className="hero-waves">
          {/* Ola 3 — más al fondo, azul claro semitransparente, más lenta */}
          <svg className="wave-3" style={{ position: 'absolute', bottom: 0, opacity: 0.35 }}
            viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 60C180 100 360 20 540 60C720 100 900 20 1080 60C1260 100 1440 40 1440 40V120H0V60Z" fill="white"/>
          </svg>
          {/* Ola 2 — capa media, blanco suave, velocidad media */}
          <svg className="wave-2" style={{ position: 'absolute', bottom: 0, opacity: 0.6 }}
            viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 50C200 90 400 10 600 50C800 90 1000 15 1200 55C1350 80 1440 45 1440 45V100H0V50Z" fill="white"/>
          </svg>
          {/* Ola 1 — frente, blanco sólido, rellena la base */}
          <svg className="wave-1" viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 40C240 80 480 0 720 40C960 80 1200 10 1440 40V80H0V40Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ===== STATS COUNTER ===== */}
      <section ref={statsRef} className="relative py-12 lg:py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {landingContent.stats.map((stat, idx) => {
              const statValues = [
                `+${countNegocios}`,
                `+${countFacturas.toLocaleString()}`,
                `${(countRating / 10).toFixed(1)}`,
                `${(countUptime / 10).toFixed(1)}%`,
              ];
              return (
                <div key={idx} className={`transition-all duration-700 ${statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${idx * 150}ms` }}>
                  <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0057FF] tracking-tight">
                    {statValues[idx]}<span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#003ACC]">{stat.suffix || ''}</span>
                  </p>
                  <p className="text-sm font-semibold text-slate-500 mt-2">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== PAIN POINTS ===== */}
      <section className="py-20 lg:py-28 bg-[#F8F9FC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Deja de perder dinero y tiempo
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto font-medium">
              Sin un sistema de facturación, los negocios pierden el control de inventario, costos y horas de papeleo que deberían invertir en crecer.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {landingContent.painPoints.map((pain, idx) => {
              const PainIcon = painPointIcons[idx] || ExclamationTriangleIcon;
              return (
                <div key={idx} className="scroll-fade-up bg-white rounded-3xl p-8 border border-slate-100 hover:shadow-xl transition-all duration-300 group" style={{ transitionDelay: `${idx * 100}ms` }}>
                  <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-100 transition-colors">
                    <PainIcon className="w-7 h-7 text-red-500" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800 mb-3">{pain.title}</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">{pain.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== WHY ECUAFACT PRO (Alternating) ===== */}
      <section id="why" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Por qué elegir Ecuafact Pro
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto font-medium">
              El sistema de facturación diseñado para el mercado ecuatoriano. Cumplimiento, soporte local y tecnologia de punta.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {landingContent.why.map((item, idx) => {
              const WhyIcon = whyIcons[idx] || ShieldCheckIcon;
              return (
                <div key={idx} className="scroll-fade-up flex gap-5 bg-[#F8F9FC] rounded-2xl p-6 lg:p-8 border border-slate-100 hover:shadow-lg transition-all duration-300" style={{ transitionDelay: `${idx * 100}ms` }}>
                  <div className="w-12 h-12 bg-[#0057FF] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#0057FF]/20">
                    <WhyIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800 mb-2">{item.title}</h3>
                    <p className="text-slate-500 leading-relaxed font-medium text-sm">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== BUSINESS TYPES ===== */}
      <section id="business-types" className="py-20 lg:py-28 bg-[#F8F9FC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Elige tu tipo de negocio
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto font-medium">
              Activamos solo los módulos que tu negocio necesita. Desde recetas para panaderías hasta inventario para tiendas.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {businessTypeCards.map((bt) => {
              const btIcon = businessTypeIcons[bt.id] ?? businessTypeIcons['GENERAL'];
              const { Icon, color, bg } = btIcon;
              return (
                <a
                  key={bt.id}
                  href={`/suscripcion?tipo=${bt.id.toLowerCase()}`}
                  className="scroll-fade-up group relative bg-white rounded-3xl p-6 border-2 border-slate-100 hover:border-[#0057FF] hover:shadow-2xl hover:shadow-[#0057FF]/10 transition-all duration-300 text-center hover:-translate-y-1"
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-colors duration-300 ${bg}`}>
                    <Icon className={`w-8 h-8 ${color} transition-colors duration-300`} />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800 group-hover:text-[#0057FF] transition-colors">{bt.label}</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed font-medium">{bt.description}</p>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Todo lo que necesitas para facturar
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto font-medium">
              Desde la emisión de facturas hasta el control de producción. Un sistema completo que crece contigo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {landingContent.features.map((feature, idx) => {
              const FeatureIcon = featureIcons[idx] || CubeIcon;
              return (
                <div key={idx} className="scroll-fade-up bg-[#F8F9FC] rounded-3xl p-8 border border-slate-100 hover:shadow-xl hover:border-[#0057FF]/20 transition-all duration-300 group" style={{ transitionDelay: `${idx * 80}ms` }}>
                  <div className="w-14 h-14 bg-[#0057FF] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#003ACC] transition-colors shadow-lg shadow-[#0057FF]/20">
                    <FeatureIcon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800 mb-3">{feature.title}</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-20 lg:py-28 bg-[#F8F9FC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Comienza en 3 pasos
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto font-medium">
              No necesitas ser experto. Regístrate, configura tu negocio y empieza a facturar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[25%] right-[25%] h-0.5 bg-gradient-to-r from-[#0057FF]/30 via-[#0057FF]/60 to-[#0057FF]/30" />
            {landingContent.howItWorks.map((step, idx) => (
              <div key={idx} className="scroll-fade-up text-center relative z-10" style={{ transitionDelay: `${idx * 150}ms` }}>
                <div className="w-24 h-24 bg-gradient-to-br from-[#0057FF] to-[#003ACC] text-white rounded-3xl flex items-center justify-center text-3xl font-extrabold mx-auto mb-6 shadow-2xl shadow-[#0057FF]/25">
                  {step.step}
                </div>
                <h3 className="text-xl font-extrabold text-slate-800 mb-3">{step.title}</h3>
                <p className="text-slate-500 leading-relaxed font-medium max-w-xs mx-auto">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PARTNERS / LOGOS ===== */}
      <section className="py-12 lg:py-16 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">Respaldado por</p>
          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-10">
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F8F9FC] border border-slate-100">
              <ShieldCheckIcon className="w-5 h-5 text-[#10B981]" />
              <span className="text-sm font-extrabold text-slate-700">Autorizado SRI</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F8F9FC] border border-slate-100">
              <span className="text-lg font-extrabold text-[#0057FF]">PayPal</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F8F9FC] border border-slate-100">
              <span className="text-lg font-extrabold text-slate-700">Visa</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F8F9FC] border border-slate-100">
              <span className="text-lg font-extrabold text-slate-700">Mastercard</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F8F9FC] border border-slate-100">
              <span className="text-lg font-extrabold text-slate-700">AWS</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F8F9FC] border border-slate-100">
              <LockClosedIcon className="w-5 h-5 text-[#10B981]" />
              <span className="text-sm font-extrabold text-slate-700">SSL 256-bit</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section id="testimonials" className="py-20 lg:py-28 bg-[#F8F9FC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Lo que dicen nuestros clientes
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto font-medium">
              Negocios reales que ya usan Ecuafact Pro para facturar y controlar su producción.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {landingContent.testimonials.map((t, idx) => (
              <div key={idx} className="scroll-fade-up bg-white rounded-3xl p-8 border border-slate-100 hover:shadow-xl transition-all duration-300" style={{ transitionDelay: `${idx * 100}ms` }}>
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <StarIcon key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 leading-relaxed font-medium mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#0057FF] to-[#003ACC] rounded-full flex items-center justify-center font-extrabold text-white text-lg">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-500 font-semibold">{t.business}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Planes que crecen contigo
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto font-medium">
              Sin costos ocultos. Elige el plan que mejor se adapte a tu negocio y cámbialo cuando quieras.
            </p>
          </div>

          <div className={`grid gap-5 mx-auto ${
            plans.length <= 2 ? 'max-w-2xl md:grid-cols-2' :
            plans.length === 3 ? 'max-w-5xl md:grid-cols-3' :
            plans.length === 4 ? 'max-w-6xl sm:grid-cols-2 lg:grid-cols-4' :
            'max-w-7xl sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
          }`}>
            {loadingPlans ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="bg-[#F8F9FC] rounded-3xl p-8 border-2 border-slate-100 animate-pulse">
                  <div className="h-5 bg-slate-200 rounded-full w-1/3 mb-4" />
                  <div className="h-10 bg-slate-200 rounded-full w-2/3 mb-8" />
                  <div className="space-y-3">
                    {[...Array(5)].map((_, j) => <div key={j} className="h-4 bg-slate-100 rounded-full" />)}
                  </div>
                  <div className="h-12 bg-slate-200 rounded-2xl mt-8" />
                </div>
              ))
            ) : plans.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400">
                <p className="text-lg font-semibold">No hay planes disponibles en este momento.</p>
                <p className="text-sm mt-2 font-medium">Contacte al administrador para más información.</p>
              </div>
            ) : (
              plans.map((plan, idx) => {
                const isPopular = plan.highlighted;
                return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-3xl p-6 lg:p-8 border-2 transition-all duration-300 hover:-translate-y-1 flex flex-col ${
                    isPopular
                      ? 'border-[#0057FF] shadow-2xl shadow-[#0057FF]/20 scale-[1.02] z-10'
                      : 'border-slate-100 hover:border-slate-300 hover:shadow-xl'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FF6B35] text-white text-xs font-extrabold px-4 py-1.5 rounded-full shadow-lg shadow-[#FF6B35]/30 whitespace-nowrap">
                      Más Popular
                    </div>
                  )}

                  <h3 className="text-base lg:text-lg font-extrabold text-slate-900">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-xs text-slate-500 mt-1 font-medium line-clamp-1">{plan.description}</p>
                  )}
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                      {plan.price === 0 ? 'Gratis' : `$${plan.price.toFixed(2)}`}
                    </span>
                    {plan.price > 0 && <span className="text-slate-400 font-semibold text-sm">/{plan.period}</span>}
                  </div>

                  <ul className="mt-6 space-y-2.5 flex-1">
                    {plan.features.slice(0, 6).map((feat, fi) => (
                      <li key={fi} className="flex items-start gap-2.5">
                        <CheckCircleIcon className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
                        <span className="text-xs lg:text-sm text-slate-600 font-medium">{feat}</span>
                      </li>
                    ))}
                    {plan.features.length > 6 && (
                      <li className="text-xs text-slate-400 pl-7">+{plan.features.length - 6} más</li>
                    )}
                  </ul>

                  <a
                    href={`/suscripcion?plan=${plan.code}`}
                    className={`mt-6 block text-center py-3 rounded-2xl font-bold text-sm transition-all ${
                      isPopular
                        ? 'bg-[#0057FF] text-white hover:bg-[#003ACC] shadow-lg shadow-[#0057FF]/25'
                        : plan.price === 0
                          ? 'bg-[#10B981] text-white hover:bg-emerald-600 shadow-lg shadow-[#10B981]/25'
                          : 'bg-[#F8F9FC] text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {plan.price === 0 ? 'Comenzar Gratis' : `Elegir ${plan.name}`}
                  </a>
                </div>
                );
              })
            )}
          </div>

          {/* Link to full pricing page */}
          {!loadingPlans && plans.length > 0 && (
            <div className="text-center mt-10">
              <a
                href="/suscripcion"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#0057FF] hover:text-[#003ACC] transition-colors"
              >
                Ver todos los planes y detalles completos
                <ArrowRightIcon className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-20 lg:py-28 bg-[#F8F9FC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p className="mt-4 text-lg text-slate-500 font-medium">Todo lo que necesitas saber sobre Ecuafact Pro</p>
          </div>

          <div className="space-y-3">
            {landingContent.faq.map((faq, idx) => (
              <details key={idx} className="scroll-fade-up group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm" style={{ transitionDelay: `${idx * 80}ms` }}>
                <summary className="flex items-center justify-between p-5 lg:p-6 cursor-pointer hover:bg-slate-50 transition-colors list-none select-none">
                  <span className="text-base font-bold text-slate-800 pr-4">{faq.question}</span>
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F8F9FC] flex items-center justify-center text-[#0057FF] font-extrabold text-lg group-open:rotate-45 transition-transform duration-300">+</span>
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-slate-500 leading-relaxed font-medium">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section ref={ctaSectionRef} className="py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-[#003ACC] via-[#003ACC] to-[#0057FF] rounded-[3rem] p-10 sm:p-16 shadow-2xl shadow-[#003ACC]/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
                {landingContent.finalCta.headline}
              </h2>
              <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto font-medium">
                {landingContent.finalCta.subheadline}
              </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/suscripcion"
                className="inline-flex items-center justify-center gap-2 bg-[#FF6B35] text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-[#e55a2b] transition-all shadow-xl shadow-[#FF6B35]/30 hover:-translate-y-0.5"
              >
                {landingContent.finalCta.primaryCta}
                <ArrowRightIcon className="w-5 h-5" />
              </a>
              <a
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-white/20 transition-all border border-white/20"
              >
                {landingContent.finalCta.secondaryCta}
              </a>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#1E293B] text-slate-400 pt-16 lg:pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 bg-[#0057FF] rounded-xl flex items-center justify-center shadow-lg shadow-[#0057FF]/20">
                  <DocumentTextIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-extrabold text-white tracking-tight">
                  ECUAFACT <span className="text-[#0057FF]">PRO</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm mb-6">
                {landingContent.footer.tagline}
              </p>
              <div className="flex items-center gap-4">
                {[
                  { url: landingContent.footer.facebook, label: 'Facebook', viewBox: '0 0 24 24', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                  { url: landingContent.footer.twitter, label: 'Twitter', viewBox: '0 0 24 24', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                  { url: landingContent.footer.instagram, label: 'Instagram', viewBox: '0 0 24 24', path: 'M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z' },
                  { url: landingContent.footer.linkedin, label: 'LinkedIn', viewBox: '0 0 24 24', path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
                ].map((social) => {
                  const finalUrl = normalizeUrl(social.url);
                  return finalUrl ? (
                    <a key={social.label} href={finalUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-[#0057FF] transition-colors text-slate-400 hover:text-white" aria-label={social.label}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox={social.viewBox}><path d={social.path} /></svg>
                    </a>
                  ) : (
                    <button key={social.label} className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors text-slate-400 hover:text-white cursor-default" aria-label={social.label} tabIndex={-1}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox={social.viewBox}><path d={social.path} /></svg>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Producto</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Planes</a></li>
                <li><a href="#business-types" className="hover:text-white transition-colors">Tipos de Negocio</a></li>
                <li><a href="#why" className="hover:text-white transition-colors">Por qué Ecuafact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Soporte</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="/ayuda" className="hover:text-white transition-colors">Centro de Ayuda</a></li>
                <li><a href="/contacto" className="hover:text-white transition-colors">Contacto</a></li>
                <li><a href="/legal" className="hover:text-white transition-colors">Términos y Condiciones</a></li>
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0 text-slate-400">API Docs</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="/legal" className="hover:text-white transition-colors">Privacidad</a></li>
                <li><a href="/legal" className="hover:text-white transition-colors">Términos de Uso</a></li>
                <li><a href="/legal" className="hover:text-white transition-colors">Cookies</a></li>
                <li><a href="https://www.sri.gob.ec" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">SRI Ecuador</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-center">
            <p>{new Date().getFullYear()} Ecuafact Pro. Todos los derechos reservados.</p>
            <a href={`tel:${landingContent.contact.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
              <PhoneIcon className="w-4 h-4" /> {landingContent.contact.phone}
            </a>
          </div>
        </div>
      </footer>

      <CookieBanner />
    </div>
  );
};

export default LandingPage;
