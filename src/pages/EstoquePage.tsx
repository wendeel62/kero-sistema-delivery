import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'

interface Ingrediente {
  id: string
  nome: string
  unidade: 'kg' | 'un' | 'lt' | 'g' | 'ml'
  estoque_atual: number
  estoque_minimo: number
  estoque_critico: number
  custo_medio: number
  categoria: string
  fornecedor_id?: string
  last_update: string
}

interface Fornecedor {
  id: string
  nome_fantasia: string
  cnpj?: string
  contato_nome?: string
  telefone?: string
  email?: string
  categoria?: string
}

export default function EstoquePage() {
  const [activeTab, setActiveTab] = useState<'movimentacao' | 'ficha_tecnica' | 'fornecedores'>('movimentacao')
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)
  const [editingIngrediente, setEditingIngrediente] = useState<any>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: ing } = await supabase.from('ingredientes').select('*').order('nome')
    const { data: forn } = await supabase.from('fornecedores').select('*').order('nome_fantasia')
    setIngredientes(ing || [])
    setFornecedores(forn || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useRealtime('ingredientes', fetchData)
  useRealtime('fornecedores', fetchData)

  const filteredIngredientes = ingredientes.filter(i => 
    i.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    total: ingredientes.length,
    critico: ingredientes.filter(i => i.estoque_atual <= i.estoque_critico).length,
    baixo: ingredientes.filter(i => i.estoque_atual > i.estoque_critico && i.estoque_atual <= i.estoque_minimo).length,
    valor_total: ingredientes.reduce((acc, i) => acc + (i.estoque_atual * i.custo_medio), 0)
  }

  return (
    <div className="animate-fade-in pb-10 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-6 md:mb-8">
        <div>
          <span className="text-[#f57c24] font-bold uppercase tracking-[0.3em] text-[10px] mb-2 block">Backoffice & Insumos</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">Estoque</h2>
        </div>
        
        <div className="flex bg-[#16181f] rounded-2xl p-1 border border-[#252830] overflow-x-auto">
          {[
            { id: 'movimentacao', label: 'Insumos', icon: 'inventory_2' },
            { id: 'ficha_tecnica', label: 'Fichas', icon: 'receipt_long' },
            { id: 'fornecedores', label: 'Fornecedores', icon: 'local_shipping' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id 
                ? 'bg-[#e8391a] text-white shadow-lg' 
                : 'text-white/60 hover:text-white hover:bg-[#252830]'
              }`}
            >
              <span className="material-symbols-outlined text-base sm:text-lg">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {activeTab === 'movimentacao' && (
          <div className="flex gap-2">
             <button 
              onClick={() => setIsEntryModalOpen(true)}
              className="bg-[#252830] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#1c1e26] transition-all border border-[#252830]"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Entrada
            </button>
            <button 
              onClick={() => { setEditingIngrediente({ nome: '', unidade: 'un', estoque_atual: 0, estoque_minimo: 0, estoque_critico: 0, custo_medio: 0, categoria: '' }); setIsModalOpen(true); }}
              className="bg-[#e8391a] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#c72f15] transition-all shadow-lg"
            >
              <span className="material-symbols-outlined text-[20px]">post_add</span>
              Novo Insumo
            </button>
          </div>
        )}
      </div>

      {activeTab === 'movimentacao' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-[#e8391a]/20 to-[#e8391a]/5 rounded-2xl p-6 border border-[#e8391a]/30">
               <div className="flex items-center justify-between mb-4">
                  <span className="material-symbols-outlined text-[#e8391a]">inventory</span>
                  <span className="text-2xl font-bold text-white">{stats.total}</span>
               </div>
               <span className="text-[10px] text-white/50 font-black uppercase tracking-widest">Total Insumos</span>
            </div>
            
            <div className={`bg-gradient-to-br from-red-500/20 to-red-500/5 rounded-2xl p-6 border ${stats.critico > 0 ? 'border-red-500/30 animate-pulse' : 'border-[#252830]'}`}>
               <div className="flex items-center justify-between mb-4">
                  <span className={`material-symbols-outlined ${stats.critico > 0 ? 'text-red-500' : 'text-white/20'}`}>report</span>
                  <span className={`text-2xl font-bold ${stats.critico > 0 ? 'text-red-500' : 'text-white'}`}>{stats.critico}</span>
               </div>
               <span className="text-[10px] text-white/50 font-black uppercase tracking-widest">Estoque Crítico</span>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 rounded-2xl p-6 border border-yellow-500/30">
               <div className="flex items-center justify-between mb-4">
                  <span className="material-symbols-outlined text-yellow-400">warning</span>
                  <span className="text-2xl font-bold text-yellow-400">{stats.baixo}</span>
               </div>
               <span className="text-[10px] text-white/50 font-black uppercase tracking-widest">Estoque Baixo</span>
            </div>

            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-2xl p-6 border border-emerald-500/30 text-right">
               <div className="flex items-center justify-between mb-4">
                  <span className="material-symbols-outlined text-emerald-400">payments</span>
                  <span className="text-xl font-bold text-emerald-400">R$ {stats.valor_total.toFixed(2)}</span>
               </div>
               <span className="text-[10px] text-white/50 font-black uppercase tracking-widest">Valor em Estoque</span>
            </div>
          </div>

          <div className="bg-[#16181f] rounded-2xl p-4 border border-[#252830] mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40">search</span>
              <input 
                type="text" 
                placeholder="Buscar insumo ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0c0e15] border border-[#252830] rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-white/40 focus:border-[#e8391a] outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {loading ? (
                <div className="col-span-full py-20 text-center"><div className="w-10 h-10 border-4 border-[#e8391a] border-t-transparent rounded-full animate-spin mx-auto" /></div>
             ) : filteredIngredientes.map(ing => {
                const perc = Math.min((ing.estoque_atual / (ing.estoque_minimo * 2)) * 100, 100)
                let color = 'bg-[#e8391a]'
                if (ing.estoque_atual <= ing.estoque_critico) color = 'bg-red-500'
                else if (ing.estoque_atual <= ing.estoque_minimo) color = 'bg-yellow-500'

                return (
                  <div key={ing.id} className="bg-[#16181f] rounded-3xl p-6 border border-[#252830] group hover:border-[#e8391a]/30 transition-all shadow-lg hover:shadow-[#e8391a]/5">
                     <div className="flex justify-between items-start mb-4">
                        <div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{ing.categoria}</span>
                           <h4 className="text-lg font-bold text-white">{ing.nome}</h4>
                        </div>
                        <button className="p-2 hover:bg-[#e8391a]/10 rounded-xl text-[#e8391a] opacity-0 group-hover:opacity-100 transition-all"><span className="material-symbols-outlined">edit</span></button>
                     </div>
                     
                     <div className="flex justify-between items-end mb-2">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold uppercase text-white/50">Estoque Atual</span>
                           <span className={`text-2xl font-black ${ing.estoque_atual <= ing.estoque_critico ? 'text-red-500' : 'text-white'}`}>{ing.estoque_atual} <span className="text-xs font-normal opacity-50">{ing.unidade}</span></span>
                        </div>
                        <div className="text-right">
                           <span className="text-[10px] font-bold uppercase text-white/50">Custo Médio</span>
                           <div className="text-sm font-bold text-emerald-400">R$ {ing.custo_medio.toFixed(2)}</div>
                        </div>
                     </div>

                     <div className="w-full h-2 bg-[#252830] rounded-full overflow-hidden mb-4">
                        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${perc}%` }} />
                     </div>

                     <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-white/30">
                        <span>Min: {ing.estoque_minimo}</span>
                        <span>Crítico: {ing.estoque_critico}</span>
                     </div>
                  </div>
                )
             })}
          </div>
        </>
      )}

      {activeTab === 'ficha_tecnica' && <FichaTecnicaContent />}
      {activeTab === 'fornecedores' && <FornecedoresContent fornecedores={fornecedores} onUpdate={fetchData} />}

      {isModalOpen && <InsumoModal data={editingIngrediente} onClose={() => setIsModalOpen(false)} onSave={fetchData} />}
      {isEntryModalOpen && <EntradaEstoqueModal ingredientes={ingredientes} onClose={() => setIsEntryModalOpen(false)} onSave={fetchData} />}
    </div>
  )
}

