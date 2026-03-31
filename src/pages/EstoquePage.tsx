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
    <div className="animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <span className="text-secondary font-bold uppercase tracking-[0.3em] text-[10px] mb-2 block">Backoffice & Insumos</span>
          <h2 className="text-5xl font-[Outfit] font-bold text-on-background tracking-tighter">Estoque</h2>
        </div>
        
        <div className="flex bg-surface-container rounded-2xl p-1 border border-outline-variant/10">
          {[
            { id: 'movimentacao', label: 'Insumos', icon: 'inventory_2' },
            { id: 'ficha_tecnica', label: 'Fichas Técnicas', icon: 'receipt_long' },
            { id: 'fornecedores', label: 'Fornecedores', icon: 'local_shipping' }
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

        {activeTab === 'movimentacao' && (
          <div className="flex gap-2">
             <button 
              onClick={() => setIsEntryModalOpen(true)}
              className="bg-surface-container-highest text-on-surface px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-surface-container-high transition-all border border-outline-variant/10"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Entrada
            </button>
            <button 
              onClick={() => { setEditingIngrediente({ nome: '', unidade: 'un', estoque_atual: 0, estoque_minimo: 0, estoque_critico: 0, custo_medio: 0, categoria: '' }); setIsModalOpen(true); }}
              className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-[20px]">post_add</span>
              Novo Insumo
            </button>
          </div>
        )}
      </div>

      {activeTab === 'movimentacao' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10">
               <div className="flex items-center justify-between mb-4">
                  <span className="material-symbols-outlined text-on-surface-variant">inventory</span>
                  <span className="text-2xl font-bold font-[Outfit]">{stats.total}</span>
               </div>
               <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">Total Insumos</span>
            </div>
            
            <div className={`bg-surface-container rounded-2xl p-6 border ${stats.critico > 0 ? 'border-error animate-pulse' : 'border-outline-variant/10'}`}>
               <div className="flex items-center justify-between mb-4">
                  <span className={`material-symbols-outlined ${stats.critico > 0 ? 'text-error' : 'text-on-surface-variant/20'}`}>report</span>
                  <span className={`text-2xl font-bold font-[Outfit] ${stats.critico > 0 ? 'text-error' : ''}`}>{stats.critico}</span>
               </div>
               <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">Estoque Crítico</span>
            </div>

            <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10">
               <div className="flex items-center justify-between mb-4">
                  <span className={`material-symbols-outlined ${stats.baixo > 0 ? 'text-yellow-500' : 'text-on-surface-variant/20'}`}>warning</span>
                  <span className={`text-2xl font-bold font-[Outfit] ${stats.baixo > 0 ? 'text-yellow-500' : ''}`}>{stats.baixo}</span>
               </div>
               <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">Estoque Baixo</span>
            </div>

            <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10 text-right">
               <div className="flex items-center justify-between mb-4">
                  <span className="material-symbols-outlined text-green-500">payments</span>
                  <span className="text-xl font-bold font-[Outfit] text-green-500">R$ {stats.valor_total.toFixed(2)}</span>
               </div>
               <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">Valor em Estoque</span>
            </div>
          </div>

          <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/10 mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input 
                type="text" 
                placeholder="Buscar insumo ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {loading ? (
                <div className="col-span-full py-20 text-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
             ) : filteredIngredientes.map(ing => {
                const perc = Math.min((ing.estoque_atual / (ing.estoque_minimo * 2)) * 100, 100)
                let color = 'bg-primary'
                if (ing.estoque_atual <= ing.estoque_critico) color = 'bg-error'
                else if (ing.estoque_atual <= ing.estoque_minimo) color = 'bg-yellow-500'

                return (
                  <div key={ing.id} className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 group hover:border-primary/30 transition-all shadow-lg hover:shadow-primary/5">
                     <div className="flex justify-between items-start mb-4">
                        <div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{ing.categoria}</span>
                           <h4 className="text-lg font-bold text-on-surface">{ing.nome}</h4>
                        </div>
                        <button className="p-2 hover:bg-primary/10 rounded-xl text-primary opacity-0 group-hover:opacity-100 transition-all"><span className="material-symbols-outlined">edit</span></button>
                     </div>
                     
                     <div className="flex justify-between items-end mb-2">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold uppercase text-on-surface-variant">Estoque Atual</span>
                           <span className={`text-2xl font-black font-[Outfit] ${ing.estoque_atual <= ing.estoque_critico ? 'text-error' : ''}`}>{ing.estoque_atual} <span className="text-xs font-normal opacity-50">{ing.unidade}</span></span>
                        </div>
                        <div className="text-right">
                           <span className="text-[10px] font-bold uppercase text-on-surface-variant">Custo Médio</span>
                           <div className="text-sm font-bold text-green-500">R$ {ing.custo_medio.toFixed(2)}</div>
                        </div>
                     </div>

                     <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden mb-4">
                        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${perc}%` }} />
                     </div>

                     <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-on-surface-variant/40">
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

// SUB-COMPONENTS
function FornecedoresContent({ fornecedores, onUpdate }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  return (
    <div className="animate-fade-in">
       <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold font-[Outfit]">Gestão de Fornecedores</h3>
          <button onClick={() => { setEditing({ nome_fantasia: '' }); setIsModalOpen(true); }} className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2">
             <span className="material-symbols-outlined">add</span> Novo Fornecedor
          </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fornecedores.map((f: any) => (
             <div key={f.id} className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                   <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">{f.nome_fantasia[0]}</div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-primary p-1 px-2 bg-primary/5 rounded-md">{f.categoria || 'Geral'}</span>
                </div>
                <h4 className="text-lg font-bold mb-1">{f.nome_fantasia}</h4>
                <p className="text-xs text-on-surface-variant mb-4">{f.contato_nome || '---'}</p>
                <div className="space-y-2 border-t border-outline-variant/5 pt-4">
                   <div className="flex items-center gap-2 text-xs text-on-surface-variant"><span className="material-symbols-outlined text-[16px]">call</span> {f.telefone || 'Sem telefone'}</div>
                   <div className="flex items-center gap-2 text-xs text-on-surface-variant"><span className="material-symbols-outlined text-[16px]">mail</span> {f.email || 'Sem email'}</div>
                </div>
                <button 
                  onClick={() => window.open(`https://wa.me/55${f.telefone?.replace(/\D/g, '')}`, '_blank')}
                  className="w-full mt-6 bg-surface-container-highest py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all"
                >Fazer Pedido Wpp</button>
             </div>
          ))}
       </div>
       {isModalOpen && <FornecedorModal data={editing} onClose={() => setIsModalOpen(false)} onSave={onUpdate} />}
    </div>
  )
}

