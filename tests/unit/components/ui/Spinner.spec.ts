import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Spinner from '@/components/ui/spinner/Spinner.vue'
import AuthWaitingScreen from '@/components/auth/AuthWaitingScreen.vue'

describe('Spinner', () => {
  it('по умолчанию объявляет себя как статус для скринридера', () => {
    const wrapper = mount(Spinner)

    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('aria-label')).toBe('Загрузка')
  })

  it('принимает собственный текст для aria-label', () => {
    const wrapper = mount(Spinner, { props: { label: 'Синхронизация' } })

    expect(wrapper.attributes('aria-label')).toBe('Синхронизация')
  })

  it.each([
    ['sm', 'size-4'],
    ['md', 'size-6'],
    ['lg', 'size-8'],
  ])('размер %s задаёт габарит', (size, sizeClass) => {
    const wrapper = mount(Spinner, { props: { size: size as 'sm' | 'md' | 'lg' } })

    expect(wrapper.classes()).toContain(sizeClass)
  })

  it('сохраняет габарит, заданный на месте вызова', () => {
    const wrapper = mount(Spinner, { props: { size: 'sm', class: 'size-3' } })

    expect(wrapper.classes()).toContain('app-spinner')
    expect(wrapper.classes()).toContain('size-3')
  })
})

describe('AuthWaitingScreen', () => {
  it('показывает согласованный с дизайном текст по умолчанию', () => {
    const wrapper = mount(AuthWaitingScreen)

    expect(wrapper.text()).toContain('Почти готово')
    expect(wrapper.text()).toContain('Загружаем ваш профиль')
  })

  it('содержит спиннер внутри области статуса', () => {
    const wrapper = mount(AuthWaitingScreen)

    expect(wrapper.find('[role="status"] .app-spinner').exists()).toBe(true)
  })

  it('позволяет заменить текст', () => {
    const wrapper = mount(AuthWaitingScreen, {
      props: { title: 'Создаём пространство', subtitle: 'Готовим рабочее место' },
    })

    expect(wrapper.text()).toContain('Создаём пространство')
    expect(wrapper.text()).toContain('Готовим рабочее место')
  })
})
