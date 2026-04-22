import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRealtime } from '../hooks/useRealtime'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ingredienteSchema } from '../schemas/ingredienteSchema'

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
  const { user } = useAuth()
  const tenantId = user?.id
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
    const { data: ing } = await supabase.from('ingredientes').select('*').eq('tenant_id', tenantId).order('nome')
    const { data: forn } = await supabase.from('fornecedores').select('*').eq('tenant_id', tenantId).order('nome_fantasia')
    setIngredientes(ing || [])
    setFornecedores(forn || [])
    setLoading(false)
  }, [tenantId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useRealtime({
  configs: [
    { table: 'ingredientes', filter: `tenant_id=eq.${tenantId}`, callback: fetchData },
    { table: 'fornecedores', filter: `tenant_id=eq.${tenantId}`, callback: fetchData }
  ]
})

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
    <div className="animate-fade-in-up pb-10 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-6 md:mb-8">
        <div>
          <span className="text-[#ff9800] font-bold uppercase tracking-[0.3em] text-[10px] mb-2 block">Backoffice & Insumos</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-on-background tracking-tight">Estoque</h2>
        </div>
        
        <div className="flex bg-surface-container rounded-2xl p-1 border border-outline overflow-x-auto">
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
                ? 'bg-primary text-on-primary shadow-lg' 
                : 'text-on-surface-variant hover:text-on-surface hover:bg-outline'
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
              className="bg-outline text-on-background px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-80 transition-all border border-outline"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Entrada
            </button>
            <button 
              onClick={() => { setEditingIngrediente({ nome: '', unidade: 'un', estoque_atual: 0, estoque_minimo: 0, estoque_critico: 0, custo_medio: 0, categoria: '' }); setIsModalOpen(true); }}
              className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all shadow-lg"
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
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-6 border border-primary/30">
               <div className="flex items-center justify-between mb-4">
                  <span className="material-symbols-outlined text-primary">inventory</span>
                  <span className="text-2xl font-bold text-on-background">{stats.total}</span>
               </div>
               <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">Total Insumos</span>
            </div>
            
            <div className={`bg-gradient-to-br from-red-500/20 to-red-500/5 rounded-2xl p-6 border ${stats.critico > 0 ? 'border-red-500/30 animate-pulse' : 'border-outline'}`}>
               <div className="flex items-center justify-between mb-4">
                  <span className={`material-symbols-outlined ${stats.critico > 0 ? 'text-red-500' : 'text-on-surface-variant'}`}>report</span>
                  <span className={`text-2xl font-bold ${stats.critico > 0 ? 'text-red-500' : 'text-on-background'}`}>{stats.critico}</span>
               </div>
               <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">Estoque Crítico</span>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 rounded-2xl p-6 border border-yellow-500/30">
               <div className="flex items-center justify-between mb-4">
                  <span className="material-symbols-outlined text-yellow-400">warning</span>
                  <span className="text-2xl font-bold text-yellow-400">{stats.baixo}</span>
               </div>
               <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">Estoque Baixo</span>
            </div>

            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-2xl p-6 border border-emerald-500/30 text-right">
               <div className="flex items-center justify-between mb-4">
                  <span className="material-symbols-outlined text-emerald-400">payments</span>
                  <span className="text-xl font-bold text-emerald-400">R$ {stats.valor_total.toFixed(2)}</span>
               </div>
               <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">Valor em Estoque</span>
            </div>
          </div>

          <div className="bg-surface-container rounded-2xl p-4 border border-outline mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input 
                type="text" 
                placeholder="Buscar insumo ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline rounded-xl py-3 pl-12 pr-4 text-sm text-on-background placeholder-on-surface-variant focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {loading ? (
                <div className="col-span-full py-20 text-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
             ) : filteredIngredientes.map(ing => {
                const perc = Math.min((ing.estoque_atual / (ing.estoque_minimo * 2)) * 100, 100)
                let color = 'bg-primary'
                if (ing.estoque_atual <= ing.estoque_critico) color = 'bg-red-500'
                else if (ing.estoque_atual <= ing.estoque_minimo) color = 'bg-yellow-500'

                return (
                  <div key={ing.id} className="bg-surface-container rounded-3xl p-6 border border-outline group hover:border-primary/30 transition-all shadow-lg hover:shadow-primary/5">
                     <div className="flex justify-between items-start mb-4">
                        <div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{ing.categoria}</span>
                           <h4 className="text-lg font-bold text-on-background">{ing.nome}</h4>
                        </div>
                        <button className="p-2 hover:bg-primary/10 rounded-xl text-primary opacity-0 group-hover:opacity-100 transition-all"><span className="material-symbols-outlined">edit</span></button>
                     </div>
                     
                     <div className="flex justify-between items-end mb-2">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold uppercase text-on-surface-variant">Estoque Atual</span>
                           <span className={`text-2xl font-black ${ing.estoque_atual <= ing.estoque_critico ? 'text-red-500' : 'text-on-background'}`}>{ing.estoque_atual} <span className="text-xs font-normal opacity-50">{ing.unidade}</span></span>
                        </div>
                        <div className="text-right">
                           <span className="text-[10px] font-bold uppercase text-on-surface-variant">Custo Médio</span>
                           <div className="text-sm font-bold text-emerald-400">R$ {ing.custo_medio.toFixed(2)}</div>
                        </div>
                     </div>

                     <div className="w-full h-2 bg-outline rounded-full overflow-hidden mb-4">
                        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${perc}%` }} />
                     </div>

                     <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-on-surface-variant/50">
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
  const { user } = useAuth()
  const tenantId = user?.id
  const [produtos, setProdutos] = useState<any[]>([])
  const [ingredientesList, setIngredientesList] = useState<any[]>([])
  const [selectedProduto, setSelectedProduto] = useState('')
  const [selectedTamanho, setSelectedTamanho] = useState('')
  const [tamanhos, setTamanhos] = useState<string[]>([])
  const [fichaItens, setFichaItens] = useState<any[]>([])
  const [novoIngrediente, setNovoIngrediente] = useState('')
  const [novaQuantidade, setNovaQuantidade] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!tenantId) return
      setLoading(true)
      const [produtosData, ingData] = await Promise.all([
        supabase.from('produtos').select('id, nome').eq('tenant_id', tenantId).order('nome'),
        supabase.from('ingredientes').select('id, nome, unidade').eq('tenant_id', tenantId).order('nome')
      ])
      setProdutos(produtosData.data || [])
      setIngredientesList(ingData.data || [])
      setLoading(false)
    }
    fetchData()
  }, [tenantId])

  useEffect(() => {
    async function fetchTamanhos() {
      if (!selectedProduto) {
        setTamanhos([])
        return
      }
      const { data } = await supabase.from('precos_tamanho').select('tamanho').eq('tenant_id', tenantId).eq('produto_id', selectedProduto)
      const uniqueTamanhos = data?.map(t => t.tamanho).filter((v, i, a) => a.indexOf(v) === i) || []
      setTamanhos(uniqueTamanhos)
      setSelectedTamanho('')
    }
    fetchTamanhos()
  }, [selectedProduto])

  useEffect(() => {
    async function fetchFicha() {
      if (!selectedProduto) {
        setFichaItens([])
        return
      }
      let query = supabase.from('ficha_tecnica').select('id, ingrediente_id, quantidade, tamanho').eq('produto_id', selectedProduto).eq('tenant_id', tenantId)
      if (selectedTamanho) {
        query = query.eq('tamanho', selectedTamanho)
      }
      const { data } = await query
      const itens = (data || []).map(item => {
        const ing = ingredientesList.find(i => i.id === item.ingrediente_id)
        return {
          ...item,
          ingrediente_nome: ing?.nome || '',
          ingrediente_unidade: ing?.unidade || 'un'
        }
      })
      setFichaItens(itens)
    }
    fetchFicha()
  }, [selectedProduto, selectedTamanho, tenantId, ingredientesList])

  const handleAddIngrediente = async () => {
    if (!novoIngrediente || !novaQuantidade) return
    const ing = ingredientesList.find(i => i.id === novoIngrediente)
    if (!ing) return
    setFichaItens([...fichaItens, {
      ingrediente_id: novoIngrediente,
      ingrediente_nome: ing.nome,
      ingrediente_unidade: ing.unidade,
      quantidade: Number(novaQuantidade),
      isNew: true
    }])
    setNovoIngrediente('')
    setNovaQuantidade('')
  }

  const handleRemoveIngrediente = (index: number) => {
    setFichaItens(fichaItens.filter((_, i) => i !== index))
  }

  const handleUpdateQuantidade = (index: number, quantidade: number) => {
    const newItens = [...fichaItens]
    newItens[index].quantidade = quantidade
    setFichaItens(newItens)
  }

  const handleSave = async () => {
    if (!selectedProduto || saving) return
    setSaving(true)
    try {
      const currentItems = fichaItens.filter(i => !i.isNew)
      const currentIds = currentItems.map(i => i.id)
      const existingItems = await supabase.from('ficha_tecnica')
        .select('id')
        .eq('produto_id', selectedProduto)
        .eq('tenant_id', tenantId)
        .eq('tamanho', selectedTamanho || null)
      const existingIds = existingItems.data?.map(i => i.id) || []
      const toDelete = existingIds.filter(id => !currentIds.includes(id))
      if (toDelete.length > 0) {
        await supabase.from('ficha_tecnica').delete().in('id', toDelete).eq('tenant_id', tenantId)
      }
      for (const item of fichaItens) {
        if (item.isNew) {
          await supabase.from('ficha_tecnica').insert([{
            produto_id: selectedProduto,
            ingrediente_id: item.ingrediente_id,
            quantidade: item.quantidade,
            tamanho: selectedTamanho || null,
            tenant_id: tenantId
          }])
        } else {
          await supabase.from('ficha_tecnica').update({
            quantidade: item.quantidade
          }).eq('id', item.id).eq('tenant_id', tenantId)
        }
      }
      const { data } = await supabase.from('ficha_tecnica').select('id, ingrediente_id, quantidade, tamanho')
        .eq('tenant_id', tenantId)
        .eq('produto_id', selectedProduto)
        .eq('tamanho', selectedTamanho || null)
      const itens = (data || []).map(item => {
        const ing = ingredientesList.find(i => i.id === item.ingrediente_id)
        return {
          ...item,
          ingrediente_nome: ing?.nome || '',
          ingrediente_unidade: ing?.unidade || 'un'
        }
      })
      setFichaItens(itens)
    } catch (error) {
      console.error('Error saving ficha tecnica:', error)
    }
    setSaving(false)
  }

  const availableIngredientes = ingredientesList.filter(ing => 
    !fichaItens.some(fi => fi.ingrediente_id === ing.id)
  )

  if (loading) {
    return (
      <div className="bg-[#16181f] rounded-3xl p-20 text-center border border-[#252830]">
        <div className="w-10 h-10 border-4 border-[#e8391a] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="bg-[#16181f] rounded-3xl p-6 md:p-8 border border-[#252830] animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#e8391a]">Engenharia de Cardápio</span>
          <h3 className="text-2xl font-bold text-white">Fichas Técnicas</h3>
          <p className="text-sm text-white/40 mt-1">Vincule ingredientes aos produtos para cálculo automático de CMV</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1 block mb-2">Produto</label>
          <select 
            value={selectedProduto} 
            onChange={(e) => { setSelectedProduto(e.target.value); setSelectedTamanho(''); }}
            className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 outline-none text-white focus:border-[#e8391a]"
          >
            <option value="">Selecione um produto...</option>
            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        
        {tamanhos.length > 0 && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1 block mb-2">Tamanho</label>
            <select 
              value={selectedTamanho} 
              onChange={(e) => setSelectedTamanho(e.target.value)}
              className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 outline-none text-white focus:border-[#e8391a]"
            >
              <option value="">Selecione o tamanho...</option>
              {tamanhos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>

      {selectedProduto && (
        <>
          <div className="border-t border-[#252830] pt-6 mb-6">
            <h4 className="text-lg font-bold text-white mb-4">Ingredientes da Ficha</h4>
            
            {fichaItens.length === 0 ? (
              <div className="text-center py-8 text-white/40 italic">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-20">recipe</span>
                <p>Nenhum ingrediente cadastrado nesta ficha técnica</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fichaItens.map((item, index) => (
                  <div key={item.id || index} className="flex flex-col md:flex-row md:items-center gap-3 bg-[#0c0e15] rounded-2xl p-4 border border-[#252830]">
                    <div className="flex-1">
                      <span className="text-sm font-bold text-white">{item.ingrediente_nome}</span>
                      <span className="text-xs text-white/40 ml-2">({item.ingrediente_unidade})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        value={item.quantidade || ''}
                        onChange={(e) => handleUpdateQuantidade(index, Number(e.target.value))}
                        className="w-24 bg-[#16181f] border border-[#252830] rounded-xl p-2 text-center text-white font-bold"
                      />
                      <button 
                        onClick={() => handleRemoveIngrediente(index)}
                        className="p-2 hover:bg-red-500/20 rounded-xl text-red-500 transition-all"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[#252830] pt-6 mb-6">
            <h4 className="text-lg font-bold text-white mb-4">Adicionar Ingrediente</h4>
            <div className="flex flex-col md:flex-row gap-3">
              <select 
                value={novoIngrediente} 
                onChange={(e) => setNovoIngrediente(e.target.value)}
                className="flex-1 bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 outline-none text-white focus:border-[#e8391a]"
              >
                <option value="">Selecione um ingrediente...</option>
                {availableIngredientes.map(ing => <option key={ing.id} value={ing.id}>{ing.nome} ({ing.unidade})</option>)}
              </select>
              <input 
                type="number" 
                step="0.01"
                min="0"
                placeholder="Quantidade"
                value={novaQuantidade}
                onChange={(e) => setNovaQuantidade(e.target.value)}
                className="w-32 bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 outline-none text-white font-bold"
              />
              <button 
                onClick={handleAddIngrediente}
                disabled={!novoIngrediente || !novaQuantidade}
                className="bg-[#252830] hover:bg-[#e8391a] px-6 py-3 rounded-2xl font-bold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          </div>

          <div className="border-t border-[#252830] pt-6">
            <button 
              onClick={handleSave}
              disabled={saving || fichaItens.length === 0}
              className="w-full bg-[#e8391a] hover:bg-[#c72f15] text-white px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-lg shadow-[#e8391a]/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : 'Salvar Ficha Técnica'}
            </button>
          </div>
        </>
      )}

      {!selectedProduto && (
        <div className="text-center py-12 text-white/40 italic">
          <span className="material-symbols-outlined text-6xl mb-4 opacity-20 text-[#e8391a]">architecture</span>
          <p className="text-sm">Selecione um produto acima para gerenciar sua ficha técnica</p>
        </div>
      )}
    </div>
  )
}

function InsumoModal({ data, onClose, onSave }: any) {
   const { user } = useAuth()
   const tenantId = user?.id
   const [saving, setSaving] = useState(false)

const { register, handleSubmit, formState: { errors } } = useForm({
      resolver: zodResolver(ingredienteSchema),
      defaultValues: {
        nome: data?.nome || '',
        unidade: data?.unidade || 'un',
        estoque_atual: data?.estoque_atual || 0,
        estoque_minimo: data?.estoque_minimo || 0,
        custo_medio: data?.custo_medio || 0,
        categoria: data?.categoria || ''
      }
    })

const onSubmit = async (formData: any) => {
      setSaving(true)
      const payload = {
        nome: formData.nome,
        unidade: formData.unidade,
        estoque_atual: formData.estoque_atual,
        estoque_minimo: formData.estoque_minimo,
        estoque_critico: Math.floor(formData.estoque_minimo * 0.5),
        custo_medio: formData.custo_medio,
        categoria: formData.categoria,
        tenant_id: tenantId
      }
     if (data?.id) {
       await supabase.from('ingredientes').update(payload).eq('id', data.id).eq('tenant_id', tenantId)
     } else {
       await supabase.from('ingredientes').insert([{ ...payload, tenant_id: tenantId }])
     }
     onSave()
     onClose()
     setSaving(false)
   }

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
         <div className="bg-[#16181f] rounded-[2.5rem] w-full max-w-lg border border-[#252830] shadow-2xl animate-scale-in">
            <div className="p-8 border-b border-[#252830] flex justify-between items-center">
               <h3 className="text-2xl font-bold text-white">{data?.id ? 'Editar' : 'Novo'} Insumo</h3>
               <button onClick={onClose} className="text-white/60 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-8 grid grid-cols-2 gap-6">
               <label className="col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Nome do Item</span>
                  <input type="text" {...register('nome')} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 mt-2 outline-none focus:border-[#e8391a] text-white"/>
                  {errors.nome && <span className="text-red-400 text-xs mt-1 block">{errors.nome.message as string}</span>}
               </label>
               <label>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Unidade</span>
                  <select {...register('unidade')} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 mt-2 outline-none text-white">
                     <option value="kg">Quilo (kg)</option>
                     <option value="g">Grama (g)</option>
                     <option value="lt">Litro (lt)</option>
                     <option value="ml">Mililitro (ml)</option>
                     <option value="un">Unidade (un)</option>
                  </select>
                  {errors.unidade && <span className="text-red-400 text-xs mt-1 block">{errors.unidade.message as string}</span>}
               </label>
               <label>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Categoria</span>
                  <input type="text" {...register('categoria')} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 mt-2 outline-none focus:border-[#e8391a] text-white"/>
               </label>
<label>
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Qtd Mínima</span>
                   <input type="number" step="0.01" {...register('estoque_minimo', { valueAsNumber: true })} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 mt-2 outline-none text-white"/>
                   {errors.estoque_minimo && <span className="text-red-400 text-xs mt-1 block">{errors.estoque_minimo.message as string}</span>}
                </label>
                <label>
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Custo Unit.</span>
                   <input type="number" step="0.01" {...register('custo_medio', { valueAsNumber: true })} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl p-4 mt-2 outline-none text-white"/>
                   {errors.custo_medio && <span className="text-red-400 text-xs mt-1 block">{errors.custo_medio.message as string}</span>}
                </label>
            </form>
            <div className="p-8 bg-[#0c0e15] flex justify-end gap-4 rounded-b-[2.5rem]">
               <button onClick={onClose} className="px-6 py-2 text-xs font-black uppercase tracking-widest text-white/60">Cancelar</button>
               <button onClick={handleSubmit(onSubmit)} disabled={saving} className="bg-[#e8391a] text-white px-10 py-4 rounded-2xl text-xs font-black uppercase shadow-lg">{saving ? '...' : 'Salvar Insumo'}</button>
            </div>
         </div>
      </div>
   )
}

function EntradaEstoqueModal({ ingredientes, onClose, onSave }: any) {
   const { user } = useAuth()
   const tenantId = user?.id
   const [form, setForm] = useState({ ingrediente_id: '', quantidade: 0, valor_total: 0 })
   const [saving, setSaving] = useState(false)

   const save = async () => {
      setSaving(true)
      const { error: errEnt } = await supabase.from('entradas_estoque').insert([{
         tenant_id: tenantId,
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
         }).eq('id', form.ingrediente_id).eq('tenant_id', tenantId)
         
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
   const { user } = useAuth()
   const tenantId = user?.id
   const [form, setForm] = useState(data)
   const [saving, setSaving] = useState(false)

   const save = async () => {
      setSaving(true)
      if (form.id) await supabase.from('fornecedores').update({ ...form, tenant_id: tenantId }).eq('id', form.id).eq('tenant_id', tenantId)
      else await supabase.from('fornecedores').insert([{ ...form, tenant_id: tenantId }])
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
