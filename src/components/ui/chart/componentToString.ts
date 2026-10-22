import { createApp, h } from 'vue'
import type { Component } from 'vue'

export function componentToString(component: Component, props: Record<string, unknown> = {}): string {
  const container: HTMLDivElement = document.createElement('div')
  const app = createApp({
    render: () => h(component, props),
  })

  app.mount(container)
  const html: string = container.innerHTML
  app.unmount()

  return html
}
