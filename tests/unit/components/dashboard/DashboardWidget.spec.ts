import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardWidget from '@/components/dashboard/DashboardWidget.vue'

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), dismiss: vi.fn() },
}))

const CardStub = { template: '<div data-stub="card"><slot /></div>' }
const CardHeaderStub = { template: '<div data-stub="card-header"><slot /></div>' }
const CardStubWithSlot = { template: '<div data-stub="card-part"><slot /></div>' }

const stubs = {
  Card: CardStub,
  CardHeader: CardHeaderStub,
  CardTitle: CardStubWithSlot,
  CardContent: CardStubWithSlot,
  Skeleton: CardStubWithSlot,
}

function factory(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(DashboardWidget, {
    props: { title: 'Заказы', ...props },
    slots,
    global: { stubs },
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
    const wrapper = factory({}, { default: '<div data-test="content">данные</div>' })

    expect(wrapper.find('[data-test="content"]').exists()).toBe(true)
  })
})

describe('DashboardWidget: стабильная геометрия', () => {
  it('заполняет высоту ячейки грида, чтобы ряд карточек не был рваным', () => {
    const wrapper = factory({ compact: true })

    expect(wrapper.find('[data-stub="card"]').classes()).toContain('h-full')
  })

  it('не переносит шапку компактной карточки на вторую строку', () => {
    const wrapper = factory({ compact: true })

    const headerClasses = wrapper.find('[data-stub="card-header"]').classes()

    expect(headerClasses).not.toContain('flex-wrap')
    expect(headerClasses).toContain('flex-nowrap')
  })

  it('не сжимает блок действий компактной карточки', () => {
    const wrapper = factory({ compact: true }, { actions: '<span data-test="badge">+6,4 %</span>' })

    const actionsClasses = wrapper.get('[data-slot="dashboard-widget-actions"]').classes()

    expect(actionsClasses).toContain('shrink-0')
    expect(actionsClasses).not.toContain('w-full')
    expect(wrapper.find('[data-test="badge"]').exists()).toBe(true)
  })

  it('обрезает длинный заголовок вместо переноса', () => {
    const wrapper = factory({ compact: true, title: 'Заказано товаров' })
    const titleElement = wrapper.get('[data-stub="card-part"]')

    expect(titleElement.classes()).toContain('truncate')
    expect(titleElement.attributes('title')).toBe('Заказано товаров')
  })

  it('оставляет перенос шапки некомпактному виджету с панелью управления', () => {
    const wrapper = factory()

    const headerClasses = wrapper.find('[data-stub="card-header"]').classes()

    expect(headerClasses).toContain('flex-wrap')
    expect(wrapper.get('[data-slot="dashboard-widget-actions"]').classes()).toContain('w-full')
  })
})
