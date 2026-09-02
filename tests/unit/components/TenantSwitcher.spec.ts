import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'

let resolveCurrentUser: (value: unknown) => void = () => {}

vi.mock('@/services/api', () => ({
  meApi: {
    getCurrentUser: vi.fn(() => new Promise((resolve) => { resolveCurrentUser = resolve })),
  },
  tenantApi: { updateTenantName: vi.fn() },
}))

import { SidebarProvider } from '@/components/ui/sidebar'
import AppSidebar from '@/components/sidebar/AppSidebar.vue'
import { useCurrentUser } from '@/composables/useCurrentUser'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
})

// Full real chain: SidebarProvider -> AppSidebar -> TenantSwitcher -> reka-ui trigger
const Host = defineComponent({
  render: () => h(SidebarProvider, null, { default: () => h(AppSidebar) }),
})

function triggerText(wrapper: ReturnType<typeof mount>): string {
  return wrapper.find('[data-slot="dropdown-menu-trigger"]').text()
}

describe('TenantSwitcher trigger', () => {
  it('shows tenant name after async load and after rename', async () => {
    window.matchMedia = window.matchMedia
      ?? ((() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia)

    const wrapper = mount(Host, { global: { plugins: [router] } })
    await flushPromises()

    // Page refresh: user not loaded yet
    expect(triggerText(wrapper)).toContain('...')

    resolveCurrentUser({ userId: 'u', displayName: null, email: 'e@e', tenantId: 't', tenantName: 'Alpha' })
    await flushPromises()
    expect(triggerText(wrapper)).toContain('Alpha')

    // Rename: same mutation TenantSettingsView performs
    const { currentUser } = useCurrentUser()
    currentUser.value!.tenantName = 'Beta'
    await nextTick()
    expect(triggerText(wrapper)).toContain('Beta')
  })
})
