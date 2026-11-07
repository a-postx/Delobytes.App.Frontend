import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorState from '@/components/feedback/ErrorState.vue'

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), dismiss: vi.fn() },
}))

/**
 * `emits` обязателен: без него Vue считает `click` обычным атрибутом, обработчик приходит
 * fallthrough'ом на корневой <button> и срабатывает дважды вместе с `$emit`.
 */
const ButtonStub = {
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
}

function factory(props: Record<string, unknown>) {
  return mount(ErrorState, {
    props: { title: 'Нет связи с сервером', description: 'Сервер не отвечает.', ...props },
    global: { stubs: { Button: ButtonStub } },
  })
}

describe('ErrorState: вид compact', () => {
  it('не навязывает минимальную высоту контейнеру', () => {
    const wrapper = factory({ variant: 'compact' })

    // min-h-[60svh] у embedded раздувал виджет дашборда на пол-экрана.
    expect(wrapper.classes().join(' ')).not.toContain('min-h-[60svh]')
    expect(wrapper.classes()).not.toContain('min-h-svh')
  })

  it('embedded по-прежнему занимает 60svh — регрессия только для compact', () => {
    const wrapper = factory({ variant: 'embedded' })

    expect(wrapper.classes()).toContain('min-h-[60svh]')
  })

  it('рисует заголовок обычным размером, а не 2xl/3xl', () => {
    const wrapper = factory({ variant: 'compact' })
    const title = wrapper.find('h1')

    expect(title.text()).toBe('Нет связи с сервером')
    expect(title.classes()).toContain('text-sm')
    expect(title.classes().join(' ')).not.toContain('text-2xl')
    expect(title.classes().join(' ')).not.toContain('text-3xl')
  })

  it('описание остаётся видимым, но меньшим кеглем', () => {
    const wrapper = factory({ variant: 'compact' })
    const description = wrapper.find('p')

    expect(description.text()).toBe('Сервер не отвечает.')
    expect(description.classes()).toContain('text-xs')
  })

  it('не рисует декоративные подложки внутри маленького контейнера', () => {
    const wrapper = factory({ variant: 'compact' })

    expect(wrapper.findAll('[aria-hidden="true"]')).toHaveLength(0)
  })

  it('сохраняет кнопку повтора и её подпись', async () => {
    const wrapper = factory({ variant: 'compact', retryLabel: 'Повторить' })
    const button = wrapper.find('button')

    expect(button.text()).toBe('Повторить')
    await button.trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('без retryLabel кнопка не отображается', () => {
    const wrapper = factory({ variant: 'compact' })

    expect(wrapper.find('button').exists()).toBe(false)
  })
})

describe('ErrorState: вид page', () => {
  it('занимает всю высоту экрана', () => {
    const wrapper = factory({ variant: 'page' })

    expect(wrapper.classes()).toContain('min-h-svh')
  })

  it('рисует декоративные подложки', () => {
    const wrapper = factory({ variant: 'page' })

    expect(wrapper.findAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
  })
})
