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

  // Create tables if they don't exist
  await createTables();
}

async function createTables() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS instances (
      id SERIAL PRIMARY KEY,
      instance_name VARCHAR(255) UNIQUE NOT NULL,
      status VARCHAR(50),
      qr_code TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      instance_id INTEGER REFERENCES instances(id),
      phone_number VARCHAR(20),
      message_text TEXT,
      direction VARCHAR(10),
      status VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      instance_id INTEGER REFERENCES instances(id),
      phone_number VARCHAR(20) UNIQUE,
      name VARCHAR(255),
      last_message_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const query of queries) {
    await pool.query(query);
  }

  console.log('Database tables initialized');
}

export function getPool() {
  return pool;
}
