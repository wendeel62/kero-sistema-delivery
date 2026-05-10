import type { ReactNode } from 'react'
import type { ItemPedido } from '../../hooks/usePdv'
import ProductCard from '../ProductCard'
import type { Produto } from '../../pages/CardapioOnlinePage'

interface PedidoCartProps {
  itens: ItemPedido[]
  tipo: 'balcao' | 'entrega' | 'mesa'
  clienteNome: string
  clienteTelefone: string
  mesaNumero: string
  enderecoEntrega: string
  formaPagamento: string
  desconto: number
  subtotal: number
  total: number
  salvando: boolean
  sucesso: boolean
  pedidoMesaSalvo: boolean
  mesaDosPedido: any
  filteredProdutos: Produto[]
  categorias: { id: string; nome: string }[]
  precosTamanho: Record<string, { id: string; produto_id: string; tamanho: string; preco: number }[]>
  filtro: string | null
  busca: string
  cartPulse: boolean
  mesasContent: ReactNode
  onTipoChange: (v: 'balcao' | 'entrega' | 'mesa') => void
  onClienteNomeChange: (v: string) => void
  onClienteTelefoneChange: (v: string) => void
  onMesaNumeroChange: (v: string) => void
  onEnderecoEntregaChange: (v: string) => void
  onFormaPagamentoChange: (v: string) => void
  onDescontoChange: (v: number) => void
  onAddItem: (p: Produto) => void
  onRemoveItem: (id: string) => void
  onSalvarPedido: () => void
  onBuscaChange: (v: string) => void
  onFiltroChange: (v: string | null) => void
  onScrollToCart: () => void
  onFecharMesa: () => void
}

