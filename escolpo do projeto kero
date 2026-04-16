KERO
Plataforma SaaS de Gestão para Delivery
Documento de Planejamento e Implementacao | v2.0 | 2026

Stack: React 19 + TypeScript + Supabase + N8N + Evolution API + Mercado Pago OAuth + Groq AI

 
1. Visao Geral do Projeto
O KERO e um SaaS completo de gestao para restaurantes, bares e delivery. Cada cliente (tenant) possui painel admin proprio, cardapio digital publico, integracao com WhatsApp via IA, pagamentos automaticos via Mercado Pago OAuth e rastreamento de motoboys em tempo real.

Proposta de Valor
•	Cliente faz pedido pelo WhatsApp sem abrir nenhum app
•	IA (Groq / Cloudflare AI) processa o pedido e gera link de pagamento automatico via Mercado Pago
•	Dono do delivery recebe 100% via conta propria do Mercado Pago
•	Painel admin em tempo real com pedidos, cardapio, financeiro e relatorios
•	Agente Consultor IA disponivel 24/7 com analises e sugestoes personalizadas
•	PWA instalavel no celular/PC com notificacoes push nativas
•	Rastreamento de motoboys em tempo real no mapa

2. Stack Tecnologica
Frontend
Camada	Tecnologia	Status
Framework	React 19 + TypeScript 5.9 + Vite 8	Feito
Estilizacao	Tailwind CSS 4 + shadcn/ui	Feito
Roteamento	React Router v7	Feito
Estado / Cache	React Query 5	Feito
Formularios	React Hook Form + Zod	Feito
Animacoes	Framer Motion 12	Feito
Graficos	Recharts 3	Feito
Mapas	Leaflet + React-Leaflet	Feito
Icones	Lucide React	Feito
PWA	Service Worker + Web Push (VAPID)	Faltando

Backend / Infraestrutura
Camada	Tecnologia	Custo
Banco de Dados	Supabase (PostgreSQL + Realtime)	Gratuito
Auth	Supabase Auth + MFA	Gratuito
Storage imagens	Cloudflare R2	Gratuito ate 10GB
VPS	Oracle Cloud ARM (4 CPU / 24GB RAM)	Forever Free
Gerenciador VPS	Easypanel + Docker	Gratuito self-hosted
Automacao	N8N (self-hosted no Oracle Cloud)	Gratuito
WhatsApp	Evolution API Go (self-hosted)	Gratuito
IA Primaria	Cloudflare Workers AI (Llama 3)	Gratuito
IA Consultor / Fallback	Groq API (Llama 3 70B)	Gratuito
Cache / Historico IA	Upstash Redis	Gratuito
Pagamentos	Mercado Pago OAuth (conta do tenant)	Gratuito
DNS / Edge	Cloudflare	Gratuito
Deploy Frontend	Vercel	Gratuito
TOTAL MVP	—	So dominio ~R$40/ano

 
3. Modulos Implementados — Estado Atual
Status completo de cada modulo conforme o codigo existente em /src.

