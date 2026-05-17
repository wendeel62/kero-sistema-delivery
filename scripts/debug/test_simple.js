const {Client}=require("/tmp/pgclient/node_modules/pg");
const c=new Client({host:"postgres",port:54,user:"kero",password:"kero_pass",database:"kero"});
c.connect().then(()=>c.query("SELECT 1")).then((r)=>{console.log("WORKS");c.end();}).catch((e)=>{console.log("ERR:"+e.message);});