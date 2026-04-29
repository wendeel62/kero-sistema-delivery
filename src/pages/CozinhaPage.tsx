import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCozinha } from '../hooks/useCozinha'
import CardPedidoCozinha from '../components/cozinha/CardPedidoCozinha'

export default function CozinhaPage() {
  const [searchParams] = useSearchParams()
  const tenantId = searchParams.get('tenant') || ''
  
  const [hora, setHora] = useState('')
  const [erro, setErro] = useState('')

  const { 
    pedidosNovos, 
    pedidosEmPreparo, 
    iniciarPreparo, 
    marcarPronto,
    refetch 
  } = useCozinha({ tenantId })

  useEffect(() => {
    if (!tenantId) {
      setErro('Tenant não informado. Use ?tenant=UUID na URL.')
      return
    }
    setErro('')
  }, [tenantId])

  useEffect(() => {
    const atualizarRelogio = () => {
      const now = new Date()
      setHora(now.toLocaleTimeString('pt-BR', { hour12: false }))
    }
    atualizarRelogio()
    const interval = setInterval(atualizarRelogio, 1000)
    return () => clearInterval(interval)
  }, [])

  const pedidosAtivos = pedidosNovos.length + pedidosEmPreparo.length

  const handleIniciar = useCallback(async (id: string) => {
    await iniciarPreparo(id)
  }, [iniciarPreparo])

  const handlePronto = useCallback(async (id: string) => {
    await marcarPronto(id)
  }, [marcarPronto])

  if (erro) {
    return (
      <div className="min-h-screen bg-[#16181f] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-red-500">error</span>
          <h2 className="mt-4 text-xl font-bold text-white">Erro</h2>
          <p className="mt-2 text-white/60">{erro}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#16181f] flex flex-col">
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#0f1117] border-b border-[#252830] flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-2">
          <span className="text-[#e8391a]" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px' }}>
            KERO
          </span>
          <span className="text-white/30">—</span>
          <span className="text-white/60 font-medium">Cozinha</span>
        </div>
        
        <div className="text-2xl font-mono font-bold text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          {hora}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#f57c24]">restaurant_menu</span>
          <span className="text-white/80 font-medium">
            {pedidosAtivos} {pedidosAtivos === 1 ? 'pedido ativo' : 'pedidos ativos'}
          </span>
        </div>
      </header>

      <main className="flex-1 mt-16 flex">
        <div className="w-1/2 border-r border-[#252830] flex flex-col">
          <div className="sticky top-0 bg-[#16181f] p-4 border-b border-[#252830] flex items-center gap-3">
            <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-bold">
              NOVOS
            </span>
            <span className="text-white/60 text-sm">
              {pedidosNovos.length} {pedidosNovos.length === 1 ? 'pedido' : 'pedidos'}
            </span>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            {pedidosNovos.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-6xl text-white/20 animate-pulse">chef_hat</span>
                <p className="mt-4 text-white/60 font-medium">Nenhum pedido no momento</p>
                <p className="text-white/40 text-sm">Aguardando novos pedidos...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {pedidosNovos
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .map((pedido) => (
                    <CardPedidoCozinha
                      key={pedido.id}
                      id={pedido.id}
                      numero={pedido.numero}
                      tipo={pedido.tipo}
                      created_at={pedido.created_at}
                      observacoes={pedido.observacoes}
                      itens={pedido.itens}
                      coluna="novo"
                      onIniciarPreparo={handleIniciar}
                      onMarcarPronto={handlePronto}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="sticky top-0 bg-[#16181f] p-4 border-b border-[#252830] flex items-center gap-3">
            <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-sm font-bold">
              EM PREPARO
            </span>
            <span className="text-white/60 text-sm">
              {pedidosEmPreparo.length} {pedidosEmPreparo.length === 1 ? 'pedido' : 'pedidos'}
            </span>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            {pedidosEmPreparo.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <span className="material-symbols-outlined text-6xl text-white/20">hourglass_empty</span>
                <p className="mt-4 text-white/60 font-medium">Sem pedidos em preparo</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {pedidosEmPreparo
                  .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
                  .map((pedido) => (
                    <CardPedidoCozinha
                      key={pedido.id}
                      id={pedido.id}
                      numero={pedido.numero}
                      tipo={pedido.tipo}
                      created_at={pedido.created_at}
                      observacoes={pedido.observacoes}
                      itens={pedido.itens}
                      coluna="em_preparo"
                      onIniciarPreparo={handleIniciar}
                      onMarcarPronto={handlePronto}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
