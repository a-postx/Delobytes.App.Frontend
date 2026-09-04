import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import YandexLoginButton from '@/components/auth/YandexLoginButton.vue'

describe('YandexLoginButton', () => {
  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders a button element', () => {
    const wrapper = mount(YandexLoginButton)
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('shows default label text', () => {
    const wrapper = mount(YandexLoginButton)
    expect(wrapper.text()).toContain('Войти с Яндекс')
  })

  it('shows loading text when loading prop is true', () => {
    const wrapper = mount(YandexLoginButton, { props: { loading: true } })
    expect(wrapper.text()).toContain('Подождите...')
    expect(wrapper.text()).not.toContain('Войти с Яндекс')
  })

  it('renders the Яндекс brand badge with letter Я', () => {
    const wrapper = mount(YandexLoginButton)
    expect(wrapper.text()).toContain('Я')
  })

  // ── Disabled state ────────────────────────────────────────────────────────

  it('is not disabled by default', () => {
    const wrapper = mount(YandexLoginButton)
    expect((wrapper.find('button').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('is disabled when loading prop is true', () => {
    const wrapper = mount(YandexLoginButton, { props: { loading: true } })
    expect((wrapper.find('button').element as HTMLButtonElement).disabled).toBe(true)
  })

  // ── Styling ───────────────────────────────────────────────────────────────

  it('has the Yandex brand background colour class', () => {
    const wrapper = mount(YandexLoginButton)
    expect(wrapper.find('button').classes()).toContain('bg-[#FC3F1D]')
  })

  it('has rounded-md class matching the rest of the form buttons', () => {
    const wrapper = mount(YandexLoginButton)
    expect(wrapper.find('button').classes()).toContain('rounded-md')
  })

  it('has full-width class', () => {
    const wrapper = mount(YandexLoginButton)
    expect(wrapper.find('button').classes()).toContain('w-full')
  })

  it('applies an extra class passed via the class prop', () => {
    const wrapper = mount(YandexLoginButton, { props: { class: 'mt-4' } })
    expect(wrapper.find('button').classes()).toContain('mt-4')
  })

  // ── Type attribute ────────────────────────────────────────────────────────

  it('has type="button" to avoid accidental form submission', () => {
    const wrapper = mount(YandexLoginButton)
    expect(wrapper.find('button').attributes('type')).toBe('button')
  })

  // ── Events ────────────────────────────────────────────────────────────────

  it('emits click event when clicked', async () => {
    const wrapper = mount(YandexLoginButton)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does not emit click event when disabled', async () => {
    const wrapper = mount(YandexLoginButton, { props: { loading: true } })
    await wrapper.find('button').trigger('click')
    // disabled buttons fire no click events in real browsers;
    // the component also has pointer-events-none via CSS, so no emit is expected.
    expect(wrapper.emitted('click')).toBeUndefined()
  })
})
