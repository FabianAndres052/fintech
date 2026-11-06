import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAdminFromRequest, hashPassword } from '@/lib/auth';
import { send2FACodeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

async function ensure2FATable() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_2fa_codes (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(150) NOT NULL,
      code VARCHAR(10) NOT NULL,
      purpose VARCHAR(50) NOT NULL DEFAULT 'CHANGE_PASSWORD',
      expires_at DATETIME NOT NULL,
      used TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_2fa_lookup (email, code, used)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

// POST: Solicitar código 2FA
export async function POST(req: NextRequest) {
  try {
    await ensure2FATable();
    const body = await req.json();
    const rawEmail = (body.email || '').trim().toLowerCase();
    const purpose = body.purpose === 'PASSWORD_RESET' ? 'PASSWORD_RESET' : 'CHANGE_PASSWORD';

    if (!rawEmail) {
      return NextResponse.json(
        { error: 'Debe ingresar un correo electrónico válido.' },
        { status: 400 }
      );
    }

    // Buscar si existe el administrador
    const admins = await query<any[]>(
      'SELECT id, name, username, email FROM administrators WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1',
      [rawEmail, rawEmail]
    );

    if (!admins || admins.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró ningún administrador registrado con este correo o usuario.' },
        { status: 404 }
      );
    }

    const admin = admins[0];
    const targetEmail = admin.email || rawEmail;

    // Generar código numérico seguro de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Guardar en la tabla con expiración en 15 minutos
    await query(
      `INSERT INTO admin_2fa_codes (email, code, purpose, expires_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
      [targetEmail, code, purpose]
    );

    // Enviar correo
    const emailResult = await send2FACodeEmail({
      to: targetEmail,
      code,
      adminName: admin.name,
      purpose,
    });

    return NextResponse.json({
      success: true,
      message: emailResult.message || `Código de seguridad enviado a ${targetEmail}.`,
      simulated: emailResult.simulated,
      devCode: emailResult.simulated ? code : undefined,
      email: targetEmail,
    });
  } catch (error: any) {
    console.error('Error generando código 2FA:', error);
    return NextResponse.json(
      { error: 'Error al generar código de seguridad 2FA.' },
      { status: 500 }
    );
  }
}

// PUT: Validar código 2FA y actualizar contraseña / usuario
export async function PUT(req: NextRequest) {
  try {
    await ensure2FATable();
    const body = await req.json();
    const rawEmail = (body.email || '').trim().toLowerCase();
    const code = (body.code || '').trim();
    const newPassword = body.newPassword;
    const newUsername = (body.newUsername || '').trim();

    if (!rawEmail || !code || !newPassword) {
      return NextResponse.json(
        { error: 'Todos los campos (correo, código 2FA y nueva contraseña) son requeridos.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    // Verificar si el código es válido
    const validCodes = await query<any[]>(
      `SELECT id, email FROM admin_2fa_codes
       WHERE (LOWER(email) = ? OR LOWER(email) IN (SELECT LOWER(email) FROM administrators WHERE LOWER(username) = ?))
         AND code = ? AND used = 0 AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [rawEmail, rawEmail, code]
    );

    if (!validCodes || validCodes.length === 0) {
      return NextResponse.json(
        { error: 'El código 2FA es incorrecto o ya ha expirado. Por favor solicita uno nuevo.' },
        { status: 400 }
      );
    }

    const matchedRecord = validCodes[0];
    const targetEmail = matchedRecord.email;

    // Buscar admin
    const admins = await query<any[]>(
      'SELECT id, name, username, email FROM administrators WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [targetEmail]
    );

    if (!admins || admins.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró la cuenta administrativa para actualizar.' },
        { status: 404 }
      );
    }

    const admin = admins[0];

    // Marcar código como utilizado
    await query('UPDATE admin_2fa_codes SET used = 1 WHERE id = ?', [matchedRecord.id]);

    // Hashear nueva contraseña
    const hashedPassword = await hashPassword(newPassword);

    // Actualizar usuario si se especificó, junto con la contraseña
    if (newUsername && newUsername !== admin.username) {
      // Verificar si el nuevo username ya existe en otro admin
      const existingUsers = await query<any[]>(
        'SELECT id FROM administrators WHERE LOWER(username) = LOWER(?) AND id != ? LIMIT 1',
        [newUsername, admin.id]
      );
      if (existingUsers && existingUsers.length > 0) {
        return NextResponse.json(
          { error: 'Ese nombre de usuario ya está en uso por otra cuenta.' },
          { status: 400 }
        );
      }

      await query(
        'UPDATE administrators SET password_hash = ?, username = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, newUsername, admin.id]
      );
    } else {
      await query(
        'UPDATE administrators SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, admin.id]
      );
    }

    // Registrar en auditoría
    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
       VALUES (?, 'PASSWORD_CHANGE_2FA', 'administrators', ?, ?)`,
      [
        admin.id,
        String(admin.id),
        JSON.stringify({ email: targetEmail, updatedUsername: !!newUsername }),
      ]
    );

    return NextResponse.json({
      success: true,
      message: '¡Contraseña actualizada exitosamente con autenticación 2FA!',
    });
  } catch (error: any) {
    console.error('Error verificando 2FA y actualizando contraseña:', error);
    return NextResponse.json(
      { error: 'Error al validar el código 2FA o actualizar la contraseña.' },
      { status: 500 }
    );
  }
}

