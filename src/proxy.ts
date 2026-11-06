import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getTokenPayload(token: string | undefined): any | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    if (!payload || !payload.id || !payload.exp) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const token = request.cookies.get('admin_token')?.value || bearerToken;
  const payload = getTokenPayload(token);
  const hasValidToken = !!payload;

  const isLoginPage = pathname === '/login';
  const isPublicApi =
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname.startsWith('/api/auth/2fa');

  // Si el usuario ya está autenticado con token válido e intenta acceder a /login, redirigir al dashboard
  if (isLoginPage && hasValidToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Rutas públicas y recursos estáticos
  if (
    isLoginPage ||
    isPublicApi ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  // Si no tiene token válido y está accediendo a una página o API protegida
  if (!hasValidToken) {
    if (pathname.startsWith('/api/')) {
      const resp = NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      resp.cookies.delete('admin_token');
      return resp;
    }
    const loginUrl = new URL('/login', request.url);
    const resp = NextResponse.rewrite(loginUrl);
    resp.cookies.delete('admin_token');
    return resp;
  }

  // =========================================================================
  // BLINDAJE DE SEGURIDAD EXCLUSIVO: SUPER ADMINISTRADOR Y AUDITORÍA
  // Solo accesible si payload.role === 'SUPERADMIN'
  // =========================================================================
  const isSuperadminRoute =
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/auditoria') ||
    pathname.startsWith('/api/superadmin') ||
    pathname.startsWith('/api/audit');

  if (isSuperadminRoute && payload?.role !== 'SUPERADMIN') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Acceso restringido: Se requieren privilegios exclusivos de Super Administrador.' },
        { status: 403 }
      );
    }
    // Si intenta ingresar por URL en el navegador, redirigir al Dashboard principal
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Encabezados anti-caché en todas las rutas protegidas para evitar retroceso con botón Atrás del navegador
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

