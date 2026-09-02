export interface DataTableColumn<T = any> {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  width?: string
  format?: (value: any, row: T) => string
}

export interface DataTableAction<T = any> {
  id: string
  label: string
  icon: string
  destructive?: boolean
  handler: (row: T) => void
}

export interface DataTableProps<T = any> {
  data: T[]
  columns: DataTableColumn<T>[]
  actions?: DataTableAction<T>[]
  itemsPerPage?: number
  headerClass?: string
  rowHoverEnabled?: boolean
  selectable?: boolean
  keyField?: string
}

export interface DataTableSortState {
  key: string | null
  descending: boolean
}
