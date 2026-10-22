import type { Component } from 'vue'
import type { PermissionType } from '@/composables/usePermissions'

export type DashboardWidgetSpan = 'quarter' | 'half' | 'full'

export interface DashboardWidgetDefinition {
  id: string
  component: Component
  props?: Record<string, unknown>
  span: DashboardWidgetSpan
  permission?: PermissionType
}
