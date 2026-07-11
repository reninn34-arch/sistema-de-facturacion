import React, { useState, useEffect } from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';
import RichTextEditor from '../../../components/RichTextEditor';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface LandingContent {
  hero: {
    badge: string;
    headline: string;
    subheadline: string;
    primaryCta: string;
    secondaryCta: string;
  };
  stats: Array<{ value: number; label: string; suffix: string }>;
  painPoints: Array<{ title: string; description: string }>;
  why: Array<{ title: string; description: string }>;
  features: Array<{ title: string; description: string }>;
  howItWorks: Array<{ step: string; title: string; description: string }>;
  testimonials: Array<{ name: string; business: string; quote: string; rating: number }>;
  faq: Array<{ question: string; answer: string }>;
  finalCta: {
    headline: string;
    subheadline: string;
    primaryCta: string;
    secondaryCta: string;
  };
  contact: { phone: string; email: string; hours: string };
  footer: { tagline: string; facebook: string; twitter: string; instagram: string; linkedin: string };
  ayudaPage: { title: string; subtitle: string; faqs: Array<{ question: string; answer: string }> };
  contactoPage: { title: string; subtitle: string };
  legalPage: { title: string; terms: { title: string; content: string }; privacy: { title: string; content: string }; cookies: { title: string; content: string } };
  cookieBanner: { message: string };
}

