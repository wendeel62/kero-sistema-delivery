import { z } from 'zod'

export const produtoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  preco: z.number().min(0, 'Preço deve ser maior ou igual a zero').optional(),
  disponivel: z.boolean().default(true),
  destaque: z.boolean().default(false),
  tempo_preparo: z.number().min(0, 'Tempo de preparo deve ser maior ou igual a zero').default(30),
  categoria_id: z.string().optional(),
  imagem_url: z.string().url('URL da imagem inválida').optional()
})