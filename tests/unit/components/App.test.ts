import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '@/App.vue'

describe('App Component', () => {
  it('should render the application header', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: true
        }
      }
    })
    
    expect(wrapper.find('header').exists()).toBe(true)
    expect(wrapper.text()).toContain('Delobytes Margin Accounting')
  })

  it('should have correct CSS classes', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: true
        }
      }
    })
    
    const mainDiv = wrapper.find('.min-h-screen')
    expect(mainDiv.exists()).toBe(true)
    expect(mainDiv.classes()).toContain('bg-gray-100')
  })
})