function getDefaultContent(): LandingContent {
  return {
    hero: {
      badge: 'Recetas y control de producción',
      headline: 'Factura, produce y haz crecer tu negocio',
      subheadline:
        'El sistema de facturación electrónica líder en Ecuador. Panadería, restaurante, tienda o servicios — activa solo lo que necesitas y empieza hoy.',
      primaryCta: 'Probar Gratis 14 Días',
      secondaryCta: 'Ver Funcionalidades',
    },
    stats: [
      { value: 450, label: 'Negocios Activos', suffix: '' },
      { value: 50000, label: 'Facturas Emitidas', suffix: '' },
      { value: 4.9, label: 'Calificación', suffix: '/5' },
      { value: 99.9, label: 'Uptime Garantizado', suffix: '%' },
    ],
    painPoints: [
      {
        title: 'Inventario fuera de control',
        description:
          'Sin saber que tienes ni cuando comprar. Quiebres de stock o sobreinventario que drenan tu flujo de caja.',
      },
      {
        title: 'Costos a ciegas',
        description:
          'Sin saber cuánto te cuesta producir cada receta. Tomas decisiones de precio sin datos reales de rentabilidad.',
      },
      {
        title: 'Horas en papeleo',
        description:
          'Facturas manuales, Excel interminables, cálculos repetitivos. Tiempo que deberías invertir en hacer crecer tu negocio.',
      },
    ],
    why: [
      {
        title: '100% Cumplimiento SRI',
        description:
          'Facturación electrónica autorizada y válida ante el Servicio de Rentas Internas. XML firmados electrónicamente con clave de acceso.',
      },
      {
        title: 'Disenado para Ecuador',
        description:
          'Adaptado a las necesidades de negocios ecuatorianos. Soporte para todos los tipos de comprobantes exigidos por la ley.',
      },
      {
        title: 'Soporte en Español 24/7',
        description:
          'Equipo de soporte local que entiende tu negocio. Chat en vivo, email y teléfono para ayudarte cuando lo necesites.',
      },
      {
        title: 'Crece Sin Límites',
        description:
          'Empieza con el plan que necesitas y escala cuando tu negocio crezca. Cambia de plan en cualquier momento sin penalización.',
      },
    ],
    features: [
      {
        title: 'Facturación Electrónica SRI',
        description:
          'Emite facturas, notas de crédito, retenciones y guías de remisión en cumplimiento con el SRI Ecuador.',
      },
      {
        title: 'Inventario Inteligente',
        description:
          'Controla tu stock en tiempo real con Kardex. Alertas de stock mínimo y movimientos de inventario.',
      },
      {
        title: 'Recetas y Produccion',
        description:
          'Crea recetas con ingredientes y unidades de medida. Registra producción y calcula costos automáticamente.',
      },
      {
        title: 'Reportes Tributarios',
        description:
          'Genera ATS, Formulario 104, Libro de Ventas y análisis de rentabilidad por producto.',
      },
      {
        title: 'Multi-usuario',
        description:
          'Administradores, vendedores y contadores con permisos específicos según su rol.',
      },
      {
        title: 'Respaldo en la Nube',
        description:
          'Tus datos seguros en la nube. Accede desde cualquier dispositivo, en cualquier momento.',
      },
    ],
    howItWorks: [
      {
        step: '01',
        title: 'Crea tu cuenta',
        description: 'Elige tu tipo de negocio y plan. Registro en menos de 2 minutos.',
      },
      {
        step: '02',
        title: 'Configura tu empresa',
        description: 'Ingresa los datos de tu negocio: RUC, dirección y logo.',
      },
      {
        step: '03',
        title: 'Empieza a facturar',
        description: 'Crea productos, recetas y emite tu primera factura electrónica.',
      },
    ],
    testimonials: [
      {
        name: 'Maria Elena G.',
        business: 'Panadería Dulce Hogar',
        quote:
          'Desde que uso Azul puedo saber exactamente cuánta harina gasto por cada lote de pan. El control de recetas me cambió el negocio.',
        rating: 5,
      },
      {
        name: 'Carlos R.',
        business: 'Restaurante El Sabor',
        quote:
          'Las recetas y el control de producción me permiten calcular el costo real de cada plato. Ahora sé cuánto gano por cada venta.',
        rating: 5,
      },
      {
        name: 'Patricia M.',
        business: 'Tienda MultiStock',
        quote:
          'El kardex y la facturación electrónica me ahorran horas de trabajo. Mis contadores están felices con los reportes.',
        rating: 5,
      },
    ],
    faq: [
      {
        question: 'Que tipos de negocio soportan?',
        answer:
          'Soportamos panaderías, restaurantes, tiendas, servicios profesionales y cualquier tipo de comercio. Cada tipo activa los módulos que realmente necesita.',
      },
      {
        question: 'Como funciona el control de recetas?',
        answer:
          'Puedes crear recetas vinculando productos terminados con sus ingredientes (materia prima). Al registrar una producción, el sistema descuenta automáticamente los insumos del inventario y calcula el costo.',
      },
      {
        question: 'Las facturas son validas para el SRI?',
        answer:
          'Si. Azul genera facturas electrónicas con todas las especificaciones del SRI Ecuador, incluyendo clave de acceso, firma electrónica y envio de XML.',
      },
      {
        question: 'Puedo cambiar de plan después?',
        answer:
          'Si, puedes actualizar o cambiar de plan en cualquier momento desde el panel de suscripción. Los cambios se aplican al siguiente ciclo de facturación.',
      },
      {
        question: 'Mis datos están seguros?',
        answer:
          'Tus datos se almacenan encriptados en servidores seguros AWS. Nadie más que tú y tus usuarios autorizados tiene acceso a tu información.',
      },
      {
        question: 'Ofrecen soporte técnico?',
        answer:
          'Si. El plan Pro incluye soporte prioritario por chat y email. El plan Enterprise tiene soporte 24/7. Todos los planes tienen acceso a nuestra base de conocimiento.',
      },
    ],
    finalCta: {
      headline: 'Listo para transformar tu negocio?',
      subheadline:
        'Únete a +450 negocios que ya facturan y controlan su producción con Azul. Empieza gratis hoy, sin compromiso.',
      primaryCta: 'Comenzar Gratis Ahora',
      secondaryCta: 'Ya tengo cuenta',
    },
    contact: {
      phone: '+593 99 999 9999',
      email: 'info@Azul.pro',
      hours: 'Lun - Vie: 08:00 - 18:00',
    },
    footer: {
      tagline:
        'Sistema de facturación electrónica y control de producción líder en Ecuador. Autorizado por el SRI para facturación electrónica.',
      facebook: 'https://facebook.com/Azulpro',
      twitter: 'https://twitter.com/Azulpro',
      instagram: 'https://instagram.com/Azulpro',
      linkedin: 'https://linkedin.com/company/Azulpro',
    },
    ayudaPage: {
      title: 'Centro de Ayuda',
      subtitle: 'Encuentra respuestas a las preguntas mas frecuentes sobre Azul.',
      faqs: [
        { question: '¿Qué tipos de negocio soportan?', answer: 'Soportamos panaderías, restaurantes, tiendas, servicios profesionales y cualquier tipo de comercio. Cada tipo activa los módulos que realmente necesita.' },
        { question: '¿Cómo funciona el control de recetas?', answer: 'Puedes crear recetas vinculando productos terminados con sus ingredientes (materia prima). Al registrar una producción, el sistema descuenta automáticamente los insumos del inventario y calcula el costo.' },
        { question: '¿Las facturas son válidas para el SRI?', answer: 'Sí. Azul genera facturas electrónicas con todas las especificaciones del SRI Ecuador, incluyendo clave de acceso, firma electrónica y envío de XML.' },
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
        content: '<h3>1. Aceptación de los Términos</h3><p>Al utilizar Azul, usted acepta estos términos y condiciones. Si no está de acuerdo, no utilice el servicio.</p><h3>2. Descripción del Servicio</h3><p>Azul es un sistema de facturación electrónica autorizado por el SRI Ecuador. Permite emitir facturas, notas de crédito, retenciones, guías de remisión y liquidaciones de compra.</p><h3>3. Obligaciones del Usuario</h3><p>El usuario es responsable de mantener la confidencialidad de sus credenciales y de toda actividad que ocurra bajo su cuenta.</p><h3>4. Facturación y Pagos</h3><p>Los planes se facturan mensualmente. El usuario puede cancelar en cualquier momento, pero no se realizan reembolsos por períodos parciales.</p><h3>5. Limitación de Responsabilidad</h3><p>Azul no se hace responsable por interrupciones del servicio causadas por factores externos, incluyendo fallos del SRI.</p>',
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
  };
}

const sectionCard = 'bg-white rounded-2xl border border-slate-200 p-6 shadow-sm';
const sectionHeader = 'font-extrabold text-slate-800';
const inputClass = 'rounded-xl border-slate-300 bg-slate-50 p-3 text-sm font-medium';
const labelClass = 'text-[10px] font-black text-slate-400 uppercase tracking-widest';

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={sectionCard}>
      <button type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2"
      >
        <h3 className={`${sectionHeader} text-lg`}>{title}</h3>
        {open ? (
          <ChevronUpIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
        )}
      </button>
      {open && <div className="mt-6 space-y-4">{children}</div>}
    </div>
  );
}

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

