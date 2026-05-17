import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { clienteSchema } from '../../schemas/clienteSchema'
import type { Cliente } from './types'

export interface ClienteFormProps {
  cliente?: Cliente | null
  onClose: () => void
  onSave: () => void
  tenantId: string
}

export function ClienteForm({ cliente, onClose, onSave, tenantId }: ClienteFormProps) {
  const [saving, setSaving] = useState(false)
  const [cepError, setCepError] = useState('')

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome: cliente?.nome || '',
      telefone: cliente?.telefone || '',
      email: cliente?.email || '',
      data_nascimento: cliente?.data_nascimento || '',
    }
  })

  const onSubmit = async (data: any) => {
    setSaving(true)
    // Implementar save logic
    onSave()
    onClose()
    setSaving(false)
  }

  const buscarCep = async (cep: string) => {
    setCepError('')
    if (cep.length !== 8) return
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await resp.json()
      if (data.erro) {
        setCepError('CEP não encontrado')
        return
      }
      // Preencher campos via API
      setValue('endereco', data.logradouro)
      setValue('bairro', data.bairro)
      setValue('cidade', data.localidade)
      setValue('estado', data.uf)
    } catch {
      setCepError('Erro ao buscar CEP')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-lg animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#16181f] rounded-[2.5rem] shadow-2xl overflow-hidden border border-[#252830] animate-scale-in">
        {/* Header */}
        <div className="bg-[#0c0e15] p-10 flex items-center justify-between border-b border-[#252830]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#e8391a]/10 flex items-center justify-center text-[#e8391a]">
              <span className="material-symbols-outlined text-3xl font-bold">person_add</span>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-white">{cliente?.id ? 'Editar Cadastro' : 'Novo Cliente'}</h3>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Informações básicas e endereço</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-[#252830] rounded-full transition-all text-white/60">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-10 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome */}
            <label className="block group">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 ml-2 group-focus-within:text-[#e8391a] transition-colors">
                Nome Completo
              </span>
              <input
                type="text"
                {...register('nome')}
                className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl py-4 px-6 mt-1.5 text-sm text-white outline-none focus:border-[#e8391a] transition-all"
              />
              {errors.nome && <span className="text-red-400 text-xs mt-1 block">{errors.nome.message as string}</span>}
            </label>

            {/* Telefone */}
            <label className="block group">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 ml-2 group-focus-within:text-[#e8391a] transition-colors">
                Telefone / WhatsApp
              </span>
              <input
                type="text"
                placeholder="(00) 00000-0000"
                {...register('telefone')}
                className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl py-4 px-6 mt-1.5 text-sm text-white outline-none focus:border-[#e8391a] transition-all font-mono"
              />
              {errors.telefone && <span className="text-red-400 text-xs mt-1 block">{errors.telefone.message as string}</span>}
            </label>

            {/* Email */}
            <label className="block group">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 ml-2 group-focus-within:text-[#e8391a] transition-colors">
                E-mail (Opcional)
              </span>
              <input
                type="email"
                {...register('email')}
                className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl py-4 px-6 mt-1.5 text-sm text-white outline-none focus:border-[#e8391a] transition-all"
              />
              {errors.email && <span className="text-red-400 text-xs mt-1 block">{errors.email.message as string}</span>}
            </label>

            {/* Data de Nascimento */}
            <label className="block group">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 ml-2 group-focus-within:text-[#e8391a] transition-colors">
                Data de Nascimento
              </span>
              <input
                type="date"
                {...register('data_nascimento')}
                className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl py-4 px-6 mt-1.5 text-sm text-white outline-none focus:border-[#e8391a] transition-all"
              />
            </label>
          </div>
        </form>

        {/* Actions */}
        <div className="p-10 bg-[#0c0e15] border-t border-[#252830] flex justify-end gap-5">
          <button onClick={onClose} className="px-8 py-4 font-black text-xs uppercase text-white/60 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            className="bg-[#e8391a] text-white px-12 py-4 rounded-2xl font-black text-xs uppercase shadow-2xl hover:bg-[#c72f15] active:scale-[0.98] transition-all flex items-center gap-3"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'CONCLUIR CADASTRO'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
