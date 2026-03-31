import { supabase } from './supabase'

export async function syncCliente(nome: string, telefone: string, totalPedido: number) {
  if (!telefone) return

  const telefoneLimpo = telefone.replace(/\D/g, '')
  
  const { data: existing } = await supabase
    .from('clientes')
    .select('*')
    .eq('telefone', telefoneLimpo)
    .maybeSingle()

  if (existing) {
    const novoTotal = (existing.total_pedidos || 0) + 1
    const novoGasto = (existing.total_gasto || 0) + totalPedido
    let perfil: 'novo' | 'recorrente' | 'vip' = 'novo'
    if (novoTotal >= 10 || novoGasto >= 500) perfil = 'vip'
    else if (novoTotal >= 3) perfil = 'recorrente'

    await supabase
      .from('clientes')
      .update({
        nome: nome || existing.nome,
        total_pedidos: novoTotal,
        total_gasto: novoGasto,
        ultimo_pedido: new Date().toISOString(),
        perfil,
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('clientes')
      .insert({
        nome,
        telefone: telefoneLimpo,
        total_pedidos: 1,
        total_gasto: totalPedido,
        primeiro_pedido: new Date().toISOString(),
        ultimo_pedido: new Date().toISOString(),
        perfil: 'novo',
        enderecos: [],
        cashback: 0,
        pontos: 0,
      })
  }
}
