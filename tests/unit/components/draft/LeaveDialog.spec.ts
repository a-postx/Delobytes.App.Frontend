import { defineComponent, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import LeaveDialog from '@/components/draft/LeaveDialog.vue'
import type { DraftRegistry } from '@/composables/usePageDraft'
import { provideDraftRegistry, useDraftSection } from '@/composables/usePageDraft'

const hoisted = vi.hoisted(() => ({ leave: null as null | (() => unknown) }))

vi.mock('vue-router', () => ({
  onBeforeRouteLeave: (fn: () => unknown) => {
    hoisted.leave = fn
  },
}))

const mountDialog = () => {
  const dirty = ref(true)
  const holder: { registry: DraftRegistry | null } = { registry: null }

  const SectionHost = defineComponent({
    setup() {
      useDraftSection({
        id: 'overview',
        label: 'Основные данные',
        isDirty: dirty,
        save: async () => true,
        discard: () => {
          dirty.value = false
        },
      })
      return () => null
    },
  })

  const Host = defineComponent({
    components: { LeaveDialog, SectionHost },
    setup() {
      holder.registry = provideDraftRegistry()
    },
    template: '<div><SectionHost /><LeaveDialog /></div>',
  })

  const wrapper = mount(Host, { attachTo: document.body })

  if (!holder.registry) {
    throw new Error('Реестр черновиков не создан')
  }

  return { wrapper, registry: holder.registry }
}

const bodyButton = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.body.querySelectorAll('button'))
    .find(button => button.textContent?.trim() === label) as HTMLButtonElement | undefined

describe('LeaveDialog: подтверждение ухода', () => {
  it('перечисляет несохранённые разделы', async () => {
    const { wrapper, registry } = mountDialog()

    void hoisted.leave?.()
    await nextTick()
    await flushPromises()

    expect(registry.leaveOpen.value).toBe(true)
    expect(document.body.textContent).toContain('Уйти со страницы?')
    expect(document.body.textContent).toContain('Основные данные')

    wrapper.unmount()
  })

  it('остаётся на странице по отмене', async () => {
    const { wrapper, registry } = mountDialog()

    const decision = hoisted.leave?.() as Promise<boolean>
    await nextTick()
    await flushPromises()

    bodyButton('Остаться')?.dispatchEvent(new Event('click', { bubbles: true }))
    await flushPromises()

    await expect(decision).resolves.toBe(false)
    expect(registry.leaveOpen.value).toBe(false)

    wrapper.unmount()
  })

  it('пропускает уход после подтверждения', async () => {
    const { wrapper, registry } = mountDialog()

    const decision = hoisted.leave?.() as Promise<boolean>
    await nextTick()
    await flushPromises()

    bodyButton('Уйти')?.dispatchEvent(new Event('click', { bubbles: true }))
    await flushPromises()

    await expect(decision).resolves.toBe(true)
    expect(registry.leaveOpen.value).toBe(false)

    wrapper.unmount()
  })
})
