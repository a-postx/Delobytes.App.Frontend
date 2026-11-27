import { defineComponent, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TabsContent from '@/components/ui/tabs/TabsContent.vue'
import TabsList from '@/components/ui/tabs/TabsList.vue'
import TabsRoot from '@/components/ui/tabs/TabsRoot.vue'
import TabsTrigger from '@/components/ui/tabs/TabsTrigger.vue'

const Child = defineComponent({
  setup() {
    const value = ref('черновик')
    return { value }
  },
  template: '<div class="child">{{ value }}</div>',
})

const Tabs = defineComponent({
  components: { TabsRoot, TabsList, TabsTrigger, TabsContent, Child },
  setup() {
    const current = ref('a')
    return { current }
  },
  template: `
    <TabsRoot v-model="current">
      <TabsList>
        <TabsTrigger value="a">A</TabsTrigger>
        <TabsTrigger value="b">B</TabsTrigger>
      </TabsList>
      <TabsContent value="a"><Child /></TabsContent>
      <TabsContent value="b"><div class="pane-b">B</div></TabsContent>
    </TabsRoot>
  `,
})

describe('TabsContent: скрытая панель', () => {
  it('сохраняет дочерний компонент в DOM при переключении', async () => {
    const wrapper = mount(Tabs)
    expect(wrapper.find('.child').exists()).toBe(true)

    await wrapper.findAll('[role="tab"]')[1].trigger('mousedown')

    expect(wrapper.find('[role="tabpanel"][data-state="inactive"]').exists()).toBe(true)
    expect(wrapper.find('.child').exists()).toBe(true)
    expect(wrapper.find('.child').text()).toBe('черновик')
  })
})
