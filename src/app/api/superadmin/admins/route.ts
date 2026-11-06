import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAdminFromRequest, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Consultar administradores (Solo Superadmin)
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin || admin.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requieren privilegios de Super Administrador.' },
        { status: 403 }
      );
    }

    const admins = await query<any[]>(`
      SELECT id, name, username, email, role, is_active, last_login, created_at, updated_at
      FROM administrators
      ORDER BY id ASC
    `);

    return NextResponse.json({
      success: true,
      admins,
    });
  } catch (error: any) {
    console.error('Error fetching admins for superadmin:', error);
    return NextResponse.json({ error: 'Error al consultar administradores.' }, { status: 500 });
  }
}

// PUT: Modificar credenciales y datos del administrador normal (Solo Superadmin)
export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin || admin.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requieren privilegios de Super Administrador.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { targetAdminId, newPassword, newEmail, newUsername, newName, isActive } = body;

    if (!targetAdminId) {
      return NextResponse.json(
        { error: 'Debe especificar el ID del administrador a gestionar.' },
        { status: 400 }
      );
    }

    // Buscar administrador objetivo
    const targets = await query<any[]>(
      'SELECT id, name, username, email, role, is_active FROM administrators WHERE id = ? LIMIT 1',
      [targetAdminId]
    );

    if (!targets || targets.length === 0) {
      return NextResponse.json(
        { error: 'Administrador no encontrado.' },
        { status: 404 }
      );
    }

    const target = targets[0];
    const changes: Record<string, any> = {};

    // 1. Cambiar contraseña si se indicó
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'La nueva contraseña debe tener al menos 6 caracteres.' },
          { status: 400 }
        );
      }
      const hashed = await hashPassword(newPassword);
      await query('UPDATE administrators SET password_hash = ? WHERE id = ?', [hashed, targetAdminId]);
      changes.passwordChanged = true;
    }

    // 2. Cambiar correo electrónico
    if (newEmail && newEmail.trim() && newEmail.trim().toLowerCase() !== target.email.toLowerCase()) {
      const cleanEmail = newEmail.trim().toLowerCase();
      // Validar que no pertenezca a otra cuenta
      const existing = await query<any[]>(
        'SELECT id FROM administrators WHERE LOWER(email) = ? AND id != ? LIMIT 1',
        [cleanEmail, targetAdminId]
      );
      if (existing && existing.length > 0) {
        return NextResponse.json(
          { error: 'El correo electrónico ya se encuentra registrado por otra cuenta.' },
          { status: 400 }
        );
      }
      await query('UPDATE administrators SET email = ? WHERE id = ?', [cleanEmail, targetAdminId]);
      changes.email = { from: target.email, to: cleanEmail };
    }

    // 3. Cambiar nombre de usuario
    if (newUsername && newUsername.trim() && newUsername.trim().toLowerCase() !== (target.username || '').toLowerCase()) {
      const cleanUsername = newUsername.trim();
      const existing = await query<any[]>(
        'SELECT id FROM administrators WHERE LOWER(username) = LOWER(?) AND id != ? LIMIT 1',
        [cleanUsername, targetAdminId]
      );
      if (existing && existing.length > 0) {
        return NextResponse.json(
          { error: 'El nombre de usuario ya se encuentra registrado por otra cuenta.' },
          { status: 400 }
        );
      }
      await query('UPDATE administrators SET username = ? WHERE id = ?', [cleanUsername, targetAdminId]);
      changes.username = { from: target.username, to: cleanUsername };
    }

    // 4. Cambiar nombre completo
    if (newName && newName.trim() && newName.trim() !== target.name) {
      await query('UPDATE administrators SET name = ? WHERE id = ?', [newName.trim(), targetAdminId]);
      changes.name = { from: target.name, to: newName.trim() };
    }

    // 5. Cambiar estado activo/suspendido
    if (typeof isActive === 'number' || typeof isActive === 'boolean') {
      const activeInt = isActive ? 1 : 0;
      await query('UPDATE administrators SET is_active = ? WHERE id = ?', [activeInt, targetAdminId]);
      changes.is_active = activeInt;
    }

    // Actualizar updated_at
    await query('UPDATE administrators SET updated_at = NOW() WHERE id = ?', [targetAdminId]);

    // Registrar en auditoría la intervención privilegiada del Super Administrador
    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address)
       VALUES (?, 'SUPERADMIN_UPDATE_ADMIN', 'administrators', ?, ?, ?)`,
      [
        admin.id,
        String(targetAdminId),
        JSON.stringify({ targetAdmin: target.username || target.email, changes }),
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Información y credenciales del administrador actualizadas correctamente.',
      changes,
    });
  } catch (error: any) {
    console.error('Error in superadmin PUT admins:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al actualizar el administrador.' },
      { status: 500 }
    );
  }
}

