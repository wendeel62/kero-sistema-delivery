import { supabase } from './supabase'

export async function syncCliente(nome: string, telefone: string, totalPedido: number, tenantId: string, enderecoEntrega?: string) {
  if (!telefone) return

  try {
    const telefoneLimpo = telefone.replace(/\D/g, '')

    const { data: existing, error: searchError } = await supabase
      .from('clientes')
      .select('*')
      .eq('telefone', telefoneLimpo)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (searchError) {
      console.error('[syncCliente] Erro ao buscar cliente:', searchError)
      return
    }

    if (existing) {
      const novoTotal = (existing.total_pedidos || 0) + 1
      const novoGasto = (existing.total_gasto || 0) + totalPedido
      let perfil: 'novo' | 'recorrente' | 'vip' = 'novo'
      if (novoTotal >= 10 || novoGasto >= 500) perfil = 'vip'
      else if (novoTotal >= 3) perfil = 'recorrente'

      const updateData: Record<string, unknown> = {
        nome: nome || existing.nome,
        total_pedidos: novoTotal,
        total_gasto: novoGasto,
        ultimo_pedido: new Date().toISOString(),
        perfil,
      }

      if (enderecoEntrega && !existing.enderecos?.some((e: { rua: string }) => e.rua === enderecoEntrega)) {
        updateData.enderecos = [...(existing.enderecos || []), { rua: enderecoEntrega, principal: existing.enderecos?.length === 0 }]
      }

      const { error: updateError } = await supabase
        .from('clientes')
        .update(updateData)
        .eq('id', existing.id)
        .eq('tenant_id', tenantId)

      if (updateError) {
        console.error('[syncCliente] Erro ao atualizar cliente:', updateError)
        return
      }

      console.log(`[syncCliente] Cliente atualizado: ${existing.nome} (${telefoneLimpo})`)
    } else {
      const enderecos = enderecoEntrega ? [{ rua: enderecoEntrega, principal: true }] : []

      const { error: insertError } = await supabase
        .from('clientes')
        .insert({
          tenant_id: tenantId,
          nome,
          telefone: telefoneLimpo,
          total_pedidos: 1,
          total_gasto: totalPedido,
          primeiro_pedido: new Date().toISOString(),
          ultimo_pedido: new Date().toISOString(),
          perfil: 'novo',
          enderecos,
          cashback: 0,
          pontos: 0,
        })

      if (insertError) {
        console.error('[syncCliente] Erro ao inserir cliente:', insertError)
        return
      }

      console.log(`[syncCliente] Novo cliente criado: ${nome} (${telefoneLimpo})`)
    }
  } catch (error) {
    console.error('[syncCliente] Erro inesperado:', error)
  }
}
