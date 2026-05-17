import { useCallback, useEffect, useRef } from 'react'
import { usePdvState } from './usePdvState'
import { usePdvApi, type CreatePedidoData } from './usePdvApi'
import { usePdvUI } from './usePdvUI'
import { usePdvOffline } from './usePdvOffline'
import { useRealtime } from './useRealtime'
import { syncCliente } from '../lib/syncCliente'
import type { Produto } from '../pages/CardapioOnlinePage'
import type { Mesa, ItemPedido } from './usePdv'

// Re-export types for backward compatibility
export type { Produto } from '../pages/CardapioOnlinePage'
export interface Categoria {
  id: string
  nome: string
}
export interface ItemPedido {
  produto: Produto
  quantidade: number
  observacoes: string
  tamanho?: string
  sabor1?: string
  sabor2?: string
  tipoPizza?: 'inteiro' | 'meio-a-meio'
  adicionais?: string
  pontoCarne?: string
}
export interface Mesa {
  id: string
  numero: number
  capacidade: number
  status: string
  responsavel: string
  pessoas: number
  aberta_em: string
}
export interface PrecoTamanho {
  id: string
  produto_id: string
  tamanho: string
  preco: number
}
export interface Sabor {
  id: string
  nome: string
  descricao: string
  disponivel: boolean
}

// ============================================
// HOOK PRINCIPAL (COMBINADOR)
// ============================================

