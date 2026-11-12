import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  switchTenant: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  meApi: {
    getCurrentUser: mocks.getCurrentUser,
  },
  tenantApi: {
    updateTenantName: vi.fn(),
    switchTenant: mocks.switchTenant,
  },
}))

import { SidebarProvider } from '@/components/ui/sidebar'
import AppSidebar from '@/components/sidebar/AppSidebar.vue'
import { useCurrentUser } from '@/composables/useCurrentUser'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
})

// Full real chain: SidebarProvider -> AppSidebar -> NavUser -> reka-ui trigger
const Host = defineComponent({
  render: () => h(SidebarProvider, null, { default: () => h(AppSidebar) }),
})

const CURRENT_USER = {
  userId: 'u',
  displayName: 'Иван Петров',
  email: 'e@e',
  tenantId: 't1',
  tenantName: 'Alpha',
  currency: 'RUB',
  timeZone: 'Europe/Samara',
  role: 'Administrator',
  tenants: [
    { tenantId: 't1', tenantName: 'Alpha', role: 'Administrator' },
    { tenantId: 't2', tenantName: 'Beta', role: 'Manager' },
  ],
}

function triggerText(wrapper: ReturnType<typeof mount>): string {
  return wrapper.find('[data-slot="dropdown-menu-trigger"]').text()
}

/** Меню река-уи рендерится в портал, поэтому содержимое ищем в документе. */
function menuText(): string {
  return document.body.textContent ?? ''
}

function tenantItems(): Element[] {
  return Array.from(document.querySelectorAll('[data-slot="dropdown-menu-item"]'))
}

function findTenantItem(name: string): Element {
  const item = tenantItems().find((candidate) => candidate.textContent?.includes(name))
  expect(item).toBeTruthy()
  return item!
}

describe('User menu tenant section', () => {
  let host: HTMLDivElement
  let reload: ReturnType<typeof vi.fn>

  beforeEach(() => {
    window.matchMedia = window.matchMedia
      ?? ((() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia)
    Element.prototype.scrollIntoView = vi.fn()
    reload = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload },
      writable: true,
    })
    mocks.getCurrentUser.mockReset()
    mocks.getCurrentUser.mockResolvedValue(CURRENT_USER)
    mocks.switchTenant.mockReset()
    useCurrentUser().clearCurrentUser()

    host = document.createElement('div')
    document.body.appendChild(host)
  })

  afterEach(() => {
    host.remove()
    document.body.innerHTML = ''
  })

  it('показывает в триггере имя пользователя и имя текущего тенанта', async () => {
    const wrapper = mount(Host, { global: { plugins: [router] }, attachTo: host })
    await flushPromises()

    expect(triggerText(wrapper)).toContain('Иван Петров')
    expect(triggerText(wrapper)).toContain('Alpha')

    // Переименование тенанта из настроек: та же мутация, что делает TenantSettingsView
    const { currentUser } = useCurrentUser()
    currentUser.value!.tenantName = 'Beta'
    await nextTick()
    expect(triggerText(wrapper)).toContain('Beta')
  })

  it('без имени пользователя показывает email', async () => {
    mocks.getCurrentUser.mockResolvedValue({ ...CURRENT_USER, displayName: null })

    const wrapper = mount(Host, { global: { plugins: [router] }, attachTo: host })
    await flushPromises()

    expect(triggerText(wrapper)).toContain('e@e')
  })

  it('после шапки пользователя выводит секцию «Организации» со списком тенантов и отметкой активного', async () => {
    const wrapper = mount(Host, { global: { plugins: [router] }, attachTo: host })
    await flushPromises()

    await wrapper.find('[data-slot="dropdown-menu-trigger"]').trigger('click')
    await flushPromises()

    expect(menuText()).toContain('Организации')
    expect(menuText()).toContain('e@e')

    const alpha = findTenantItem('Alpha')
    const beta = findTenantItem('Beta')

    expect(alpha.textContent).toContain('Administrator')
    expect(beta.textContent).toContain('Manager')

    // Иконка здания есть у каждого пункта, галочка активного — только у Alpha
    expect(alpha.querySelectorAll('svg').length).toBe(2)
    expect(beta.querySelectorAll('svg').length).toBe(1)
  })

  it('переключает тенант по клику и сохраняет новый токен', async () => {
    mocks.switchTenant.mockResolvedValue({ accessToken: 'new-token' })

    const wrapper = mount(Host, { global: { plugins: [router] }, attachTo: host })
    await flushPromises()

    await wrapper.find('[data-slot="dropdown-menu-trigger"]').trigger('click')
    await flushPromises()

    findTenantItem('Beta').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(mocks.switchTenant).toHaveBeenCalledWith('t2')
    expect(localStorage.getItem('accessToken')).toBe('new-token')
    expect(reload).toHaveBeenCalled()

    // Повторный клик по уже активному тенанту не переключает
    await wrapper.find('[data-slot="dropdown-menu-trigger"]').trigger('click')
    await flushPromises()
    findTenantItem('Alpha').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(mocks.switchTenant).toHaveBeenCalledTimes(1)
  })
})
