import type { RadioGroupEmits, RadioGroupProps } from "reka-ui"
import { RadioGroup, useForwardPropsEmits } from "reka-ui"
import { defineComponent, h } from "vue"

export default defineComponent({
  name: "RadioGroup",
  props: RadioGroup.props as RadioGroupProps,
  emits: ["update:modelValue"] as unknown as RadioGroupEmits,
  setup(props, { slots, emit }) {
    const forwarded = useForwardPropsEmits(props, emit)

    return () =>
      h(
        RadioGroup,
        {
          ...forwarded,
          "data-slot": "radio-group",
        },
        slots
      )
  },
})
