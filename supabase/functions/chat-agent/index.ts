import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  messages: Array<{ role: string; content: string }>
  userId?: string
  storeId?: string
  context?: {
    isFirstAccess: boolean
    hasProducts: boolean
    hasDeliveryConfig: boolean
    todayRevenue: number
    totalOrders: number
    products: Array<{ id: string; name: string; price: number; category: string; active: boolean }>
    categories: Array<{ id: string; nome: string }>
    settings?: {
      nome_loja?: string
      telefone?: string
      endereco?: string
      cidade?: string
      estado?: string
      horario_abertura?: string
      horario_fechamento?: string
      loja_aberta?: boolean
      taxa_entrega?: number
      pedido_minimo?: number
      aceita_pix?: boolean
      acepta_cartao?: boolean
      acepta_dinheiro?: boolean
    }
  }
  pendingAction?: {
    type: string
    confirmed: boolean
    data: Record<string, unknown>
  }
}

function buildSystemPrompt(ctx: RequestBody['context']): string {
  const s = ctx?.settings
  return `Você é Alex, assistente autônomo do KERO Delivery — plataforma de cardápio digital para restaurantes e lanchonetes.

DADOS ATUAIS DA LOJA:
${s ? `- Nome: ${s.nome_loja || 'não cadastrado'}
- Telefone: ${s.telefone || 'não cadastrado'}
- Endereço: ${s.endereco || 'não cadastrado'}, ${s.cidade || ''}-${s.estado || ''}
- Horário: ${s.horario_abertura || '--:--'} às ${s.horario_fechamento || '--:--'}
- Status: ${s.loja_aberta ? '🟢 ABERTA' : '🔴 FECHADA'}
- Taxa entrega: R$ ${s.taxa_entrega ?? 0}
- Pedido mínimo: R$ ${s.pedido_minimo ?? 0}
- Pagamentos: ${s.aceita_pix ? 'PIX ' : ''}${s.aceita_cartao ? 'Cartão ' : ''}${s.aceita_dinheiro ? 'Dinheiro' : ''}` : '(sem configurações)'}

PRODUTOS CADASTRADOS (${ctx?.products?.length || 0}):
${ctx?.products?.length ? ctx.products.map(p => `${p.name} - R$ ${p.price.toFixed(2)} (${p.active ? 'ativo' : 'inativo'})`).join(', ') : 'Nenhum produto no cardápio'}

CATEGORIAS:
${ctx?.categories?.length ? ctx.categories.map(c => c.nome).join(', ') : 'Nenhuma categoria'}

SUAS CAPACIDADES (SEMPRE peça confirmação):
1. **Configurar loja**: nome, telefone, endereço, cidade, estado
2. **Horário de funcionamento**: abrir/fechar, horário início e fim
3. **Delivery**: taxa de entrega, pedido mínimo, raio de entrega
4. **Formas de pagamento**: PIX, cartão, dinheiro
5. **Abrir/fechar loja**: Alternar status da loja rapidamente
6. **Criar produto**: Nome, preço, categoria
7. **Editar produto**: Preço, ativar/desativar

REGRAS:
- Para CADAÇÃO pediNformações específicas, depois mostre a confirmação
- Quando quiseralterar algo, responda APENAS com JSON:
  { "message": "...", "action": { "type": "ação", "data": {...} } }
- Types disponíveis: update_store_settings, update_delivery_settings, update_opening_hours, update_payment_methods, toggle_store_open, create_product, update_price, toggle_product
- data deve conter APENAS os campos que serão alterados (não precisa enviar tudo)
- Fale em português brasileiro, seja direto e consultivo

${ctx?.isFirstAccess ? `ONBOARDING - Primeiro Acesso:
1. Boas-vindas
2. Pedir nome da loja, telefone, endereço
3. Configurar horário de funcionamento
4. Configurar taxa de entrega
5. Criar primeiro produto
Guide uma coisas de cada vez!` : ''}
`
}

