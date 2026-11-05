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
      `SELECT p.*, l.loan_code 
       FROM payments p 
       JOIN loans l ON p.loan_id = l.id 
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

    await query(
      `UPDATE clients SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        phone = COALESCE(?, phone),
        email = ?,
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        occupation = ?,
        monthly_income = ?,
        notes = ?,
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        first_name?.trim(),
        last_name?.trim(),
        phone?.trim(),
        email ? email.trim() : null,
        address?.trim(),
        city?.trim(),
        occupation ? occupation.trim() : null,
        monthly_income !== undefined ? Number(monthly_income) : 0,
        notes ? notes.trim() : null,
        status,
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
