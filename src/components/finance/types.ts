export type PnlRowTone = 'default' | 'sub' | 'total' | 'result' | 'muted'

export type PnlBarKind = 'total' | 'increase' | 'decrease' | 'result'

/** Floating bar of the waterfall: offset and width as percentages of the shared scale. */
export interface PnlStatementBar {
  offset: number
  width: number
  kind: PnlBarKind
}

export interface PnlStatementRow {
  key?: string
  label: string
  amount: string
  percent?: string
  chip?: string
  tone?: PnlRowTone
  bar?: PnlStatementBar
}

export interface PnlAxisTick {
  position: number
  label: string
}
