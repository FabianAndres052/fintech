import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { getClientFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const loanId = Number(body.loan_id);
    const installmentId = body.installment_id ? Number(body.installment_id) : null;
    const amount = Number(body.amount);
    const paymentType = body.payment_type === 'ABONO' ? 'ABONO' : 'CUOTA';

    if (!loanId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Parámetros de pago inválidos.' }, { status: 400 });
    }

    // Verificar que el préstamo pertenezca a este cliente
    const [loans] = await query<any[]>('SELECT * FROM loans WHERE id = ? AND client_id = ? LIMIT 1', [loanId, client.id]);
    if (!loans || loans.length === 0) {
      return NextResponse.json({ error: 'El crédito no existe o no pertenece a este cliente.' }, { status: 404 });
    }

    const loan = loans[0];

    // Verificar cuota si aplica
    let installmentNumber = null;
    if (installmentId) {
      const [inst] = await query<any[]>('SELECT * FROM installments WHERE id = ? AND loan_id = ? LIMIT 1', [installmentId, loanId]);
      if (inst && inst.length > 0) {
        installmentNumber = inst[0].installment_number;
      }
    }

    // Generar orden única de Bold
    const orderId = `BOLD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Bold keys (configuración por entorno)
    const boldApiKey = process.env.BOLD_API_KEY || 'sandbox_bold_api_key_fintech_colombia';
    const boldSecretKey = process.env.BOLD_SECRET_KEY || 'sandbox_bold_secret_key_fintech';
    const boldIntegritySecret = process.env.BOLD_INTEGRITY_SECRET || boldSecretKey;

    // Calcular hash de integridad SHA256: orderId + amount + COP + secret
    const hashString = `${orderId}${amount.toFixed(2)}COP${boldIntegritySecret}`;
    const integritySignature = crypto.createHash('sha256').update(hashString).digest('hex');

    // Registrar en tabla bold_payments
    await query(
      `INSERT INTO bold_payments 
       (order_id, client_id, loan_id, installment_id, amount, payment_type, status, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
      [
        orderId,
        client.id,
        loanId,
        installmentId,
        amount,
        paymentType,
        JSON.stringify({
          loanCode: loan.loan_code,
          installmentNumber,
          clientName: `${client.first_name} ${client.last_name || ''}`.trim(),
          clientPhone: client.phone,
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      orderId,
      amount,
      currency: 'COP',
      integritySignature,
      boldApiKey,
      paymentType,
      loanCode: loan.loan_code,
      installmentNumber,
      client: {
        name: `${client.first_name} ${client.last_name || ''}`.trim(),
        email: client.email || 'cliente@fintech.com',
        phone: client.phone || '3000000000',
        document: client.document_number || '12345678',
      },
    });
  } catch (error: any) {
    console.error('Error initiating Bold payment:', error);
    return NextResponse.json({ error: 'Error al iniciar pago en Bold.' }, { status: 500 });
  }
}
