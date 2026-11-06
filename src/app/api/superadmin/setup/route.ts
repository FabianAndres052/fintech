import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Actualizar Administrador Normal (ID: 1)
    await query(
      'UPDATE administrators SET email = ?, role = "ADMIN", updated_at = NOW() WHERE id = 1 OR username = "AnaPosada55"',
      ['artulio213@gmail.com']
    );

    // 2. Crear o actualizar Super Administrador Fabian1105
    const superPasswordHash = await hashPassword('Valderrama1105!');
    const existing = await query<any[]>(
      'SELECT id, username FROM administrators WHERE username = ? OR email = ? LIMIT 1',
      ['Fabian1105', 'fabian1105@fintech.com']
    );

    let superAdminId: number;
    if (existing && existing.length > 0) {
      superAdminId = existing[0].id;
      await query(
        `UPDATE administrators SET 
          name = 'Fabián Andrés Martínez Valderrama', 
          username = 'Fabian1105', 
          email = 'fabian1105@fintech.com', 
          password_hash = ?, 
          role = 'SUPERADMIN', 
          is_active = 1, 
          updated_at = NOW() 
         WHERE id = ?`,
        [superPasswordHash, superAdminId]
      );
    } else {
      const result: any = await query(
        `INSERT INTO administrators 
          (name, username, email, password_hash, role, is_active) 
         VALUES ('Fabián Andrés Martínez Valderrama', 'Fabian1105', 'fabian1105@fintech.com', ?, 'SUPERADMIN', 1)`,
        [superPasswordHash]
      );
      superAdminId = result.insertId;
    }

    // 3. Consultar administradores actuales
    const admins = await query<any[]>('SELECT id, name, username, email, role, is_active FROM administrators');

    return NextResponse.json({
      success: true,
      message: 'Configuración de Super Administrador y Administrador Normal ejecutada con éxito en la base de datos de producción.',
      admins,
    });
  } catch (error: any) {
    console.error('Error in superadmin setup route:', error);
    return NextResponse.json({ error: error?.message || 'Error en setup' }, { status: 500 });
  }
}

