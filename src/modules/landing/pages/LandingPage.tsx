import React, { useState, useEffect, useRef } from 'react';
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
} from '@heroicons/react/24/outline';
import { BUSINESS_TYPES, BusinessType } from '../../../types/types';

const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const ctaSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      if (ctaSectionRef.current) {
        const rect = ctaSectionRef.current.getBoundingClientRect();
        setCtaVisible(rect.top < window.innerHeight && rect.bottom > 0);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const plans = [
    {
      name: 'Básico',
      price: '$29.99',
      period: '/mes',
      features: [
        'Hasta 100 facturas/mes',
        'Facturación electrónica SRI',
        '1 usuario',
        'Clientes ilimitados',
        'Soporte por email',
      ],
      highlighted: false,
      code: 'MONTHLY',
    },
    {
      name: 'Pro',
      price: '$149.99',
      period: '/semestre',
      features: [
        'Hasta 500 facturas/mes',
        'Facturación electrónica SRI',
        '5 usuarios',
        'Inventario y Kardex',
        'Recetas y producción',
        'Reportes tributarios',
        'Soporte prioritario',
        'Asistente IA',
      ],
      highlighted: true,
      code: 'SEMIANNUAL',
    },
    {
      name: 'Enterprise',
      price: '$249.99',
      period: '/año',
      features: [
        'Facturas ilimitadas',
        'Facturación electrónica SRI',
        'Usuarios ilimitados',
        'Inventario y Kardex',
        'Recetas y producción',
        'Reportes tributarios ATS/104',
        'Portal de clientes',
        'Soporte 24/7',
        'Asistente IA avanzado',
        'API de integración',
      ],
      highlighted: false,
      code: 'YEARLY',
    },
  ];

  const businessTypeCards = Object.entries(BUSINESS_TYPES).map(([key, value]) => ({
    id: key as BusinessType,
    ...value,
  }));

  const features = [
    {
      icon: DocumentTextIcon,
      title: 'Facturación Electrónica SRI',
      description: 'Emite facturas, notas de crédito, retenciones y guías de remisión en cumplimiento con el SRI Ecuador.',
    },
    {
      icon: CubeIcon,
      title: 'Inventario Inteligente',
      description: 'Controla tu stock en tiempo real con Kardex. Alertas de stock mínimo y movimientos de inventario.',
    },
    {
      icon: SparklesIcon,
      title: 'Recetas y Producción',
      description: 'Crea recetas con ingredientes y unidades de medida. Registra producción y calcula costos automáticamente.',
    },
    {
      icon: ChartBarIcon,
      title: 'Reportes Tributarios',
      description: 'Genera ATS, Formulario 104, Libro de Ventas y análisis de rentabilidad por producto.',
    },
    {
      icon: UserGroupIcon,
      title: 'Multi-usuario',
      description: 'Administradores, vendedores y contadores con permisos específicos según su rol.',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Respaldo en la Nube',
      description: 'Tus datos seguros en la nube. Accede desde cualquier dispositivo, en cualquier momento.',
    },
  ];

  const testimonials = [
    {
      name: 'María Elena G.',
      business: 'Panadería Dulce Hogar',
      quote: 'Desde que uso Ecuafact Pro puedo saber exactamente cuánta harina gasto por cada lote de pan. El control de recetas me cambió el negocio.',
      rating: 5,
    },
    {
      name: 'Carlos R.',
      business: 'Restaurante El Sabor',
      quote: 'Las recetas y el control de producción me permiten calcular el costo real de cada plato. Ahora sé cuánto gano por cada venta.',
      rating: 5,
    },
    {
      name: 'Patricia M.',
      business: 'Tienda MultiStock',
      quote: 'El kardex y la facturación electrónica me ahorran horas de trabajo. Mis contadores están felices con los reportes.',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg shadow-slate-200/50' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
                <DocumentTextIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-slate-900">
                ECUAFACT <span className="text-indigo-600">PRO</span>
              </span>
            </div>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-8">
              <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">Funcionalidades</a>
              <a href="#business-types" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">Negocios</a>
              <a href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">Planes</a>
              <a href="#testimonials" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">Testimonios</a>
              <a
                href="/login"
                className="text-sm font-bold text-slate-700 hover:text-indigo-600 transition-colors px-4 py-2"
              >
                Iniciar Sesión
              </a>
              <a
                href="/suscripcion"
                className="text-sm font-bold bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40"
              >
                Comenzar Gratis
              </a>
            </div>

            {/* Mobile menu button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-xl">
              {mobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 shadow-xl">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block py-3 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl" onClick={() => setMobileMenuOpen(false)}>Funcionalidades</a>
              <a href="#business-types" className="block py-3 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl" onClick={() => setMobileMenuOpen(false)}>Negocios</a>
              <a href="#pricing" className="block py-3 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl" onClick={() => setMobileMenuOpen(false)}>Planes</a>
              <a href="/login" className="block py-3 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl">Iniciar Sesión</a>
              <a href="/suscripcion" className="block py-3 px-4 text-sm font-bold bg-indigo-600 text-white text-center rounded-xl">Comenzar Gratis</a>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-28 lg:pt-36 pb-16 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-amber-50 -z-10" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-10 left-0 w-[400px] h-[400px] bg-amber-200/20 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-bold px-4 py-2 rounded-full mb-6">
                <SparklesIcon className="w-4 h-4" />
                Nuevo: Recetas y control de producción
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
                Factura, produce y crece —{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">todo en un solo lugar</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-slate-500 leading-relaxed max-w-lg mx-auto lg:mx-0">
                El sistema de facturación electrónica que se adapta a tu negocio. Panadería, restaurante, tienda o servicios — activa solo lo que necesitas.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a
                  href="/suscripcion"
                  className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:-translate-y-0.5"
                >
                  Comenzar Gratis
                  <ArrowRightIcon className="w-5 h-5" />
                </a>
                <a
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 bg-white text-slate-700 px-8 py-4 rounded-2xl font-bold text-base hover:bg-slate-50 transition-all border-2 border-slate-200 hover:border-slate-300"
                >
                  Iniciar Sesión
                </a>
              </div>
              <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start text-sm text-slate-400">
                <div className="flex items-center gap-1.5">
                  <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold">Datos seguros</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StarIcon className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold">4.9/5 estrellas</span>
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Outcome-focused visual: Business results transformation */}
              <div className="relative z-10">
                {/* Main result card: happy metrics */}
                <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/70 p-6 sm:p-8 border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                        <ArrowTrendingUpIcon className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">Resultado del mes</p>
                        <p className="text-xs text-slate-400 font-semibold">Panadería Dulce Hogar</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
                      <span className="text-base">+34%</span>
                    </div>
                  </div>

                  {/* Before → After comparison */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-red-50 rounded-2xl p-4 relative overflow-hidden">
                      <div className="absolute top-2 right-2 text-[10px] font-bold text-red-400 bg-red-100 px-2 py-0.5 rounded-full">Antes</div>
                      <div className="space-y-3 mt-3">
                        <div className="flex items-center gap-2">
                          <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                          <span className="text-xs text-red-700 font-semibold">Sin control de inventario</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ClockIcon className="w-4 h-4 text-red-400" />
                          <span className="text-xs text-red-700 font-semibold">3h/día en papeleo</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalculatorIcon className="w-4 h-4 text-red-400" />
                          <span className="text-xs text-red-700 font-semibold">Costos desconocidos</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-4 relative overflow-hidden">
                      <div className="absolute top-2 right-2 text-[10px] font-bold text-emerald-500 bg-emerald-100 px-2 py-0.5 rounded-full">Ahora</div>
                      <div className="space-y-3 mt-3">
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs text-emerald-700 font-semibold">Stock en tiempo real</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs text-emerald-700 font-semibold">10 min/día facturando</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs text-emerald-700 font-semibold">Rentabilidad por receta</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key metrics row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                      <p className="text-2xl font-black text-indigo-700">98%</p>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mt-1">menos errores</p>
                    </div>
                    <div className="bg-amber-50 rounded-2xl p-4 text-center">
                      <p className="text-2xl font-black text-amber-700">3x</p>
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mt-1">más rápido</p>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                      <p className="text-2xl font-black text-emerald-700">24/7</p>
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-1">en la nube</p>
                    </div>
                  </div>
                </div>

                {/* Floating trust card */}
                <div className="absolute -bottom-6 -right-6 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl px-6 py-4 shadow-xl shadow-indigo-500/30 hidden lg:block">
                  <p className="text-xs font-bold opacity-80">Clientes activos</p>
                  <p className="text-lg font-black">+450 negocios</p>
                  <p className="text-xs opacity-80 mt-0.5">Facturando en Ecuador</p>
                </div>
              </div>

              {/* Background decorative circles */}
              <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-br from-indigo-200/40 to-violet-200/40 rounded-full blur-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <section className="py-8 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-12">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-indigo-500" />
              <span className="text-sm font-bold text-slate-600">Datos encriptados</span>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
              ))}
              <span className="text-sm font-bold text-slate-600 ml-1">4.9/5</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-600"><span className="text-indigo-600 text-lg font-black">+450</span> negocios activos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-600"><span className="text-indigo-600 text-lg font-black">+50,000</span> facturas emitidas</span>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM / PAIN POINTS SECTION */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              ¿Cansado de perder el control de tu negocio?
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
              Sin un sistema, los negocios pierden dinero por inventario mal controlado, recetas sin costo real y horas de papeleo manual.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { icon: ExclamationTriangleIcon, title: 'Inventario fuera de control', desc: 'Sin saber qué tienes ni cuándo comprar. Quiebres de stock o sobreinventario que drenan tu flujo de caja.' },
              { icon: CalculatorIcon, title: 'Costos a ciegas', desc: 'Sin saber cuánto te cuesta producir cada receta. Tomas decisiones de precio sin datos reales de rentabilidad.' },
              { icon: ClockIcon, title: 'Horas en papeleo', desc: 'Facturas manuales, Excel interminables, cálculos repetitivos. Tiempo que deberías invertir en hacer crecer tu negocio.' },
            ].map((pain, idx) => (
              <div key={idx} className="bg-red-50/50 border border-red-100 rounded-3xl p-8 hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                  <pain.icon className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-3">{pain.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{pain.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUSINESS TYPES SECTION */}
      <section id="business-types" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Elige tu tipo de negocio
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
              Activamos solo los módulos que tu negocio necesita. Desde recetas para panaderías hasta inventario para tiendas.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {businessTypeCards.map((bt) => (
              <a
                key={bt.id}
                href={`/suscripcion?tipo=${bt.id.toLowerCase()}`}
                className="group relative bg-white rounded-3xl p-6 border-2 border-slate-100 hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-300 text-center hover:-translate-y-1"
              >
                <div className="text-4xl mb-4">{bt.icon}</div>
                <h3 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{bt.label}</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{bt.description}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 lg:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Todo lo que necesitas para facturar
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
              Desde la emisión de facturas hasta el control de producción. Un sistema completo que crece contigo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-8 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
                  <feature.icon className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-3">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Comienza en 3 pasos
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
              No necesitas ser experto. Regístrate, configura tu negocio y empieza a facturar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Crea tu cuenta', desc: 'Elige tu tipo de negocio y plan. Registro en menos de 2 minutos.' },
              { step: '02', title: 'Configura tu empresa', desc: 'Ingresa los datos de tu negocio: RUC, dirección y logo.' },
              { step: '03', title: 'Empieza a facturar', desc: 'Crea productos, recetas y emite tu primera factura electrónica.' },
            ].map((step, idx) => (
              <div key={idx} className="text-center relative">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-3xl flex items-center justify-center text-3xl font-black mx-auto mb-6 shadow-xl shadow-indigo-500/20">
                  {step.step}
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-3">{step.title}</h3>
                <p className="text-slate-500 leading-relaxed">{step.desc}</p>
                {idx < 2 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-full h-0.5 bg-gradient-to-r from-indigo-200 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-20 lg:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Planes que crecen contigo
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
              Sin costos ocultos. Elige el plan que mejor se adapte a tu negocio y cámbialo cuando quieras.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`relative bg-white rounded-3xl p-8 border-2 transition-all duration-300 hover:-translate-y-1 ${
                  plan.highlighted
                    ? 'border-indigo-600 shadow-2xl shadow-indigo-200/50 scale-[1.02]'
                    : 'border-slate-100 hover:border-slate-300 hover:shadow-xl'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                    Más Popular
                  </div>
                )}

                <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-slate-400 font-semibold">{plan.period}</span>
                </div>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feat, fi) => (
                    <li key={fi} className="flex items-start gap-3">
                      <CheckCircleIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-600 font-medium">{feat}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={`/suscripcion?plan=${plan.code}`}
                  className={`mt-8 block text-center py-3.5 rounded-2xl font-bold text-sm transition-all ${
                    plan.highlighted
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/25'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Elegir {plan.name}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Lo que dicen nuestros clientes
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
              Negocios reales que ya usan Ecuafact Pro para facturar y controlar su producción.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((t, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-8 border border-slate-100 hover:shadow-xl transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <StarIcon key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 leading-relaxed italic mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center font-black text-indigo-600">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-500 font-semibold">{t.business}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-20 lg:py-28 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Preguntas frecuentes
            </h2>
          </div>

          <div className="space-y-4">
            {[
              { q: '¿Qué tipos de negocio soportan?', a: 'Soportamos panaderías, restaurantes, tiendas, servicios profesionales y cualquier tipo de comercio. Cada tipo activa los módulos que realmente necesita.' },
              { q: '¿Cómo funciona el control de recetas?', a: 'Puedes crear recetas vinculando productos terminados con sus ingredientes (materia prima). Al registrar una producción, el sistema descuenta automáticamente los insumos del inventario y calcula el costo.' },
              { q: '¿Las facturas son válidas para el SRI?', a: 'Sí. Ecuafact Pro genera facturas electrónicas con todas las especificaciones del SRI Ecuador, incluyendo clave de acceso, firma electrónica y envío de XML.' },
              { q: '¿Puedo cambiar de plan después?', a: 'Sí, puedes actualizar o cambiar de plan en cualquier momento desde el panel de suscripción. Los cambios se aplican al siguiente ciclo de facturación.' },
              { q: '¿Mis datos están seguros?', a: 'Tus datos se almacenan encriptados en servidores seguros. Nadie más que tú y tus usuarios autorizados tiene acceso a tu información.' },
              { q: '¿Ofrecen soporte técnico?', a: 'Sí. El plan Pro incluye soporte prioritario por chat y email. El plan Enterprise tiene soporte 24/7. Todos los planes tienen acceso a nuestra base de conocimiento.' },
            ].map((faq, idx) => (
              <details key={idx} className="group bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors list-none">
                  <span className="text-base font-bold text-slate-800">{faq.q}</span>
                  <span className="text-xl text-slate-400 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-slate-500 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section ref={ctaSectionRef} className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[3rem] p-10 sm:p-16 shadow-2xl shadow-indigo-500/30">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              ¿Listo para transformar tu negocio?
            </h2>
            <p className="mt-4 text-lg text-indigo-100 max-w-xl mx-auto">
              Únete a cientos de negocios que ya facturan y controlan su producción con Ecuafact Pro. Empieza gratis hoy.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/suscripcion"
                className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 px-8 py-4 rounded-2xl font-bold text-base hover:bg-indigo-50 transition-all shadow-xl hover:-translate-y-0.5"
              >
                Comenzar Gratis Ahora
                <ArrowRightIcon className="w-5 h-5" />
              </a>
              <a
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-white/20 transition-all border border-white/20"
              >
                Ya tengo cuenta
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-black text-white">
                  ECUAFACT <span className="text-indigo-400">PRO</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed">
                Sistema de facturación electrónica y control de producción para negocios en Ecuador.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Planes</a></li>
                <li><a href="#business-types" className="hover:text-white transition-colors">Tipos de Negocio</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Soporte</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Centro de Ayuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacidad</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Términos de Uso</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm">
            <p>© 2026 Ecuafact Pro. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* STICKY MOBILE CTA BAR — hidden when Final CTA section is visible */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-4 py-3 shadow-2xl shadow-slate-300/50 transition-all duration-300 ${ctaVisible ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <a
          href="/suscripcion"
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-bold text-sm w-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
        >
          Comenzar Gratis
          <ArrowRightIcon className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};

export default LandingPage;