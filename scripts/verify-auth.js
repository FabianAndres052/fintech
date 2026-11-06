const fs = require('fs');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

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
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 4000,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  const [rows] = await pool.query(
    'SELECT id, name, username, email, password_hash, role, is_active FROM administrators'
  );
  console.log('Admins in DB:');
  for (const r of rows) {
    console.log({
      id: r.id,
      name: r.name,
      username: r.username,
      email: r.email,
      role: r.role,
      active: r.is_active,
    });
    if (r.username === 'Fabian1105') {
      const match = await bcrypt.compare('Valderrama1105!', r.password_hash);
      console.log('Password match for Fabian1105 / Valderrama1105!:', match);
    }
  }

  await pool.end();
}

main().catch(console.error);
