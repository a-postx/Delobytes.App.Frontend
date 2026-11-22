export type PnlRowTone = 'default' | 'sub' | 'total' | 'result' | 'muted'

export interface PnlStatementRow {
  key?: string
  label: string
  amount: string
  percent?: string
  chip?: string
  tone?: PnlRowTone
}
