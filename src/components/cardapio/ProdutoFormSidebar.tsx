import type { Categoria, Produto, Sabor, PrecoTamanho, ComplementoTemp } from '../../hooks/cardapio/types'
import type { UseFormReturn } from 'react-hook-form'

interface ProdutoFormSidebarProps {
  editProduto: Partial<Produto> | null
  showProdutoModal: boolean
  uploading: boolean
  imagePreview: string | null
  produtoForm: UseFormReturn<any>
  categorias: Categoria[]
  sabores: Sabor[]
  precos: PrecoTamanho[]
  selectedSabores: Sabor[]
  selectedSaborId: string
  tempComplementos: ComplementoTemp[]
  newTamanho: string
  newPrecoValor: string
  showInlineCategoria: boolean
  newCategoriaNome: string
  newCategoriaDescricao: string
  savingCategoria: boolean
  showInlineSabor: boolean
  newSaborNome: string
  newSaborDescricao: string
  savingSabor: boolean
  onSave: (data: any) => void
  onClose: () => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemovePhoto: () => void
  onNewTamanhoChange: (v: string) => void
  onNewPrecoValorChange: (v: string) => void
  onAddTempComplemento: () => void
  onRemoveTempComplemento: (id: string) => void
  onAddPreco: (produtoId: string) => void
  onDeletePreco: (precoId: string, produtoId: string) => void
  onSelectedSaborIdChange: (id: string) => void
  onAddSaborToProduto: () => void
  onRemoveSaborFromProduto: (saborId: string) => void
  onShowInlineCategoriaChange: (v: boolean) => void
  onNewCategoriaNomeChange: (v: string) => void
  onNewCategoriaDescricaoChange: (v: string) => void
  onSaveInlineCategoria: () => void
  onCancelInlineCategoria: () => void
  onShowInlineSaborChange: (v: boolean) => void
  onNewSaborNomeChange: (v: string) => void
  onNewSaborDescricaoChange: (v: string) => void
  onSaveInlineSabor: () => void
  onCancelInlineSabor: () => void
}