export default function PedidoCart({
  itens,
  tipo,
  clienteNome,
  clienteTelefone,
  mesaNumero,
  enderecoEntrega,
  formaPagamento,
  desconto,
  subtotal,
  total,
  salvando,
  sucesso,
  pedidoMesaSalvo,
  mesaDosPedido,
  filteredProdutos,
  categorias,
  precosTamanho,
  filtro,
  busca,
  cartPulse,
  mesasContent,
  onTipoChange,
  onClienteNomeChange,
  onClienteTelefoneChange,
  onMesaNumeroChange,
  onEnderecoEntregaChange,
  onFormaPagamentoChange,
  onDescontoChange,
  onAddItem,
  onRemoveItem,
  onSalvarPedido,
  onBuscaChange,
  onFiltroChange,
  onScrollToCart,
  onFecharMesa
}: PedidoCartProps) {
  const mesasOcupadasCount = 0 // This is just for the button badge, handled by parent

  return (
    <div className="animate-fade-in flex flex-col lg:flex-row gap-3 lg:gap-6 min-h-[calc(100vh-6rem)] p-2 sm:p-3 lg:p-6">
      {/* Left - Product Grid / Mesas */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-3 lg:mb-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
          <div>
            <span className="text-[#e8391a] font-bold uppercase tracking-[0.3em] text-[10px] mb-0.5 block">Ponto de Venda</span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-[Outfit] font-bold text-white tracking-tighter">PDV</h2>
          </div>
          <div className="flex bg-[#1a1a1a] rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-[#252830]">
            <button onClick={onScrollToCart} className={`lg:hidden flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all bg-[#e8391a] text-white ${cartPulse ? 'scale-110' : ''}`}>
              Carrinho
              {itens.length > 0 && <span className="w-4 h-4 flex items-center justify-center rounded-full text-[8px] animate-in fade-in zoom-in duration-300 bg-white text-[#e8391a]">{itens.length}</span>}
            </button>
          </div>
        </div>

        {/* Mesas - always visible */}
        {mesasContent}

        <input value={busca} onChange={e => onBuscaChange(e.target.value)} placeholder="Buscar produto..." className="w-full bg-[#1a1a1a] border border-[#252830] rounded-xl py-2 sm:py-3 px-4 sm:px-5 text-xs sm:text-sm text-white mb-3 lg:mb-4 placeholder:text-gray-500" />

        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 lg:mb-4">
          <button onClick={() => onFiltroChange(null)} className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap ${!filtro ? 'bg-[#e8391a] text-white' : 'bg-[#1a1a1a] text-gray-400'}`}>Todos</button>
          {categorias.map(c => (
            <button key={c.id} onClick={() => onFiltroChange(c.id)} className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap ${filtro === c.id ? 'bg-[#e8391a] text-white' : 'bg-[#1a1a1a] text-gray-400'}`}>{c.nome}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start overflow-y-auto flex-1 pb-4 custom-scrollbar pr-2 pt-1">
          {filteredProdutos.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <span className="material-symbols-outlined text-4xl mb-2 block">inventory_2</span>
              <p className="text-sm">Nenhum produto encontrado</p>
              <p className="text-xs mt-1">Cadastre produtos no Cardápio Admin</p>
            </div>
          ) : filteredProdutos.map(p => {
            const preco = precosTamanho[p.id]?.length ? Math.min(...precosTamanho[p.id].map(t => Number(t.preco))) : Number(p.preco)
            return <ProductCard key={p.id} produto={p} preco={preco} onAddToCart={() => onAddItem(p)} />
          })}
        </div>
      </div>

      {/* Right - Cart / Order */}
      <div className="w-full lg:flex-1 bg-[#1a1a1a] rounded-2xl border border-[#252830] flex flex-col shrink-0">
        <div className="p-4 lg:p-6 border-b border-[#252830]">
          <div className="flex justify-between items-center mb-3 lg:mb-4">
            <h3 className="font-[Outfit] font-bold text-base lg:text-lg text-white">Pedido Atual</h3>
          </div>
          <div className="flex gap-2">
            {(['balcao', 'entrega', 'mesa'] as const).map(t => (
              <button key={t} onClick={() => onTipoChange(t)} className={`flex-1 py-2 lg:py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${tipo === t ? 'bg-[#e8391a] text-white' : 'bg-[#252830] text-gray-400'}`}>{t}</button>
            ))}
          </div>
          {tipo === 'mesa' && <input value={mesaNumero} onChange={e => onMesaNumeroChange(e.target.value)} placeholder="Nº Mesa" className="w-full bg-[#16181f] border border-[#252830] rounded-lg py-2.5 px-3 text-sm text-white mt-3" />}
          {tipo === 'entrega' && <input value={enderecoEntrega} onChange={e => onEnderecoEntregaChange(e.target.value)} placeholder="Endereço de entrega completo" className="w-full bg-[#16181f] border border-[#252830] rounded-lg py-2.5 px-3 text-sm text-white mt-3" />}
          <input value={clienteNome} onChange={e => onClienteNomeChange(e.target.value)} placeholder={tipo === 'entrega' ? "Nome do cliente *" : "Nome do cliente (Opcional)"} className="w-full bg-[#16181f] border border-[#252830] rounded-lg py-2.5 px-3 text-sm text-white mt-3" />
          <input value={clienteTelefone} onChange={e => onClienteTelefoneChange(e.target.value)} placeholder={tipo === 'entrega' ? "Telefone (WhatsApp) *" : "Telefone (WhatsApp - Opcional)"} className="w-full bg-[#16181f] border border-[#252830] rounded-lg py-2.5 px-3 text-sm text-white mt-3" />
        </div>

        {/* Items */}
        <div className="p-4 space-y-2">
          {itens.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <span className="material-symbols-outlined text-4xl mb-2 block">shopping_cart</span>
              <p className="text-sm">Adicione produtos ao pedido</p>
            </div>
          ) : (
            <>
              {itens.map(item => {
                const detalhes: string[] = []
                if (item.tamanho) detalhes.push(item.tamanho)
                if (item.sabor1) detalhes.push(item.sabor1)
                if (item.sabor2) detalhes.push(item.sabor2)
                if (item.pontoCarne) detalhes.push(item.pontoCarne)
                if (item.adicionais) detalhes.push(item.adicionais)
                if (item.observacoes) detalhes.push(item.observacoes)
                const detalheStr = detalhes.join(' | ')

                return (
                  <div key={item.produto.id} className="flex items-center gap-3 bg-[#252830] p-3 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate text-white">{item.produto.nome}</p>
                      {detalheStr && <p className="text-xs text-gray-400 truncate">{detalheStr}</p>}
                      <p className="text-xs text-gray-400">{Number(item.produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onRemoveItem(item.produto.id)} className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-gray-400 hover:text-white"><span className="material-symbols-outlined text-sm">remove</span></button>
                      <span className="text-sm font-bold w-5 text-center text-white">{item.quantidade}</span>
                      <button onClick={() => onAddItem(item.produto)} className="w-8 h-8 rounded-lg bg-[#e8391a] flex items-center justify-center text-white"><span className="material-symbols-outlined text-sm">add</span></button>
                    </div>
                    <span className="text-sm font-bold w-20 text-right text-white">{(Number(item.produto.preco) * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 lg:p-6 border-t border-[#252830] space-y-3">
          <select value={formaPagamento} onChange={e => onFormaPagamentoChange(e.target.value)} className="w-full bg-[#16181f] border border-[#252830] rounded-lg py-2.5 px-3 text-sm text-white">
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao_credito">Cartão Crédito</option>
            <option value="cartao_debito">Cartão Débito</option>
          </select>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Subtotal</span>
            <span className="text-white">{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Desconto</span>
            <input type="number" value={desconto || ''} onChange={e => onDescontoChange(Number(e.target.value))} className="w-20 sm:w-24 text-right bg-transparent border-b border-[#252830] text-sm py-0 text-white" />
          </div>
          <div className="flex justify-between pt-2 border-t border-[#252830]">
            <span className="font-bold text-base lg:text-lg text-white">Total</span>
            <span className="text-xl lg:text-2xl font-[Outfit] font-bold text-[#e8391a]">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          <button onClick={onSalvarPedido} disabled={itens.length === 0 || salvando} className={`w-full py-3.5 lg:py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${sucesso ? 'bg-emerald-500 text-white' : 'bg-[#e8391a] text-white'} disabled:opacity-50`}>
            {salvando ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : sucesso ? '✓ Pedido Salvo!' : 'Finalizar Pedido'}
          </button>
          {pedidoMesaSalvo && mesaDosPedido && (
            <button onClick={onFecharMesa} className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-yellow-500 text-black animate-in fade-in zoom-in duration-300">
              <span className="material-symbols-outlined text-sm">receipt_long</span>
              Fechar Mesa {mesaDosPedido.numero}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