function FornecedoresContent({ fornecedores, onUpdate }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  return (
    <div className="animate-fade-in">
       <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-white">Gestão de Fornecedores</h3>
          <button onClick={() => { setEditing({ nome_fantasia: '' }); setIsModalOpen(true); }} className="bg-[#e8391a] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#c72f15]">
             <span className="material-symbols-outlined">add</span> Novo Fornecedor
          </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fornecedores.map((f: any) => (
             <div key={f.id} className="bg-[#16181f] rounded-3xl p-6 border border-[#252830] shadow-lg">
                <div className="flex justify-between items-start mb-4">
                   <div className="w-12 h-12 rounded-2xl bg-[#e8391a]/10 flex items-center justify-center text-[#e8391a] font-bold text-xl">{f.nome_fantasia[0]}</div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-[#e8391a] p-1 px-2 bg-[#e8391a]/5 rounded-md">{f.categoria || 'Geral'}</span>
                </div>
                <h4 className="text-lg font-bold mb-1 text-white">{f.nome_fantasia}</h4>
                <p className="text-xs text-white/40 mb-4">{f.contato_nome || '---'}</p>
                <div className="space-y-2 border-t border-[#252830]/50 pt-4">
                   <div className="flex items-center gap-2 text-xs text-white/40"><span className="material-symbols-outlined text-[16px]">call</span> {f.telefone || 'Sem telefone'}</div>
                   <div className="flex items-center gap-2 text-xs text-white/40"><span className="material-symbols-outlined text-[16px]">mail</span> {f.email || 'Sem email'}</div>
                </div>
                <button 
                  onClick={() => window.open(`https://wa.me/55${f.telefone?.replace(/\D/g, '')}`, '_blank')}
                  className="w-full mt-6 bg-[#252830] py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                >Fazer Pedido Wpp</button>
             </div>
          ))}
       </div>
       {isModalOpen && <FornecedorModal data={editing} onClose={() => setIsModalOpen(false)} onSave={onUpdate} />}
    </div>
  )
}

