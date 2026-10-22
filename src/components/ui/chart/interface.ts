import { inject } from 'vue'
import type { Component, ComputedRef, InjectionKey } from 'vue'

export interface ChartConfigEntry {
  label?: string
  color?: string
  icon?: Component
}

export type ChartConfig = Record<string, ChartConfigEntry>

export interface ChartTooltipItem {
  key: string
  label: string
  value: string
  color?: string
}

export const ChartConfigKey: InjectionKey<ComputedRef<ChartConfig>> = Symbol('chart-config')

export function useChart(): ComputedRef<ChartConfig> {
  const config: ComputedRef<ChartConfig> | undefined = inject(ChartConfigKey)

  if (!config) {
    throw new Error('useChart() must be used inside a <ChartContainer>')
  }

  return config
}
