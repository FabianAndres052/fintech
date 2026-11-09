import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { comparePassword, signClientToken } from '@/lib/auth';
import { Client } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = (body.identifier || body.phone || body.document || body.email || '').trim();
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Debe ingresar su número de documento o celular y contraseña.' },
        { status: 400 }
      );
    }

    // Normalizar números telefónicos (quitar espacios, guiones, +57)
    const cleanPhone = identifier.replace(/\D/g, '');
    const cleanPhoneWith57 = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
    const cleanPhoneWithout57 = cleanPhone.startsWith('57') ? cleanPhone.slice(2) : cleanPhone;

    // Buscar por documento, celular (variantes) o email
    const clients = await query<any[]>(
      `SELECT * FROM clients 
       WHERE (
         document_number = ? 
         OR phone = ? 
         OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') = ?
         OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') = ?
         OR LOWER(email) = LOWER(?)
       ) LIMIT 1`,
      [identifier, identifier, cleanPhoneWithout57, cleanPhoneWith57, identifier]
    );

    if (!clients || clients.length === 0) {
      return NextResponse.json(
        { error: 'Credenciales inválidas. Verifique su número de documento o celular.' },
        { status: 401 }
      );
    }

    const client = clients[0];

    if (client.status !== 'ACTIVO') {
      return NextResponse.json(
        { error: 'Su cuenta se encuentra inactiva o suspendida. Comuníquese con FINTECH.' },
        { status: 403 }
      );
    }

    if (!client.portal_access) {
      return NextResponse.json(
        { error: 'El acceso al portal de clientes no está habilitado para su cuenta. Contacte a soporte.' },
        { status: 403 }
      );
    }

    if (!client.password_hash) {
      return NextResponse.json(
        { error: 'Su cuenta aún no tiene contraseña asignada. Solicite al administrador activar su acceso.' },
        { status: 400 }
      );
    }

    const isValid = await comparePassword(password, client.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta. Verifique e intente nuevamente.' },
        { status: 401 }
      );
    }

    // Actualizar last_login
    query('UPDATE clients SET last_login = NOW() WHERE id = ?', [client.id]).catch(() => {});

    // Registrar en auditoría
    query(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [
        client.id,
        'CLIENT_PORTAL_LOGIN',
        'clients',
        String(client.id),
        JSON.stringify({ clientName: `${client.first_name} ${client.last_name || ''}`.trim() }),
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    ).catch(() => {});

    const token = signClientToken({
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      phone: client.phone,
      document_number: client.document_number,
    });

    const safeClient: Partial<Client> = {
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      document_number: client.document_number,
      document_type: client.document_type,
      phone: client.phone,
      email: client.email,
      address: client.address,
      city: client.city,
      status: client.status,
      payout_bank: client.payout_bank,
      payout_key_type: client.payout_key_type,
      payout_key_value: client.payout_key_value,
      avatar_url: client.avatar_url,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      client: safeClient,
      token,
    });

    const isHttps = req.headers.get('x-forwarded-proto') === 'https';
    response.cookies.set('client_token', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 días
    });

    return response;
  } catch (error: any) {
    console.error('Error en portal login:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error en el servidor al autenticar.' },
      { status: 500 }
    );
  }
}
