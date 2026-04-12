import { z } from 'zod'
export const cupomSchema = z.object({
  codigo: z.string().min(3, 'Código deve ter ao menos 3 caracteres').transform(v => v.toUpperCase()),
  tipo: z.enum(['percentual', 'fixo']),
  valor: z.number().positive('Valor deve ser positivo'),
  uso_maximo: z.number().int().positive().optional(),
  validade: z.string().optional().refine(v => !v || new Date(v) > new Date(), { message: 'A validade deve ser uma data futura' })
});
