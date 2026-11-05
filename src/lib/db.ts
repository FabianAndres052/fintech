import mysql from 'mysql2/promise';

interface GlobalWithPool {
  mysqlPool?: mysql.Pool;
}

const globalForDb = global as unknown as GlobalWithPool;

export function getPool(): mysql.Pool {
  if (!globalForDb.mysqlPool) {
    const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

    if (databaseUrl) {
      // Soporte directo para cadenas completas de conexión (TiDB Cloud, Railway, Aiven, Vercel Storage)
      globalForDb.mysqlPool = mysql.createPool(databaseUrl);
    } else {
      const host = process.env.DB_HOST || '127.0.0.1';
      const port = Number(process.env.DB_PORT) || 3306;
      const user = process.env.DB_USER || 'root';
      const password = process.env.DB_PASSWORD || '';
      const database = process.env.DB_NAME || 'prestamos_db';
      const isSsl = process.env.DB_SSL === 'true';

      globalForDb.mysqlPool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 15,
        maxIdle: 10,
        idleTimeout: 60000,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        ssl: isSsl ? { rejectUnauthorized: false } : undefined,
      });
    }
  }
  return globalForDb.mysqlPool;
}

/**
 * Ejecuta una consulta SQL estándar
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const p = getPool();
  const [rows] = await p.query(sql, params);
  return rows as T;
}

/**
 * Ejecuta un bloque de operaciones dentro de una transacción ACID en MySQL
 */
export async function withTransaction<T>(
  callback: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Sincroniza automáticamente los estados de mora de cuotas y préstamos en tiempo real
 */
export async function syncOverdueStatus(): Promise<void> {
  try {
    // 1. Marcar cuotas vencidas cuya fecha sea anterior a hoy y no estén completamente pagadas
    await query(`
      UPDATE installments 
      SET status = 'VENCIDA' 
      WHERE due_date < CURDATE() AND status IN ('PENDIENTE', 'PARCIAL')
    `);

    // 2. Marcar préstamos en mora si tienen al menos una cuota vencida
    await query(`
      UPDATE loans l
      SET l.status = 'EN_MORA'
      WHERE l.status = 'ACTIVO' AND EXISTS (
        SELECT 1 FROM installments i 
        WHERE i.loan_id = l.id AND i.status = 'VENCIDA'
      )
    `);

    // 3. Devolver a ACTIVO préstamos en mora cuyas cuotas ya no estén vencidas (si fueron canceladas o regularizadas)
    await query(`
      UPDATE loans l
      SET l.status = 'ACTIVO'
      WHERE l.status = 'EN_MORA' AND NOT EXISTS (
        SELECT 1 FROM installments i 
        WHERE i.loan_id = l.id AND i.status = 'VENCIDA'
      )
    `);
  } catch (error) {
    console.error('Error sincronizando estados de mora:', error);
  }
}
