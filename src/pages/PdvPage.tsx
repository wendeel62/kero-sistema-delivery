import { usePdv } from '../hooks/usePdv'
import type { Produto } from '../hooks/usePdv'
import MesasGrid from '../components/pdv/MesasGrid'
import MesasPanel from '../components/pdv/MesasPanel'
import OcuparMesaModal from '../components/pdv/OcuparMesaModal'
import VariacoesModal from '../components/pdv/VariacoesModal'
import PedidoCart from '../components/pdv/PedidoCart'
import DivisaoConta from '../components/DivisaoConta'

export default function PdvPage() {
  const h = usePdv()

  return (
    <>
      <PedidoCart
        itens={h.itens}
        tipo={h.tipo}
        clienteNome={h.clienteNome}
        clienteTelefone={h.clienteTelefone}
        mesaNumero={h.mesaNumero}
        enderecoEntrega={h.enderecoEntrega}
        formaPagamento={h.formaPagamento}
        desconto={h.desconto}
        subtotal={h.subtotal}
        total={h.total}
        salvando={h.salvando}
        sucesso={h.sucesso}
        pedidoMesaSalvo={h.pedidoMesaSalvo}
        mesaDosPedido={h.mesaDosPedido as any}
        filteredProdutos={h.filteredProdutos}
        categorias={h.categorias}
        precosTamanho={h.precosTamanho}
        filtro={h.filtro}
        busca={h.busca}
        cartPulse={h.cartPulse}
        mesasContent={
          <MesasGrid
            mesas={h.mesas}
            getStatusColor={h.getStatusColor}
            getTempoOcupada={h.getTempoOcupada}
            onMesaClick={h.onMesaClick}
            onMesaFecharClick={h.onMesaFecharClick}
          />
        }
        onTipoChange={h.setTipo}
        onClienteNomeChange={h.setClienteNome}
        onClienteTelefoneChange={h.setClienteTelefone}
        onMesaNumeroChange={h.setMesaNumero}
        onEnderecoEntregaChange={h.setEnderecoEntrega}
        onFormaPagamentoChange={h.setFormaPagamento}
        onDescontoChange={h.setDesconto}
        onAddItem={(p: Produto) => h.addItem(p, h.precosTamanho)}
        onRemoveItem={h.removeItem}
        onSalvarPedido={h.salvarPedido}
        onBuscaChange={h.setBusca}
        onFiltroChange={h.setFiltro}
        onScrollToCart={() => h.pedidoAtualRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        onFecharMesa={async () => {
          if (h.mesaDosPedido) await h.onMesaFecharClick(h.mesaDosPedido)
        }}
      />

      <MesasPanel
        showMesasPanel={h.showMesasPanel}
        mesas={h.mesas}
        mesasComItens={h.mesasComItens as any}
        mesaExpandida={h.mesaExpandida}
        getTempoOcupada={h.getTempoOcupada}
        onClose={() => h.setShowMesasPanel(false)}
        onExpandMesa={h.setMesaExpandida}
        onFecharMesa={(mesa, itens) => {
          h.setItensMesa(itens as any)
          h.setMesaFechar(mesa)
          h.setShowMesasPanel(false)
          h.setShowDivisaoConta(true)
        }}
      />

      <OcuparMesaModal
        show={h.showOcuparMesa}
        mesa={h.mesaSelecionada}
        pessoas={h.pessoasMesa}
        responsavel={h.responsavelMesa}
        onPessoasChange={h.setPessoasMesa}
        onResponsavelChange={h.setResponsavelMesa}
        onConfirm={h.ocuparMesa}
        onCancel={() => { h.setShowOcuparMesa(false); h.setMesaSelecionada(null) }}
      />

      <VariacoesModal
        show={h.showVariacoesModal}
        produto={h.produtoSelecionado}
        precosTamanho={h.precosTamanho}
        sabores={h.sabores}
        tamanhoSelecionado={h.tamanhoSelecionado}
        tipoPizza={h.tipoPizza}
        sabor1={h.sabor1}
        sabor2={h.sabor2}
        onTamanhoChange={h.setTamanhoSelecionado}
        onTipoPizzaChange={h.setTipoPizza}
        onSabor1Change={h.setSabor1}
        onSabor2Change={h.setSabor2}
        onAddToCart={h.addToCart}
        onClose={() => h.setShowVariacoesModal(false)}
      />

      {h.showDivisaoConta && h.mesaFechar && (
        <DivisaoConta
          mesa={h.mesaFechar}
          itens={h.itensMesa}
          totalGeral={h.itensMesa.reduce((sum, item) => sum + (item.total || 0), 0)}
          onFechar={() => { h.setShowDivisaoConta(false); h.setMesaFechar(null); h.fetchData() }}
          onCancelar={() => { h.setShowDivisaoConta(false); h.setMesaFechar(null) }}
        />
      )}
    </>
  )
}