export default function ProdutoFormSidebar({
  editProduto,
  showProdutoModal,
  uploading,
  imagePreview,
  produtoForm,
  categorias,
  sabores,
  precos,
  selectedSabores,
  selectedSaborId,
  tempComplementos,
  newTamanho,
  newPrecoValor,
  showInlineCategoria,
  newCategoriaNome,
  newCategoriaDescricao,
  savingCategoria,
  showInlineSabor,
  newSaborNome,
  newSaborDescricao,
  savingSabor,
  onSave,
  onClose,
  onFileChange,
  onRemovePhoto,
  onNewTamanhoChange,
  onNewPrecoValorChange,
  onAddTempComplemento,
  onRemoveTempComplemento,
  onAddPreco,
  onDeletePreco,
  onSelectedSaborIdChange,
  onAddSaborToProduto,
  onRemoveSaborFromProduto,
  onShowInlineCategoriaChange,
  onNewCategoriaNomeChange,
  onNewCategoriaDescricaoChange,
  onSaveInlineCategoria,
  onCancelInlineCategoria,
  onShowInlineSaborChange,
  onNewSaborNomeChange,
  onNewSaborDescricaoChange,
  onSaveInlineSabor,
  onCancelInlineSabor
}: ProdutoFormSidebarProps) {
  if (!showProdutoModal) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[998] animate-fade-in"
        onClick={onClose}
      />
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-auto z-[999] bg-[#16181f] shadow-2xl animate-slide-in-from-right w-full max-w-[600px] min-h-screen">
        <div className="flex items-center justify-between p-5 sm:p-8 border-b border-[#252830] sticky top-0 bg-[#16181f] z-10">
          <h3 className="font-headline text-xl sm:text-3xl font-bold text-white tracking-tight">{editProduto?.id ? 'Editar' : 'Novo'} Produto</h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#252830] text-gray-400 hover:text-white hover:bg-[#333] transition-all">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="p-5 sm:p-8 no-scrollbar">
          {/* Photo */}
          <div className="mb-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-[#888] ml-1">Foto do Produto</label>
            <div className="relative w-full max-w-[200px] aspect-[4/5] my-4">
              <input type="file" accept="image/*" onChange={onFileChange} className="hidden" id="photo-input" disabled={uploading} />
              {(imagePreview || editProduto?.imagem_url) ? (
                <div className="relative w-full h-full rounded-xl overflow-hidden">
                  <img src={imagePreview || editProduto?.imagem_url} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={onRemovePhoto} className="absolute top-2 right-2 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 transition-all">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              ) : (
                <label htmlFor="photo-input" className="flex flex-col items-center justify-center w-full h-full bg-[#1a1a1a] border-2 border-dashed border-[#333] rounded-xl cursor-pointer hover:border-[#555] transition-all">
                  <span className="material-symbols-outlined text-4xl text-[#555]">photo_camera</span>
                  <span className="text-sm text-[#555] mt-2">Adicionar foto</span>
                </label>
              )}
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); onSave(produtoForm.getValues()); }} className="space-y-6">
            {/* Nome */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#888] ml-1">Nome do Produto</label>
              <input {...produtoForm.register('nome')} placeholder="Ex: Pizza Calabresa Especial" className="w-full bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ff5722] rounded-xl py-4 px-5 text-sm text-white" />
              {produtoForm.formState.errors.nome && <span className="text-red-400 text-xs">{produtoForm.formState.errors.nome.message as string}</span>}
            </div>

            {/* Descricao */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#888] ml-1">Descricao Detalhada</label>
              <textarea {...produtoForm.register('descricao')} placeholder="Descreva os ingredientes e detalhes" rows={3} className="w-full bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ff5722] rounded-xl py-4 px-5 text-sm text-white resize-none" />
            </div>

            {/* Preco & Tempo */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#888] ml-1">Preco Base (R$) <span className="text-[10px] normal-case text-[#666]">- Opcional</span></label>
                <input type="number" step="0.01" {...produtoForm.register('preco', { valueAsNumber: true })} placeholder="Ex: 25.00" className="w-full bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ff5722] rounded-xl py-4 px-5 text-sm text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#888] ml-1">Tempo (Min)</label>
                <input type="number" {...produtoForm.register('tempo_preparo', { valueAsNumber: true })} className="w-full bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ff5722] rounded-xl py-4 px-5 text-sm text-white" />
              </div>
            </div>

            {/* Categoria */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#ff5722] ml-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">category</span>
                Categoria
              </label>
              {!showInlineCategoria ? (
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <select {...produtoForm.register('categoria_id')} className="w-full bg-[#1a1a1a] border-2 border-[#ff5722]/30 focus:border-[#ff5722] rounded-xl py-4 px-5 text-sm text-white cursor-pointer appearance-none">
                      <option value="">Selecione uma categoria</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#ff5722] pointer-events-none">expand_more</span>
                  </div>
                  <button type="button" onClick={() => onShowInlineCategoriaChange(true)} className="bg-[#ff5722] text-white px-3 rounded-xl text-xs font-bold uppercase hover:shadow-[0_0_10px_rgba(255,86,55,0.3)] transition-all flex items-center gap-1" title="Criar nova categoria">
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>
              ) : (
                <div className="bg-[#1a1a1a] border border-[#ff5722]/30 rounded-xl p-4 space-y-3">
                  <input value={newCategoriaNome} onChange={e => onNewCategoriaNomeChange(e.target.value)} placeholder="Nome da categoria" className="w-full bg-[#252830] border border-[#333] rounded-lg py-3 px-4 text-sm text-white placeholder:text-gray-500" autoFocus />
                  <input value={newCategoriaDescricao} onChange={e => onNewCategoriaDescricaoChange(e.target.value)} placeholder="Descricao (opcional)" className="w-full bg-[#252830] border border-[#333] rounded-lg py-3 px-4 text-sm text-white placeholder:text-gray-500" />
                  <div className="flex gap-2">
                    <button type="button" onClick={onCancelInlineCategoria} className="flex-1 py-2.5 rounded-lg border border-[#333] text-gray-400 text-xs font-bold uppercase hover:bg-[#252830] transition-all">Cancelar</button>
                    <button type="button" onClick={onSaveInlineCategoria} disabled={savingCategoria || !newCategoriaNome.trim()} className="flex-1 py-2.5 rounded-lg bg-[#ff5722] text-white text-xs font-bold uppercase hover:shadow-[0_0_10px_rgba(255,86,55,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">{savingCategoria ? 'Salvando...' : 'Salvar'}</button>
                  </div>
                </div>
              )}
              {produtoForm.watch('categoria_id') && !showInlineCategoria && (
                <div className="mt-2 px-3 py-2 bg-[#ff5722]/10 rounded-lg flex items-center gap-2">
                  <span className="text-[10px] text-[#ff5722] uppercase tracking-widest font-bold">Categoria selecionada:</span>
                  <span className="text-sm text-white font-medium">{categorias.find(c => c.id === produtoForm.watch('categoria_id'))?.nome}</span>
                </div>
              )}
            </div>

            {/* Disponivel & Destaque */}
            <div className="flex gap-8 pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" {...produtoForm.register('disponivel')} className="hidden" />
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${produtoForm.watch('disponivel') ? 'bg-[#ff5722] border-[#ff5722]' : 'border-[#444]'}`}>
                  {produtoForm.watch('disponivel') && <span className="material-symbols-outlined text-white text-base">check</span>}
                </div>
                <span className="text-sm font-headline font-bold uppercase tracking-widest opacity-80 group-hover:opacity-100 text-white">Disponivel</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" {...produtoForm.register('destaque')} className="hidden" />
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${produtoForm.watch('destaque') ? 'bg-[#ffc107] border-[#ffc107]' : 'border-[#444]'}`}>
                  {produtoForm.watch('destaque') && <span className="material-symbols-outlined text-black text-base">star</span>}
                </div>
                <span className="text-sm font-headline font-bold uppercase tracking-widest opacity-80 group-hover:opacity-100 text-[#ffc107]">Destaque</span>
              </label>
            </div>

            {/* Complementos (Tamanhos e Precos) */}
            <div className="border-t border-[#333] pt-8 mt-4">
              <h4 className="text-xs font-headline font-bold uppercase tracking-[0.2em] mb-4 text-[#ffc107] flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">straighten</span>
                Complementos (Tamanhos e Precos)
              </h4>
              <p className="text-xs text-gray-500 mb-4">Adicione os tamanhos e precos do produto. Ex: Pizza P, M, G, GG</p>

              {/* Exibir complementos existentes para produtos em edicao */}
              {editProduto?.id && precos.length > 0 && (
                <div className="space-y-3 mb-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Ja cadastrados</p>
                  {precos.map(pt => (
                    <div key={pt.id} className="flex items-center justify-between bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">
                      <span className="text-sm font-bold uppercase tracking-widest text-white">{pt.tamanho} -- <span className="text-[#4ade80]">R$ {Number(pt.preco).toFixed(2)}</span></span>
                      <button type="button" onClick={() => onDeletePreco(pt.id, editProduto.id!)} className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Exibir complementos temporarios para novos produtos */}
              {tempComplementos.length > 0 && (
                <div className="space-y-3 mb-4">
                  <p className="text-[10px] text-[#ffc107] uppercase tracking-widest">A serem cadastrados</p>
                  {tempComplementos.map(comp => (
                    <div key={comp.id} className="flex items-center justify-between bg-[#ffc107]/10 p-4 rounded-xl border border-[#ffc107]/30">
                      <span className="text-sm font-bold uppercase tracking-widest text-white">{comp.tamanho} -- <span className="text-[#4ade80]">R$ {Number(comp.preco).toFixed(2)}</span></span>
                      <button type="button" onClick={() => onRemoveTempComplemento(comp.id!)} className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario para adicionar novo complemento */}
              <div className="flex gap-3 mt-4">
                <input value={newTamanho} onChange={e => onNewTamanhoChange(e.target.value)} placeholder="Tamanho (Ex: P, M, G, GG)" className="flex-1 bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ffc107] rounded-xl py-3 px-4 text-xs text-white placeholder:text-gray-600" />
                <input value={newPrecoValor} onChange={e => onNewPrecoValorChange(e.target.value)} type="number" step="0.01" placeholder="R$ 0,00" className="w-28 bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ffc107] rounded-xl py-3 px-4 text-xs text-white placeholder:text-gray-600" />
                <button type="button" onClick={editProduto?.id ? () => onAddPreco(editProduto.id!) : onAddTempComplemento} className="bg-[#ffc107] text-black px-4 rounded-xl text-xs font-bold uppercase hover:shadow-[0_0_10px_rgba(255,193,7,0.3)] transition-all">+</button>
              </div>
            </div>

            {/* Sabores Disponiveis */}
            <div className="border-t border-[#333] pt-8 mt-4">
              <h4 className="text-xs font-headline font-bold uppercase tracking-[0.2em] mb-4 text-[#8b5cf6] flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">icecream</span>
                Sabores Disponiveis
              </h4>
              {sabores.length === 0 ? (
                <p className="text-xs text-gray-500 mb-4">Nenhum sabor cadastrado. Cadastre sabores na aba Complementos para permitir meio a meio.</p>
              ) : (
                <p className="text-xs text-gray-500 mb-4">Selecione os sabores disponiveis para este produto.</p>
              )}

              {/* Exibir sabores selecionados */}
              {selectedSabores.length > 0 && (
                <div className="space-y-3 mb-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Selecionados</p>
                  {selectedSabores.map(sabor => (
                    <div key={sabor.id} className="flex items-center justify-between bg-[#8b5cf6]/10 p-4 rounded-xl border border-[#8b5cf6]/30">
                      <span className="text-sm font-bold text-white">{sabor.nome}</span>
                      <button type="button" onClick={() => onRemoveSaborFromProduto(sabor.id)} className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Dropdown para adicionar novo sabor */}
              {!showInlineSabor ? (
                <div className="flex gap-3 mt-4">
                  <div className="flex-1 relative">
                    <select value={selectedSaborId} onChange={e => onSelectedSaborIdChange(e.target.value)} className="w-full bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#8b5cf6] rounded-xl py-3 px-4 text-xs text-white appearance-none cursor-pointer">
                      <option value="">Selecione um sabor</option>
                      {sabores.filter(s => !selectedSabores.some(ss => ss.id === s.id)).map(sabor => (
                        <option key={sabor.id} value={sabor.id}>{sabor.nome}</option>
                      ))}
                    </select>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#8b5cf6] pointer-events-none">expand_more</span>
                  </div>
                  <button type="button" onClick={onAddSaborToProduto} disabled={!selectedSaborId} className="bg-[#8b5cf6] text-white px-3 rounded-xl text-xs font-bold uppercase hover:shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check</span>
                  </button>
                  <button type="button" onClick={() => onShowInlineSaborChange(true)} className="bg-[#252830] text-[#8b5cf6] px-3 rounded-xl text-xs font-bold uppercase hover:bg-[#333] transition-all flex items-center gap-1" title="Criar novo sabor">
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>
              ) : (
                <div className="bg-[#1a1a1a] border border-[#8b5cf6]/30 rounded-xl p-4 space-y-3 mt-4">
                  <input value={newSaborNome} onChange={e => onNewSaborNomeChange(e.target.value)} placeholder="Nome do sabor" className="w-full bg-[#252830] border border-[#333] rounded-lg py-3 px-4 text-sm text-white placeholder:text-gray-500" autoFocus />
                  <input value={newSaborDescricao} onChange={e => onNewSaborDescricaoChange(e.target.value)} placeholder="Descricao (opcional)" className="w-full bg-[#252830] border border-[#333] rounded-lg py-3 px-4 text-sm text-white placeholder:text-gray-500" />
                  <div className="flex gap-2">
                    <button type="button" onClick={onCancelInlineSabor} className="flex-1 py-2.5 rounded-lg border border-[#333] text-gray-400 text-xs font-bold uppercase hover:bg-[#252830] transition-all">Cancelar</button>
                    <button type="button" onClick={onSaveInlineSabor} disabled={savingSabor || !newSaborNome.trim()} className="flex-1 py-2.5 rounded-lg bg-[#8b5cf6] text-white text-xs font-bold uppercase hover:shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">{savingSabor ? 'Salvando...' : 'Salvar'}</button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="p-5 sm:p-8 border-t border-[#252830]">
              <div className="flex gap-4">
                <button type="button" onClick={onClose} className="flex-1 py-4 rounded-xl border border-[#333] text-[#888] font-headline font-bold text-xs uppercase tracking-widest hover:bg-[#1a1a1a] transition-all" disabled={uploading}>Cancelar</button>
                <button type="submit" disabled={uploading} className="flex-1 py-4 rounded-xl bg-[#ff5722] text-white font-headline font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,86,55,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">{uploading ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
