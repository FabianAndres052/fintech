const fs = require('fs');
const mysql = require('mysql2/promise');

const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach((l) => {
  const idx = l.indexOf('=');
  if (idx !== -1 && !l.startsWith('#')) {
    let v = l.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[l.slice(0, idx).trim()] = v;
  }
});

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 4000,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  console.log('1. Creando / verificando tabla `receipts`...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      receipt_code VARCHAR(60) NOT NULL UNIQUE,
      client_id INT UNSIGNED NOT NULL,
      loan_id INT UNSIGNED NULL,
      payment_id INT UNSIGNED NULL,
      receipt_type ENUM('INDIVIDUAL', 'CONSOLIDADO') DEFAULT 'INDIVIDUAL',
      is_consolidated TINYINT(1) DEFAULT 0,
      receipt_date DATETIME NOT NULL,
      total_amount DECIMAL(15,2) NOT NULL,
      client_name VARCHAR(255) NOT NULL,
      client_phone VARCHAR(50) NULL,
      client_document VARCHAR(50) NULL,
      items_json JSON NOT NULL,
      summary_json JSON NULL,
      whatsapp_sent TINYINT(1) DEFAULT 0,
      whatsapp_sent_at DATETIME NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_receipt_client (client_id),
      INDEX idx_receipt_loan (loan_id),
      INDEX idx_receipt_code (receipt_code),
      INDEX idx_receipt_date (receipt_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('Tabla `receipts` lista.');

  // 2. Verificar y asegurar que cualquier cuota de Carlos Rueda para el 14 de noviembre esté estrictamente PENDIENTE
  console.log('2. Verificando cuotas del 14 de noviembre de Carlos Rueda...');
  // Si hubiera algún pago registrado erróneamente para la cuota 14-nov, se revierte:
  const [errPayments] = await pool.query(`
    SELECT p.* FROM payments p 
    JOIN installments i ON p.installment_id = i.id 
    JOIN loans l ON p.loan_id = l.id 
    WHERE l.client_id = 1 AND DATE(i.due_date) = '2026-11-14'
  `);
  if (errPayments.length > 0) {
    console.log(`Encontrados ${errPayments.length} pagos erróneos del 14 nov. Revertiendo...`);
    for (const p of errPayments) {
      await pool.query('DELETE FROM payments WHERE id = ?', [p.id]);
      await pool.query('DELETE FROM financial_movements WHERE reference_id = ?', [p.payment_code]);
    }
  }

  // Devolver las cuotas del 14 de noviembre a estado PENDIENTE
  await pool.query(`
    UPDATE installments i
    JOIN loans l ON i.loan_id = l.id
    SET i.status = 'PENDIENTE', i.paid_amount = 0, i.paid_date = NULL, i.capital_paid = 0, i.interest_paid = 0, i.balance = i.total_amount
    WHERE l.client_id = 1 AND DATE(i.due_date) = '2026-11-14'
  `);
  console.log('Cuotas del 14 de noviembre verificadas como PENDIENTE.');

  // 3. Registrar los 3 pagos legítimos de Carlos Rueda (si no están ya registrados):
  // Cuota 5 de PRE-00001 (7 nov, $87.000)
  // Cuota 1 de PRE-00003 (7 nov, $85.000)
  // Cuota 3 de PRE-00002 (8 nov, $85.000)
  console.log('3. Verificando registro de las 3 cuotas legítimas de Carlos Rueda...');

  const carlosTargetPayments = [
    {
      loanId: 1,
      loanCode: 'PRE-00001',
      instId: 5,
      instNum: 5,
      amount: 87000,
      cap: 66923.08,
      int: 20076.92,
      payDate: '2026-11-07 10:30:00',
      payCode: 'REC-PRE-00001-05',
      note: 'Pago cuota 5 de 12 - Carlos Rueda',
    },
    {
      loanId: 3,
      loanCode: 'PRE-00003',
      instId: 41,
      instNum: 1,
      amount: 85000,
      cap: 50000.00,
      int: 35000.00,
      payDate: '2026-11-07 10:35:00',
      payCode: 'REC-PRE-00003-01',
      note: 'Pago cuota 1 de 28 - Carlos Rueda',
    },
    {
      loanId: 2,
      loanCode: 'PRE-00002',
      instId: 15,
      instNum: 3,
      amount: 85000,
      cap: 50000.00,
      int: 35000.00,
      payDate: '2026-11-08 11:15:00',
      payCode: 'REC-PRE-00002-03',
      note: 'Pago cuota 3 de 28 - Carlos Rueda',
    },
  ];

  for (const item of carlosTargetPayments) {
    const [existing] = await pool.query('SELECT * FROM payments WHERE payment_code = ?', [item.payCode]);
    if (existing.length === 0) {
      console.log(`Registrando pago ${item.payCode} ($${item.amount})...`);
      // 1. Insert payment
      const [pRes] = await pool.query(
        `INSERT INTO payments 
          (payment_code, loan_id, client_id, installment_id, amount_paid, capital_paid, interest_paid, payment_method, payment_date, notes, created_by)
         VALUES (?, ?, 1, ?, ?, ?, ?, 'TRANSFERENCIA', ?, ?, 1)`,
        [item.payCode, item.loanId, item.instId, item.amount, item.cap, item.int, item.payDate, item.note]
      );

      // 2. Update installment
      await pool.query(
        `UPDATE installments SET 
          paid_amount = ?, 
          balance = 0, 
          capital_paid = ?, 
          interest_paid = ?, 
          status = 'PAGADA', 
          paid_date = ? 
         WHERE id = ?`,
        [item.amount, item.cap, item.int, item.payDate, item.instId]
      );

      // 3. Update loan
      await pool.query(
        `UPDATE loans SET 
          balance_remaining = balance_remaining - ?, 
          capital_collected = capital_collected + ?, 
          interest_collected = interest_collected + ? 
         WHERE id = ?`,
        [item.amount, item.cap, item.int, item.loanId]
      );

      // 4. Update cash balance
      const [cashRows] = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = "current_cash_balance"');
      const curCash = cashRows.length > 0 ? Number(cashRows[0].setting_value) : 15000000;
      const newCash = curCash + item.amount;
      await pool.query('UPDATE system_settings SET setting_value = ? WHERE setting_key = "current_cash_balance"', [String(newCash)]);

      // 5. Insert financial movement
      await pool.query(
        `INSERT INTO financial_movements 
          (movement_code, type, category, amount, capital_component, interest_component, payment_method, balance_after, description, reference_id, created_by)
         VALUES (?, 'COBRO_CUOTA', 'RECAUDO_PRESTAMO', ?, ?, ?, 'TRANSFERENCIA', ?, ?, ?, 1)`,
        [
          `MOV-${item.payCode}`,
          item.amount,
          item.cap,
          item.int,
          newCash,
          `Recaudo cuota ${item.instNum} (${item.loanCode}) - Carlos Rueda`,
          item.payCode,
        ]
      );
    } else {
      console.log(`Pago ${item.payCode} ya existía.`);
    }
  }

  // Sincronizar saldos exactos de los 3 préstamos de Carlos Rueda
  console.log('4. Sincronizando saldos acumulados de préstamos...');
  for (const lId of [1, 2, 3]) {
    const [instStats] = await pool.query(
      `SELECT 
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(capital_paid), 0) as cap_paid,
        COALESCE(SUM(interest_paid), 0) as int_paid,
        COALESCE(SUM(balance), 0) as remaining_balance
       FROM installments WHERE loan_id = ?`,
      [lId]
    );
    const stat = instStats[0];
    await pool.query(
      `UPDATE loans SET 
        balance_remaining = ?, 
        capital_collected = ?, 
        interest_collected = ? 
       WHERE id = ?`,
      [stat.remaining_balance, stat.cap_paid, stat.int_paid, lId]
    );
  }

  console.log('Saldos de Carlos Rueda perfectamente actualizados.');

  await pool.end();
}

main().catch(console.error);

