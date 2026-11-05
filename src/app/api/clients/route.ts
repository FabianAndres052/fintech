import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';

    let sql = `
      SELECT 
        c.*,
        COUNT(CASE WHEN l.status IN ('ACTIVO', 'EN_MORA') THEN 1 END) as active_loans_count,
        COALESCE(SUM(l.capital_amount), 0) as total_borrowed,
        COALESCE(SUM(CASE WHEN l.status IN ('ACTIVO', 'EN_MORA') THEN l.balance_remaining ELSE 0 END), 0) as current_balance
      FROM clients c
      LEFT JOIN loans l ON c.id = l.client_id
    `;
    const params: any[] = [];

    if (search) {
      sql += ` WHERE c.document_number LIKE ? OR CONCAT(c.first_name, ' ', c.last_name) LIKE ? OR c.phone LIKE ?`;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    sql += ` GROUP BY c.id ORDER BY c.id DESC`;

    const clients = await query<any[]>(sql, params);

    return NextResponse.json({ success: true, clients });
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Error al consultar clientes.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      document_type = 'CC',
      document_number,
      first_name,
      last_name,
      phone,
      email,
      address,
      city = 'Colombia',
      occupation,
      monthly_income = 0,
      notes,
    } = body;

    if (!document_number || !first_name || !last_name || !phone || !address) {
      return NextResponse.json(
        { error: 'Cédula/Documento, nombres, apellidos, teléfono y dirección son obligatorios.' },
        { status: 400 }
      );
    }

    // Comprobar cédula duplicada
    const existing = await query<any[]>('SELECT id FROM clients WHERE document_number = ? LIMIT 1', [
      document_number.trim(),
    ]);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un cliente registrado con ese número de documento.' },
        { status: 409 }
      );
    }

    const insertResult = await query<any>(
      `INSERT INTO clients 
        (document_type, document_number, first_name, last_name, phone, email, address, city, occupation, monthly_income, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')`,
      [
        document_type,
        document_number.trim(),
        first_name.trim(),
        last_name.trim(),
        phone.trim(),
        email ? email.trim() : null,
        address.trim(),
        city ? city.trim() : 'Colombia',
        occupation ? occupation.trim() : null,
        Number(monthly_income) || 0,
        notes ? notes.trim() : null,
      ]
    );

    // Auditoría
    await query(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        admin.id,
        'CREATE_CLIENT',
        'clients',
        String(insertResult.insertId),
        JSON.stringify({ name: `${first_name} ${last_name}`, document_number }),
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Cliente registrado exitosamente.',
      clientId: insertResult.insertId,
    });
  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Error al registrar cliente.' }, { status: 500 });
  }
}
