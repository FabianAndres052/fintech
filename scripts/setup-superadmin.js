const fs = require('fs');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// 1. Cargar .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    process.env[key] = val;
  }
});

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  let pool;

  if (databaseUrl) {
    const isSsl =
      process.env.DB_SSL === 'true' ||
      databaseUrl.includes('tidbcloud') ||
      databaseUrl.includes('aiven') ||
      databaseUrl.includes('ssl=');

    pool = mysql.createPool({
      uri: databaseUrl,
      waitForConnections: true,
      connectionLimit: 5,
      ssl: isSsl ? { rejectUnauthorized: false } : undefined,
    });
  } else {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'prestamos_db',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  }

  console.log('Conectando a la base de datos MySQL / TiDB Cloud...');

  // 1. Verificar y actualizar Administrador Normal a artulio213@gmail.com y rol 'ADMIN'
  const [admins] = await pool.query(
    'SELECT id, name, username, email, role FROM administrators ORDER BY id ASC'
  );
  console.log('Administradores actuales:', admins);

  if (admins.length > 0) {
    const normalAdmin = admins.find((a) => a.username === 'AnaPosada55' || a.id === 1) || admins[0];
    await pool.query(
      'UPDATE administrators SET email = ?, role = "ADMIN", updated_at = NOW() WHERE id = ?',
      ['artulio213@gmail.com', normalAdmin.id]
    );
    console.log(`Administrador normal (ID: ${normalAdmin.id}) actualizado a: artulio213@gmail.com, ROL: ADMIN`);
  }

  // 2. Crear o actualizar Super Administrador Fabian1105
  const superPasswordHash = await bcrypt.hash('Valderrama1105!', 10);
  const [existingSuper] = await pool.query(
    'SELECT id, username FROM administrators WHERE username = ? OR email = ? LIMIT 1',
    ['Fabian1105', 'fabian1105@fintech.com']
  );

  if (existingSuper.length > 0) {
    await pool.query(
      `UPDATE administrators SET 
        name = ?, 
        username = ?, 
        email = ?, 
        password_hash = ?, 
        role = 'SUPERADMIN', 
        is_active = 1, 
        updated_at = NOW() 
       WHERE id = ?`,
      [
        'Fabián Andrés Martínez Valderrama',
        'Fabian1105',
        'fabian1105@fintech.com',
        superPasswordHash,
        existingSuper[0].id,
      ]
    );
    console.log(`Super Administrador Fabian1105 (ID: ${existingSuper[0].id}) actualizado con éxito.`);
  } else {
    const [insertResult] = await pool.query(
      `INSERT INTO administrators 
        (name, username, email, password_hash, role, is_active) 
       VALUES (?, ?, ?, ?, 'SUPERADMIN', 1)`,
      [
        'Fabián Andrés Martínez Valderrama',
        'Fabian1105',
        'fabian1105@fintech.com',
        superPasswordHash,
      ]
    );
    console.log(`Super Administrador Fabian1105 creado exitosamente con ID: ${insertResult.insertId}.`);
  }

  // 3. Verificar saldo de caja en system_settings
  const [cashRows] = await pool.query(
    'SELECT setting_value FROM system_settings WHERE setting_key = "current_cash_balance" LIMIT 1'
  );
  console.log('Saldo de caja en system_settings:', cashRows[0]?.setting_value);

  // 4. Registrar evento en audit_logs
  await pool.query(
    `INSERT INTO audit_logs (action, entity, entity_id, details) 
     VALUES ('SETUP_SUPERADMIN_ROLE', 'administrators', 'SYSTEM', ?)`,
    [JSON.stringify({ updatedAdmin: 'artulio213@gmail.com', superAdmin: 'Fabian1105' })]
  );

  console.log('Migración completada exitosamente.');
  await pool.end();
}

main().catch((err) => {
  console.error('Error en setup:', err);
  process.exit(1);
});

