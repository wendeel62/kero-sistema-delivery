import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3'

const DebitarEstoqueInputSchema = z.object({
  pedido_id: z.string().uuid('pedido_id deve ser um UUID válido'),
  tenant_id: z.string().uuid('tenant_id deve ser um UUID válido'),
})

type DebitarEstoqueInput = z.infer<typeof DebitarEstoqueInputSchema>

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyJwt(req: Request): Promise<{ valid: boolean; userId: string; tenantId: string; error: string }> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, userId: '', tenantId: '', error: 'Missing or invalid authorization header' }
  }

  const token = authHeader.replace('Bearer ', '')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    return { valid: false, userId: '', tenantId: '', error: 'Server misconfiguration' }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return { valid: false, userId: '', tenantId: '', error: 'Invalid or expired token' }
  }

  const userId = data.user.id
  const tenantId = data.user.user_metadata?.tenant_id || userId

  return { valid: true, userId, tenantId, error: '' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const auth = await verifyJwt(req)
    if (!auth.valid) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', details: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const parsedInput = DebitarEstoqueInputSchema.safeParse(body)
    
    if (!parsedInput.success) {
      const errors = parsedInput.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      return new Response(JSON.stringify({ success: false, error: 'Validacao falhou', detalhes: errors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { pedido_id, tenant_id } = parsedInput.data

    if (tenant_id !== auth.tenantId) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden: tenant mismatch' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

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

    const consumoPorIngrediente: Record<string, number> = {}

    for (const item of itensPedido) {
      let query = supabaseAdmin
        .from('ficha_tecnica')
        .select('ingrediente_id, quantidade')
        .eq('produto_id', item.produto_id)
        .eq('tenant_id', tenant_id)

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

    for (const [ingrediente_id, quantidadeCalc] of Object.entries(consumoPorIngrediente)) {
      const { data: resultado } = await supabaseAdmin.rpc('decrementar_estoque', {
        ingrediente_id: ingrediente_id,
        quantidade: quantidadeCalc
      })
      
      if (resultado === false) {
        console.warn('Falha ao decrementar ingrediente: ' + ingrediente_id)
      }
    }

    const { data: ingredientesAtualizados, error: erroConsulta } = await supabaseAdmin
      .from('ingredientes')
      .select('id, nome, estoque_atual, estoque_minimo')
      .eq('tenant_id', tenant_id)
      .lt('estoque_atual', 'estoque_minimo')

    const alertas: string[] = []

    if (ingredientesAtualizados && ingredientesAtualizados.length > 0) {
      for (const ing of ingredientesAtualizados) {
        alertas.push(ing.nome)
        
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

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[debitar-estoque] ERRO:', message)
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
