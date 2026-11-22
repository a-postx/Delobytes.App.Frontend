export type StatsTone = 'default' | 'positive' | 'negative' | 'warning'

export interface StatsStripItem {
  key?: string
  label: string
  value: string
  caption?: string
  tone?: StatsTone
}
