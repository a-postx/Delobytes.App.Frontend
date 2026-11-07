import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { defineComponent, h } from 'vue'
import AppErrorBoundary from '@/components/feedback/AppErrorBoundary.vue'

vi.mock('vue-sonner', () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}))

/**
 * До R8 AppErrorBoundary жёстко подставлял code="500" в ErrorState для любой ошибки
 * рендера, включая обычный TypeError. Это превращало сбой верстки в ложный "ответ
 * сервера". Тест фиксирует, что строка "500" больше не появляется на экране ни в каком
 * виде — ни как code, ни как часть текста.
 */
const BrokenComponent = defineComponent({
  name: 'BrokenComponent',
  setup() {
    return () => {
      throw new TypeError('Cannot read properties of undefined')
    }
  },
})

describe('AppErrorBoundary — не выдаёт ошибку рендера за HTTP 500', () => {
  it('не содержит литерал "500" на экране ошибки', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { render: () => null } }],
    })

    const wrapper = mount(AppErrorBoundary, {
      global: {
        plugins: [router],
        stubs: { RouterView: true },
      },
      slots: {
        default: () => h(BrokenComponent),
      },
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).not.toContain('500')
  })
})