async function executeAction(
  action: NonNullable<RequestBody['pendingAction']>,
  tenantId: string,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  if (!action.confirmed) return 'Ação cancelada.'

  switch (action.type) {
    case 'create_product': {
      const { data: lastProduct } = await supabase
        .from('produtos')
        .select('ordem')
        .eq('tenant_id', tenantId)
        .order('ordem', { ascending: false })
        .limit(1)
        .maybeSingle()
      const nextOrder = (lastProduct?.ordem ?? -1) + 1

      await supabase.from('produtos').insert({
        tenant_id: tenantId,
        nome: action.data.name as string,
        preco: Number(action.data.price) || 0,
        descricao: (action.data.description as string) || '',
        categoria_id: action.data.category_id as string || null,
        disponivel: true,
        destaque: false,
        tempo_preparo: 30,
        ordem: nextOrder,
      })
      return `✅ Produto "${action.data.name}" criado com sucesso!`
    }

    case 'update_price': {
      await supabase
        .from('produtos')
        .update({ preco: Number(action.data.newPrice) })
        .eq('id', action.data.productId as string)
        .eq('tenant_id', tenantId)
      return `✅ Preço atualizado para R$ ${Number(action.data.newPrice).toFixed(2)}`
    }

    case 'toggle_product': {
      const active = Boolean(action.data.active)
      await supabase
        .from('produtos')
        .update({ disponivel: active })
        .eq('id', action.data.productId as string)
        .eq('tenant_id', tenantId)
      return `✅ Produto ${active ? 'ativado' : 'desativado'}`
    }

    case 'update_store_settings': {
      const data = action.data as Record<string, unknown>
      const { data: existing } = await supabase
        .from('configuracoes')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('configuracoes')
          .update(data)
          .eq('tenant_id', tenantId)
      } else {
        await supabase
          .from('configuracoes')
          .insert({ ...data, tenant_id: tenantId, loja_aberta: false, taxa_entrega: 0, pedido_minimo: 0 })
      }
      return `✅ Dados da loja atualizados!`
    }

    case 'update_delivery_settings': {
      const data = action.data as Record<string, unknown>
      await supabase
        .from('configuracoes')
        .update(data)
        .eq('tenant_id', tenantId)
      return `✅ Configurações de delivery atualizadas!`
    }

    case 'update_opening_hours': {
      const data = action.data as Record<string, unknown>
      await supabase
        .from('configuracoes')
        .update(data)
        .eq('tenant_id', tenantId)
      return `✅ Horário de funcionamento atualizado!`
    }

    case 'update_payment_methods': {
      const data = action.data as Record<string, unknown>
      await supabase
        .from('configuracoes')
        .update(data)
        .eq('tenant_id', tenantId)
      return `✅ Formas de pagamento atualizadas!`
    }

    case 'toggle_store_open': {
      const open = action.data.open as boolean
      await supabase
        .from('configuracoes')
        .update({ loja_aberta: open })
        .eq('tenant_id', tenantId)
      return `✅ Loja ${open ? 'ABERTA' : 'FECHADA'}!`
    }

    default:
      return 'Ação não reconhecida.'
  }
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const auth = await verifyJwt(req)
    if (!auth.valid) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: RequestBody = await req.json()
    const { messages, storeId, context, pendingAction } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const effectiveTenantId = storeId || auth.tenantId

    let replyText = ''
    let action: { type: string; data: Record<string, unknown> } | null = null

    if (pendingAction?.confirmed && effectiveTenantId) {
      replyText = await executeAction(pendingAction, effectiveTenantId, supabase)
    } else {
      const systemPrompt = buildSystemPrompt(context)

      const groqMessages = [
        { role: 'system', content: systemPrompt },
        ...messages,
      ]

      const groqApiKey = Deno.env.get('GROQ_API_KEY')
      if (!groqApiKey) {
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: groqMessages,
          max_tokens: 1024,
          temperature: 0.7,
        }),
      })

      if (!groqResponse.ok) {
        const errorText = await groqResponse.text()
        console.error('Groq API error:', errorText)
        return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const groqData = await groqResponse.json()
      const rawContent = groqData.choices?.[0]?.message?.content

      if (!rawContent) {
        return new Response(JSON.stringify({ error: 'Invalid response from AI' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      try {
        const parsed = JSON.parse(rawContent)
        if (parsed.message && parsed.action) {
          replyText = parsed.message
          action = parsed.action
        } else {
          replyText = rawContent
        }
      } catch {
        replyText = rawContent
      }
    }

    return new Response(JSON.stringify({ reply: replyText, pendingAction: action }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
