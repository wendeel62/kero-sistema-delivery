/**
 * @hook useCardapioUpload
 * @description Upload de imagens e mídia para o bucket "produtos"
 * no Supabase Storage. Gerencia seleção de arquivo, preview e
 * operações de upload/remove.
 */
import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface UseCardapioUploadOptions {
  tenantId: string | null
}

interface UseCardapioUploadReturn {
  /** Arquivo selecionado para upload */
  selectedFile: File | null
  /** URL de preview da imagem (data URL ou URL remota) */
  imagePreview: string | null
  /** Indica se upload está em andamento */
  uploading: boolean
  /** Manipula seleção de arquivo no input */
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** Faz upload do arquivo para o bucket e retorna a URL pública */
  uploadPhoto: (produtoId: string) => Promise<string | null>
  /** Remove o arquivo selecionado e limpa o preview */
  removePhoto: (onEditProdutoUpdate?: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void) => void
  /** Setter para selectedFile */
  setSelectedFile: (file: File | null) => void
  /** Setter para imagePreview */
  setImagePreview: (url: string | null) => void
  /** Setter para uploading */
  setUploading: (v: boolean) => void
}

export function useCardapioUpload(
  options: UseCardapioUploadOptions
): UseCardapioUploadReturn {
  const { tenantId } = options

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // ── File selection ─────────────────────────────────────────────────

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (ev) => setImagePreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    },
    []
  )

  // ── Upload ─────────────────────────────────────────────────────────

  const uploadPhoto = useCallback(
    async (produtoId: string): Promise<string | null> => {
      if (!selectedFile || !tenantId) {
        alert('Erro: tenant nao identificado')
        return null
      }
      const ext = selectedFile.name.split('.').pop() || 'jpg'
      const filePath = `${tenantId}/${produtoId}.${ext}`

      const { error } = await supabase.storage
        .from('produtos')
        .upload(filePath, selectedFile, {
          upsert: true,
          contentType: selectedFile.type || 'image/jpeg',
        })

      if (error) {
        console.error('Erro ao fazer upload:', error)
        alert(
          'Erro ao fazer upload. Verifique se o bucket "produtos" existe e se a policy de upload do Supabase está configurada.'
        )
        return null
      }

      const { data: urlData } = supabase.storage.from('produtos').getPublicUrl(filePath)
      return urlData.publicUrl
    },
    [selectedFile, tenantId]
  )

  // ── Remove ─────────────────────────────────────────────────────────

  const removePhoto = useCallback(
    (onEditProdutoUpdate?: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void) => {
      setSelectedFile(null)
      setImagePreview(null)
      if (onEditProdutoUpdate) {
        onEditProdutoUpdate((prev) => ({ ...prev, imagem_url: '' }))
      }
    },
    []
  )

  return {
    selectedFile,
    imagePreview,
    uploading,
    handleFileChange,
    uploadPhoto,
    removePhoto,
    setSelectedFile,
    setImagePreview,
    setUploading,
  }
}
