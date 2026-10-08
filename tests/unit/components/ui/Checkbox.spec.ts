import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Checkbox from '@/components/ui/checkbox/Checkbox.vue'
import CheckboxRoot from '@/components/ui/checkbox/CheckboxRoot.vue'

/**
 * Регрессия: обёртки `CheckboxRoot`/`Checkbox` объявляли пропсы без emits,
 * и слушатель `update:modelValue` терялся внутри `reactiveOmit`/`$attrs`.
 * DataGrid использует именно эти обёртки для select-all и чекбоксов строк —
 * без этого теста баг может вернуться незаметно при следующей правке.
 */
describe('Checkbox wrappers: update:modelValue', () => {
  it('CheckboxRoot эмитит update:modelValue при клике', async () => {
    const onUpdate = vi.fn()
    const wrapper = mount(CheckboxRoot, {
      props: { modelValue: false, 'onUpdate:modelValue': onUpdate },
      attachTo: document.body,
    })

    await wrapper.find('[data-slot="checkbox"]').trigger('click')
    await nextTick()

    expect(onUpdate).toHaveBeenCalledWith(true)
    wrapper.unmount()
  })

  it('CheckboxRoot отражает modelValue в data-state', () => {
    const checked = mount(CheckboxRoot, { props: { modelValue: true } })
    const indeterminate = mount(CheckboxRoot, { props: { modelValue: 'indeterminate' } })

    expect(checked.find('[data-slot="checkbox"]').attributes('data-state')).toBe('checked')
    expect(indeterminate.find('[data-slot="checkbox"]').attributes('data-state')).toBe('indeterminate')

    checked.unmount()
    indeterminate.unmount()
  })

  it('Checkbox (составной компонент) эмитит update:modelValue при клике', async () => {
    const onUpdate = vi.fn()
    const wrapper = mount(Checkbox, {
      props: { modelValue: false, 'onUpdate:modelValue': onUpdate },
      attachTo: document.body,
    })

    await wrapper.find('[data-slot="checkbox"]').trigger('click')
    await nextTick()

    expect(onUpdate).toHaveBeenCalledWith(true)
    wrapper.unmount()
  })

  it('повторный клик по Checkbox возвращает false', async () => {
    const onUpdate = vi.fn()
    const wrapper = mount(Checkbox, {
      props: { modelValue: true, 'onUpdate:modelValue': onUpdate },
      attachTo: document.body,
    })

    await wrapper.find('[data-slot="checkbox"]').trigger('click')
    await nextTick()

    expect(onUpdate).toHaveBeenCalledWith(false)
    wrapper.unmount()
  })
})