const LandingPageEditor: React.FC = () => {
  const [content, setContent] = useState<LandingContent>(getDefaultContent());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [landingLogo, setLandingLogo] = useState<string | null>(null);
  const [savingLogo, setSavingLogo] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    fetch(`${API_URL}/api/landing-content`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        const apiContent = data?.landingContent;
        if (apiContent && Object.keys(apiContent).length > 0) {
          setContent(deepMerge(getDefaultContent(), apiContent));
        }
      })
      .catch(() => setLoadError('No se pudo cargar el contenido actual'))
      .finally(() => setLoading(false));
  }, []);

  // Cargar logo de la landing
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    fetch(`${API_URL}/api/admin/settings`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        if (data?.landingLogo) setLandingLogo(data.landingLogo);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/api/landing-content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ landingContent: content }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData?.error || 'Error al guardar');
      }
    } catch {
      setError('Error de conexión al guardar');
    } finally {
      setSaving(false);
    }
  };

  const updateHero = (key: keyof LandingContent['hero'], value: string) => {
    setContent((prev) => ({ ...prev, hero: { ...prev.hero, [key]: value } }));
  };

  const updateStat = (index: number, field: 'value' | 'label' | 'suffix', val: string | number) => {
    setContent((prev) => {
      const stats = [...prev.stats];
      stats[index] = {
        ...stats[index],
        [field]: field === 'value' ? Number(val) : val,
      } as typeof stats[number];
      return { ...prev, stats };
    });
  };

  const updatePainPoint = (index: number, field: 'title' | 'description', value: string) => {
    setContent((prev) => {
      const painPoints = [...prev.painPoints];
      painPoints[index] = { ...painPoints[index], [field]: value };
      return { ...prev, painPoints };
    });
  };

  const updateWhy = (index: number, field: 'title' | 'description', value: string) => {
    setContent((prev) => {
      const why = [...prev.why];
      why[index] = { ...why[index], [field]: value };
      return { ...prev, why };
    });
  };

  const updateFeature = (index: number, field: 'title' | 'description', value: string) => {
    setContent((prev) => {
      const features = [...prev.features];
      features[index] = { ...features[index], [field]: value };
      return { ...prev, features };
    });
  };

  const updateHowItWorks = (
    index: number,
    field: 'step' | 'title' | 'description',
    value: string
  ) => {
    setContent((prev) => {
      const howItWorks = [...prev.howItWorks];
      howItWorks[index] = { ...howItWorks[index], [field]: value };
      return { ...prev, howItWorks };
    });
  };

  const updateTestimonial = (
    index: number,
    field: 'name' | 'business' | 'quote' | 'rating',
    value: string | number
  ) => {
    setContent((prev) => {
      const testimonials = [...prev.testimonials];
      testimonials[index] = {
        ...testimonials[index],
        [field]: field === 'rating' ? Number(value) : value,
      } as typeof testimonials[number];
      return { ...prev, testimonials };
    });
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    setContent((prev) => {
      const faq = [...prev.faq];
      faq[index] = { ...faq[index], [field]: value };
      return { ...prev, faq };
    });
  };

  const updateFinalCta = (key: keyof LandingContent['finalCta'], value: string) => {
    setContent((prev) => ({ ...prev, finalCta: { ...prev.finalCta, [key]: value } }));
  };

  const updateContact = (key: keyof LandingContent['contact'], value: string) => {
    setContent((prev) => ({ ...prev, contact: { ...prev.contact, [key]: value } }));
  };

  const updateFooter = (key: keyof LandingContent['footer'], value: string) => {
    setContent((prev) => ({ ...prev, footer: { ...prev.footer, [key]: value } }));
  };

  const updateAyudaPage = (key: 'title' | 'subtitle', value: string) => {
    setContent((prev) => ({ ...prev, ayudaPage: { ...prev.ayudaPage, [key]: value } }));
  };

  const updateAyudaFaq = (index: number, field: 'question' | 'answer', value: string) => {
    setContent((prev) => {
      const faqs = [...prev.ayudaPage.faqs];
      faqs[index] = { ...faqs[index], [field]: value };
      return { ...prev, ayudaPage: { ...prev.ayudaPage, faqs } };
    });
  };

  const addAyudaFaq = () => {
    setContent((prev) => ({
      ...prev,
      ayudaPage: {
        ...prev.ayudaPage,
        faqs: [...prev.ayudaPage.faqs, { question: '', answer: '' }],
      },
    }));
  };

  const removeAyudaFaq = (index: number) => {
    setContent((prev) => ({
      ...prev,
      ayudaPage: {
        ...prev.ayudaPage,
        faqs: prev.ayudaPage.faqs.filter((_, i) => i !== index),
      },
    }));
  };

  const updateContactoPage = (key: 'title' | 'subtitle', value: string) => {
    setContent((prev) => ({ ...prev, contactoPage: { ...prev.contactoPage, [key]: value } }));
  };

  const updateLegalPage = (key: 'title', value: string) => {
    setContent((prev) => ({ ...prev, legalPage: { ...prev.legalPage, [key]: value } }));
  };

  const updateLegalSubSection = (
    section: 'terms' | 'privacy' | 'cookies',
    field: 'title' | 'content',
    value: string
  ) => {
    setContent((prev) => ({
      ...prev,
      legalPage: {
        ...prev.legalPage,
        [section]: { ...prev.legalPage[section], [field]: value },
      },
    }));
  };

  const renderSaveButton = (className = '') => (
    <button type="submit"
      onClick={handleSave}
      disabled={saving}
      className={`px-6 py-3 bg-sky-500 text-white rounded-xl font-bold text-sm hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 ${className}`}
    >
      {saving ? (
        <>
          <ArrowPathIcon className="w-4 h-4 animate-spin" /> Guardando...
        </>
      ) : (
        'Guardar Cambios'
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-20">
        <ArrowPathIcon className="w-12 h-12 mb-4 animate-spin mx-auto text-slate-400" />
        <p className="font-bold text-slate-500">Cargando contenido de la landing...</p>
      </div>
    );
  }

  return (
    <div className={`${showPreview ? 'flex gap-0 h-[calc(100vh-64px)] overflow-hidden' : 'p-6 max-w-4xl mx-auto space-y-6'}`}>
      <div className={`${showPreview ? 'flex-1 overflow-y-auto p-6 space-y-6' : ''}`}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          Contenido de la Landing Page
        </h1>
        <div className="flex gap-3">
          <button type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase flex items-center gap-2 transition-all ${showPreview ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {showPreview ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            {showPreview ? 'Ocultar Preview' : 'Vista Previa'}
          </button>
          {renderSaveButton()}
        </div>
      </div>

      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-700 text-sm font-semibold">
          <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
          {loadError} — usando valores por defecto
        </div>
      )}

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-700 text-sm font-semibold animate-in fade-in">
          <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
          Contenido guardado exitosamente
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm font-semibold">
          <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Hero Section */}
      <CollapsibleSection title="Hero" defaultOpen>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className={labelClass}>Badge</label>
            <input
              type="text"
              value={content.hero.badge}
              onChange={(e) => updateHero('badge', e.target.value)}
              className={`w-full ${inputClass}`}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Headline</label>
            <input
              type="text"
              value={content.hero.headline}
              onChange={(e) => updateHero('headline', e.target.value)}
              className={`w-full ${inputClass}`}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Subheadline</label>
            <textarea
              value={content.hero.subheadline}
              onChange={(e) => updateHero('subheadline', e.target.value)}
              className={`w-full ${inputClass}`}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>Primary CTA</label>
              <input
                type="text"
                value={content.hero.primaryCta}
                onChange={(e) => updateHero('primaryCta', e.target.value)}
                className={`w-full ${inputClass}`}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Secondary CTA</label>
              <input
                type="text"
                value={content.hero.secondaryCta}
                onChange={(e) => updateHero('secondaryCta', e.target.value)}
                className={`w-full ${inputClass}`}
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Stats Section */}
      <CollapsibleSection title="Estadísticas">
        <div className="space-y-4">
          {content.stats.map((stat, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <label className={labelClass}>Valor #{idx + 1}</label>
                <input
                  type="number"
                  value={stat.value}
                  onChange={(e) => updateStat(idx, 'value', e.target.value)}
                  className={`w-full ${inputClass}`}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Etiqueta #{idx + 1}</label>
                <input
                  type="text"
                  value={stat.label}
                  onChange={(e) => updateStat(idx, 'label', e.target.value)}
                  className={`w-full ${inputClass}`}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Sufijo #{idx + 1}</label>
                <input
                  type="text"
                  value={stat.suffix}
                  onChange={(e) => updateStat(idx, 'suffix', e.target.value)}
                  className={`w-full ${inputClass}`}
                />
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Pain Points Section */}
      <CollapsibleSection title="Puntos de Dolor">
        <div className="space-y-4">
          {content.painPoints.map((pp, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
              <div className="space-y-1">
                <label className={labelClass}>Título #{idx + 1}</label>
                <input
                  type="text"
                  value={pp.title}
                  onChange={(e) => updatePainPoint(idx, 'title', e.target.value)}
                  className={`w-full ${inputClass}`}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Descripción #{idx + 1}</label>
                <textarea
                  value={pp.description}
                  onChange={(e) => updatePainPoint(idx, 'description', e.target.value)}
                  className={`w-full ${inputClass}`}
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Why Section */}
      <CollapsibleSection title="Por Qué Elegirnos">
        <div className="space-y-4">
          {content.why.map((item, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
              <div className="space-y-1">
                <label className={labelClass}>Título #{idx + 1}</label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateWhy(idx, 'title', e.target.value)}
                  className={`w-full ${inputClass}`}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Descripción #{idx + 1}</label>
                <textarea
                  value={item.description}
                  onChange={(e) => updateWhy(idx, 'description', e.target.value)}
                  className={`w-full ${inputClass}`}
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Features Section */}
      <CollapsibleSection title="Funcionalidades">
        <div className="space-y-4">
          {content.features.map((feat, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
              <div className="space-y-1">
                <label className={labelClass}>Título #{idx + 1}</label>
                <input
                  type="text"
                  value={feat.title}
                  onChange={(e) => updateFeature(idx, 'title', e.target.value)}
                  className={`w-full ${inputClass}`}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Descripción #{idx + 1}</label>
                <textarea
                  value={feat.description}
                  onChange={(e) => updateFeature(idx, 'description', e.target.value)}
                  className={`w-full ${inputClass}`}
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* How It Works Section */}
      <CollapsibleSection title="Cómo Funciona">
        <div className="space-y-4">
          {content.howItWorks.map((step, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className={labelClass}>Paso #{idx + 1}</label>
                  <input
                    type="text"
                    value={step.step}
                    onChange={(e) => updateHowItWorks(idx, 'step', e.target.value)}
                    className={`w-full ${inputClass}`}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className={labelClass}>Título #{idx + 1}</label>
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => updateHowItWorks(idx, 'title', e.target.value)}
                    className={`w-full ${inputClass}`}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Descripción #{idx + 1}</label>
                <textarea
                  value={step.description}
                  onChange={(e) => updateHowItWorks(idx, 'description', e.target.value)}
                  className={`w-full ${inputClass}`}
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Testimonials Section */}
      <CollapsibleSection title="Testimonios">
        <div className="space-y-4">
          {content.testimonials.map((t, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelClass}>Nombre #{idx + 1}</label>
                  <input
                    type="text"
                    value={t.name}
                    onChange={(e) => updateTestimonial(idx, 'name', e.target.value)}
                    className={`w-full ${inputClass}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Negocio #{idx + 1}</label>
                  <input
                    type="text"
                    value={t.business}
                    onChange={(e) => updateTestimonial(idx, 'business', e.target.value)}
                    className={`w-full ${inputClass}`}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Cita #{idx + 1}</label>
                <textarea
                  value={t.quote}
                  onChange={(e) => updateTestimonial(idx, 'quote', e.target.value)}
                  className={`w-full ${inputClass}`}
                  rows={2}
                />
              </div>
              <div className="space-y-1 w-32">
                <label className={labelClass}>Rating (1-5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={t.rating}
                  onChange={(e) => updateTestimonial(idx, 'rating', e.target.value)}
                  className={`w-full ${inputClass}`}
                />
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* FAQ Section */}
      <CollapsibleSection title="Preguntas Frecuentes">
        <div className="space-y-4">
          {content.faq.map((item, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
              <div className="space-y-1">
                <label className={labelClass}>Pregunta #{idx + 1}</label>
                <input
                  type="text"
                  value={item.question}
                  onChange={(e) => updateFaq(idx, 'question', e.target.value)}
                  className={`w-full ${inputClass}`}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Respuesta #{idx + 1}</label>
                <textarea
                  value={item.answer}
                  onChange={(e) => updateFaq(idx, 'answer', e.target.value)}
                  className={`w-full ${inputClass}`}
                  rows={3}
                />
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Final CTA Section */}
      <CollapsibleSection title="CTA Final">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className={labelClass}>Headline</label>
            <input
              type="text"
              value={content.finalCta.headline}
              onChange={(e) => updateFinalCta('headline', e.target.value)}
              className={`w-full ${inputClass}`}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Subheadline</label>
            <textarea
              value={content.finalCta.subheadline}
              onChange={(e) => updateFinalCta('subheadline', e.target.value)}
              className={`w-full ${inputClass}`}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>Primary CTA</label>
              <input
                type="text"
                value={content.finalCta.primaryCta}
                onChange={(e) => updateFinalCta('primaryCta', e.target.value)}
                className={`w-full ${inputClass}`}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Secondary CTA</label>
              <input
                type="text"
                value={content.finalCta.secondaryCta}
                onChange={(e) => updateFinalCta('secondaryCta', e.target.value)}
                className={`w-full ${inputClass}`}
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Contact Section */}
      <CollapsibleSection title="Contacto">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className={labelClass}>Teléfono</label>
            <input
              type="text"
              value={content.contact.phone}
              onChange={(e) => updateContact('phone', e.target.value)}
              className={`w-full ${inputClass}`}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Email</label>
            <input
              type="text"
              value={content.contact.email}
              onChange={(e) => updateContact('email', e.target.value)}
              className={`w-full ${inputClass}`}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Horario</label>
            <input
              type="text"
              value={content.contact.hours}
              onChange={(e) => updateContact('hours', e.target.value)}
              className={`w-full ${inputClass}`}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Footer Section */}
      <CollapsibleSection title="Footer">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className={labelClass}>Tagline</label>
            <textarea
              value={content.footer.tagline}
              onChange={(e) => updateFooter('tagline', e.target.value)}
              className={`w-full ${inputClass}`}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>Facebook URL</label>
              <input
                type="text"
                value={content.footer.facebook}
                onChange={(e) => updateFooter('facebook', e.target.value)}
                placeholder="https://facebook.com/tu-pagina"
                className={`w-full ${inputClass}`}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Twitter URL</label>
              <input
                type="text"
                value={content.footer.twitter}
                onChange={(e) => updateFooter('twitter', e.target.value)}
                placeholder="https://twitter.com/tu-perfil"
                className={`w-full ${inputClass}`}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Instagram URL</label>
              <input
                type="text"
                value={content.footer.instagram}
                onChange={(e) => updateFooter('instagram', e.target.value)}
                placeholder="https://instagram.com/tu-perfil"
                className={`w-full ${inputClass}`}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>LinkedIn URL</label>
              <input
                type="text"
                value={content.footer.linkedin}
                onChange={(e) => updateFooter('linkedin', e.target.value)}
                placeholder="https://linkedin.com/company/tu-empresa"
                className={`w-full ${inputClass}`}
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Ayuda Page Section */}
      <CollapsibleSection title="Página de Ayuda">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className={labelClass}>Título</label>
            <input
              type="text"
              value={content.ayudaPage.title}
              onChange={(e) => updateAyudaPage('title', e.target.value)}
              className={`w-full ${inputClass}`}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Subtítulo</label>
            <input
              type="text"
              value={content.ayudaPage.subtitle}
              onChange={(e) => updateAyudaPage('subtitle', e.target.value)}
              className={`w-full ${inputClass}`}
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-700">FAQs</h4>
              <button
                type="button"
                onClick={addAyudaFaq}
                className="px-3 py-1.5 text-xs font-bold bg-sky-100 text-sky-500 rounded-lg hover:bg-sky-200 transition-colors"
              >
                + Agregar FAQ
              </button>
            </div>
            {content.ayudaPage.faqs.map((faq, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className={labelClass}>FAQ #{idx + 1}</label>
                  <button
                    type="button"
                    onClick={() => removeAyudaFaq(idx)}
                    className="px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Pregunta</label>
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => updateAyudaFaq(idx, 'question', e.target.value)}
                    className={`w-full ${inputClass}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Respuesta</label>
                  <textarea
                    value={faq.answer}
                    onChange={(e) => updateAyudaFaq(idx, 'answer', e.target.value)}
                    className={`w-full ${inputClass}`}
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* Contacto Page Section */}
      <CollapsibleSection title="Página de Contacto">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className={labelClass}>Título</label>
            <input
              type="text"
              value={content.contactoPage.title}
              onChange={(e) => updateContactoPage('title', e.target.value)}
              className={`w-full ${inputClass}`}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Subtítulo</label>
            <textarea
              value={content.contactoPage.subtitle}
              onChange={(e) => updateContactoPage('subtitle', e.target.value)}
              className={`w-full ${inputClass}`}
              rows={2}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Legal Page Section */}
      <CollapsibleSection title="Página Legal">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className={labelClass}>Título de la Página</label>
            <input
              type="text"
              value={content.legalPage.title}
              onChange={(e) => updateLegalPage('title', e.target.value)}
              className={`w-full ${inputClass}`}
            />
          </div>

          {/* Terms */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
            <h4 className="text-sm font-bold text-slate-700">Términos y Condiciones</h4>
            <div className="space-y-1">
              <label className={labelClass}>Título</label>
              <input
                type="text"
                value={content.legalPage.terms.title}
                onChange={(e) => updateLegalSubSection('terms', 'title', e.target.value)}
                className={`w-full ${inputClass}`}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Contenido (HTML)</label>
              <RichTextEditor value={content.legalPage.terms.content} onChange={(html) => updateLegalSubSection('terms', 'content', html)} />
            </div>
          </div>

          {/* Privacy */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
            <h4 className="text-sm font-bold text-slate-700">Política de Privacidad</h4>
            <div className="space-y-1">
              <label className={labelClass}>Título</label>
              <input
                type="text"
                value={content.legalPage.privacy.title}
                onChange={(e) => updateLegalSubSection('privacy', 'title', e.target.value)}
                className={`w-full ${inputClass}`}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Contenido (HTML)</label>
              <RichTextEditor value={content.legalPage.privacy.content} onChange={(html) => updateLegalSubSection('privacy', 'content', html)} />
            </div>
          </div>

          {/* Cookies */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
            <h4 className="text-sm font-bold text-slate-700">Política de Cookies</h4>
            <div className="space-y-1">
              <label className={labelClass}>Título</label>
              <input
                type="text"
                value={content.legalPage.cookies.title}
                onChange={(e) => updateLegalSubSection('cookies', 'title', e.target.value)}
                className={`w-full ${inputClass}`}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Contenido (HTML)</label>
              <RichTextEditor value={content.legalPage.cookies.content} onChange={(html) => updateLegalSubSection('cookies', 'content', html)} />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Banner de Cookies">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className={labelClass}>Mensaje del Banner</label>
            <textarea
              value={content.cookieBanner.message}
              onChange={(e) => setContent(prev => ({ ...prev, cookieBanner: { ...prev.cookieBanner, message: e.target.value } }))}
              className={`w-full ${inputClass}`}
              rows={3}
              placeholder="Mensaje sobre el uso de cookies..."
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Logo de la Landing */}
      <CollapsibleSection title="Logo de la Landing" icon={<CameraIcon className="w-5 h-5" />}>
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-400">Sube el logo que aparecera en la barra de navegacion y footer de la landing page.</p>
          <div className="flex items-start gap-4">
            <div className="w-32 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 flex-shrink-0">
              {landingLogo ? (
                <img src={landingLogo} className="w-full h-full object-contain p-1" alt="Logo preview" />
              ) : (
                <CameraIcon className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className="px-4 py-2 bg-sky-500 text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-sky-600 transition-colors text-center">
                {landingLogo ? 'Cambiar Logo' : 'Subir Logo'}
                <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    alert('La imagen no debe superar 2MB.');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onloadend = async () => {
                    const base64 = reader.result as string;
                    setLandingLogo(base64);
                    setSavingLogo(true);
                    try {
                      const token = localStorage.getItem('adminToken');
                      const res = await fetch(`${API_URL}/api/settings/landing-logo`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ logo: base64 }),
                      });
                      if (!res.ok) throw new Error('Error al guardar');
                    } catch {
                      alert('Error al guardar el logo. Intente de nuevo.');
                    } finally {
                      setSavingLogo(false);
                    }
                  };
                  reader.onerror = () => alert('Error al leer la imagen.');
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }} />
              </label>
              {landingLogo && (
                <button type="button" onClick={async () => {
                  setSavingLogo(true);
                  try {
                    const token = localStorage.getItem('adminToken');
                    await fetch(`${API_URL}/api/settings/landing-logo`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ logo: null }),
                    });
                    setLandingLogo(null);
                  } catch {
                    alert('Error al eliminar el logo.');
                  } finally {
                    setSavingLogo(false);
                  }
                }}
                  disabled={savingLogo}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors disabled:opacity-50">
                  {savingLogo ? 'Eliminando...' : 'Eliminar Logo'}
                </button>
              )}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Bottom save button */}
      <div className="flex justify-end pt-2">
        {renderSaveButton()}
      </div>
      </div>

      {showPreview && (
        <div className="w-[420px] border-l border-slate-200 bg-white overflow-y-auto flex-shrink-0 shadow-2xl z-10">
          <div className="sticky top-0 bg-white border-b border-slate-100 p-4 z-10">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Vista Previa en Vivo</p>
          </div>

          <div className="p-5 space-y-6 scale-[0.85] origin-top-left" style={{ width: 'calc(100% / 0.85)' }}>
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-sky-600 to-sky-800 rounded-2xl p-6 text-white">
              <span className="inline-block bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase mb-2">{content.hero.badge || 'Badge'}</span>
              <h2 className="text-lg font-extrabold leading-tight mb-1">{content.hero.headline}</h2>
              <p className="text-white/70 text-[11px] leading-relaxed mb-3">{content.hero.subheadline}</p>
              <div className="flex gap-2">
                <span className="bg-white text-sky-700 px-3 py-1.5 rounded-lg text-[10px] font-black">{content.hero.primaryCta}</span>
                <span className="border border-white/30 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">{content.hero.secondaryCta}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              {content.stats.slice(0, 4).map((s, i) => (
                <div key={i} className="bg-sky-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-sky-600">{s.value}{s.suffix}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Features */}
            <div>
              <h3 className="text-sm font-black text-slate-800 mb-2 text-center">Funcionalidades</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {content.features.slice(0, 6).map((f, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-2.5">
                    <p className="text-[10px] font-bold text-slate-700">{f.title}</p>
                    <p className="text-[9px] text-slate-400 leading-tight">{f.description.substring(0, 50)}...</p>
                  </div>
                ))}
              </div>
            </div>

            {/* How it Works */}
            <div>
              <h3 className="text-sm font-black text-slate-800 mb-2 text-center">Como Funciona</h3>
              <div className="flex gap-2">
                {content.howItWorks.slice(0, 3).map((s, i) => (
                  <div key={i} className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 text-center">
                    <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] font-black mx-auto mb-1">{s.step}</div>
                    <p className="text-[9px] font-bold text-slate-700">{s.title}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonials */}
            <div>
              <h3 className="text-sm font-black text-slate-800 mb-2 text-center">Testimonios</h3>
              <div className="space-y-1.5">
                {content.testimonials.slice(0, 3).map((t, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-2.5">
                    <p className="text-[10px] italic text-slate-600">"{t.quote.substring(0, 80)}..."</p>
                    <p className="text-[9px] font-bold text-slate-700 mt-1">{t.name} - {t.business}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h3 className="text-sm font-black text-slate-800 mb-2 text-center">FAQ</h3>
              <div className="space-y-1">
                {content.faq.slice(0, 3).map((f, i) => (
                  <div key={i} className="bg-slate-50 rounded-lg p-2">
                    <p className="text-[9px] font-bold text-slate-700">{f.question}</p>
                    <p className="text-[8px] text-slate-400">{f.answer.substring(0, 60)}...</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Final CTA */}
            <div className="bg-gradient-to-br from-sky-600 to-sky-800 rounded-2xl p-6 text-white text-center">
              <h3 className="text-base font-extrabold mb-1">{content.finalCta.headline}</h3>
              <p className="text-white/70 text-[10px] mb-3">{content.finalCta.subheadline}</p>
              <div className="flex gap-2 justify-center">
                <span className="bg-white text-sky-700 px-3 py-1.5 rounded-lg text-[10px] font-black">{content.finalCta.primaryCta}</span>
              </div>
            </div>

            {/* Contact & Footer */}
            <div className="bg-slate-800 rounded-xl p-4 text-center text-white">
              <p className="text-[10px] font-bold">{content.contact.phone} | {content.contact.email}</p>
              <p className="text-[9px] text-slate-400 mt-1">{content.footer.tagline}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPageEditor;