function FichaTecnicaContent() {
  return (
    <div className="bg-[#16181f] rounded-3xl p-20 text-center border border-dashed border-[#252830] italic text-white/40 animate-fade-in">
       <span className="material-symbols-outlined text-6xl mb-4 opacity-20 text-[#e8391a]">architecture</span>
       <h3 className="text-xl font-bold not-italic text-white">Fichas Técnicas & Engenharia de Cardápio</h3>
       <p className="mt-2 text-sm max-w-md mx-auto text-white/40">Vincule seus produtos aos insumos do estoque para abatimento automático e cálculo de CMV em tempo real.</p>
    </div>
  )
}

function InsumoModal({ data, onClose, onSave }: any) {
   const [form, setForm] = useState(data)
   const [saving, setSaving] = useState(false)

   const save = async () => {
      setSaving(true)
      if (form.id) await supabase.from('ingredientes').update(form).eq('id', form.id)
      else await supabase.from('ingredientes').insert([form])
      onSave()
      onClose()
      setSaving(false)
   }

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
         <div className="bg-[#16181f] rounded-[2.5rem] w-full max-w-lg border border-[#252830] shadow-2xl animate-scale-in">
            <div className="p-8 border-b border-[#252830] flex justify-between items-center">
               <h3 className="text-2xl font-bold text-white">Novo Insumo</h3>
               <button onClick={onClose} className="text-white/60 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-8 grid grid-cols-2 gap-6">
               <label className="col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Nome do Item</span>
                  <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 mt-2 outline-none focus:border-[#e8391a] text-white"/>
               </label>
               <label>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Unidade</span>
                  <select value={form.unidade} onChange={e => setForm({...form, unidade: e.target.value})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 mt-2 outline-none text-white">
                     <option value="kg">Quilo (kg)</option>
                     <option value="g">Grama (g)</option>
                     <option value="lt">Litro (lt)</option>
                     <option value="ml">Mililitro (ml)</option>
                     <option value="un">Unidade (un)</option>
                  </select>
               </label>
               <label>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Categoria</span>
                  <input type="text" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 mt-2 outline-none focus:border-[#e8391a] text-white"/>
               </label>
               <label>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Estoque Mínimo</span>
                  <input type="number" value={form.estoque_minimo} onChange={e => setForm({...form, estoque_minimo: Number(e.target.value)})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 mt-2 outline-none text-white"/>
               </label>
               <label>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Estoque Crítico</span>
                  <input type="number" value={form.estoque_critico} onChange={e => setForm({...form, estoque_critico: Number(e.target.value)})} className="w-full bg-[#0c0e15] border border-red-500/50 rounded-2xl p-4 mt-2 outline-none text-white"/>
               </label>
            </div>
            <div className="p-8 bg-[#0c0e15] flex justify-end gap-4 rounded-b-[2.5rem]">
               <button onClick={onClose} className="px-6 py-2 text-xs font-black uppercase tracking-widest text-white/60">Cancelar</button>
               <button onClick={save} disabled={saving} className="bg-[#e8391a] text-white px-10 py-4 rounded-2xl text-xs font-black uppercase shadow-lg">{saving ? '...' : 'Salvar Insumo'}</button>
            </div>
         </div>
      </div>
   )
}

function EntradaEstoqueModal({ ingredientes, onClose, onSave }: any) {
   const [form, setForm] = useState({ ingrediente_id: '', quantidade: 0, valor_total: 0 })
   const [saving, setSaving] = useState(false)

   const save = async () => {
      setSaving(true)
      const { error: errEnt } = await supabase.from('entradas_estoque').insert([{
         ingrediente_id: form.ingrediente_id,
         quantidade: form.quantidade,
         valor_unitario: form.valor_total / form.quantidade,
         data_entrada: new Date().toISOString()
      }])

      if (!errEnt) {
         const ing = ingredientes.find((i: any) => i.id === form.ingrediente_id)
         const novoEstoque = ing.estoque_atual + form.quantidade
         const novoCusto = novoEstoque > 0 ? ((ing.estoque_atual * ing.custo_medio) + Number(form.valor_total)) / novoEstoque : 0

         await supabase.from('ingredientes').update({
            estoque_atual: novoEstoque,
            custo_medio: novoCusto,
            last_update: new Date().toISOString()
         }).eq('id', form.ingrediente_id)
         
         onSave()
         onClose()
      }
      setSaving(false)
   }

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
         <div className="bg-[#16181f] rounded-[2.5rem] w-full max-w-md border border-[#252830] shadow-2xl animate-scale-in">
            <div className="p-8 border-b border-[#252830]">
               <h3 className="text-2xl font-bold text-[#e8391a]">Entrada de Mercadoria</h3>
            </div>
            <div className="p-8 space-y-6">
               <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Selecionar Insumo</span>
                  <select value={form.ingrediente_id} onChange={e => setForm({...form, ingrediente_id: e.target.value})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 mt-2 outline-none text-white">
                     <option value="">Selecione...</option>
                     {ingredientes.map((i: any) => <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>)}
                  </select>
               </label>
               <div className="grid grid-cols-2 gap-4">
                  <label>
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Quantidade</span>
                     <input type="number" value={form.quantidade || ''} onChange={e => setForm({...form, quantidade: Number(e.target.value)})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 mt-2 outline-none font-bold text-xl text-white"/>
                  </label>
                  <label>
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Valor Total (NF)</span>
                     <input type="number" step="0.01" value={form.valor_total || ''} onChange={e => setForm({...form, valor_total: Number(e.target.value)})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 mt-2 outline-none font-bold text-xl text-emerald-400"/>
                  </label>
               </div>
            </div>
            <div className="p-8 bg-[#0c0e15] flex justify-end gap-4 rounded-b-[2.5rem]">
               <button onClick={onClose} className="px-6 py-2 text-xs font-black uppercase tracking-widest text-white/60">Cancelar</button>
               <button onClick={save} disabled={saving || !form.ingrediente_id || !form.quantidade} className="bg-emerald-500 text-white px-10 py-4 rounded-2xl text-xs font-black uppercase shadow-lg shadow-emerald-500/20">Registrar Entrada</button>
            </div>
         </div>
      </div>
   )
}

function FornecedorModal({ data, onClose, onSave }: any) {
   const [form, setForm] = useState(data)
   const [saving, setSaving] = useState(false)

   const save = async () => {
      setSaving(true)
      if (form.id) await supabase.from('fornecedores').update(form).eq('id', form.id)
      else await supabase.from('fornecedores').insert([form])
      onSave()
      onClose()
      setSaving(false)
   }

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
         <div className="bg-[#16181f] rounded-[2.5rem] w-full max-w-lg border border-[#252830] shadow-2xl animate-scale-in">
            <div className="p-8 border-b border-[#252830]">
               <h3 className="text-2xl font-bold text-white">Novo Fornecedor</h3>
            </div>
            <div className="p-8 space-y-4">
               <label className="block">
                  <span className="text-[10px] font-black uppercase text-white/50">Nome Fantasia</span>
                  <input type="text" value={form.nome_fantasia} onChange={e => setForm({...form, nome_fantasia: e.target.value})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 mt-2 text-white outline-none focus:border-[#e8391a]"/>
               </label>
               <div className="grid grid-cols-2 gap-4">
                  <label>
                     <span className="text-[10px] font-black uppercase text-white/50">Contato</span>
                     <input type="text" value={form.contato_nome} onChange={e => setForm({...form, contato_nome: e.target.value})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 mt-2 text-white outline-none focus:border-[#e8391a]"/>
                  </label>
                  <label>
                     <span className="text-[10px] font-black uppercase text-white/50">Telefone</span>
                     <input type="text" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 mt-2 text-white outline-none focus:border-[#e8391a]"/>
                  </label>
               </div>
            </div>
            <div className="p-8 bg-[#0c0e15] flex justify-end gap-3 rounded-b-[2.5rem]">
               <button onClick={onClose} className="px-6 py-2 text-xs font-black uppercase tracking-widest text-white/60">Cancelar</button>
               <button onClick={save} disabled={saving} className="bg-[#e8391a] text-white px-10 py-4 rounded-2xl text-xs font-black uppercase">Salvar Fornecedor</button>
            </div>
         </div>
      </div>
   )
}
