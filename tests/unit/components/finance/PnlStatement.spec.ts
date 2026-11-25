import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PnlStatement from '@/components/finance/PnlStatement.vue'
import type { PnlStatementRow } from '@/components/finance/types'

const rows: PnlStatementRow[] = [
  { key: 'revenue', label: 'Выручка', amount: '4 812 400' },
  { key: 'comp', label: 'Компенсация СПП', amount: '+186 300', percent: '+3,9%', tone: 'sub' },
  { key: 'fee', label: 'Комиссия маркетплейса', amount: '−612 900', percent: '−12,7%', tone: 'sub' },
  { key: 'net', label: 'Чистая выручка', amount: '4 035 200', tone: 'total' },
  { key: 'tax', label: 'Налог', amount: '−98 400', chip: 'оценка', tone: 'muted' },
  { key: 'margin', label: 'Маржинальная прибыль', amount: '1 522 300', tone: 'result' },
]

const mountStatement = (props: { rows: PnlStatementRow[]; footnote?: string }) =>
  mount(PnlStatement, { props })

describe('PnlStatement', () => {
  it('renders every row with its amount and percent', () => {
    const wrapper = mountStatement({ rows })
    const rendered = wrapper.findAll('[data-slot="pnl-row"]')

    expect(rendered).toHaveLength(rows.length)
    expect(rendered[1].text()).toContain('Компенсация СПП')
    expect(rendered[1].text()).toContain('+186 300')
    expect(rendered[1].text()).toContain('+3,9%')
  })

  it('indents deduction rows', () => {
    const wrapper = mountStatement({ rows })
    const rendered = wrapper.findAll('[data-slot="pnl-row"]')
    const label = (index: number): string => rendered[index].find('span').classes().join(' ')

    expect(label(1)).toContain('pl-3.5')
    expect(label(0)).not.toContain('pl-3.5')
    expect(label(3)).not.toContain('pl-3.5')
  })

  it('highlights total and result rows', () => {
    const wrapper = mountStatement({ rows })
    const rendered = wrapper.findAll('[data-slot="pnl-row"]')

    expect(rendered[3].classes()).toContain('bg-muted')
    expect(rendered[3].classes()).toContain('font-medium')
    expect(rendered[5].classes()).toContain('bg-badge-success')
    expect(rendered[5].classes()).toContain('text-badge-success-foreground')
  })

  it('marks a negative result as a loss, not as a success', () => {
    const wrapper = mountStatement({
      rows: [{ key: 'margin', label: 'Маржинальная прибыль', amount: '−33 317', tone: 'loss' }],
    })
    const row = wrapper.findAll('[data-slot="pnl-row"]')[0]

    expect(row.classes()).toContain('bg-badge-destructive')
    expect(row.classes()).toContain('text-badge-destructive-foreground')
    expect(row.classes()).not.toContain('bg-badge-success')
  })

  it('renders the chip of a row', () => {
    const wrapper = mountStatement({ rows })
    const taxRow = wrapper.findAll('[data-slot="pnl-row"]')[4]

    expect(taxRow.text()).toContain('оценка')
  })

  it('renders the footnote when provided', () => {
    const wrapper = mountStatement({ rows, footnote: 'Налог — оценка по профилю' })

    expect(wrapper.text()).toContain('Налог — оценка по профилю')
  })

  it('omits the footnote when it is not provided', () => {
    const wrapper = mountStatement({ rows })

    expect(wrapper.findAll('p')).toHaveLength(0)
  })
})
