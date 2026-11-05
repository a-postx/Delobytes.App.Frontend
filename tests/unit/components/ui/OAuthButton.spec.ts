import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import OAuthButton from '@/components/ui/oauth-button/OAuthButton.vue'

const mountYandex = (props: { loading?: boolean; class?: string } = {}): VueWrapper =>
  mount(OAuthButton, { props: { provider: 'yandex', ...props } })

const mountGoogle = (props: { loading?: boolean; class?: string } = {}): VueWrapper =>
  mount(OAuthButton, { props: { provider: 'google', ...props } })

describe('OAuthButton', () => {
  describe('rendering', () => {
    it('renders a button element', () => {
      const wrapper = mountYandex()

      expect(wrapper.find('button').exists()).toBe(true)
    })

    it('has type="button" to avoid accidental form submission', () => {
      const wrapper = mountGoogle()

      expect(wrapper.find('button').attributes('type')).toBe('button')
    })

    it('labels the Yandex provider', () => {
      const wrapper = mountYandex()

      expect(wrapper.text()).toContain('Яндекс')
    })

    it('labels the Google provider', () => {
      const wrapper = mountGoogle()

      expect(wrapper.text()).toContain('Google')
    })

    it('exposes the provider as a data attribute', () => {
      expect(mountYandex().find('button').attributes('data-provider')).toBe('yandex')
      expect(mountGoogle().find('button').attributes('data-provider')).toBe('google')
    })

    it('applies an extra class passed via the class prop', () => {
      const wrapper = mountYandex({ class: 'mt-4' })

      expect(wrapper.find('button').classes()).toContain('mt-4')
    })
  })

  describe('accessibility', () => {
    it('sets a distinct aria-label per provider', () => {
      const yandexLabel: string | undefined = mountYandex().find('button').attributes('aria-label')
      const googleLabel: string | undefined = mountGoogle().find('button').attributes('aria-label')

      expect(yandexLabel).toBe('Войти через Яндекс ID')
      expect(googleLabel).toBe('Войти через учётную запись Google')
      expect(yandexLabel).not.toBe(googleLabel)
    })

    /*
     * WCAG 2.5.3 "Label in Name": сокращённая подпись на кнопке должна дословно
     * входить в доступное имя, иначе голосовое управление не сможет нажать кнопку
     * по произнесённому тексту.
     */
    it('keeps the visible label inside the accessible name', () => {
      const yandex = mountYandex().find('button')
      const google = mountGoogle().find('button')

      expect(yandex.attributes('aria-label')).toContain(yandex.text())
      expect(google.attributes('aria-label')).toContain(google.text())
    })

    it('hides the decorative highlight ring from assistive technology', () => {
      const ring = mountYandex().find('.oauth-ring')

      expect(ring.exists()).toBe(true)
      expect(ring.attributes('aria-hidden')).toBe('true')
    })

    it('hides both provider logos from assistive technology', () => {
      const wrapper = mountGoogle()

      wrapper.findAll('svg').forEach((svg) => {
        expect(svg.attributes('aria-hidden')).toBe('true')
      })
    })
  })

  describe('provider icons', () => {
    it('renders the single brand mark for Yandex', () => {
      const wrapper = mountYandex()

      expect(wrapper.findAll('svg')).toHaveLength(1)
      expect(wrapper.find('svg path[fill="#FC3F1D"]').exists()).toBe(true)
    })

    it('does not fall back to a text badge for Yandex', () => {
      const wrapper = mountYandex()
      const button = wrapper.find('button')

      expect(button.find('svg').exists()).toBe(true)
      expect(button.text()).toBe('Яндекс')
      expect(button.find('[class*="rounded-full"]').exists()).toBe(false)
    })

    it('renders the four-colour Google mark', () => {
      const wrapper = mountGoogle()
      const colors = ['#4285F4', '#34A853', '#FBBC05', '#EA4335']

      expect(wrapper.findAll('svg')).toHaveLength(1)
      colors.forEach((color) => {
        expect(wrapper.find(`svg path[fill="${color}"]`).exists()).toBe(true)
      })
    })
  })

  describe('loading state', () => {
    it('replaces the label with a progress message', () => {
      const wrapper = mountYandex({ loading: true })

      expect(wrapper.text()).toContain('Подождите...')
      expect(wrapper.text()).not.toContain('Яндекс')
    })

    it('is enabled by default', () => {
      const wrapper = mountGoogle()

      expect((wrapper.find('button').element as HTMLButtonElement).disabled).toBe(false)
    })

    it('is disabled while loading', () => {
      const wrapper = mountGoogle({ loading: true })

      expect((wrapper.find('button').element as HTMLButtonElement).disabled).toBe(true)
    })
  })

  describe('events', () => {
    it('emits click when pressed', async () => {
      const wrapper = mountYandex()

      await wrapper.find('button').trigger('click')

      expect(wrapper.emitted('click')).toHaveLength(1)
    })
  })

  describe('pointer tracking', () => {
    it('stores the cursor position in CSS variables consumed by the ring gradient', async () => {
      const wrapper = mountYandex()

      await wrapper.find('.oauth-button').trigger('pointermove', {
        clientX: 10,
        clientY: 20,
        pointerType: 'mouse',
      })

      const element: HTMLElement = wrapper.find('.oauth-button').element as HTMLElement
      expect(element.style.getPropertyValue('--oauth-x')).toBe('10px')
      expect(element.style.getPropertyValue('--oauth-y')).toBe('20px')
    })

    it('clears the cursor position on leave so the gradient resets to centre', async () => {
      const wrapper = mountYandex()
      const triggerTarget = wrapper.find('.oauth-button')

      await triggerTarget.trigger('pointermove', {
        clientX: 10,
        clientY: 20,
        pointerType: 'mouse',
      })
      await triggerTarget.trigger('pointerleave')

      const element: HTMLElement = triggerTarget.element as HTMLElement
      expect(element.style.getPropertyValue('--oauth-x')).toBe('')
      expect(element.style.getPropertyValue('--oauth-y')).toBe('')
    })

    it('ignores non-mouse pointers because touch has no hover position', async () => {
      const wrapper = mountYandex()

      await wrapper.find('.oauth-button').trigger('pointermove', {
        clientX: 10,
        clientY: 20,
        pointerType: 'touch',
      })

      const element: HTMLElement = wrapper.find('.oauth-button').element as HTMLElement
      expect(element.style.getPropertyValue('--oauth-x')).toBe('')
    })
  })
})
