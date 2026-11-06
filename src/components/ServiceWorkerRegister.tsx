'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X, PlusSquare } from 'lucide-react';

export default function ServiceWorkerRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showIosBanner, setShowIosBanner] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('ServiceWorker registration successful:', registration.scope);
          },
          (err) => {
            console.log('ServiceWorker registration failed:', err);
          }
        );
      });
    }

    // Comprobar si ya está en modo Standalone (App instalada en Home Screen)
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    // Detectar iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);

    if (isIosDevice && !isStandalone) {
      const dismissed = sessionStorage.getItem('ios_install_dismissed');
      if (!dismissed) {
        setShowIosBanner(true);
      }
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroidBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowAndroidBanner(false);
    }
  };

  const dismissIosBanner = () => {
    setShowIosBanner(false);
    sessionStorage.setItem('ios_install_dismissed', '1');
  };

  if (showAndroidBanner) {
    return (
      <div className="fixed bottom-16 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-slate-900/95 border border-emerald-500/30 backdrop-blur-xl p-4 rounded-2xl shadow-2xl shadow-emerald-950/50 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Instalar Aplicación</h4>
            <p className="text-xs text-slate-400">Acceso rápido desde tu pantalla de inicio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer"
          >
            Instalar
          </button>
          <button
            onClick={() => setShowAndroidBanner(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (showIosBanner) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-neutral-900/95 border border-red-500/30 backdrop-blur-xl p-4 rounded-2xl shadow-2xl shadow-black/80 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom duration-300 text-neutral-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-red-800 flex items-center justify-center text-white shadow-md font-black text-xl">
              $
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Instalar FINTECH en iPhone</h4>
              <p className="text-xs text-neutral-400">Úsala en pantalla completa como App nativa</p>
            </div>
          </div>
          <button
            onClick={dismissIosBanner}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-neutral-950/80 rounded-xl p-3 text-xs text-neutral-300 space-y-2 border border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
            <span>Toca el botón <strong>Compartir</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-blue-400" /> abajo en Safari.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
            <span>Baja y selecciona <strong>&quot;Agregar a pantalla de inicio&quot;</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-neutral-200" />.</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
