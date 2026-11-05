import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { comparePassword, signAdminToken } from '@/lib/auth';
import { Administrator } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = (body.email || body.username || '').trim();
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Debe ingresar su usuario y contraseña.' },
        { status: 400 }
      );
    }

    const admins = await query<any[]>(
      'SELECT id, name, username, email, password_hash, role, is_active FROM administrators WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1',
      [identifier, identifier]
    );

    if (!admins || admins.length === 0) {
      return NextResponse.json(
        { error: 'Credenciales inválidas. Verifique su usuario o contraseña.' },
        { status: 401 }
      );
    }

    const admin = admins[0];

    if (!admin.is_active) {
      return NextResponse.json(
        { error: 'Esta cuenta administrativa se encuentra suspendida.' },
        { status: 403 }
      );
    }

    const isValid = await comparePassword(password, admin.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas. Verifique su correo o contraseña.' },
        { status: 401 }
      );
    }

    // Actualizar última fecha de login y auditoría en paralelo para acelerar la respuesta
    Promise.allSettled([
      query('UPDATE administrators SET last_login = NOW() WHERE id = ?', [admin.id]),
      query(
        'INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
        [
          admin.id,
          'LOGIN_SUCCESS',
          'administrators',
          String(admin.id),
          JSON.stringify({ email: admin.email, username: admin.username }),
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      ),
    ]).catch(() => {});

    const token = signAdminToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.name,
    });

    const safeAdmin: Partial<Administrator> = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      admin: safeAdmin,
      token,
    });

    const isHttps = req.headers.get('x-forwarded-proto') === 'https';
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 días
    });

    return response;
  } catch (error: any) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error en el servidor al autenticar.' },
      { status: 500 }
    );
  }
}
