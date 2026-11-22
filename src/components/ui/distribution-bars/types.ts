export type DistributionTone = 'default' | 'info' | 'warning' | 'danger'

export interface DistributionBucket {
  key?: string
  label: string
  count: number
  amount: string
  tone?: DistributionTone
}
