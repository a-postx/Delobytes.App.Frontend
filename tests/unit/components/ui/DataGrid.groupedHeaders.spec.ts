import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import type { ColumnDef, RowSelectionState, SortingState, VisibilityState } from '@tanstack/vue-table'
import { defineComponent, h, ref, type Ref } from 'vue'
import DataGrid from '@/components/ui/data-grid/DataGrid.vue'
import type { DataGridPaginationState } from '@/components/ui/data-grid/types'

interface TestRow {
  id: string
  sku: string
  revenue: number
  net: number
}

const pageRows: TestRow[] = [
  { id: 'row-1', sku: 'SKU-001', revenue: 100, net: 80 },
]

const groupedColumns: ColumnDef<TestRow, unknown>[] = [
  {
    id: 'sku',
    accessorKey: 'sku',
    header: 'SKU',
    meta: { title: 'SKU' },
    cell: ({ row }) => row.original.sku,
  },
  {
    id: 'money',
    header: 'Объём',
    meta: { title: 'Объём' },
    columns: [
      {
        id: 'revenue',
        accessorKey: 'revenue',
        header: 'Выручка',
        meta: { title: 'Выручка' },
        cell: ({ row }) => String(row.original.revenue),
      },
      {
        id: 'net',
        accessorKey: 'net',
        header: 'Чистая',
        meta: { title: 'Чистая' },
        cell: ({ row }) => String(row.original.net),
      },
    ],
  },
]

const flatColumns: ColumnDef<TestRow, unknown>[] = [
  { id: 'sku', accessorKey: 'sku', header: 'SKU', meta: { title: 'SKU' } },
  { id: 'revenue', accessorKey: 'revenue', header: 'Выручка', meta: { title: 'Выручка' } },
]

interface HostOptions {
  columns: ColumnDef<TestRow, unknown>[]
  selectable?: boolean
}

function mountGrid(options: HostOptions): VueWrapper {
  const pagination: Ref<DataGridPaginationState> = ref({ pageIndex: 0, pageSize: 10 })
  const sorting: Ref<SortingState> = ref<SortingState>([])
  const columnVisibility: Ref<VisibilityState> = ref<VisibilityState>({})
  const rowSelection: Ref<RowSelectionState> = ref<RowSelectionState>({})

  const Host = defineComponent({
    name: 'DataGridGroupedHost',
    setup() {
      return () => h(DataGrid as never, {
        data: pageRows,
        columns: options.columns,
        totalCount: pageRows.length,
        selectable: options.selectable ?? false,
        isLoading: false,
        'pagination': pagination.value,
        'sorting': sorting.value,
        'columnVisibility': columnVisibility.value,
        'rowSelection': rowSelection.value,
        'onUpdate:pagination': (value: DataGridPaginationState) => {
          pagination.value = value
        },
        'onUpdate:sorting': (value: SortingState) => {
          sorting.value = value
        },
        'onUpdate:columnVisibility': (value: VisibilityState) => {
          columnVisibility.value = value
        },
        'onUpdate:rowSelection': (value: RowSelectionState) => {
          rowSelection.value = value
        },
      })
    },
  })

  return mount(Host, { attachTo: document.body })
}

function headerRows(wrapper: VueWrapper) {
  return wrapper.findAll('thead tr')
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('DataGrid grouped headers', () => {
  it('renders one header row per level', () => {
    const wrapper = mountGrid({ columns: groupedColumns })

    expect(headerRows(wrapper)).toHaveLength(2)
  })

  it('spans the group header across its leaves', () => {
    const wrapper = mountGrid({ columns: groupedColumns })
    const groupCell = headerRows(wrapper)[0].findAll('th')[1]

    expect(groupCell.text()).toBe('Объём')
    expect(groupCell.attributes('colspan')).toBe('2')
    expect(groupCell.attributes('rowspan')).toBeUndefined()
  })

  it('merges an ungrouped column into a single cell across the header rows', () => {
    const wrapper = mountGrid({ columns: groupedColumns })
    const [firstRow, secondRow] = headerRows(wrapper)
    const skuCell = firstRow.findAll('th')[0]

    expect(skuCell.text()).toBe('SKU')
    expect(skuCell.attributes('rowspan')).toBe('2')
    expect(skuCell.attributes('colspan')).toBeUndefined()
    expect(secondRow.findAll('th').map(cell => cell.text())).toEqual(['Выручка', 'Чистая'])
  })

  it('keeps a flat header single-row without spans', () => {
    const wrapper = mountGrid({ columns: flatColumns })
    const rows = headerRows(wrapper)

    expect(rows).toHaveLength(1)
    expect(rows[0].findAll('th').map(cell => cell.text())).toEqual(['SKU', 'Выручка'])
    expect(rows[0].findAll('th')[0].attributes('rowspan')).toBeUndefined()
  })

  it('does not offer sorting on the group header but keeps it on the leaves', () => {
    const wrapper = mountGrid({ columns: groupedColumns })
    const [firstRow, secondRow] = headerRows(wrapper)

    expect(firstRow.findAll('th')[1].find('button').exists()).toBe(false)
    expect(secondRow.findAll('th')[0].find('button').exists()).toBe(true)
  })

  it('spans the selection column across the header rows', () => {
    const wrapper = mountGrid({ columns: groupedColumns, selectable: true })
    const [firstRow, secondRow] = headerRows(wrapper)

    expect(firstRow.findAll('th')[0].attributes('rowspan')).toBe('2')
    expect(firstRow.findAll('th')[0].find('button[role="checkbox"]').exists()).toBe(true)
    expect(secondRow.find('button[role="checkbox"]').exists()).toBe(false)
  })
})
