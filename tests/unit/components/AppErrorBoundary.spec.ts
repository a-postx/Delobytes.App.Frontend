import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { defineComponent, h, ref } from 'vue'
import type { Ref } from 'vue'
import AppErrorBoundary from '@/components/feedback/AppErrorBoundary.vue'

vi.mock('vue-sonner', () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}))

/** Компонент, который падает при рендере: имитирует ошибку на странице. */
const BrokenComponent = defineComponent({
  name: 'BrokenComponent',
  setup() {
    const shouldThrow: Ref<boolean> = ref<boolean>(true)
    return () =>
      shouldThrow.value ? (() => { throw new Error('Ошибка построения страницы') })() : h('div', 'ok')
  },
})

describe('AppErrorBoundary', () => {
  function mountWithBoundary(child: unknown) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { render: () => null } }],
    })

    return mount(AppErrorBoundary, {
      global: {
        plugins: [router],
        stubs: {
          RouterView: true,
        },
      },
      slots: {
        default: () => h(child as never),
      },
    })
  }

  it('показывает заглушку вместо пустого экрана при ошибке рендера', async () => {
    const wrapper = mountWithBoundary(BrokenComponent)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Не удалось отобразить раздел')
    expect(wrapper.text()).toContain('Попробовать снова')
  })

  it('пропускает содержимое, когда ошибки нет', () => {
    const FineComponent = defineComponent({
      name: 'FineComponent',
      render: () => h('div', 'рабочий экран'),
    })

    const wrapper = mountWithBoundary(FineComponent)

    expect(wrapper.text()).toContain('рабочий экран')
    expect(wrapper.text()).not.toContain('Не удалось отобразить раздел')
  })
})
