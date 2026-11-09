import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_fintech_loans_colombia_2026';

/**
 * Verificación criptográfica real de JWT mediante Web Crypto API (HMAC-SHA256).
 * Valida formato, integridad de firma, expiración e identidad del rol.
 */
async function verifyTokenCryptographically(token: string | undefined): Promise<any | null> {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    // 1. Decodificar payload y verificar expiración
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload || (!payload.id && !payload.clientId) || !payload.exp) return null;
    if (payload.exp * 1000 < Date.now()) return null;

    // 2. Verificar firma HMAC SHA-256
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBuf = Buffer.from(sigB64, 'base64url');
    const dataBuf = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    const isValid = await crypto.subtle.verify('HMAC', key, sigBuf, dataBuf);
    return isValid ? payload : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Recursos estáticos públicos siempre permitidos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  // 2. Webhooks externos (Bold) siempre permitidos
  if (pathname.startsWith('/api/webhooks')) {
    return NextResponse.next();
  }

  // 3. Flujo del Portal de Clientes (/portal y /api/portal)
  const isClientPortalRoute = pathname.startsWith('/portal') || pathname.startsWith('/api/portal');
  if (isClientPortalRoute) {
    const isClientLoginPage = pathname === '/portal/login';
    const isClientPublicApi =
      pathname === '/api/portal/auth/login' ||
      pathname === '/api/portal/auth/logout';

    if (isClientLoginPage || isClientPublicApi) {
      if (isClientLoginPage) {
        const clientToken = request.cookies.get('client_token')?.value;
        const clientPayload = await verifyTokenCryptographically(clientToken);
        if (clientPayload && clientPayload.role === 'CLIENT') {
          return NextResponse.redirect(new URL('/portal', request.url));
        }
      }
      return NextResponse.next();
    }

    // Rutas protegidas del portal de clientes
    const clientToken = request.cookies.get('client_token')?.value;
    const clientPayload = await verifyTokenCryptographically(clientToken);
    const hasValidClientToken = !!(clientPayload && clientPayload.role === 'CLIENT');

    if (!hasValidClientToken) {
      if (pathname.startsWith('/api/')) {
        const resp = NextResponse.json({ error: 'No autorizado: Inicie sesión en el portal.' }, { status: 401 });
        resp.cookies.delete('client_token');
        return resp;
      }
      // Redirigir a /portal/login si intenta acceder a /portal sin autenticarse
      const clientLoginUrl = new URL('/portal/login', request.url);
      const resp = NextResponse.redirect(clientLoginUrl);
      resp.cookies.delete('client_token');
      return resp;
    }

    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    return response;
  }

  // 4. Flujo del Administrador y Super Administrador
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const adminToken = request.cookies.get('admin_token')?.value || bearerToken;

  const adminPayload = await verifyTokenCryptographically(adminToken);
  const hasValidAdminToken = !!(adminPayload && (adminPayload.role === 'ADMIN' || adminPayload.role === 'SUPERADMIN'));

  const isLoginPage = pathname === '/login';
  const isPublicAdminApi =
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout');

  // Si ya tiene sesión administrativa válida e intenta acceder a /login, redirigir al dashboard
  if (isLoginPage && hasValidAdminToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isLoginPage || isPublicAdminApi) {
    return NextResponse.next();
  }

  // Si no tiene token administrativo válido
  if (!hasValidAdminToken) {
    if (pathname.startsWith('/api/')) {
      const resp = NextResponse.json({ error: 'No autorizado: Token administrativo inexistente o inválido.' }, { status: 401 });
      resp.cookies.delete('admin_token');
      return resp;
    }
    const loginUrl = new URL('/login', request.url);
    const resp = NextResponse.redirect(loginUrl);
    resp.cookies.delete('admin_token');
    return resp;
  }

  // =========================================================================
  // BLINDAJE DE SEGURIDAD EXCLUSIVO: SUPER ADMINISTRADOR Y AUDITORÍA
  // Solo accesible si adminPayload.role === 'SUPERADMIN'
  // =========================================================================
  const isSuperadminRoute =
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/auditoria') ||
    pathname.startsWith('/api/superadmin') ||
    pathname.startsWith('/api/audit');

  if (isSuperadminRoute && adminPayload?.role !== 'SUPERADMIN') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Acceso restringido: Se requieren privilegios exclusivos de Super Administrador.' },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Encabezados anti-caché en todas las rutas protegidas
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
