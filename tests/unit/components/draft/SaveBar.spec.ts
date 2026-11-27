import { defineComponent, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import SaveBar from '@/components/draft/SaveBar.vue'
import { provideDraftRegistry, useDraftSection } from '@/composables/usePageDraft'

vi.mock('vue-router', () => ({
  onBeforeRouteLeave: vi.fn(),
}))

const mountBar = (outcomes: boolean[] = [true]) => {
  const queue = [...outcomes]
  const dirty = ref(false)
  const save = vi.fn(async () => queue.shift() ?? true)

  const SectionHost = defineComponent({
    setup() {
      useDraftSection({
        id: 'overview',
        label: 'Основные данные',
        isDirty: dirty,
        save,
        discard: () => {
          dirty.value = false
        },
      })
      return () => null
    },
  })

  const Host = defineComponent({
    components: { SaveBar, SectionHost },
    setup() {
      provideDraftRegistry()

      const setDirty = (value: boolean): void => {
        dirty.value = value
      }

      return { setDirty }
    },
    template: '<div><SectionHost /><SaveBar /></div>',
  })

  const wrapper = mount(Host, { attachTo: document.body })

  return {
    wrapper,
    save,
    setDirty: (value: boolean): void => {
      wrapper.vm.setDirty(value)
    },
  }
}

const saveBar = (wrapper: VueWrapper) =>
  wrapper.find('[role="region"][aria-label="Несохранённые изменения"]')

const buttonByText = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find(button => button.text().includes(text))

describe('SaveBar: панель сохранения', () => {
  it('не показывается без правок', () => {
    const { wrapper } = mountBar()

    expect(saveBar(wrapper).exists()).toBe(false)

    wrapper.unmount()
  })

  it('показывает, какие разделы не сохранены', async () => {
    const { wrapper, setDirty } = mountBar()

    setDirty(true)
    await nextTick()

    const bar = saveBar(wrapper)
    expect(bar.exists()).toBe(true)
    expect(bar.text()).toContain('Не сохранено:')
    expect(bar.text()).toContain('Основные данные')

    wrapper.unmount()
  })

  it('сохраняет всё по кнопке', async () => {
    const { wrapper, save, setDirty } = mountBar([true])

    setDirty(true)
    await nextTick()

    await buttonByText(wrapper, 'Сохранить всё')?.trigger('click')
    await flushPromises()

    expect(save).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('показывает частичный сбой и предлагает повторить', async () => {
    const { wrapper, save, setDirty } = mountBar([false])

    setDirty(true)
    await nextTick()

    await buttonByText(wrapper, 'Сохранить всё')?.trigger('click')
    await flushPromises()

    expect(save).toHaveBeenCalledTimes(1)
    expect(saveBar(wrapper).text()).toContain('Сохранено 0 из 1')
    expect(saveBar(wrapper).text()).toContain('не сохранено:')
    expect(buttonByText(wrapper, 'Повторить')).toBeTruthy()

    wrapper.unmount()
  })

  it('сохраняет по Ctrl+S', async () => {
    const { wrapper, save, setDirty } = mountBar([true])

    setDirty(true)
    await nextTick()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }))
    await flushPromises()

    expect(save).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })
})