export function usePdv() {
  const pedidoAtualRef = useRef<HTMLDivElement>(null)
  
  // Hooks especializados
  const state = usePdvState()
  const api = usePdvApi(state.tenantId)
  const offline = usePdvOffline()
  
  // UI hook dependencies
  const ui = usePdvUI({
    produtos: state.produtos,
    precosTamanho: state.precosTamanho,
    filtro: state.filtro,
    busca: state.busca,
    itens: state.itens,
    desconto: state.desconto,
    onAddItem: state.addItem,
    onLoadMesaItens: async (mesa: Mesa) => {
      const itens = await api.loadMesaItens(mesa)
      state.setItensMesa(itens)
    },
    onSetMesaFechar: state.setMesaFechar,
    onSetShowDivisaoConta: state.setShowDivisaoConta
  })

  // Realtime updates
  useRealtime({
    configs: [
      { table: 'produtos', filter: `tenant_id=eq.${state.tenantId}`, callback: api.fetchData },
      { table: 'mesas', filter: `tenant_id=eq.${state.tenantId}`, callback: api.fetchData }
    ]
  })

  // ----- Mesa Actions -----
  const ocuparMesa = useCallback(async () => {
    if (!state.mesaSelecionada) return
    await api.ocuparMesa(state.mesaSelecionada.id, state.responsavelMesa, state.pessoasMesa)
    state.setShowOcuparMesa(false)
    state.setMesaSelecionada(null)
    state.setPessoasMesa(1)
    state.setResponsavelMesa('')
  }, [state.mesaSelecionada, state.responsavelMesa, state.pessoasMesa, api.ocuparMesa])

  const getTempoOcupada = useCallback((abertaEm: string) => {
    if (!abertaEm) return ''
    const diff = Date.now() - new Date(abertaEm).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}min`
    return `${Math.floor(mins / 60)}h ${mins % 60}min`
  }, [])

  const abrirPainelMesas = useCallback(async () => {
    const mesasOcupadas = state.mesas.filter(m => m.status === 'ocupada' || m.status === 'aguardando_pagamento')
    const dados = await api.loadMesasComItens(mesasOcupadas)
    state.setMesasComItens(dados)
    state.setShowMesasPanel(true)
  }, [state.mesas, api.loadMesasComItens])

  // ----- Save Order -----
  const salvarPedido = useCallback(async () => {
    if (state.itens.length === 0) return
    
    if (state.tipo === 'entrega') {
      if (!state.clienteNome || !state.clienteTelefone) {
        alert('Nome e Telefone são obrigatórios para pedidos de entrega!')
        return
      }
      if (!state.enderecoEntrega) {
        alert('Endereço de entrega é obrigatório!')
        return
      }
    }

    state.setSalvando(true)

    const itensInsert = state.itens.map(i => ({
      produto_id: i.produto.id,
      produto_nome: i.produto.nome + (i.tamanho ? ` (${i.tamanho})` : '') + (i.sabor1 ? ` - ${i.sabor1}` : '') + (i.sabor2 ? ` + ${i.sabor2}` : ''),
      quantidade: i.quantidade,
      preco_unitario: i.produto.preco,
      total: Number(i.produto.preco) * i.quantidade,
      observacoes: i.observacoes || null,
    }))

    const pedidoData: CreatePedidoData = {
      tenantId: state.tenantId,
      clienteNome: state.clienteNome || null,
      clienteTelefone: state.clienteTelefone || null,
      tipo: state.tipo,
      mesaNumero: state.tipo === 'mesa' ? Number(state.mesaNumero) || null : null,
      subtotal: ui.subtotal,
      desconto: state.desconto,
      total: ui.total,
      formaPagamento: state.formaPagamento,
      observacoes: state.observacoes || null,
      enderecoEntrega: state.tipo === 'entrega' ? state.enderecoEntrega || null : null,
      itens: itensInsert
    }

    // Tenta salvar online, se falhar salva offline
    if (offline.isOnline) {
      const result = await api.salvarPedido(pedidoData)
      if (result.success) {
        if (state.clienteNome || state.clienteTelefone) {
          await syncCliente(state.clienteNome, state.clienteTelefone, ui.total)
        }
        
        state.setSalvando(false)
        state.setSucesso(true)
        
        if (state.tipo === 'mesa') {
          const mesaEncontrada = state.mesas.find(m => m.numero === Number(state.mesaNumero))
          if (mesaEncontrada) {
            state.setPedidoMesaSalvo(true)
            state.setMesaDosPedido(mesaEncontrada)
          }
        }
        
        setTimeout(() => {
          state.setSucesso(false)
          state.setItens([])
          state.setClienteNome('')
          state.setClienteTelefone('')
          state.setMesaNumero('')
          state.setEnderecoEntrega('')
          state.setObservacoes('')
          state.setDesconto(0)
        }, 10000)
      } else {
        alert(`Erro ao salvar pedido: ${result.error}`)
        state.setSalvando(false)
      }
    } else {
      // Salva offline
      try {
        await offline.savePedidoOffline({
          tenant_id: state.tenantId,
          cliente_nome: state.clienteNome || null,
          cliente_telefone: state.clienteTelefone || null,
          tipo: state.tipo,
          mesa_numero: state.tipo === 'mesa' ? Number(state.mesaNumero) || null : null,
          subtotal: ui.subtotal,
          desconto: state.desconto,
          total: ui.total,
          forma_pagamento: state.formaPagamento,
          status: 'pendente',
          observacoes: state.observacoes || null,
          endereco_entrega: state.tipo === 'entrega' ? state.enderecoEntrega || null : null,
          itens: itensInsert
        })
        
        state.setSalvando(false)
        state.setSucesso(true)
        
        setTimeout(() => {
          state.setSucesso(false)
          state.setItens([])
        }, 10000)
      } catch (error) {
        alert('Erro ao salvar pedido offline')
        state.setSalvando(false)
      }
    }
  }, [
    state.itens,
    state.tipo,
    state.clienteNome,
    state.clienteTelefone,
    state.enderecoEntrega,
    state.tenantId,
    state.mesaNumero,
    state.desconto,
    state.formaPagamento,
    state.observacoes,
    state.mesas,
    ui.subtotal,
    ui.total,
    api.salvarPedido,
    offline.isOnline,
    offline.savePedidoOffline
  ])

  return {
    // Refs
    pedidoAtualRef,
    
    // Data (from API)
    produtos: api.produtos,
    categorias: api.categorias,
    mesas: api.mesas,
    precosTamanho: api.precosTamanho,
    sabores: api.sabores,
    tenantId: state.tenantId,
    
    // Cart (from State)
    itens: state.itens,
    cartPulse: state.cartPulse,
    addItem: state.addItem,
    addToCart: state.addToCart,
    removeItem: state.removeItem,
    subtotal: ui.subtotal,
    total: ui.total,
    
    // Variacoes Modal (from State)
    produtoSelecionado: state.produtoSelecionado,
    showVariacoesModal: state.showVariacoesModal,
    tamanhoSelecionado: state.tamanhoSelecionado,
    tipoPizza: state.tipoPizza,
    sabor1: state.sabor1,
    sabor2: state.sabor2,
    setTamanhoSelecionado: state.setTamanhoSelecionado,
    setTipoPizza: state.setTipoPizza,
    setSabor1: state.setSabor1,
    setSabor2: state.setSabor2,
    setShowVariacoesModal: state.setShowVariacoesModal,
    
    // Filters (from State & UI)
    filtro: state.filtro,
    busca: state.busca,
    filteredProdutos: ui.filteredProdutos,
    setFiltro: state.setFiltro,
    setBusca: state.setBusca,
    getStatusColor: ui.getStatusColor,
    
    // Mesa (from State)
    showOcuparMesa: state.showOcuparMesa,
    mesaSelecionada: state.mesaSelecionada,
    pessoasMesa: state.pessoasMesa,
    responsavelMesa: state.responsavelMesa,
    showDivisaoConta: state.showDivisaoConta,
    itensMesa: state.itensMesa,
    mesaFechar: state.mesaFechar,
    showMesasPanel: state.showMesasPanel,
    mesasComItens: state.mesasComItens,
    mesaExpandida: state.mesaExpandida,
    setShowOcuparMesa: state.setShowOcuparMesa,
    setMesaSelecionada: state.setMesaSelecionada,
    setPessoasMesa: state.setPessoasMesa,
    setResponsavelMesa: state.setResponsavelMesa,
    setShowDivisaoConta: state.setShowDivisaoConta,
    setMesaFechar: state.setMesaFechar,
    setShowMesasPanel: state.setShowMesasPanel,
    setMesaExpandida: state.setMesaExpandida,
    ocuparMesa,
    getTempoOcupada,
    abrirPainelMesas,
    onMesaClick: ui.handleMesaClick,
    onMesaFecharClick: ui.handleMesaFecharClick,
    
    // Order (from State)
    tipo: state.tipo,
    clienteNome: state.clienteNome,
    clienteTelefone: state.clienteTelefone,
    mesaNumero: state.mesaNumero,
    observacoes: state.observacoes,
    formaPagamento: state.formaPagamento,
    desconto: state.desconto,
    enderecoEntrega: state.enderecoEntrega,
    salvando: state.salvando,
    sucesso: state.sucesso,
    pedidoMesaSalvo: state.pedidoMesaSalvo,
    mesaDosPedido: state.mesaDosPedido,
    setTipo: state.setTipo,
    setClienteNome: state.setClienteNome,
    setClienteTelefone: state.setClienteTelefone,
    setMesaNumero: state.setMesaNumero,
    setObservacoes: state.setObservacoes,
    setFormaPagamento: state.setFormaPagamento,
    setDesconto: state.setDesconto,
    setEnderecoEntrega: state.setEnderecoEntrega,
    salvarPedido,
    fetchData: api.fetchData,
    
    // Offline status
    isOnline: offline.isOnline,
    syncStatus: offline.syncStatus
  }
}
