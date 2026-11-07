import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardWidget from '@/components/dashboard/DashboardWidget.vue'

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), dismiss: vi.fn() },
}))

const CardStub = { template: '<div><slot /></div>' }

function factory(props: Record<string, unknown> = {}) {
  return mount(DashboardWidget, {
    props: { title: 'Заказы', ...props },
    global: {
      stubs: {
        Card: CardStub,
        CardHeader: CardStub,
        CardTitle: CardStub,
        CardContent: CardStub,
        Skeleton: CardStub,
      },
    },
  })
}

describe('DashboardWidget: состояние ошибки', () => {
  it('показывает сообщение об ошибке и текст сбоя', () => {
    const wrapper = factory({ error: 'Нет связи с сервером' })

    expect(wrapper.text()).toContain('Не удалось загрузить данные')
    expect(wrapper.text()).toContain('Нет связи с сервером')
  })

  it('использует компактный вид, а не полноразмерный embedded', () => {
    const wrapper = factory({ error: 'Нет связи с сервером' })
    const errorState = wrapper.findComponent({ name: 'ErrorState' })

    expect(errorState.props('variant')).toBe('compact')
  })

  it('не раздувает карточку минимальной высотой', () => {
    const wrapper = factory({ error: 'Нет связи с сервером' })
    const errorRoot = wrapper.findComponent({ name: 'ErrorState' }).element as HTMLElement

    expect(errorRoot.className).not.toContain('min-h-[60svh]')
  })

  it('пробрасывает retry наружу', async () => {
    const wrapper = factory({ error: 'Нет связи с сервером' })
    const errorState = wrapper.findComponent({ name: 'ErrorState' })

    await errorState.vm.$emit('retry')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('без ошибки показывает содержимое слота', () => {
    const wrapper = mount(DashboardWidget, {
      props: { title: 'Заказы' },
      slots: { default: '<div data-test="content">данные</div>' },
      global: {
        stubs: {
          Card: CardStub,
          CardHeader: CardStub,
          CardTitle: CardStub,
          CardContent: CardStub,
          Skeleton: CardStub,
        },
      },
    })

    expect(wrapper.find('[data-test="content"]').exists()).toBe(true)
  })
})
