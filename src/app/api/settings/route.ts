import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAdminFromRequest, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const settings = await query<any[]>('SELECT * FROM system_settings');
    const paymentMethods = await query<any[]>('SELECT * FROM payment_methods ORDER BY id ASC');

    const configMap: Record<string, string> = {};
    settings.forEach((s) => {
      configMap[s.setting_key] = s.setting_value;
    });

    return NextResponse.json({
      success: true,
      settings: configMap,
      rawSettings: settings,
      paymentMethods,
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Error al consultar configuración.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { settings, adminPasswordUpdate, adminProfileUpdate } = body;

    // Actualizar nombre de usuario del administrador
    if (adminProfileUpdate && adminProfileUpdate.username) {
      const cleanUsername = adminProfileUpdate.username.trim();
      const existing = await query<any[]>(
        'SELECT id FROM administrators WHERE LOWER(username) = LOWER(?) AND id != ? LIMIT 1',
        [cleanUsername, admin.id]
      );
      if (existing && existing.length > 0) {
        return NextResponse.json(
          { error: 'Ese nombre de usuario ya se encuentra registrado por otra cuenta.' },
          { status: 400 }
        );
      }
      await query('UPDATE administrators SET username = ?, updated_at = NOW() WHERE id = ?', [cleanUsername, admin.id]);
    }

    // Actualizar o insertar configuraciones del sistema
    if (settings && typeof settings === 'object') {
      for (const [key, val] of Object.entries(settings)) {
        // No permitir modificar saldo de caja directamente por settings sin registrar movimiento
        if (key === 'current_cash_balance') continue;
        await query(
          `INSERT INTO system_settings (setting_key, setting_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [key, String(val)]
        );
      }
    }

    // Actualizar contraseña administrativa si se proporciona
    if (adminPasswordUpdate && adminPasswordUpdate.newPassword) {
      if (adminPasswordUpdate.newPassword.length < 6) {
        return NextResponse.json(
          { error: 'La nueva contraseña debe tener al menos 6 caracteres.' },
          { status: 400 }
        );
      }
      const hashed = await hashPassword(adminPasswordUpdate.newPassword);
      await query('UPDATE administrators SET password_hash = ? WHERE id = ?', [hashed, admin.id]);
    }

    await query(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [admin.id, 'UPDATE_SETTINGS', 'system_settings', 'ALL', JSON.stringify({ updatedKeys: Object.keys(settings || {}) })]
    );

    return NextResponse.json({ success: true, message: 'Configuración actualizada exitosamente.' });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Error al guardar configuración.' }, { status: 500 });
  }
}
