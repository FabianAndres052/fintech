'use client';

import { useEffect } from 'react';

/**
 * Garantiza que si el usuario presiona el botón "Atrás" del navegador
 * después de cerrar sesión, no se restaure el estado en caché del dashboard.
 */
export default function AuthCacheSync() {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  return null;
}