Modulo	Rota	Status	Observacoes
Dashboard	/dashboard	✅ Feito	KPIs drag-and-drop, graficos, funil de vendas
Pedidos (Kanban)	/pedidos	✅ Feito	Fluxo completo com filtros
PDV	/pdv	✅ Feito	Ponto de venda com variacoes de produto
Cardapio Admin	/cardapio-admin	✅ Feito	CRUD categorias, produtos, precos
Cardapio Online	/cardapio	✅ Feito	Menu digital publico com checkout
Gestao de Mesas	/mesa/:numero	✅ Feito	Comanda via QR Code
Clientes (CRM)	/clientes	✅ Feito	Perfis, fidelidade, cupons
Estoque	/estoque	✅ Feito	Insumos, fornecedores (Ficha Tecnica = placeholder)
Financeiro	/financeiro	✅ Feito	Dashboard, contas a pagar, caixa
Entregas	/entregas	✅ Feito	Mapa + gestao motoboys (GPS realtime a implementar)
WhatsApp Inbox	/whatsapp	⚠️ Parcial	UI feita, integracao real pendente (Docker local)
WhatsApp Orders	/whatsapp-orders	⚠️ Parcial	UI feita, fluxo N8N pendente
Cozinha (KDS)	/cozinha	✅ Feito	Monitor Kitchen Display
Operacoes	/operacoes	✅ Feito	Operacoes do dia
Status do Pedido	/pedido/:numero	✅ Feito	Pagina publica de acompanhamento
App Motoboy	/motoboy	✅ Feito	PWA para entregadores (sem GPS ainda)
Admin SaaS	/admin/*	✅ Feito	Dashboard administrativo multi-tenant
Login / Auth	/login	✅ Feito	Supabase Auth + MFA
Agente Consultor IA	Botao flutuante	❌ Faltando	Ver secao 5.2
PWA + Push	—	❌ Faltando	Ver secao 5.3
Rastreamento Motoboy	/entregas + /motoboy	❌ Faltando	GPS realtime + links de rota
Marketing / Pixels	/configuracoes	❌ Faltando	Modal: Meta Pixel, GA4, UTMfy
Mercado Pago OAuth	/configuracoes	❌ Faltando	Fluxo OAuth por tenant

 
4. Problemas e Itens Mal Implementados
4.1 WhatsApp — Integracao Real Pendente (BLOQUEANTE)
A UI do WhatsApp Inbox e WhatsApp Orders esta implementada, porem Docker, N8N e Evolution API ainda estao rodando localmente no PC de desenvolvimento. Necessario migrar para o Oracle Cloud.

O que precisa ser feito:
•	Provisionar VPS Oracle Cloud ARM (4 CPU / 24GB RAM — Forever Free)
•	Instalar Easypanel no Oracle para gerenciar containers Docker
•	Subir N8N no Easypanel via imagem Docker n8nio/n8n
•	Subir Evolution API Go no Easypanel (atendai/evolution-api:latest)
•	Apontar subdominios no Cloudflare: n8n.seudominio.com e api.seudominio.com
•	Configurar SSL automatico via Lets Encrypt no Easypanel
•	Conectar numero WhatsApp via QR Code na Evolution API
•	Configurar webhook da Evolution API apontando para o N8N
•	Configurar Upstash Redis para historico de conversas (TTL 24h por numero)
•	Atualizar variaveis de ambiente no frontend e Edge Functions

4.2 Mercado Pago OAuth — Nao Implementado
O sistema nao possui integracao com pagamentos. O modelo correto para o SaaS e OAuth por tenant: cada dono conecta a propria conta MP e recebe pagamentos diretamente.

O que precisa ser feito:
•	Criar aplicacao no portal Mercado Pago Developers
•	Configurar Redirect URI: https://seudominio.com/api/mp/callback
•	Criar tabela mp_credentials (tenant_id, access_token, refresh_token, expires_at)
•	Implementar botao 'Conectar Mercado Pago' na pagina de Configuracoes
•	Criar Edge Function para trocar codigo OAuth por access_token
•	Criar Edge Function para gerar preferencia de pagamento usando token do tenant
•	Configurar webhook do MP no N8N para confirmar pagamento e atualizar status

4.3 Rastreamento de Motoboys — Mapa sem GPS Real
O mapa da pagina de Entregas existe mas nao ha rastreamento GPS real do motoboy nem geracao de links de rota navegaveis para o App Motoboy.

•	App Motoboy: capturar geoloc via navigator.geolocation.watchPosition()
•	Enviar lat/lng para Supabase Realtime em intervalos regulares
•	Pagina Entregas: assinar canal Realtime e atualizar marcador no mapa
•	Gerar link de rota para o motoboy ao receber nova entrega atribuida
•	Links suportados: Waze (https://waze.com/ul?ll=LAT,LNG) e Google Maps

4.4 Ficha Tecnica — Placeholder
A Ficha Tecnica (vinculacao de produtos a insumos e calculo de CMV) existe apenas como placeholder na EstoquePage.

•	Implementar UI: associar ingredientes + quantidades a cada produto
•	Calcular custo do prato automaticamente com base nos precos dos insumos
•	Exibir margem de lucro e CMV% no cardapio admin
•	Disparar alerta quando estoque de ingrediente cair abaixo do minimo

 
5. Novas Funcionalidades a Implementar
5.1 Migracao WhatsApp para Oracle Cloud
Prioridade maxima — bloqueia WhatsApp Orders, IA e pagamentos automaticos.
Etapa	O que fazer	Tempo est.
1	Criar conta Oracle Cloud + VPS ARM (4CPU/24GB)	2-3h
2	Instalar Easypanel + configurar dominio + SSL	1-2h
3	Subir N8N via Easypanel	30min
4	Subir Evolution API Go + conectar WhatsApp via QR	1h
5	Configurar Cloudflare DNS (subdominios)	30min
6	Configurar Upstash Redis (historico IA)	30min
7	Montar fluxo N8N completo (webhook > IA > MP > resposta)	3-4h
8	Testes end-to-end + variaveis de ambiente	2h

5.2 Agente Consultor IA — Botao Flutuante
Botao flutuante em todas as telas do painel admin que abre um chat com o Agente Consultor IA (Groq). O agente tem acesso total aos dados do tenant, entrega analises proativas e NUNCA executa acoes sem aprovacao explicita do dono.

Interface do Chat
•	Botao flutuante canto inferior direito com icone de IA + badge de mensagens nao lidas
•	Abre painel lateral de chat (nao modal — nao bloqueia o painel admin)
•	Campo de mensagem + botao Enviar + historico da conversa com scroll
•	Mensagens do agente: analise + proposta + botao 'Aprovar' + botao 'Recusar'

Capacidades do Agente
•	Analise diaria, semanal e mensal de vendas, ticket medio, CMV, lucro
•	Alertas de estoque critico (insumos abaixo do minimo definido)
•	Identificacao dos produtos mais e menos vendidos
•	Identificacao de dias/horarios fracos com sugestao de promocoes
•	Proposta de disparos WhatsApp marketing — delega para N8N, so executa com aprovacao
•	Sugestao de ajuste de precos visando maior margem — so aplica com aprovacao

Notificacoes Push (quando chat fechado)
•	Analises do agente chegam como notificacao push nativa (via PWA)
•	Ex: 'Seu estoque de mozzarella esta acabando. Quer criar um alerta para o fornecedor?'

Stack Tecnica
•	API: Groq API (llama3-70b-8192 para analises complexas)
•	Contexto: dados do tenant buscados do Supabase antes de cada chamada
•	Historico: salvo na tabela historico_agente (ja existe no banco)
•	Permissoes: toda acao proposta exige confirmacao do usuario antes de executar

5.3 PWA — Instalacao e Notificacoes Push
Transformar o painel admin em um Progressive Web App instalavel no celular e PC com suporte a notificacoes push nativas.

O que implementar
•	manifest.json: nome, icones em varios tamanhos, cores e display standalone
•	Service Worker: cache offline + interceptacao de push notifications
•	Solicitar permissao de notificacao push no primeiro acesso autenticado
•	Push API: subscrever via PushManager e salvar endpoint no Supabase (tabela push_subscriptions)
•	Edge Function Supabase: disparar notificacoes via Web Push Protocol com VAPID keys

Notificacoes Previstas
•	Nova venda PIX/Cartao: 'Venda de R$ 89,90 recebida! Parcela indo direto pra sua conta.'
•	Meta do dia batida: 'Pode almocar naquele restaurante top! Lucro de hoje: R$ 1.240,00 💚'
•	Novo pedido WhatsApp: 'Novo pedido recebido pelo WhatsApp — cliente aguardando.'
•	Estoque critico: 'Atencao: mozzarella com apenas 200g restantes.'
•	Analise do agente IA disponivel para revisao

5.4 Marketing — Modal de Rastreamento
Na pagina de Configuracoes: uma secao dedicada para integracao com ferramentas de marketing e rastreamento de conversoes.

Ferramentas a integrar
•	Meta Pixel (Facebook/Instagram Ads): campo para Pixel ID + script de injecao dinamica no cardapio online
•	Google Analytics 4: campo para G-XXXXXXXX + injecao do gtag.js nas paginas publicas
•	UTMfy: configuracao de UTMs padrao nos links gerados (cardapio, WhatsApp, etc.)

Implementacao
•	Salvar IDs/tokens na tabela configuracoes do tenant no Supabase
•	Injetar scripts APENAS nas paginas publicas (cardapio online, acompanhamento de pedido)
•	Nunca injetar no painel admin para nao contaminar dados de analytics
•	Eventos de conversao: AddToCart, InitiateCheckout, Purchase no cardapio online

5.5 Rastreamento de Motoboys em Tempo Real
O App Motoboy deve capturar GPS e o mapa da pagina de Entregas deve mostrar a posicao de cada motoboy em tempo real, com links de rota automaticos para cada entrega.

App Motoboy (/motoboy)
•	Capturar GPS via navigator.geolocation.watchPosition()
•	Enviar lat/lng para Supabase a cada 10-15 segundos
•	Ao receber entrega atribuida: exibir botao 'Abrir Rota'
•	Link Waze: https://waze.com/ul?ll=LAT,LNG&navigate=yes
•	Link Google Maps: https://maps.google.com/maps?daddr=ENDERECO

Pagina de Entregas (admin)
•	Assinar canal Supabase Realtime da tabela posicoes_motoboy
•	Atualizar marcador do motoboy no mapa Leaflet em tempo real
•	Exibir nome, status e ultima atualizacao no marcador
•	Linha tracejada do motoboy ate o destino da entrega atual

 
6. Banco de Dados (Supabase)
Tabelas Existentes
Todas as tabelas possuem RLS configurado com filtragem por tenant_id.

Tabela	Descricao	Status
configuracoes	Configuracoes gerais do tenant	Feito
categorias	Categorias do cardapio	Feito
produtos	Produtos do cardapio	Feito
precos_tamanho	Variacoes de preco por tamanho	Feito
sabores	Sabores por produto	Feito
mesas	Mesas do estabelecimento	Feito
pedidos	Pedidos internos e delivery	Feito
itens_pedido	Itens de cada pedido	Feito
pedidos_online	Pedidos via cardapio online	Feito
clientes	CRM de clientes	Feito
cupons	Cupons de desconto	Feito
fornecedores	Fornecedores de insumos	Feito
ingredientes	Insumos do estoque	Feito
entradas_estoque	Movimentacoes de estoque	Feito
ficha_tecnica	Vinculo produto-ingrediente (CMV)	Parcial
caixa	Controle de caixa	Feito
sangrias_caixa	Sangrias do caixa	Feito
contas_pagar	Contas a pagar	Feito
motoboys	Cadastro de motoboys	Feito
entregas	Entregas em andamento	Feito
historico_status	Historico de status dos pedidos	Feito
notificacoes	Notificacoes do sistema	Feito
mensagens_whatsapp	Mensagens do WhatsApp Inbox	Feito
configuracoes_whatsapp	Config. da integracao WhatsApp	Feito
user_roles	Permissoes por tenant	Feito
metas_faturamento	Metas de faturamento	Feito
historico_agente	Historico de chat com o Agente IA	Feito

Tabelas a Criar
Tabela	Descricao	Modulo
mp_credentials	access_token e refresh_token do Mercado Pago por tenant	Mercado Pago OAuth
posicoes_motoboy	lat/lng em tempo real por motoboy (Realtime)	Rastreamento GPS
push_subscriptions	Endpoints de notificacao push por tenant/device	PWA Push
configuracoes_marketing	Pixel ID, GA4, UTMfy por tenant	Marketing

 
7. Variaveis de Ambiente
Frontend (.env)
Variavel	Descricao
VITE_SUPABASE_URL	URL do projeto Supabase
VITE_SUPABASE_ANON_KEY	Chave publica do Supabase
VITE_R2_PUBLIC_URL	URL publica do bucket Cloudflare R2
VITE_MP_CLIENT_ID	Client ID do Mercado Pago
VITE_VAPID_PUBLIC_KEY	Chave publica VAPID para notificacoes push

Supabase Edge Functions
Variavel	Descricao
MP_CLIENT_ID	Client ID Mercado Pago
MP_CLIENT_SECRET	Client Secret Mercado Pago
UPSTASH_REDIS_REST_URL	URL REST do Upstash Redis
UPSTASH_REDIS_REST_TOKEN	Token do Upstash Redis
CLOUDFLARE_ACCOUNT_ID	Account ID do Cloudflare Workers AI
CLOUDFLARE_AI_TOKEN	Token da Cloudflare Workers AI
GROQ_API_KEY	Chave da Groq API (Agente Consultor + fallback IA)
R2_ACCESS_KEY_ID	Access Key do Cloudflare R2
R2_SECRET_ACCESS_KEY	Secret Key do Cloudflare R2
R2_BUCKET_NAME	Nome do bucket R2 (ex: kero-images)
VAPID_PRIVATE_KEY	Chave privada VAPID para push notifications
VAPID_EMAIL	Email para identificacao VAPID

 
8. Fluxo Completo de um Pedido
Etapa	O que acontece	Tecnologia
1	Cliente manda mensagem no WhatsApp do delivery	WhatsApp
2	Evolution API recebe e dispara webhook para o N8N	Evolution API Go
3	N8N busca historico da conversa no Upstash Redis	N8N + Upstash
4	N8N verifica contador de tokens Cloudflare AI no Upstash	Upstash Redis
5	IA processa com contexto do historico + cardapio do tenant	Cloudflare AI / Groq
6	N8N salva resposta no historico (TTL 24h)	Upstash Redis
7	Cliente confirma pedido — IA retorna JSON com itens e total	Groq (llama3)
8	N8N chama Edge Function para criar pedido no Supabase	Supabase Edge Function
9	Edge Function busca access_token MP do tenant	Supabase (mp_credentials)
10	Edge Function cria preferencia de pagamento no MP	Mercado Pago OAuth
11	N8N envia link de pagamento via WhatsApp	Evolution API Go
12	Cliente paga via Pix, cartao ou saldo MP	Mercado Pago
13	MP dispara webhook confirmando pagamento para o N8N	MP Webhook
14	N8N atualiza status do pedido para 'paid' no Supabase	Supabase
15	Painel admin atualiza em tempo real	Supabase Realtime
16	Push notification enviada ao dono: 'Venda de R$ X recebida!'	PWA Web Push
17	N8N envia alerta WhatsApp para o dono do delivery	Evolution API Go

 
9. Ordem de Implementacao Recomendada
Prioridade	O que fazer	Tempo est.
1 - CRITICO	Migrar WhatsApp para Oracle Cloud (N8N + Evolution API)	10-12h
2 - CRITICO	Implementar Mercado Pago OAuth (tabela + Edge Functions + N8N)	4-6h
3 - CRITICO	Montar fluxo N8N completo (IA + pedido + pagamento + resposta)	3-4h
4 - ALTA	Implementar PWA: manifest + Service Worker + notificacoes push	6-8h
5 - ALTA	Implementar Agente Consultor IA (chat flutuante + analises Groq)	8-10h
6 - ALTA	Rastreamento GPS motoboys em tempo real + links de rota	4-6h
7 - MEDIA	Modal de Marketing: Pixel, GA4, UTMfy nas Configuracoes	3-4h
8 - MEDIA	Ficha Tecnica completa (CMV + margem automatica)	4-5h
9 - BAIXA	Testes E2E (Playwright) e ajustes finais	4-6h

Tempo total estimado: 47-61 horas de desenvolvimento

 
10. Padroes de Codigo e Boas Praticas
Multi-Tenant — CRITICO
SEMPRE filtrar por tenant_id. Nunca fazer queries sem o filtro — vaza dados de outros tenants.
	Exemplo
CORRETO	supabase.from('pedidos').select('*').eq('tenant_id', tenantId)
ERRADO	supabase.from('pedidos').select('*')  // SEM filtro — vaza dados!

Realtime
•	Usar o hook useRealtime(tabela, callback) para subscricoes
•	Sempre cancelar subscricao no cleanup: return () => channel.unsubscribe()
•	Nao misturar polling com Realtime — escolher um dos dois por modulo

Notificacoes e Feedback Visual
•	Usar ToastContext (showToast) em vez de alert() ou console.log()
•	Categorias disponíveis: success, error, warning, info

Agente Consultor IA — Regra de Permissao
•	NUNCA executar acoes (alterar preco, criar promocao, disparar WhatsApp) sem aprovacao explicita
•	Sempre apresentar: analise detalhada + proposta clara + botao Aprovar + botao Recusar
•	Logar todas as acoes aprovadas e recusadas na tabela historico_agente
•	Em caso de duvida sobre o impacto de uma acao, pedir confirmacao adicional ao usuario
