const {Client} = require('/tmp/pgclient/node_modules/pg');
const c = new Client({host:'postgres',port:5432,user:'kero',password:'kero_pass',database:'kero'});
async function run() {
  await c.connect();
  const q = async(s)=>{try{await c.query(s);console.log('OK: '+s.substring(0,50));}catch(e){console.log('ERR: '+e.message.substring(0,80));}};
  await q("CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $x$ BEGIN NEW.updated_at=NOW(); RETURN NEW; END; $x$ LANGUAGE plpgsql");
  await q('CREATE TRIGGER dev_updated BEFORE UPDATE ON whatsapp_devices FOR EACH ROW EXECUTE PROCEDURE set_updated_at()');
  await q('CREATE TRIGGER conv_updated BEFORE UPDATE ON whatsapp_conversations FOR EACH ROW EXECUTE PROCEDURE set_updated_at()');
  await q('CREATE TRIGGER cts_updated BEFORE UPDATE ON whatsapp_contacts FOR EACH ROW EXECUTE PROCEDURE set_updated_at()');
  await q("CREATE OR REPLACE FUNCTION update_conv_lastmsg() RETURNS TRIGGER AS $x$ BEGIN UPDATE whatsapp_conversations SET last_message_id=NEW.id,last_message_at=NEW.timestamp WHERE id=NEW.conversation_id AND (last_message_at IS NULL OR last_message_at<NEW.timestamp); RETURN NEW; END; $x$ LANGUAGE plpgsql");
  await q('CREATE TRIGGER msg_update_conv AFTER INSERT ON whatsapp_messages FOR EACH ROW EXECUTE PROCEDURE update_conv_lastmsg()');
  await q("CREATE OR REPLACE FUNCTION inc_unread() RETURNS TRIGGER AS $x$ BEGIN IF NEW.direction='inbound' AND NEW.from_me=false THEN UPDATE whatsapp_conversations SET unread_count=unread_count+1 WHERE id=NEW.conversation_id; END IF; RETURN NEW; END; $x$ LANGUAGE plpgsql");
  await q('CREATE TRIGGER msg_inc_unread AFTER INSERT ON whatsapp_messages FOR EACH ROW EXECUTE PROCEDURE inc_unread()');
  console.log('TRIGGERS DONE');
  await c.end();
}
run().catch(e=>{console.error(e.message);process.exit(1);});