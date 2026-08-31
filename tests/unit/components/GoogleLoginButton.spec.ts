import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GoogleLoginButton from '@/components/auth/GoogleLoginButton.vue'

describe('GoogleLoginButton', () => {
  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders a button element', () => {
    const wrapper = mount(GoogleLoginButton)
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('shows default label text', () => {
    const wrapper = mount(GoogleLoginButton)
    expect(wrapper.text()).toContain('Войти с Google')
  })

  it('shows loading text when loading prop is true', () => {
    const wrapper = mount(GoogleLoginButton, { props: { loading: true } })
    expect(wrapper.text()).toContain('Подождите...')
    expect(wrapper.text()).not.toContain('Войти с Google')
  })

  it('renders the Google SVG logo', () => {
    const wrapper = mount(GoogleLoginButton)
    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
    // The Google logo uses four distinct path elements for its four colours
    expect(wrapper.findAll('path').length).toBeGreaterThanOrEqual(4)
  })

  it('renders the blue Google G path', () => {
    const wrapper = mount(GoogleLoginButton)
    const paths = wrapper.findAll('path')
    const fills = paths.map((p) => p.attributes('fill'))
    expect(fills).toContain('#4285F4')
  })

  // ── Disabled state ────────────────────────────────────────────────────────

  it('is not disabled by default', () => {
    const wrapper = mount(GoogleLoginButton)
    expect((wrapper.find('button').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('is disabled when loading prop is true', () => {
    const wrapper = mount(GoogleLoginButton, { props: { loading: true } })
    expect((wrapper.find('button').element as HTMLButtonElement).disabled).toBe(true)
  })

  // ── Styling ───────────────────────────────────────────────────────────────

  it('has outline / border styling instead of a brand fill colour', () => {
    const wrapper = mount(GoogleLoginButton)
    const classes = wrapper.find('button').classes()
    expect(classes).toContain('border')
    expect(classes).not.toContain('bg-[#4285F4]')
  })

  it('has rounded-md class matching the rest of the form buttons', () => {
    const wrapper = mount(GoogleLoginButton)
    expect(wrapper.find('button').classes()).toContain('rounded-md')
  })

  it('has full-width class', () => {
    const wrapper = mount(GoogleLoginButton)
    expect(wrapper.find('button').classes()).toContain('w-full')
  })

  it('applies an extra class passed via the class prop', () => {
    const wrapper = mount(GoogleLoginButton, { props: { class: 'mt-2' } })
    expect(wrapper.find('button').classes()).toContain('mt-2')
  })

  // ── Type attribute ────────────────────────────────────────────────────────

  it('has type="button" to avoid accidental form submission', () => {
    const wrapper = mount(GoogleLoginButton)
    expect(wrapper.find('button').attributes('type')).toBe('button')
  })

  // ── Events ────────────────────────────────────────────────────────────────

  it('emits click event when clicked', async () => {
    const wrapper = mount(GoogleLoginButton)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does not emit click event when disabled', async () => {
    const wrapper = mount(GoogleLoginButton, { props: { loading: true } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })
})
