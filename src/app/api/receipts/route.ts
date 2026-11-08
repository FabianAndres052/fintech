import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function parseJsonField(val: any) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const code = searchParams.get('code');
    const clientId = searchParams.get('clientId');
    const loanId = searchParams.get('loanId');
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const date = searchParams.get('date');
    const limit = Number(searchParams.get('limit')) || 100;

    let sql = 'SELECT * FROM receipts WHERE 1=1';
    const params: any[] = [];

    if (id) {
      sql += ' AND id = ?';
      params.push(Number(id));
    }
    if (code) {
      sql += ' AND receipt_code = ?';
      params.push(code.trim());
    }
    if (clientId) {
      sql += ' AND client_id = ?';
      params.push(Number(clientId));
    }
    if (loanId) {
      sql += ' AND loan_id = ?';
      params.push(Number(loanId));
    }
    if (type && ['INDIVIDUAL', 'CONSOLIDADO'].includes(type.toUpperCase())) {
      sql += ' AND receipt_type = ?';
      params.push(type.toUpperCase());
    }
    if (date) {
      sql += ' AND DATE(receipt_date) = ?';
      params.push(date.trim());
    }
    if (search) {
      const s = `%${search.trim()}%`;
      sql += ' AND (receipt_code LIKE ? OR client_name LIKE ? OR client_document LIKE ? OR notes LIKE ?)';
      params.push(s, s, s, s);
    }

    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(limit);

    const rows = await query<any[]>(sql, params);

    const receipts = rows.map((r) => ({
      ...r,
      items: parseJsonField(r.items_json) || [],
      summary: parseJsonField(r.summary_json) || {},
    }));

    const response = NextResponse.json({ success: true, receipts });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error: any) {
    console.error('Error in GET /api/receipts:', error);
    return NextResponse.json({ error: 'Error al consultar recibos.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { client_id, payment_ids, notes } = body;

    if (!client_id) {
      return NextResponse.json({ error: 'Se requiere el ID del cliente.' }, { status: 400 });
    }

    if (!Array.isArray(payment_ids) || payment_ids.length < 2) {
      return NextResponse.json({ error: 'Un recibo consolidado debe incluir al menos 2 pagos.' }, { status: 400 });
    }

    const receiptResult = await withTransaction(async (conn) => {
      // 1. Obtener cliente
      const [cRows]: any = await conn.query('SELECT * FROM clients WHERE id = ?', [client_id]);
      if (cRows.length === 0) throw new Error('Cliente no encontrado.');
      const client = cRows[0];
      const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim();

      // 2. Obtener los pagos seleccionados
      const placeholders = payment_ids.map(() => '?').join(',');
      const [payments]: any = await conn.query(
        `SELECT 
          p.*,
          l.loan_code,
          l.total_amount as loan_total,
          l.balance_remaining as loan_balance,
          l.installments_count,
          i.installment_number,
          i.due_date as inst_due_date
        FROM payments p
        JOIN loans l ON p.loan_id = l.id
        LEFT JOIN installments i ON p.installment_id = i.id
        WHERE p.id IN (${placeholders}) AND p.client_id = ?
        ORDER BY p.id ASC`,
        [...payment_ids, client_id]
      );

      if (payments.length !== payment_ids.length) {
        throw new Error('Uno o más pagos no pertenecen a este cliente o no existen.');
      }

      // 3. Generar número de recibo consolidado único
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const [countRows]: any = await conn.query(
        'SELECT COUNT(*) as countToday FROM receipts WHERE receipt_type = "CONSOLIDADO" AND DATE(created_at) = CURDATE()'
      );
      const seq = (countRows[0]?.countToday || 0) + 1;
      const receiptCode = `CON-${dateStr}-${String(seq).padStart(3, '0')}`;

      let totalReceived = 0;
      let totalRemainingAllLoans = 0;
      const items: any[] = [];

      for (const p of payments) {
        totalReceived += Number(p.amount_paid);

        const [accumRows]: any = await conn.query(
          'SELECT COALESCE(SUM(amount_paid), 0) as accum FROM payments WHERE loan_id = ? AND id <= ?',
          [p.loan_id, p.id]
        );
        const accumPaid = Number(accumRows[0]?.accum || p.amount_paid);
        const remBal = Math.max(0, Number(p.loan_total) - accumPaid);
        totalRemainingAllLoans += remBal;

        const isFreeDebt = !p.installment_id;
        const totalInsts = p.installments_count ? Number(p.installments_count) : null;
        const remainingInsts = isFreeDebt || !totalInsts ? null : Math.max(0, totalInsts - (p.installment_number || 0));

        items.push({
          loanId: p.loan_id,
          loanCode: p.loan_code,
          installmentId: p.installment_id,
          installmentNumber: p.installment_number || null,
          totalInstallments: totalInsts,
          remainingInstallments: remainingInsts,
          amountPaid: Number(p.amount_paid),
          capitalPaid: Number(p.capital_paid || 0),
          interestPaid: Number(p.interest_paid || 0),
          remainingBalance: remBal,
          totalAccumulatedPaid: accumPaid,
          dueDate: p.inst_due_date ? new Date(p.inst_due_date).toISOString().slice(0, 10) : null,
          isFreeDebt,
          notes: p.notes,
        });
      }

      const summary = {
        totalReceived,
        totalBalanceRemaining: totalRemainingAllLoans,
        loansCount: items.length,
        paymentMethod: payments[0]?.payment_method || 'TRANSFERENCIA',
        description: 'Recibo consolidado de pagos múltiples',
      };

      const [insRes]: any = await conn.query(
        `INSERT INTO receipts 
          (receipt_code, client_id, loan_id, payment_id, receipt_type, is_consolidated, receipt_date, total_amount, client_name, client_phone, client_document, items_json, summary_json, notes)
         VALUES (?, ?, NULL, NULL, 'CONSOLIDADO', 1, NOW(), ?, ?, ?, ?, ?, ?, ?)`,
        [
          receiptCode,
          client_id,
          totalReceived,
          clientName,
          client.phone || null,
          client.document_number || null,
          JSON.stringify(items),
          JSON.stringify(summary),
          notes ? notes.trim() : `Recibo consolidado de ${items.length} pagos`,
        ]
      );

      // Auditoría sin duplicar movimientos financieros
      await conn.query(
        'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [
          admin.id,
          'CREATE_CONSOLIDATED_RECEIPT',
          'receipts',
          String(insRes.insertId),
          JSON.stringify({ receiptCode, clientName, totalReceived, itemsCount: items.length, paymentIds: payment_ids }),
        ]
      );

      return {
        id: insRes.insertId,
        receipt_code: receiptCode,
        client_id,
        receipt_type: 'CONSOLIDADO',
        is_consolidated: 1,
        total_amount: totalReceived,
        client_name: clientName,
        client_phone: client.phone,
        client_document: client.document_number,
        items,
        summary,
        notes,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Recibo consolidado ${receiptResult.receipt_code} generado exitosamente.`,
      receipt: receiptResult,
    });
  } catch (error: any) {
    console.error('Error creating consolidated receipt:', error);
    return NextResponse.json({ error: error.message || 'Error al generar recibo consolidado.' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { receiptId, whatsapp_sent = true } = body;

    if (!receiptId) {
      return NextResponse.json({ error: 'receiptId es requerido.' }, { status: 400 });
    }

    await query(
      'UPDATE receipts SET whatsapp_sent = ?, whatsapp_sent_at = NOW() WHERE id = ?',
      [whatsapp_sent ? 1 : 0, Number(receiptId)]
    );

    return NextResponse.json({
      success: true,
      message: 'Estado de WhatsApp actualizado correctamente.',
    });
  } catch (error: any) {
    console.error('Error updating receipt:', error);
    return NextResponse.json({ error: 'Error al actualizar recibo.' }, { status: 500 });
  }
}

