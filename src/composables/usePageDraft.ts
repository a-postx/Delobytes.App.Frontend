import { computed, inject, onBeforeUnmount, onMounted, provide, shallowRef } from 'vue'
import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

export type DraftStatus = 'clean' | 'saving' | 'saved' | 'error'

export interface DraftSectionInput {
  id: string
  label: string
  isDirty: Readonly<Ref<boolean>>
  save: () => Promise<boolean>
  discard: () => void
}

export interface DraftSection extends DraftSectionInput {
  readonly status: Ref<DraftStatus>
}

export interface DraftPartialFailure {
  readonly ok: number
  readonly total: number
  readonly failedLabel: string
}

export interface DraftRegistry {
  readonly sections: ComputedRef<readonly DraftSection[]>
  readonly dirtySections: ComputedRef<readonly DraftSection[]>
  readonly isDirty: ComputedRef<boolean>
  readonly isBusy: ComputedRef<boolean>
  readonly partialFailure: Readonly<Ref<DraftPartialFailure | null>>
  readonly leaveOpen: Readonly<Ref<boolean>>
  saveAll: () => Promise<boolean>
  discardAll: () => void
  resolveLeave: (leave: boolean) => void
}

interface DraftRegistryControl extends DraftRegistry {
  register: (section: DraftSectionInput) => void
  unregister: (id: string) => void
}

const draftKey: InjectionKey<DraftRegistryControl> = Symbol('draft-registry')

let activeRegistry: DraftRegistryControl | null = null

/** Проверка для dev-ассерта в роутере: страница с meta.saveGuard обязана создать реестр. */
export function hasActiveDraftRegistry(): boolean {
  return activeRegistry !== null
}

/**
 * Владелец черновиков страницы. Реестр читают панель сохранения, диалог ухода
 * и единственный перехватчик навигации, поэтому признак «есть правки» считается
 * в одном месте и не может разойтись между ними.
 */
export function provideDraftRegistry(): DraftRegistry {
  const entries = shallowRef<DraftSection[]>([])
  const partialFailure = shallowRef<DraftPartialFailure | null>(null)
  const leaveOpen = shallowRef(false)
  let leaveResolver: ((leave: boolean) => void) | null = null

  const sections = computed<readonly DraftSection[]>(() => entries.value)
  const dirtySections = computed<readonly DraftSection[]>(() =>
    entries.value.filter(section => section.isDirty.value),
  )
  const isDirty = computed<boolean>(() => dirtySections.value.length > 0)
  const isBusy = computed<boolean>(() =>
    entries.value.some(section => section.status.value === 'saving'),
  )

  const runSave = async (section: DraftSection): Promise<boolean> => {
    section.status.value = 'saving'
    try {
      const saved: boolean = await section.save()
      section.status.value = saved ? 'saved' : 'error'
      return saved
    } catch {
      section.status.value = 'error'
      return false
    }
  }

  /**
   * Сохраняет все изменённые разделы и сообщает о частичном успехе.
   * Молчаливое «сохранилось всё» недопустимо: разделы пишутся разными запросами,
   * и пользователь должен увидеть, что именно не принято.
   */
  const saveAll = async (): Promise<boolean> => {
    const targetIds: string[] = dirtySections.value.map(section => section.id)
    if (targetIds.length === 0) {
      partialFailure.value = null
      return true
    }

    let ok = 0
    let failedLabel: string | null = null

    for (const id of targetIds) {
      const section: DraftSection | undefined = entries.value.find(item => item.id === id)
      if (!section) {
        continue
      }

      if (await runSave(section)) {
        ok += 1
      } else if (failedLabel === null) {
        failedLabel = section.label
      }
    }

    if (failedLabel !== null) {
      partialFailure.value = { ok, total: targetIds.length, failedLabel }
      return false
    }

    partialFailure.value = null
    return true
  }

  const discardAll = (): void => {
    entries.value.forEach(section => {
      section.discard()
      section.status.value = 'clean'
    })
    partialFailure.value = null
  }

  const resolveLeave = (leave: boolean): void => {
    leaveOpen.value = false
    const resolver = leaveResolver
    leaveResolver = null
    resolver?.(leave)
  }

  const confirmLeave = (): Promise<boolean> => {
    if (!isDirty.value) {
      return Promise.resolve(true)
    }

    leaveOpen.value = true
    return new Promise<boolean>(resolve => {
      leaveResolver = resolve
    })
  }

  const register = (input: DraftSectionInput): void => {
    const entry: DraftSection = { ...input, status: shallowRef<DraftStatus>('clean') }
    entries.value = [...entries.value.filter(section => section.id !== entry.id), entry]
  }

  const unregister = (id: string): void => {
    entries.value = entries.value.filter(section => section.id !== id)
  }

  const registry: DraftRegistryControl = {
    sections,
    dirtySections,
    isDirty,
    isBusy,
    partialFailure,
    leaveOpen,
    saveAll,
    discardAll,
    resolveLeave,
    register,
    unregister,
  }

  provide(draftKey, registry)

  const onBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (!isDirty.value) {
      return
    }

    // Браузер игнорирует любой текст, но без preventDefault диалог не появится.
    event.preventDefault()
    event.returnValue = ''
  }

  // Единственный перехватчик навигации: секции не вешают собственные хуки,
  // иначе на один уход приходило бы по вопросу от каждой.
  onBeforeRouteLeave(() => {
    if (!isDirty.value) {
      return true
    }

    return confirmLeave()
  })

  onMounted(() => {
    window.addEventListener('beforeunload', onBeforeUnload)
    activeRegistry = registry
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
    resolveLeave(false)
    entries.value = []
    if (activeRegistry === registry) {
      activeRegistry = null
    }
  })

  return registry
}

export function useDraftRegistry(): DraftRegistry {
  const registry = inject(draftKey)
  if (!registry) {
    throw new Error('useDraftRegistry требует provideDraftRegistry() на странице')
  }

  return registry
}

/** Регистрирует секцию в реестре страницы; снимает регистрацию при размонтировании. */
export function useDraftSection(input: DraftSectionInput): void {
  const registry = inject(draftKey)
  if (!registry) {
    throw new Error(`useDraftSection «${input.id}» требует provideDraftRegistry() на странице`)
  }

  registry.register(input)
  onBeforeUnmount(() => registry.unregister(input.id))
}
