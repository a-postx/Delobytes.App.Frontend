export type StatsTone = 'default' | 'positive' | 'negative' | 'warning'

export type StatsDeltaDirection = 'up' | 'down' | 'flat'

export type StatsDeltaTone = 'positive' | 'negative' | 'neutral'

export interface StatsDelta {
  text: string
  direction: StatsDeltaDirection
  tone: StatsDeltaTone
}

export interface StatsStripItem {
  key?: string
  label: string
  value: string
  /** Small unit rendered next to the value: `₽`, `шт`, `%`. */
  unit?: string
  caption?: string
  delta?: StatsDelta
  tone?: StatsTone
}
