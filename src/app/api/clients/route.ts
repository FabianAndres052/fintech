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
      last_name = '',
      phone = '',
      email,
      address = '',
      city = 'Colombia',
      occupation,
      monthly_income = 0,
      notes,
    } = body;

    // Solo el nombre es obligatorio
    if (!first_name || !String(first_name).trim()) {
      return NextResponse.json(
        { error: 'El nombre del cliente es obligatorio.' },
        { status: 400 }
      );
    }

    const cleanDoc = document_number && String(document_number).trim() ? String(document_number).trim() : null;

    // Comprobar cédula duplicada si se proporciona
    if (cleanDoc) {
      const existing = await query<any[]>('SELECT id FROM clients WHERE document_number = ? LIMIT 1', [
        cleanDoc,
      ]);

      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'Ya existe un cliente registrado con ese número de documento.' },
          { status: 409 }
        );
      }
    }

    const insertResult = await query<any>(
      `INSERT INTO clients 
        (document_type, document_number, first_name, last_name, phone, email, address, city, occupation, monthly_income, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')`,
      [
        document_type || 'CC',
        cleanDoc,
        String(first_name).trim(),
        last_name ? String(last_name).trim() : '',
        phone ? String(phone).trim() : '',
        email ? String(email).trim() : null,
        address ? String(address).trim() : '',
        city ? String(city).trim() : 'Colombia',
        occupation ? String(occupation).trim() : null,
        Number(monthly_income) || 0,
        notes ? String(notes).trim() : null,
      ]
    );

    // Auditoría (no bloqueante)
    query(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        admin.id,
        'CREATE_CLIENT',
        'clients',
        String(insertResult.insertId),
        JSON.stringify({ name: `${first_name} ${last_name || ''}`.trim(), document_number: cleanDoc }),
      ]
    ).catch((err) => console.error('Error logging audit for client creation:', err));

    return NextResponse.json({
      success: true,
      message: 'Cliente registrado exitosamente.',
      clientId: insertResult.insertId,
    });
  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: error?.message || 'Error al registrar cliente.' }, { status: 500 });
  }
}
