import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusDot from '@/components/ui/status-dot/StatusDot.vue'
import type { StatusDotState } from '@/components/ui/status-dot/types'

const mountDot = (props: { label: string; state: StatusDotState; title?: string }) =>
  mount(StatusDot, { props })

describe('StatusDot', () => {
  it('renders the label', () => {
    const wrapper = mountDot({ label: 'Окончательно', state: 'success' })

    expect(wrapper.text()).toBe('Окончательно')
  })

  it.each<[StatusDotState, string]>([
    ['success', 'bg-success'],
    ['warning', 'bg-warning'],
    ['danger', 'bg-destructive'],
    ['muted', 'bg-muted-foreground/50'],
  ])('colors the mark for the %s state', (state: StatusDotState, expected: string) => {
    const wrapper = mountDot({ label: 'Статус', state })

    expect(wrapper.find('[data-slot="status-dot-mark"]').classes()).toContain(expected)
    expect(wrapper.attributes('data-state')).toBe(state)
  })

  it('marks only the danger label as an error', () => {
    const danger = mountDot({ label: 'Просрочено', state: 'danger' })
    const warning = mountDot({ label: 'Предварительно', state: 'warning' })
    const success = mountDot({ label: 'Окончательно', state: 'success' })

    expect(danger.classes()).toContain('text-destructive')
    expect(warning.classes()).toContain('text-muted-foreground')
    expect(success.classes()).toContain('text-muted-foreground')
  })

  it('passes the title through as an explanation', () => {
    const wrapper = mountDot({ label: 'Просрочено', state: 'danger', title: 'Срок документа прошёл 2 января' })

    expect(wrapper.attributes('title')).toBe('Срок документа прошёл 2 января')
  })

  it('renders no title attribute when it is not provided', () => {
    const wrapper = mountDot({ label: 'Окончательно', state: 'success' })

    expect(wrapper.attributes('title')).toBeUndefined()
  })
})
