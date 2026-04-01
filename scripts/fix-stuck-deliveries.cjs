const { Client } = require('pg')
const { createPgClient } = require('./_env.cjs')

const client = createPgClient()

async function run() {
  await client.connect()
  console.log('Conectado!')

  // Verificar pedidos com status 'saiu_entrega' que têm motoboy_id
  const { rows: pedidos } = await client.query(`
    SELECT id, numero, status, motoboy_id 
    FROM pedidos 
    WHERE status = 'saiu_entrega' AND motoboy_id IS NOT NULL
  `)
  console.log('Pedidos saiu_entrega com motoboy:', pedidos.length)

  // Verificar entregas com status 'atribuido' ou 'coletado'
  const { rows: entregas } = await client.query(`
    SELECT e.id, e.pedido_id, e.motoboy_id, e.status as entrega_status, p.status as pedido_status, p.numero
    FROM entregas e
    LEFT JOIN pedidos p ON e.pedido_id = p.id
    WHERE e.status IN ('atribuido', 'coletado')
  `)
  console.log('\nEntregas ativas:', entregas.length)

  // Corrigir: Se pedido foi entregue mas entrega ainda está ativa
  for (const e of entregas) {
    if (e.pedido_status === 'entregue') {
      console.log('\nCorrigindo entrega', e.id, '- Pedido já foi entregue')
      
      // Atualizar entrega para entregue
      await client.query(`
        UPDATE entregas 
        SET status = 'entregue', entregue_em = NOW() 
        WHERE id = $1
      `, [e.id])
      
      // Liberar motoboy
      if (e.motoboy_id) {
        await client.query(`
          UPDATE motoboys 
          SET status = 'disponivel', disponivel = true 
          WHERE id = $1
        `, [e.motoboy_id])
        console.log(' - Motoboy liberado para a entrega corrigida')
      }
    }
  }

  // Verificar novamente
  const { rows: entregasDepois } = await client.query(`
    SELECT e.id, e.pedido_id, e.status as entrega_status, p.status as pedido_status, p.numero
    FROM entregas e
    LEFT JOIN pedidos p ON e.pedido_id = p.id
    WHERE e.status IN ('atribuido', 'coletado')
  `)
  console.log('\nEntregas ativas após correção:', entregasDepois.length)

  await client.end()
  console.log('\nPRONTO!')
}

run().catch(e => console.error('ERRO:', e.message))
