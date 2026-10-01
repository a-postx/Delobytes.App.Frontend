import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { computed, nextTick, ref } from 'vue'
import LegalEntitySettingsCard from '@/components/features/LegalEntitySettingsCard.vue'
import { tenantLegalEntityApi } from '@/services/api/endpoints/tenantLegalEntity'
import { usePermissions } from '@/composables/usePermissions'
import { useCurrentUser } from '@/composables/useCurrentUser'
import type { CurrentUser } from '@/types'

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: vi.fn(),
}))

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('@/services/api/endpoints/tenantLegalEntity', () => ({
  tenantLegalEntityApi: {
    get: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

/**
 * Integration-level assertions that mount the real components (no stubs), so the
 * currency line is checked against what the design system actually renders — a stub
 * would happily mirror any markup, including markup that never reaches the DOM.
 */
describe('LegalEntitySettingsCard with real components', () => {
  const currentUser = ref<CurrentUser | null>(null)

  const buildUser = (currency: string): CurrentUser => ({
    userId: 'user-1',
    displayName: 'Тест',
    email: 'test@example.com',
    tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
    tenantName: 'Пространство',
    currency,
    timeZone: 'Europe/Moscow',
    role: 'Administrator',
    tenants: [],
  })

  const mockCanEdit = (canEdit: boolean): void => {
    vi.mocked(usePermissions).mockReturnValue({
      canEditTenantSettings: computed(() => canEdit),
    } as unknown as ReturnType<typeof usePermissions>)
  }

  const mountCard = async () => {
    const wrapper = mount(LegalEntitySettingsCard, { attachTo: document.body })
    await flushPromises()
    await nextTick()
    return wrapper
  }

  const mountedWrappers: { unmount: () => void }[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    mockCanEdit(true)
    currentUser.value = buildUser('RUB')

    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser,
    } as unknown as ReturnType<typeof useCurrentUser>)

    vi.mocked(tenantLegalEntityApi.get).mockResolvedValue({
      tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
      legalName: 'ООО «Ромашка»',
      inn: '7712345678',
    })
  })

  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('renders the legal name and INN in real inputs', async () => {
    const wrapper = await mountCard()
    mountedWrappers.push(wrapper)

    expect(wrapper.find('#inn').element).toBeInstanceOf(HTMLInputElement)
    expect((wrapper.find('#inn').element as HTMLInputElement).value).toBe('7712345678')
    expect((wrapper.find('#legal-name').element as HTMLInputElement).value).toBe('ООО «Ромашка»')
  })

  it('renders the currency as text, not as an editable control', async () => {
    const wrapper = await mountCard()
    mountedWrappers.push(wrapper)

    const currencyNode = wrapper.find('#currency')

    expect(currencyNode.exists()).toBe(true)
    expect(currencyNode.element.tagName).toBe('P')
    expect(currencyNode.text()).toBe('Валюта учёта: RUB (₽)')
  })

  it('renders the currency code of KZT, which has no narrow symbol in ru-RU', async () => {
    currentUser.value = buildUser('KZT')

    const wrapper = await mountCard()
    mountedWrappers.push(wrapper)

    // ICU подставляет код валюты, поэтому и код, и «символ» здесь — KZT.
    expect(wrapper.find('#currency').text()).toBe('Валюта учёта: KZT (KZT)')
  })

  it('does not render any tax selector, even for an administrator', async () => {
    const wrapper = await mountCard()
    mountedWrappers.push(wrapper)

    expect(wrapper.find('#tax-type').exists()).toBe(false)
    expect(wrapper.find('#vat-type').exists()).toBe(false)
    expect(wrapper.find('#tax-rate').exists()).toBe(false)
  })

  it('disables the real inputs for a non-administrator', async () => {
    mockCanEdit(false)

    const wrapper = await mountCard()
    mountedWrappers.push(wrapper)

    expect(wrapper.find('#inn').attributes('disabled')).toBeDefined()
    expect(wrapper.find('#legal-name').attributes('disabled')).toBeDefined()
  })

  it('keeps the real inputs enabled for an administrator', async () => {
    const wrapper = await mountCard()
    mountedWrappers.push(wrapper)

    expect(wrapper.find('#inn').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('#legal-name').attributes('disabled')).toBeUndefined()
  })
})
