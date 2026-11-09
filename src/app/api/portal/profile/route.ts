import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getClientFromRequest, hashPassword, comparePassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { password_hash, ...safeClient } = client as any;
    return NextResponse.json({ client: safeClient });
  } catch (error: any) {
    console.error('Error fetching portal profile:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      phone,
      email,
      address,
      city,
      payout_bank,
      payout_key_type,
      payout_key_value,
      current_password,
      new_password,
    } = body;

    // Si intenta cambiar contraseña
    if (new_password) {
      if (!current_password) {
        return NextResponse.json(
          { error: 'Debe ingresar su contraseña actual para establecer una nueva.' },
          { status: 400 }
        );
      }
      if (new_password.length < 6) {
        return NextResponse.json(
          { error: 'La nueva contraseña debe tener al menos 6 caracteres.' },
          { status: 400 }
        );
      }

      const [existingClient] = await query<any[]>('SELECT password_hash FROM clients WHERE id = ?', [client.id]);
      const isMatch = await comparePassword(current_password, existingClient[0]?.password_hash || '');
      if (!isMatch) {
        return NextResponse.json(
          { error: 'La contraseña actual ingresada es incorrecta.' },
          { status: 400 }
        );
      }

      const newHash = await hashPassword(new_password);
      await query('UPDATE clients SET password_hash = ? WHERE id = ?', [newHash, client.id]);
    }

    // Actualizar datos de contacto y recepción de transferencias
    await query(
      `UPDATE clients 
       SET phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           address = COALESCE(?, address),
           city = COALESCE(?, city),
           payout_bank = COALESCE(?, payout_bank),
           payout_key_type = COALESCE(?, payout_key_type),
           payout_key_value = COALESCE(?, payout_key_value),
           updated_at = NOW()
       WHERE id = ?`,
      [phone, email, address, city, payout_bank, payout_key_type, payout_key_value, client.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Perfil y datos de transferencia actualizados correctamente.',
    });
  } catch (error: any) {
    console.error('Error updating portal profile:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el perfil.' },
      { status: 500 }
    );
  }
}
