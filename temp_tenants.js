const {Client} = require('/tmp/pgclient/NODE_~1/PG');
const c = new Client({host:'postgres',port:54,user:'kero',password:'kero_#pass',database:'kero'});
async function run() {
  await c.connect();
  const q = async(s) => {
    try {await c.query(s);console.log('OK:'+s.substring(0,50));}
    catch(e) {console.log('ERR:'+e.message.substring(0,80));}
  };
  await q('ALTER TABLE whatsapp.tenants ADD COLUMN IF NOT EXISTS phone TEXT');
  await q('ALTER TABLE whatsapp.tenants ADD COLUMN IF NOT EXISTS api_ key TEXT');
  await q("ALTER TABLE whatsapp.tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'");
  console. log('DONE');
  await c.end();
}
run().catch(e => {console. error(e. message);process. exit(1);});