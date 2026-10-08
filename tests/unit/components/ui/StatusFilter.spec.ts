import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusFilter from '@/components/ui/status-filter/StatusFilter.vue'

const options = [
  { value: 'active', label: 'Активные', count: 3 },
  { value: 'archived', label: 'Архивные', count: 1 },
  { value: 'all', label: 'Все', count: 4 },
]

const mountFilter = (modelValue = 'active') =>
  mount(StatusFilter, { props: { modelValue, options } })

describe('StatusFilter', () => {
  it('renders no "Показать" caption', () => {
    const wrapper = mountFilter()

    expect(wrapper.text()).not.toContain('Показать')
  })

  it('renders every option with its counter', () => {
    const wrapper = mountFilter()
    const items = wrapper.findAll('button')

    expect(items).toHaveLength(options.length)
    expect(items[0].text()).toContain('Активные')
    expect(items[0].text()).toContain('(3)')
    expect(items[1].text()).toContain('Архивные')
    expect(items[1].text()).toContain('(1)')
    expect(items[2].text()).toContain('Все')
    expect(items[2].text()).toContain('(4)')
  })

  it('emits update:modelValue with the clicked option value', async () => {
    const wrapper = mountFilter()

    await wrapper.findAll('button')[2].trigger('click')

    expect(wrapper.emitted('update:modelValue')).toContainEqual(['all'])
  })

  it('marks the option matching modelValue as pressed', () => {
    const wrapper = mountFilter('archived')
    const items = wrapper.findAll('button')

    expect(items[1].attributes('data-state')).toBe('on')
    expect(items[0].attributes('data-state')).toBe('off')
  })
})
