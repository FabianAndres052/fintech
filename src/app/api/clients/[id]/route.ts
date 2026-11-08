import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const clientId = Number(id);

    const clients = await query<any[]>('SELECT * FROM clients WHERE id = ?', [clientId]);
    if (!clients || clients.length === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const client = clients[0];

    // Historial de préstamos del cliente
    const loans = await query<any[]>(
      `SELECT * FROM loans WHERE client_id = ? ORDER BY id DESC`,
      [clientId]
    );

    // Historial de pagos del cliente
    const payments = await query<any[]>(
      `SELECT p.*, l.loan_code, l.installments_count, l.balance_remaining as loan_balance, i.installment_number, i.due_date as installment_due_date 
       FROM payments p 
       JOIN loans l ON p.loan_id = l.id 
       LEFT JOIN installments i ON p.installment_id = i.id
       WHERE p.client_id = ? 
       ORDER BY p.id DESC`,
      [clientId]
    );

    return NextResponse.json({
      success: true,
      client,
      loans,
      payments,
    });
  } catch (error: any) {
    console.error('Error fetching client details:', error);
    return NextResponse.json({ error: 'Error al consultar detalles del cliente.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const clientId = Number(id);
    const body = await req.json();

    const {
      document_type,
      document_number,
      first_name,
      last_name,
      phone,
      email,
      address,
      city,
      occupation,
      monthly_income,
      notes,
      status,
    } = body;

    const currentRows = await query<any[]>('SELECT * FROM clients WHERE id = ?', [clientId]);
    if (!currentRows || currentRows.length === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    const cur = currentRows[0];

    const cleanDoc = document_number !== undefined
      ? (document_number && String(document_number).trim() ? String(document_number).trim() : null)
      : cur.document_number;

    if (cleanDoc) {
      const existing = await query<any[]>('SELECT id FROM clients WHERE document_number = ? AND id != ? LIMIT 1', [
        cleanDoc,
        clientId,
      ]);
      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'Ya existe otro cliente registrado con ese número de documento.' },
          { status: 409 }
        );
      }
    }

    const updatedFirstName = first_name !== undefined ? String(first_name).trim() : cur.first_name;
    const updatedLastName = last_name !== undefined ? String(last_name).trim() : cur.last_name;
    const updatedDocType = document_type !== undefined ? document_type : (cur.document_type || 'CC');
    const updatedPhone = phone !== undefined ? String(phone).trim() : cur.phone;
    const updatedEmail = email !== undefined ? (email ? String(email).trim() : null) : cur.email;
    const updatedAddress = address !== undefined ? String(address).trim() : cur.address;
    const updatedCity = city !== undefined ? String(city).trim() : cur.city;
    const updatedOccupation = occupation !== undefined ? String(occupation).trim() : cur.occupation;
    const updatedIncome = monthly_income !== undefined ? Number(monthly_income) : cur.monthly_income;
    const updatedNotes = notes !== undefined ? String(notes).trim() : cur.notes;
    const updatedStatus = status !== undefined ? status : cur.status;

    await query(
      `UPDATE clients SET
        document_type = ?,
        document_number = ?,
        first_name = ?,
        last_name = ?,
        phone = ?,
        email = ?,
        address = ?,
        city = ?,
        occupation = ?,
        monthly_income = ?,
        notes = ?,
        status = ?
       WHERE id = ?`,
      [
        updatedDocType,
        cleanDoc,
        updatedFirstName,
        updatedLastName,
        updatedPhone,
        updatedEmail,
        updatedAddress,
        updatedCity,
        updatedOccupation,
        updatedIncome,
        updatedNotes,
        updatedStatus,
        clientId,
      ]
    );

    // Registrar en auditoría
    await query(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [admin.id, 'UPDATE_CLIENT', 'clients', String(clientId), JSON.stringify(body)]
    );

    return NextResponse.json({ success: true, message: 'Cliente actualizado exitosamente.' });
  } catch (error: any) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Error al actualizar cliente.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const clientId = Number(id);

    // Comprobar si tiene préstamos activos
    const activeLoans = await query<any[]>(
      'SELECT id FROM loans WHERE client_id = ? AND status IN ("ACTIVO", "EN_MORA")',
      [clientId]
    );

    if (activeLoans.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar el cliente porque tiene préstamos activos vigentes.' },
        { status: 400 }
      );
    }

    await query('UPDATE clients SET status = "INACTIVO" WHERE id = ?', [clientId]);

    await query(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [admin.id, 'DEACTIVATE_CLIENT', 'clients', String(clientId), JSON.stringify({ status: 'INACTIVO' })]
    );

    return NextResponse.json({ success: true, message: 'Cliente inactivado correctamente.' });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Error al inactivar cliente.' }, { status: 500 });
  }
}
