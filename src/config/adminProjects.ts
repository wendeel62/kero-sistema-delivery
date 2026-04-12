export type AdminProject = {
  id: string
  name: string
  icon: string
  color: string
  status: 'active' | 'coming_soon'
  metricsEndpoint: string
  plans: { id: string; name: string; value: number }[]
}

export const ADMIN_PROJECTS: AdminProject[] = [
  {
    id: 'kero',
    name: 'Kero',
    icon: 'UtensilsCrossed',
    color: '#e8391a',
    status: 'active',
    metricsEndpoint: 'admin-metrics',
    plans: [
      { id: 'basic', name: 'Básico', value: 69 },
      { id: 'pro', name: 'Pro', value: 127 },
      { id: 'premium', name: 'Premium', value: 197 },
    ],
  },
]
