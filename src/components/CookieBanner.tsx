import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CookieBannerProps {
  message?: string;
  privacyUrl?: string;
  legalUrl?: string;
}

const CookieBanner: React.FC<CookieBannerProps> = ({
  message = 'Utilizamos cookies propias y de terceros para mejorar tu experiencia, analizar el trafico y mostrarte contenido personalizado. Al hacer clic en "Aceptar", consientes el uso de todas las cookies.',
  privacyUrl = '/legal',
  legalUrl = '/legal',
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem('cookieConsent', 'rejected');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999] animate-slide-up">
      <div className="bg-white border-t border-slate-200 shadow-2xl shadow-slate-300/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-[#0057FF]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheckIcon className="w-5 h-5 text-[#0057FF]" />
              </div>
              <div className="text-sm text-slate-600 leading-relaxed font-medium">
                {message}{' '}
                <a href={privacyUrl} className="text-[#0057FF] font-bold hover:underline">Politica de Privacidad</a>
                {' '}y{' '}
                <a href={legalUrl} className="text-[#0057FF] font-bold hover:underline">Terminos Legales</a>.
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={reject}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Rechazar
              </button>
              <button
                onClick={accept}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#0057FF] text-white hover:bg-[#003ACC] transition-all shadow-lg shadow-[#0057FF]/20"
              >
                Aceptar Cookies
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
