import { z } from 'zod'

export const clienteSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  telefone: z.string().regex(/^\\\\(\\d{2}\\\\)\\\\s9?\\\\d{4}-\\\\d{4}$/, 'Telefone inválido. Use o formato (99) 99999-9999'),
  email: z.string().email().optional().or(z.literal('')),
  data_nascimento: z.string().optional(),
})