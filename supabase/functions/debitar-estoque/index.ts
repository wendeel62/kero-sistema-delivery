import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pedido_id, tenant_id } = await req.json()
    
    if (!pedido_id || !tenant_id) {
      return new Response(JSON.stringify({ success: false, error: 'pedido_id e tenant_id sao obrigatorios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Buscar itens do pedido
    const { data: itensPedido, error: erroItens } = await supabaseAdmin
      .from('itens_pedido')
      .select('id, produto_id, quantidade, tamanho')
      .eq('pedido_id', pedido_id)
      .eq('tenant_id', tenant_id)

    if (erroItens) throw new Error('Erro ao buscar itens: ' + erroItens.message)
    if (!itensPedido || itensPedido.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Nenhum item encontrado para este pedido' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Mapear ingredientes por ficha tecnica
    const consumoPorIngrediente: Record<string, number> = {}

    for (const item of itensPedido) {
      // Buscar ficha tecnica do produto
      let query = supabaseAdmin
        .from('ficha_tecnica')
        .select('ingrediente_id, quantidade')
        .eq('produto_id', item.produto_id)
        .eq('tenant_id', tenant_id)

      // Se item tiver tamanho, filtrar por tamanho
      if (item.tamanho) {
        query = query.eq('tamanho', item.tamanho)
      }

      const { data: ficha, error: erroFicha } = await query

      if (erroFicha) throw new Error('Erro ao buscar ficha tecnica: ' + erroFicha.message)

      if (ficha && ficha.length > 0) {
        for (const ft of ficha) {
          const ingId = ft.ingrediente_id
          const qtdItem = Number(item.quantidade) || 1
          const qtdFt = Number(ft.quantidade) || 0
          consumoPorIngrediente[ingId] = (consumoPorIngrediente[ingId] || 0) + (qtdItem * qtdFt)
        }
      }
    }

    // Executar updates em ingredientes
    for (const [ingrediente_id, quantidadeCalc] of Object.entries(consumoPorIngrediente)) {
      const { data: resultado } = await supabaseAdmin.rpc('decrementar_estoque', {
        ingrediente_id: ingrediente_id,
        quantidade: quantidadeCalc
      })
      
      if (resultado === false) {
        console.warn('Falha ao decrementar ingrediente: ' + ingrediente_id)
      }
    }

    // Verificar estoque critico
    const { data: ingredientesAtualizados, error: erroConsulta } = await supabaseAdmin
      .from('ingredientes')
      .select('id, nome, quantidade_atual, quantidade_minima')
      .eq('tenant_id', tenant_id)
      .lt('quantidade_atual', 'quantidade_minima')

    const alertas: string[] = []

    if (ingredientesAtualizados && ingredientesAtualizados.length > 0) {
      for (const ing of ingredientesAtualizados) {
        alertas.push(ing.nome)
        
        // Inserir notificacao
        const { error: erroNotif } = await supabaseAdmin
          .from('notificacoes')
          .insert({
            tenant_id: tenant_id,
            tipo: 'estoque_critico',
            titulo: 'Estoque critico',
            mensagem: ing.nome + ' abaixo do minimo',
            lida: false
          })

        if (erroNotif) {
          console.warn('Erro ao inserir notificacao para ' + ing.nome + ': ' + erroNotif.message)
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      alertas 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('[debitar-estoque] ERRO:', err.message)
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
