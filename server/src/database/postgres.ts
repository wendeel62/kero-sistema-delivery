import pkg from 'pg';
const { Pool } = pkg;

let pool: pkg.Pool;

export async function initializeDatabase() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Test connection
  const client = await pool.connect();
  console.log('Connected to Postgres');
  client.release();

  console.log('Database initialized (Evolution tables removed)');
}

export function getPool() {
  return pool;
}

