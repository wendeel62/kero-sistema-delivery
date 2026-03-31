const URL = 'https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/rpc/exec_sql';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY';

fetch(URL, {
  method: 'POST',
  headers: {
    'apikey': KEY,
    'Authorization': 'Bearer ' + KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: 'SELECT 1' })
})
.then(r => {
  console.log('Status:', r.status);
  return r.json();
})
.then(j => console.log('Response:', j))
.catch(e => console.error('Error:', e.message));
