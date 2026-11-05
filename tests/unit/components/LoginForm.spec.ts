import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import LoginForm from '@/components/auth/LoginForm.vue'

const mountForm = (props: { loading?: boolean; error?: string } = {}): VueWrapper =>
  mount(LoginForm, {
    props: {
      email: '',
      password: '',
      loading: false,
      error: '',
      ...props,
    },
    global: {
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  })

describe('LoginForm', () => {
  describe('block order', () => {
    it('places the email form first, the separator second and the providers last', () => {
      const wrapper = mountForm()
      const ordered = wrapper.element.querySelectorAll(
        'form, [data-slot="field-separator"], [data-provider]',
      )

      const sequence: string[] = Array.from(ordered).map((element: Element): string => {
        if (element.tagName === 'FORM') {
          return 'form'
        }
        if (element.getAttribute('data-slot') === 'field-separator') {
          return 'separator'
        }
        return element.getAttribute('data-provider') ?? 'unknown'
      })

      expect(sequence).toEqual(['form', 'separator', 'yandex', 'google'])
    })

    it('captions the separator with the provider invitation', () => {
      const wrapper = mountForm()
      const separator = wrapper.find('[data-slot="field-separator"]')

      expect(separator.text()).toBe('или войти через')
    })

    it('renders exactly one separator, so the two groups are split once', () => {
      const wrapper = mountForm()

      expect(wrapper.findAll('[data-slot="field-separator"]')).toHaveLength(1)
    })
  })

  describe('form boundaries', () => {
    it('keeps the email and password inputs inside the form', () => {
      const wrapper = mountForm()

      expect(wrapper.find('form input#email').exists()).toBe(true)
      expect(wrapper.find('form input#password').exists()).toBe(true)
    })

    it('keeps the provider buttons outside the form so they cannot submit it', () => {
      const wrapper = mountForm()

      expect(wrapper.find('form [data-provider="yandex"]').exists()).toBe(false)
      expect(wrapper.find('form [data-provider="google"]').exists()).toBe(false)
    })
  })

  describe('provider labels', () => {
    it('uses the short provider names on the buttons', () => {
      const wrapper = mountForm()

      expect(wrapper.find('[data-provider="yandex"]').text()).toBe('Яндекс')
      expect(wrapper.find('[data-provider="google"]').text()).toBe('Google')
    })

    it('keeps the full wording in the accessible name', () => {
      const wrapper = mountForm()

      expect(wrapper.find('[data-provider="yandex"]').attributes('aria-label')).toBe(
        'Войти через Яндекс ID',
      )
      expect(wrapper.find('[data-provider="google"]').attributes('aria-label')).toBe(
        'Войти через учётную запись Google',
      )
    })
  })

  describe('events', () => {
    it('emits submit from the email form', async () => {
      const wrapper = mountForm()

      await wrapper.find('form').trigger('submit')

      expect(wrapper.emitted('submit')).toHaveLength(1)
    })

    it('emits yandex when the Yandex button is pressed', async () => {
      const wrapper = mountForm()

      await wrapper.find('[data-provider="yandex"]').trigger('click')

      expect(wrapper.emitted('yandex')).toHaveLength(1)
    })

    it('emits google when the Google button is pressed', async () => {
      const wrapper = mountForm()

      await wrapper.find('[data-provider="google"]').trigger('click')

      expect(wrapper.emitted('google')).toHaveLength(1)
    })
  })

  describe('states', () => {
    it('renders the error message inside the form above the submit button', () => {
      const wrapper = mountForm({ error: 'Неверный email или пароль.' })

      expect(wrapper.find('form').text()).toContain('Неверный email или пароль.')
    })

    it('disables the provider buttons while loading', () => {
      const wrapper = mountForm({ loading: true })

      const yandex = wrapper.find('[data-provider="yandex"]').element as HTMLButtonElement
      const google = wrapper.find('[data-provider="google"]').element as HTMLButtonElement

      expect(yandex.disabled).toBe(true)
      expect(google.disabled).toBe(true)
    })
  })
})
