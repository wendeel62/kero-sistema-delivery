import { useCardapioAdmin } from '../hooks/useCardapioAdmin'
import CategoriaList from '../components/cardapio/CategoriaList'
import ProdutoList from '../components/cardapio/ProdutoList'
import ComplementosTab from '../components/cardapio/ComplementosTab'
import CategoriaModal from '../components/cardapio/CategoriaModal'
import SaborModal from '../components/cardapio/SaborModal'
import ProdutoFormSidebar from '../components/cardapio/ProdutoFormSidebar'

export default function CardapioAdminPage() {
  const h = useCardapioAdmin()

  if (h.authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#e8391a] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (h.shouldRedirect) return null

  return (
    <div className="animate-fade-in p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div>
          <span className="text-[#e8391a] font-bold uppercase tracking-[0.3em] text-[8px] sm:text-[10px] mb-1 sm:mb-2 block">Gestão</span>
          <h2 className="text-3xl sm:text-5xl font-[Outfit] font-bold text-white tracking-tighter">Cardápio</h2>
        </div>
        <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-[#252830] w-full">
          <button onClick={() => h.setTab('produtos')} className={`flex-1 px-1 sm:px-6 py-2 sm:py-2.5 rounded-lg text-[9px] sm:text-xs font-bold uppercase tracking-normal sm:tracking-widest transition-all whitespace-nowrap ${h.tab === 'produtos' ? 'bg-[#e8391a] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Produtos</button>
          <button onClick={() => h.setTab('complementos')} className={`flex-1 px-1 sm:px-6 py-2 sm:py-2.5 rounded-lg text-[9px] sm:text-xs font-bold uppercase tracking-normal sm:tracking-widest transition-all whitespace-nowrap ${h.tab === 'complementos' ? 'bg-[#e8391a] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Complementos</button>
          <button onClick={() => h.setTab('categorias')} className={`flex-1 px-1 sm:px-6 py-2 sm:py-2.5 rounded-lg text-[9px] sm:text-xs font-bold uppercase tracking-normal sm:tracking-widest transition-all whitespace-nowrap ${h.tab === 'categorias' ? 'bg-[#e8391a] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Categorias</button>
        </div>
      </div>

      {/* Tab: Categorias */}
      {h.tab === 'categorias' && (
        <CategoriaList
          categorias={h.categorias}
          draggedCategoria={h.draggedCategoria}
          onDragStart={h.setDraggedCategoria}
          onDrop={h.handleDropCategoria}
          onEdit={(c) => { h.setEditCategoria(c); h.setShowCategoriaModal(true) }}
          onDelete={h.deleteCategoria}
          onNew={h.openNewCategoria}
        />
      )}

      {/* Tab: Produtos */}
      {h.tab === 'produtos' && (
        <ProdutoList
          produtos={h.produtos}
          categorias={h.categorias}
          produtoPrecos={h.produtoPrecos}
          onEdit={h.openEditProduto}
          onDelete={h.deleteProduto}
          onToggleDisponivel={h.toggleDisponivel}
          onNew={h.openNewProduto}
        />
      )}

      {/* Tab: Complementos */}
      {h.tab === 'complementos' && (
        <ComplementosTab
          sabores={h.sabores}
          produtos={h.produtos}
          produtoPrecos={h.produtoPrecos}
          selectedProdutoComplementos={h.selectedProdutoComplementos}
          newTamanho={h.newTamanho}
          newPrecoValor={h.newPrecoValor}
          tenantId={h.tenantId}
          onToggleSaborDisponivel={h.toggleSaborDisponivel}
          onEditSabor={(s) => { h.setEditSabor(s); h.setShowSaborModal(true) }}
          onDeleteSabor={h.deleteSabor}
          onNewSabor={h.openNewSabor}
          onSelectProduto={h.setSelectedProdutoComplementos}
          onAddPreco={h.addPreco}
          onDeletePreco={h.deletePrecoFromComplementos}
          onNewTamanhoChange={h.setNewTamanho}
          onNewPrecoValorChange={h.setNewPrecoValor}
        />
      )}

      {/* Modals */}
      <CategoriaModal
        editCategoria={h.editCategoria}
        showCategoriaModal={h.showCategoriaModal}
        onSave={h.saveCategoria}
        onClose={() => { h.setShowCategoriaModal(false); h.setEditCategoria(null) }}
        onEditChange={(updates) => h.setEditCategoria(p => ({ ...p, ...updates }))}
      />

      <SaborModal
        editSabor={h.editSabor}
        showSaborModal={h.showSaborModal}
        onSave={h.saveSabor}
        onClose={() => { h.setShowSaborModal(false); h.setEditSabor(null) }}
        onEditChange={(updates) => h.setEditSabor(p => ({ ...p, ...updates }))}
      />

      <ProdutoFormSidebar
        editProduto={h.editProduto}
        showProdutoModal={h.showProdutoModal}
        uploading={h.uploading}
        imagePreview={h.imagePreview}
        produtoForm={h.produtoForm}
        categorias={h.categorias}
        sabores={h.sabores}
        precos={h.precos}
        selectedSabores={h.selectedSabores}
        selectedSaborId={h.selectedSaborId}
        tempComplementos={h.tempComplementos}
        newTamanho={h.newTamanho}
        newPrecoValor={h.newPrecoValor}
        showInlineCategoria={h.showInlineCategoria}
        newCategoriaNome={h.newCategoriaNome}
        newCategoriaDescricao={h.newCategoriaDescricao}
        savingCategoria={h.savingCategoria}
        showInlineSabor={h.showInlineSabor}
        newSaborNome={h.newSaborNome}
        newSaborDescricao={h.newSaborDescricao}
        savingSabor={h.savingSabor}
        onSave={h.handleSaveProduto}
        onClose={h.closeProdutoModal}
        onFileChange={h.handleFileChange}
        onRemovePhoto={h.removePhoto}
        onNewTamanhoChange={h.setNewTamanho}
        onNewPrecoValorChange={h.setNewPrecoValor}
        onAddTempComplemento={h.addTempComplemento}
        onRemoveTempComplemento={h.removeTempComplemento}
        onAddPreco={h.addPreco}
        onDeletePreco={h.deletePreco}
        onSelectedSaborIdChange={h.setSelectedSaborId}
        onAddSaborToProduto={h.addSaborToProduto}
        onRemoveSaborFromProduto={h.removeSaborFromProduto}
        onShowInlineCategoriaChange={h.setShowInlineCategoria}
        onNewCategoriaNomeChange={h.setNewCategoriaNome}
        onNewCategoriaDescricaoChange={h.setNewCategoriaDescricao}
        onSaveInlineCategoria={h.saveInlineCategoria}
        onCancelInlineCategoria={h.cancelInlineCategoria}
        onShowInlineSaborChange={h.setShowInlineSabor}
        onNewSaborNomeChange={h.setNewSaborNome}
        onNewSaborDescricaoChange={h.setNewSaborDescricao}
        onSaveInlineSabor={h.saveInlineSabor}
        onCancelInlineSabor={h.cancelInlineSabor}
      />
    </div>
  )
}
