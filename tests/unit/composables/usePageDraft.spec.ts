import { defineComponent, h, ref } from 'vue'
import type { Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import {
  hasActiveDraftRegistry,
  provideDraftRegistry,
  useDraftSection,
} from '@/composables/usePageDraft'
import type { DraftRegistry } from '@/composables/usePageDraft'

const hoisted = vi.hoisted(() => ({ leave: null as null | (() => unknown) }))

vi.mock('vue-router', () => ({
  onBeforeRouteLeave: (fn: () => unknown) => {
    hoisted.leave = fn
  },
}))

interface Harness {
  registry: DraftRegistry
  flags: { a: Ref<boolean>; b: Ref<boolean> }
  saves: { a: number; b: number }
  discards: { a: number; b: number }
  wrapper: VueWrapper
}

const mountHarness = (outcomes: boolean[] = []): Harness => {
  const queue = [...outcomes]
  const flags = { a: ref(false), b: ref(false) }
  const saves = { a: 0, b: 0 }
  const discards = { a: 0, b: 0 }
  const holder: { registry: DraftRegistry | null } = { registry: null }

  const Sections = defineComponent({
    setup() {
      useDraftSection({
        id: 'a',
        label: 'Раздел А',
        isDirty: flags.a,
        save: async () => {
          saves.a += 1
          return queue.shift() ?? true
        },
        discard: () => {
          discards.a += 1
          flags.a.value = false
        },
      })
      useDraftSection({
        id: 'b',
        label: 'Раздел Б',
        isDirty: flags.b,
        save: async () => {
          saves.b += 1
          return true
        },
        discard: () => {
          discards.b += 1
          flags.b.value = false
        },
      })
      return () => null
    },
  })

  const Host = defineComponent({
    components: { Sections },
    setup() {
      holder.registry = provideDraftRegistry()
      return () => h(Sections)
    },
  })

  const wrapper = mount(Host)
  mounted.push(wrapper)

  if (!holder.registry) {
    throw new Error('Реестр черновиков не создан')
  }

  return { registry: holder.registry, flags, saves, discards, wrapper }
}

const mounted: VueWrapper[] = []

beforeEach(() => {
  hoisted.leave = null
})

afterEach(() => {
  mounted.forEach(wrapper => wrapper.unmount())
  mounted.length = 0
})

describe('usePageDraft: реестр черновиков', () => {
  it('регистрирует секции и агрегирует признак правок', () => {
    const { registry, flags } = mountHarness()

    expect(registry.sections.value).toHaveLength(2)
    expect(registry.isDirty.value).toBe(false)

    flags.b.value = true

    expect(registry.isDirty.value).toBe(true)
    expect(registry.dirtySections.value).toHaveLength(1)
    expect(registry.dirtySections.value[0].label).toBe('Раздел Б')
  })

  it('сохраняет все изменённые секции', async () => {
    const { registry, flags, saves } = mountHarness([true, true])

    flags.a.value = true
    flags.b.value = true

    await expect(registry.saveAll()).resolves.toBe(true)

    expect(saves).toEqual({ a: 1, b: 1 })
    expect(registry.partialFailure.value).toBeNull()
  })

  it('сообщает о частичном сбое и не теряет остальные секции', async () => {
    const { registry, flags, saves } = mountHarness([false, true])

    flags.a.value = true
    flags.b.value = true

    await expect(registry.saveAll()).resolves.toBe(false)

    expect(saves).toEqual({ a: 1, b: 1 })
    expect(registry.partialFailure.value).toEqual({ ok: 1, total: 2, failedLabel: 'Раздел А' })
  })

  it('сбрасывает все секции и очищает частичный сбой', async () => {
    const { registry, flags, discards } = mountHarness([false])

    flags.a.value = true
    await registry.saveAll()
    expect(registry.partialFailure.value).not.toBeNull()

    registry.discardAll()

    expect(discards).toEqual({ a: 1, b: 1 })
    expect(registry.isDirty.value).toBe(false)
    expect(registry.partialFailure.value).toBeNull()
  })
})

describe('usePageDraft: уход со страницы', () => {
  it('пропускает уход без правок', async () => {
    mountHarness()

    expect(hoisted.leave).not.toBeNull()
    expect(hoisted.leave?.()).toBe(true)
  })

  it('спрашивает подтверждение при правках', async () => {
    const { registry, flags } = mountHarness()
    flags.a.value = true

    const decision = hoisted.leave?.() as Promise<boolean>
    expect(registry.leaveOpen.value).toBe(true)

    registry.resolveLeave(false)

    await expect(decision).resolves.toBe(false)
    expect(registry.leaveOpen.value).toBe(false)
  })

  it('пропускает уход после подтверждения', async () => {
    const { registry, flags } = mountHarness()
    flags.a.value = true

    const decision = hoisted.leave?.() as Promise<boolean>
    registry.resolveLeave(true)

    await expect(decision).resolves.toBe(true)
  })
})

describe('usePageDraft: выгрузка страницы', () => {
  it('блокирует выгрузку только при правках', () => {
    const { flags, wrapper } = mountHarness()

    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)

    flags.a.value = true

    const dirty = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirty)
    expect(dirty.defaultPrevented).toBe(true)

    wrapper.unmount()

    const afterUnmount = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(afterUnmount)
    expect(afterUnmount.defaultPrevented).toBe(false)
  })

  it('публикует активный реестр для dev-ассерта', () => {
    const { wrapper } = mountHarness()

    expect(hasActiveDraftRegistry()).toBe(true)

    wrapper.unmount()

    expect(hasActiveDraftRegistry()).toBe(false)
  })
})
