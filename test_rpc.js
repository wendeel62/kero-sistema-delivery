import { createPgClient } from './scripts/_env.mjs';

const client = createPgClient();

client.connect()
  .then(() => client.query('SELECT 1 AS ok'))
  .then((result) => console.log('Resultado:', result.rows[0]))
  .finally(() => client.end())
  .catch((error) => console.error('Error:', error.message));
