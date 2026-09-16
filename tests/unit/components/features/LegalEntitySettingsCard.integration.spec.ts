import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { computed, nextTick } from 'vue'
import LegalEntitySettingsCard from '@/components/features/LegalEntitySettingsCard.vue'
import { tenantLegalEntityApi } from '@/services/api/endpoints/tenantLegalEntity'
import { usePermissions } from '@/composables/usePermissions'

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: vi.fn(),
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
 * Integration-level assertions that use the real reka-ui Select wrappers instead of
 * stubs. This is what catches a mismatch between the enum values the API returns as
 * strings and the option values the card offers.
 */
describe('LegalEntitySettingsCard with real Select', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usePermissions).mockReturnValue({
      canEditTenantSettings: computed(() => true),
    } as unknown as ReturnType<typeof usePermissions>)
  })

  const mountCard = async () => {
    const wrapper = mount(LegalEntitySettingsCard, { attachTo: document.body })
    await flushPromises()
    await nextTick()
    return wrapper
  }

  it('shows the saved tax regime and VAT mode as their labels', async () => {
    vi.mocked(tenantLegalEntityApi.get).mockResolvedValue({
      tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
      legalName: 'ООО «Ромашка»',
      inn: '7712345678',
      taxType: 'Usn',
      taxRatePercent: 6,
      vatType: 'None',
    })

    const wrapper = await mountCard()

    expect(wrapper.find('#tax-type').text()).toBe('УСН')
    expect(wrapper.find('#vat-type').text()).toBe('Без НДС')
  })

  it.each([
    ['Usn', 'УСН'],
    ['Osno', 'ОСНО'],
    ['Npd', 'НПД'],
  ])('renders the %s tax regime as %s', async (taxType, expectedLabel) => {
    vi.mocked(tenantLegalEntityApi.get).mockResolvedValue({
      tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
      legalName: null,
      inn: null,
      taxType,
      taxRatePercent: 6,
      vatType: 'None',
    } as never)

    const wrapper = await mountCard()

    expect(wrapper.find('#tax-type').text()).toBe(expectedLabel)
  })

  it.each([
    ['None', 'Без НДС'],
    ['Five', '5%'],
    ['Seven', '7%'],
    ['TwentyTwo', '22%'],
  ])('renders the %s VAT mode as %s', async (vatType, expectedLabel) => {
    vi.mocked(tenantLegalEntityApi.get).mockResolvedValue({
      tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
      legalName: null,
      inn: null,
      taxType: 'Usn',
      taxRatePercent: 6,
      vatType,
    } as never)

    const wrapper = await mountCard()

    expect(wrapper.find('#vat-type').text()).toBe(expectedLabel)
  })

  it('shows an em dash when the tenant has never chosen a tax regime', async () => {
    // A tenant created before the settings were filled in keeps the CLR default of 0,
    // which the API serializes as the number 0 rather than an enum name.
    vi.mocked(tenantLegalEntityApi.get).mockResolvedValue({
      tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
      legalName: null,
      inn: null,
      taxType: 0,
      taxRatePercent: 0,
      vatType: 0,
    } as never)

    const wrapper = await mountCard()

    expect(wrapper.find('#tax-type').text()).toBe('—')
    expect(wrapper.find('#vat-type').text()).toBe('—')
  })

  it('shows an em dash for a regime name the frontend does not know', async () => {
    vi.mocked(tenantLegalEntityApi.get).mockResolvedValue({
      tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
      legalName: null,
      inn: null,
      taxType: 'SomeFutureRegime',
      taxRatePercent: 6,
      vatType: 'SomeFutureVatMode',
    } as never)

    const wrapper = await mountCard()

    expect(wrapper.find('#tax-type').text()).toBe('—')
    expect(wrapper.find('#vat-type').text()).toBe('—')
  })

  it('disables both triggers for a non-administrator', async () => {
    vi.mocked(usePermissions).mockReturnValue({
      canEditTenantSettings: computed(() => false),
    } as unknown as ReturnType<typeof usePermissions>)

    vi.mocked(tenantLegalEntityApi.get).mockResolvedValue({
      tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
      legalName: null,
      inn: null,
      taxType: 'Usn',
      taxRatePercent: 6,
      vatType: 'None',
    })

    const wrapper = await mountCard()

    expect(wrapper.find('#tax-type').attributes('disabled')).toBeDefined()
    expect(wrapper.find('#vat-type').attributes('disabled')).toBeDefined()
  })

  it('keeps both triggers enabled for an administrator', async () => {
    vi.mocked(tenantLegalEntityApi.get).mockResolvedValue({
      tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
      legalName: null,
      inn: null,
      taxType: 'Usn',
      taxRatePercent: 6,
      vatType: 'None',
    })

    const wrapper = await mountCard()

    expect(wrapper.find('#tax-type').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('#vat-type').attributes('disabled')).toBeUndefined()
  })
})