function FichaTecnicaContent() {
  // Placeholder para Módulo 4 parte 2
  return (
    <div className="bg-surface-container rounded-3xl p-20 text-center border border-dashed border-outline-variant/20 italic text-on-surface-variant animate-fade-in">
       <span className="material-symbols-outlined text-6xl mb-4 opacity-20 text-primary">architecture</span>
       <h3 className="text-xl font-bold not-italic text-on-surface">Fichas Técnicas & Engenharia de Cardápio</h3>
       <p className="mt-2 text-sm max-w-md mx-auto">Vincule seus produtos aos insumos do estoque para abatimento automático e cálculo de CMV (Custo de Mercadoria Vendida) em tempo real.</p>
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
         <div className="bg-surface-container rounded-[2.5rem] w-full max-w-lg border border-outline-variant/10 shadow-2xl animate-scale-in">
            <div className="p-8 border-b border-outline-variant/5 flex justify-between items-center">
               <h3 className="text-2xl font-bold font-[Outfit]">Novo Insumo</h3>
               <button onClick={onClose}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-8 grid grid-cols-2 gap-6">
               <label className="col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Nome do Item</span>
                  <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 mt-2 outline-none focus:ring-1 focus:ring-primary"/>
               </label>
               <label>
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Unidade</span>
                  <select value={form.unidade} onChange={e => setForm({...form, unidade: e.target.value})} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 mt-2 outline-none">
                     <option value="kg">Quilo (kg)</option>
                     <option value="g">Grama (g)</option>
                     <option value="lt">Litro (lt)</option>
                     <option value="ml">Mililitro (ml)</option>
                     <option value="un">Unidade (un)</option>
                  </select>
               </label>
               <label>
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Categoria</span>
                  <input type="text" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 mt-2 outline-none focus:ring-1 focus:ring-primary"/>
               </label>
               <label>
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Estoque Mínimo</span>
                  <input type="number" value={form.estoque_minimo} onChange={e => setForm({...form, estoque_minimo: Number(e.target.value)})} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 mt-2 outline-none"/>
               </label>
               <label>
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Estoque Crítico</span>
                  <input type="number" value={form.estoque_critico} onChange={e => setForm({...form, estoque_critico: Number(e.target.value)})} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 mt-2 outline-none border-error/50 focus:ring-error"/>
               </label>
            </div>
            <div className="p-8 bg-surface-container-high flex justify-end gap-4 rounded-b-[2.5rem]">
               <button onClick={onClose} className="px-6 py-2 text-xs font-black uppercase tracking-widest">Cancelar</button>
               <button onClick={save} disabled={saving} className="bg-primary text-white px-10 py-4 rounded-2xl text-xs font-black uppercase shadow-lg shadow-primary/20">{saving ? '...' : 'Salvar Insumo'}</button>
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
      // 1. Registrar entrada
      const { error: errEnt } = await supabase.from('entradas_estoque').insert([{
         ingrediente_id: form.ingrediente_id,
         quantidade: form.quantidade,
         valor_unitario: form.valor_total / form.quantidade,
         data_entrada: new Date().toISOString()
      }])

      if (!errEnt) {
         // 2. Atualizar estoque atual e custo médio no ingrediente
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
         <div className="bg-surface-container rounded-[2.5rem] w-full max-w-md border border-outline-variant/10 shadow-2xl animate-scale-in">
            <div className="p-8 border-b border-outline-variant/5">
               <h3 className="text-2xl font-bold font-[Outfit] text-primary">Entrada de Mercadoria</h3>
            </div>
            <div className="p-8 space-y-6">
               <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Selecionar Insumo</span>
                  <select value={form.ingrediente_id} onChange={e => setForm({...form, ingrediente_id: e.target.value})} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 mt-2 outline-none">
                     <option value="">Selecione...</option>
                     {ingredientes.map((i: any) => <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>)}
                  </select>
               </label>
               <div className="grid grid-cols-2 gap-4">
                  <label>
                     <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Quantidade</span>
                     <input type="number" value={form.quantidade || ''} onChange={e => setForm({...form, quantidade: Number(e.target.value)})} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 mt-2 outline-none font-bold text-xl"/>
                  </label>
                  <label>
                     <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Valor Total (NF)</span>
                     <input type="number" step="0.01" value={form.valor_total || ''} onChange={e => setForm({...form, valor_total: Number(e.target.value)})} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 mt-2 outline-none font-bold text-xl text-green-500"/>
                  </label>
               </div>
            </div>
            <div className="p-8 bg-surface-container-high flex justify-end gap-4 rounded-b-[2.5rem]">
               <button onClick={onClose} className="px-6 py-2 text-xs font-black uppercase tracking-widest">Cancelar</button>
               <button onClick={save} disabled={saving || !form.ingrediente_id || !form.quantidade} className="bg-green-500 text-white px-10 py-4 rounded-2xl text-xs font-black uppercase shadow-lg shadow-green-500/20">Registrar Entrada</button>
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
         <div className="bg-surface-container rounded-[2.5rem] w-full max-w-lg border border-outline-variant/10 shadow-2xl animate-scale-in">
            <div className="p-8 border-b border-outline-variant/5">
               <h3 className="text-2xl font-bold font-[Outfit]">Novo Fornecedor</h3>
            </div>
            <div className="p-8 space-y-4">
               <label className="block">
                  <span className="text-[10px] font-black uppercase text-on-surface-variant">Nome Fantasia</span>
                  <input type="text" value={form.nome_fantasia} onChange={e => setForm({...form, nome_fantasia: e.target.value})} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 mt-2"/>
               </label>
               <div className="grid grid-cols-2 gap-4">
                  <label>
                     <span className="text-[10px] font-black uppercase text-on-surface-variant">Contato</span>
                     <input type="text" value={form.contato_nome} onChange={e => setForm({...form, contato_nome: e.target.value})} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 mt-2"/>
                  </label>
                  <label>
                     <span className="text-[10px] font-black uppercase text-on-surface-variant">Telefone</span>
                     <input type="text" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 mt-2"/>
                  </label>
               </div>
            </div>
            <div className="p-8 bg-surface-container-high flex justify-end gap-3 rounded-b-[2.5rem]">
               <button onClick={onClose} className="px-6 py-2 text-xs font-black uppercase tracking-widest">Cancelar</button>
               <button onClick={save} disabled={saving} className="bg-primary text-white px-10 py-4 rounded-2xl text-xs font-black uppercase">Salvar Fornecedor</button>
            </div>
         </div>
      </div>
   )
}
