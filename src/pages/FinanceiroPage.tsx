import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface ContaPagar {
  id: string
  descricao: string
  valor: number
  data_vencimento: string
  status: 'pendente' | 'pago' | 'atrasado'
  categoria: string
}

interface Caixa {
  id: string
  status: 'aberto' | 'fechado'
  valor_abertura: number
  valor_fechamento?: number
  aberto_em: string
  fechado_em?: string
}

export default function FinanceiroPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'contas_pagar' | 'caixa'>('dashboard')
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [caixaAtivo, setCaixaAtivo] = useState<Caixa | null>(null)
  const [faturamentoTotal, setFaturamentoTotal] = useState(0)
  const [dateRange, setDateRange] = useState({ 
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })

  const fetchData = useCallback(async () => {
    
    // Faturamento (Pedidos Entregues)
    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('total')
      .eq('status', 'entregue')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end + ' 23:59:59')
    
    const { data: pedidosOnline } = await supabase
      .from('pedidos_online')
      .select('total')
      .eq('status', 'entregue')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end + ' 23:59:59')

    const totalPed = (pedidos || []).reduce((acc, p) => acc + Number(p.total), 0)
    const totalOn = (pedidosOnline || []).reduce((acc, p) => acc + Number(p.total), 0)
    setFaturamentoTotal(totalPed + totalOn)

    // Contas a Pagar
    const { data: ct } = await supabase.from('contas_pagar').select('*').order('data_vencimento')
    setContas(ct || [])

    // Caixa Ativo
    const { data: cx } = await supabase.from('caixa').select('*').eq('status', 'aberto').maybeSingle()
    setCaixaAtivo(cx)
  }, [dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useRealtime('pedidos', fetchData)
  useRealtime('contas_pagar', fetchData)
  useRealtime('caixa', fetchData)

  const kpis = {
    faturamento: faturamentoTotal,
    pendente: contas.filter(c => c.status === 'pendente').reduce((acc, c) => acc + Number(c.valor), 0),
    atrasado: contas.filter(c => c.status === 'atrasado').reduce((acc, c) => acc + Number(c.valor), 0),
    lucro_estimado: faturamentoTotal - contas.filter(c => c.status === 'pago').reduce((acc, c) => acc + Number(c.valor), 0)
  }

  return (
    <div className="animate-fade-in pb-10">
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <span className="text-secondary font-bold uppercase tracking-[0.3em] text-[10px] mb-2 block">Gestão & Resultados</span>
          <h2 className="text-5xl font-[Outfit] font-bold text-on-background tracking-tighter">Financeiro</h2>
        </div>
        
        <div className="flex bg-surface-container rounded-2xl p-1 border border-outline-variant/10">
          {[
            { id: 'dashboard', label: 'Resumo', icon: 'dashboard' },
            { id: 'contas_pagar', label: 'Contas a Pagar', icon: 'payments' },
            { id: 'caixa', label: 'Fluxo de Caixa', icon: 'point_of_sale' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                ? 'bg-primary text-white shadow-lg' 
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 bg-surface-container rounded-2xl p-2 border border-outline-variant/10">
           <input 
              type="date" 
              value={dateRange.start} 
              onChange={e => setDateRange({...dateRange, start: e.target.value})}
              className="bg-transparent text-xs font-bold outline-none p-1"
           />
           <span className="text-on-surface-variant/30 text-xs">até</span>
           <input 
              type="date" 
              value={dateRange.end} 
              onChange={e => setDateRange({...dateRange, end: e.target.value})}
              className="bg-transparent text-xs font-bold outline-none p-1"
           />
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
             {[
               { label: 'Faturamento Bruto', value: kpis.faturamento, color: 'text-primary', icon: 'trending_up' },
               { label: 'Contas Pendentes', value: kpis.pendente, color: 'text-yellow-500', icon: 'timer' },
               { label: 'Total Atrasado', value: kpis.atrasado, color: 'text-error', icon: 'emergency_home' },
               { label: 'Saldo Projetado', value: kpis.lucro_estimado, color: 'text-green-500', icon: 'wallet' },
             ].map((kpi, i) => (
               <div key={i} className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                     <span className={`material-symbols-outlined ${kpi.color} opacity-40`}>{kpi.icon}</span>
                     <span className={`text-2xl font-black font-[Outfit] ${kpi.color}`}>R$ {kpi.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{kpi.label}</span>
               </div>
             ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-surface-container rounded-[2.5rem] p-8 border border-outline-variant/10 min-h-[300px] flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-5xl opacity-10 mb-4">analytics</span>
                <p className="text-on-surface-variant italic text-sm">Gráfico de Faturamento Diário (Chart.js será carregado aqui)</p>
             </div>
             <div className="bg-surface-container rounded-[2.5rem] p-8 border border-outline-variant/10 min-h-[300px] flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-5xl opacity-10 mb-4">pie_chart</span>
                <p className="text-on-surface-variant italic text-sm">Distribuição por Forma de Pagamento</p>
             </div>
          </div>
        </>
      )}

      {activeTab === 'contas_pagar' && <ContasPagarContent contas={contas} onUpdate={fetchData} />}
      {activeTab === 'caixa' && <CaixaContent caixaAtivo={caixaAtivo} onUpdate={fetchData} />}
    </div>
  )
}

function ContasPagarContent({ contas, onUpdate }: { contas: ContaPagar[], onUpdate: () => void }) {
   const [isModalOpen, setIsModalOpen] = useState(false)
   const [newConta, setNewConta] = useState({ descricao: '', valor: 0, data_vencimento: '', categoria: 'Fixo' })

   const handleSave = async () => {
      await supabase.from('contas_pagar').insert([{ ...newConta, status: 'pendente' }])
      onUpdate()
      setIsModalOpen(false)
   }

   return (
      <div className="animate-fade-in">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold font-[Outfit]">Listagem de Contas</h3>
            <button onClick={() => setIsModalOpen(true)} className="bg-primary text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
               <span className="material-symbols-outlined text-[20px]">add</span> Nova Conta
            </button>
         </div>

         <div className="bg-surface-container rounded-3xl border border-outline-variant/10 overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/10">
                     <th className="p-4 text-[10px] font-black uppercase text-on-surface-variant">Vencimento</th>
                     <th className="p-4 text-[10px] font-black uppercase text-on-surface-variant">Descrição</th>
                     <th className="p-4 text-[10px] font-black uppercase text-on-surface-variant">Categoria</th>
                     <th className="p-4 text-[10px] font-black uppercase text-on-surface-variant text-right">Valor</th>
                     <th className="p-4 text-[10px] font-black uppercase text-on-surface-variant text-center">Status</th>
                  </tr>
               </thead>
               <tbody>
                  {contas.map((c: any) => (
                     <tr key={c.id} className="border-b border-outline-variant/5 hover:bg-primary/[0.02]">
                        <td className="p-4 text-sm font-medium">{format(new Date(c.data_vencimento), 'dd/MM/yyyy')}</td>
                        <td className="p-4 text-sm font-bold">{c.descricao}</td>
                        <td className="p-4"><span className="text-[10px] font-bold p-1 px-2 bg-surface-container-high rounded-md">{c.categoria}</span></td>
                        <td className="p-4 text-right font-black">R$ {c.valor.toFixed(2)}</td>
                        <td className="p-4 text-center">
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                              c.status === 'pago' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                              c.status === 'atrasado' ? 'bg-error/10 text-error border-error/20' : 
                              'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                           }`}>{c.status}</span>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
               <div className="bg-surface-container rounded-[2.5rem] w-full max-w-md border border-outline-variant/10 p-8">
                  <h3 className="text-xl font-bold font-[Outfit] mb-6">Cadastrar Conta</h3>
                  <div className="space-y-4">
                     <input type="text" placeholder="Descrição" value={newConta.descricao} onChange={e => setNewConta({...newConta, descricao: e.target.value})} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl p-3 outline-none"/>
                     <input type="number" placeholder="Valor" value={newConta.valor || ''} onChange={e => setNewConta({...newConta, valor: Number(e.target.value)})} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl p-3 outline-none font-bold"/>
                     <input type="date" value={newConta.data_vencimento} onChange={e => setNewConta({...newConta, data_vencimento: e.target.value})} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl p-3 outline-none"/>
                  </div>
                  <div className="mt-8 flex justify-end gap-3">
                     <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold uppercase">Cancelar</button>
                     <button onClick={handleSave} className="bg-primary text-white px-8 py-2 rounded-xl text-xs font-bold shadow-lg shadow-primary/20">Salvar</button>
                  </div>
               </div>
            </div>
         )}
      </div>
   )
}

function CaixaContent({ caixaAtivo, onUpdate }: { caixaAtivo: Caixa | null, onUpdate: () => void }) {
   const [valAbertura, setValAbertura] = useState(0)

   const abrirCaixa = async () => {
      await supabase.from('caixa').insert([{ valor_abertura: valAbertura, status: 'aberto', aberto_em: new Date().toISOString() }])
      onUpdate()
   }

   const fecharCaixa = async () => {
      if (!caixaAtivo) return
      const { data: vendas } = await supabase.from('pedidos').select('total').eq('status', 'entregue').gte('created_at', caixaAtivo.aberto_em)
      const total = (vendas || []).reduce((acc, v) => acc + Number(v.total), 0)
      
      await supabase.from('caixa').update({ 
         status: 'fechado', 
         fechado_em: new Date().toISOString(),
         valor_fechamento: caixaAtivo.valor_abertura + total
      }).eq('id', caixaAtivo.id)
      onUpdate()
   }

   return (
      <div className="animate-fade-in flex flex-col items-center py-10">
         {!caixaAtivo ? (
            <div className="bg-surface-container rounded-[3rem] p-12 text-center border border-dashed border-outline-variant/30 max-w-lg w-full">
               <span className="material-symbols-outlined text-8xl opacity-10 text-primary mb-6">lock_open</span>
               <h3 className="text-2xl font-black font-[Outfit]">Caixa Fechado</h3>
               <p className="text-on-surface-variant text-sm mt-2 mb-8 italic">Você precisa abrir o caixa para gerenciar as vendas em dinheiro e sangrias.</p>
               
               <div className="space-y-4">
                  <input 
                     type="number" 
                     placeholder="Fundo de Caixa (R$)" 
                     className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 text-center font-bold text-xl outline-none"
                     onChange={e => setValAbertura(Number(e.target.value))}
                  />
                  <button onClick={abrirCaixa} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/30">Abrir Caixa Agora</button>
               </div>
            </div>
         ) : (
            <div className="bg-surface-container rounded-[3.5rem] p-12 text-center border border-outline-variant/10 max-w-2xl w-full shadow-2xl shadow-black/20">
               <div className="flex justify-between items-start mb-10">
                  <div className="text-left">
                     <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] font-black uppercase tracking-widest">Caixa Aberto</span>
                     <p className="text-xs text-on-surface-variant mt-2">Iniciado em {format(new Date(caixaAtivo.aberto_em), "dd/MM 'às' HH:mm")}</p>
                  </div>
                  <button onClick={fecharCaixa} className="bg-error/10 text-error px-6 py-2 rounded-xl text-xs font-black uppercase border border-error/20 hover:bg-error hover:text-white transition-all">Fechar Caixa</button>
               </div>

               <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-surface-container-low p-8 rounded-[2rem] border border-outline-variant/10">
                     <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-1">Abertura</span>
                     <span className="text-2xl font-black font-[Outfit] text-on-surface">R$ {caixaAtivo.valor_abertura.toFixed(2)}</span>
                  </div>
                  <div className="bg-surface-container-low p-8 rounded-[2rem] border border-outline-variant/10">
                     <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-1">Entradas (Dinheiro)</span>
                     <span className="text-2xl font-black font-[Outfit] text-green-500">R$ 0.00</span>
                  </div>
               </div>

               <div className="bg-primary/5 rounded-[2.5rem] p-10 border border-primary/10">
                  <span className="text-xs font-black uppercase tracking-[0.3em] text-primary/60 block mb-2">Saldo Atual em Caixa</span>
                  <span className="text-6xl font-black font-[Outfit] text-primary tracking-tighter">R$ {caixaAtivo.valor_abertura.toFixed(2)}</span>
               </div>
            </div>
         )}
      </div>
   )
}
