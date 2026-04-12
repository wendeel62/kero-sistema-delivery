import { z } from 'zod'
export const ingredienteSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  unidade: z.enum(['kg', 'g', 'lt', 'ml', 'un'] as [string, ...string[]]),
  quantidade_atual: z.number().min(0, 'Quantidade não pode ser negativa'),
  quantidade_minima: z.number().min(0, 'Quantidade mínima não pode ser negativa'),
  custo_unitario: z.number().min(0, 'Custo unitário não pode ser negativo'),
  categoria: z.string().optional()
});
