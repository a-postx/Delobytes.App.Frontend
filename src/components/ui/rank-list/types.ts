export type RankTone = 'default' | 'negative'

export interface RankListItem {
  id: string
  label: string
  value: string
  percent?: string
  tone?: RankTone
}
