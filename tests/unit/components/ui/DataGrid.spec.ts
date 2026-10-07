import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import type { ColumnDef, RowSelectionState, SortingState, VisibilityState } from '@tanstack/vue-table'
import { nextTick, ref } from 'vue'
import DataGrid from '@/components/ui/data-grid/DataGrid.vue'
import DataGridPagination from '@/components/ui/data-grid/DataGridPagination.vue'
import DataGridViewOptions from '@/components/ui/data-grid/DataGridViewOptions.vue'
import type { DataGridPaginationState } from '@/components/ui/data-grid/types'

interface TestRow {
  id: string
  name: string
  sku: string
}

const pageRows: TestRow[] = [
  { id: 'row-1', name: 'Товар А', sku: 'SKU-001' },
  { id: 'row-2', name: 'Товар Б', sku: 'SKU-002' },
]

const columns: ColumnDef<TestRow, unknown>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    enableSorting: true,
    header: 'Название',
    meta: { title: 'Название' },
    cell: ({ row }) => `cell-name-${row.original.id}`,
  },
  {
    id: 'sku',
    accessorKey: 'sku',
    enableSorting: true,
    header: 'SKU',
    meta: { title: 'SKU' },
    cell: ({ row }) => `cell-sku-${row.original.id}`,
  },
]

interface GridState {
  pagination: DataGridPaginationState
  sorting: SortingState
  columnVisibility: VisibilityState
  rowSelection: RowSelectionState
  data: TestRow[]
  totalCount: number
  selectable: boolean
  isLoading: boolean
  actionsColumnId?: string
}

interface MountedGrid {
  wrapper: VueWrapper
  state: GridState
}

function mountGrid(overrides: Partial<GridState> = {}): MountedGrid {
  const state: GridState = {
    pagination: { pageIndex: 0, pageSize: 10 },
    sorting: [],
    columnVisibility: {},
    rowSelection: {},
    data: pageRows,
    totalCount: 42,
    selectable: true,
    isLoading: false,
    ...overrides,
  }

  const wrapper = mount(DataGrid, {
    props: {
      data: state.data,
      columns,
      totalCount: state.totalCount,
      pagination: state.pagination,
      sorting: state.sorting,
      columnVisibility: state.columnVisibility,
      rowSelection: state.rowSelection,
      selectable: state.selectable,
      isLoading: state.isLoading,
      actionsColumnId: state.actionsColumnId,
      'onUpdate:pagination': (value: DataGridPaginationState) => {
        state.pagination = value
      },
      'onUpdate:sorting': (value: SortingState) => {
        state.sorting = value
      },
      'onUpdate:columnVisibility': (value: VisibilityState) => {
        state.columnVisibility = value
      },
      'onUpdate:rowSelection': (value: RowSelectionState) => {
        state.rowSelection = value
      },
    },
    global: { stubs: { teleport: true } },
  })

  return { wrapper, state }
}

function headerCheckbox(wrapper: VueWrapper) {
  return wrapper.find('thead [data-slot="checkbox"]')
}

function rowCheckboxes(wrapper: VueWrapper) {
  return wrapper.findAll('tbody [data-slot="checkbox"]')
}

function findSortButton(wrapper: VueWrapper, title: string) {
  const button = wrapper.findAll('thead button').find(candidate => candidate.text().includes(title))

  if (!button) {
    throw new Error(`Кнопка сортировки «${title}» не найдена`)
  }

  return button
}

async function clickSortHeader(wrapper: VueWrapper, title: string): Promise<void> {
  await findSortButton(wrapper, title).trigger('click')
  await nextTick()
}

function mountOptionsMenu(initialVisibility: VisibilityState = {}, gridColumns: ColumnDef<TestRow, unknown>[] = columns) {
  const columnVisibility = ref<VisibilityState>({ ...initialVisibility })

  const table = useVueTable<TestRow>({
    data: pageRows,
    columns: gridColumns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      get columnVisibility() {
        return columnVisibility.value
      },
    },
    onColumnVisibilityChange: (updater) => {
      columnVisibility.value = typeof updater === 'function' ? updater(columnVisibility.value) : updater
    },
  })

  const wrapper = mount(DataGridViewOptions, {
    props: { table },
    global: { stubs: { teleport: true } },
  })

  return { wrapper, table, columnVisibility }
}

function menuItemLabels(wrapper: VueWrapper): string[] {
  return wrapper.findAll('[data-slot="dropdown-menu-checkbox-item"]').map(item => item.text())
}

describe('DataGrid: рендер строк', () => {
  it('рендерит строки текущей страницы и заголовки колонок', () => {
    const { wrapper } = mountGrid()

    expect(wrapper.findAll('tbody tr')).toHaveLength(pageRows.length)
    expect(wrapper.find('thead').text()).toContain('Название')
    expect(wrapper.find('thead').text()).toContain('SKU')
    expect(wrapper.find('tbody').text()).toContain('cell-name-row-1')
    expect(wrapper.find('tbody').text()).toContain('cell-sku-row-2')
  })

  it('показывает сводку по выбору относительно totalCount, а не длины страницы', () => {
    const { wrapper } = mountGrid({ totalCount: 42, rowSelection: { 'row-1': true } })

    expect(wrapper.text()).toContain('1 из 42 выбрано')
  })

  it('показывает skeleton-строки вместо таблицы во время загрузки', () => {
    const { wrapper } = mountGrid({ isLoading: true })

    expect(wrapper.findAll('[data-slot="skeleton"]')).toHaveLength(5)
    expect(wrapper.find('tbody').exists()).toBe(false)
  })

  it('показывает пустое состояние по умолчанию', () => {
    const { wrapper } = mountGrid({ data: [], totalCount: 0 })

    expect(wrapper.text()).toContain('Нет товаров')
    expect(wrapper.text()).toContain('В этом разделе пока ничего нет')
  })

  it('подменяет пустое состояние слотом empty', () => {
    const wrapper = mount(DataGrid, {
      props: {
        data: [],
        columns,
        totalCount: 0,
        pagination: { pageIndex: 0, pageSize: 10 },
        sorting: [],
        columnVisibility: {},
        rowSelection: {},
      },
      slots: { empty: '<div class="custom-empty">Своё состояние</div>' },
      global: { stubs: { teleport: true } },
    })

    expect(wrapper.find('.custom-empty').exists()).toBe(true)
  })

  it('эмитит rowClick с исходной строкой, но молчит на клик по чекбоксу', async () => {
    const { wrapper } = mountGrid()

    const firstDataCell = wrapper.findAll('tbody tr')[0].findAll('td')[1]
    await firstDataCell.trigger('click')

    expect(wrapper.emitted('rowClick')?.[0]).toEqual([pageRows[0]])

    const fresh = mountGrid()
    await rowCheckboxes(fresh.wrapper)[0].trigger('click')
    await nextTick()

    expect(fresh.wrapper.emitted('rowClick')).toBeUndefined()
  })
})

describe('DataGrid: серверная сортировка', () => {
  it('циклически переключает состояние сортировки и эмитит update:sorting', async () => {
    const { wrapper, state } = mountGrid()

    await clickSortHeader(wrapper, 'Название')
    expect(state.sorting).toEqual([{ id: 'name', desc: false }])

    await clickSortHeader(wrapper, 'Название')
    expect(state.sorting).toEqual([{ id: 'name', desc: true }])

    await clickSortHeader(wrapper, 'Название')
    expect(state.sorting).toEqual([])

    expect(wrapper.emitted('update:sorting')).toHaveLength(3)
  })

  it('сбрасывает страницу на первую при смене сортировки', async () => {
    const { wrapper, state } = mountGrid({ pagination: { pageIndex: 2, pageSize: 10 } })

    await clickSortHeader(wrapper, 'SKU')

    expect(state.sorting).toEqual([{ id: 'sku', desc: false }])
    expect(state.pagination).toEqual({ pageIndex: 0, pageSize: 10 })
    expect(wrapper.emitted('update:pagination')?.at(-1)).toEqual([{ pageIndex: 0, pageSize: 10 }])
  })

  it('не трогает страницу, если она уже первая', async () => {
    const { wrapper, state } = mountGrid({ pagination: { pageIndex: 0, pageSize: 10 } })

    await clickSortHeader(wrapper, 'Название')

    expect(state.pagination).toEqual({ pageIndex: 0, pageSize: 10 })
    expect(wrapper.emitted('update:pagination')).toBeUndefined()
  })

  it('помечает активную сортировку через aria-sort', () => {
    const { wrapper } = mountGrid({ sorting: [{ id: 'name', desc: true }] })

    const ariaSorts = wrapper.findAll('thead th').map(cell => cell.attributes('aria-sort'))

    expect(ariaSorts).toContain('descending')
    expect(ariaSorts).toContain('none')
  })

  it('не даёт сортировать колонку без enableSorting', () => {
    const staticColumns: ColumnDef<TestRow, unknown>[] = [
      { id: 'sku', accessorKey: 'sku', header: 'SKU', cell: () => 'static' },
    ]

    const wrapper = mount(DataGrid, {
      props: {
        data: pageRows,
        columns: staticColumns,
        totalCount: pageRows.length,
        pagination: { pageIndex: 0, pageSize: 10 },
        sorting: [],
        columnVisibility: {},
        rowSelection: {},
      },
      global: { stubs: { teleport: true } },
    })

    expect(wrapper.findAll('thead button')).toHaveLength(0)
  })
})

describe('DataGrid: выбор строк', () => {
  it('select-all выделяет только строки текущей страницы', async () => {
    const { wrapper, state } = mountGrid()

    await headerCheckbox(wrapper).trigger('click')
    await nextTick()

    expect(state.rowSelection).toEqual({ 'row-1': true, 'row-2': true })
    expect(Object.keys(state.rowSelection)).toHaveLength(pageRows.length)
    expect(wrapper.emitted('update:rowSelection')?.at(-1)).toEqual([{ 'row-1': true, 'row-2': true }])
  })

  it('повторный клик по select-all снимает выбор со страницы', async () => {
    const { wrapper, state } = mountGrid({ rowSelection: { 'row-1': true, 'row-2': true } })

    await headerCheckbox(wrapper).trigger('click')
    await nextTick()

    expect(state.rowSelection).toEqual({})
    expect(wrapper.emitted('update:rowSelection')?.at(-1)).toEqual([{}])
  })

  it('не выдумывает id строк, которых нет на странице', async () => {
    const { wrapper, state } = mountGrid()

    await headerCheckbox(wrapper).trigger('click')
    await nextTick()

    expect(Object.keys(state.rowSelection).sort()).toEqual(['row-1', 'row-2'])
  })

  it('частичный выбор даёт indeterminate у чекбокса в шапке', () => {
    const { wrapper } = mountGrid({ rowSelection: { 'row-1': true } })

    const checkbox = headerCheckbox(wrapper)

    expect(checkbox.attributes('data-state')).toBe('indeterminate')
    expect(checkbox.attributes('aria-checked')).toBe('mixed')
  })

  it('полный выбор страницы даёт checked у чекбокса в шапке', () => {
    const { wrapper } = mountGrid({ rowSelection: { 'row-1': true, 'row-2': true } })

    expect(headerCheckbox(wrapper).attributes('data-state')).toBe('checked')
  })

  it('подсвечивает выбранную строку', () => {
    const { wrapper } = mountGrid({ rowSelection: { 'row-1': true, 'row-2': true } })

    const rows = wrapper.findAll('tbody tr')

    expect(rows[0].attributes('class')).toContain('bg-muted/60')
    expect(rows[1].attributes('class')).toContain('bg-muted/60')
  })

  it('клик по чекбоксу строки меняет только эту строку', async () => {
    const { wrapper, state } = mountGrid({ rowSelection: { 'row-2': true } })

    await rowCheckboxes(wrapper)[0].trigger('click')
    await nextTick()

    expect(state.rowSelection).toEqual({ 'row-2': true, 'row-1': true })
  })

  it('скрывает колонку выбора при selectable = false', () => {
    const { wrapper } = mountGrid({ selectable: false })

    expect(wrapper.findAll('[data-slot="checkbox"]')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('выбрано')
  })
})

describe('DataGrid: видимость колонок', () => {
  it('скрывает колонку через состояние columnVisibility', () => {
    const { wrapper } = mountGrid({ columnVisibility: { sku: false } })

    expect(wrapper.find('thead').text()).not.toContain('SKU')
    expect(wrapper.find('tbody').text()).not.toContain('cell-sku-row-1')
    expect(wrapper.find('tbody').text()).toContain('cell-name-row-1')
  })

  it('оставляет только включённые колонки', () => {
    const { wrapper } = mountGrid({ columnVisibility: { name: false, sku: true } })

    expect(wrapper.find('thead').text()).toContain('SKU')
    expect(wrapper.find('thead').text()).not.toContain('Название')
  })

  it('переключает видимость колонки через шестерёнку', async () => {
    const { wrapper, state } = mountGrid()

    const options = wrapper.findComponent(DataGridViewOptions)
    await options.find('button').trigger('click')
    await nextTick()

    const skuItem = options
      .findAll('[data-slot="dropdown-menu-checkbox-item"]')
      .find(item => item.text().includes('SKU'))

    await skuItem!.trigger('click')
    await nextTick()

    expect(state.columnVisibility).toEqual({ sku: false })
  })

  it('исключает колонку действий из меню видимости', async () => {
    const columnsWithActions: ColumnDef<TestRow, unknown>[] = [
      ...columns,
      {
        id: 'actions',
        header: '',
        meta: { title: 'Действия' },
        cell: () => 'cell-actions',
      },
    ]

    const wrapper = mount(DataGrid, {
      props: {
        data: pageRows,
        columns: columnsWithActions,
        totalCount: pageRows.length,
        actionsColumnId: 'actions',
        pagination: { pageIndex: 0, pageSize: 10 },
        sorting: [],
        columnVisibility: {},
        rowSelection: {},
      },
      global: { stubs: { teleport: true } },
    })

    expect(wrapper.find('tbody').text()).toContain('cell-actions')

    const options = wrapper.findComponent(DataGridViewOptions)
    await options.find('button').trigger('click')
    await nextTick()

    // «Показать все» + две колонки данных: колонка действий из меню исключена.
    expect(options.findAll('[data-slot="dropdown-menu-checkbox-item"]')).toHaveLength(3)
    expect(menuItemLabels(options)).not.toContain('Действия')
  })
})

describe('DataGridViewOptions: меню видимости', () => {
  it('перечисляет скрываемые колонки и пункт «Показать все»', async () => {
    const { wrapper } = mountOptionsMenu({ sku: false })

    await wrapper.find('button').trigger('click')
    await nextTick()

    const labels = menuItemLabels(wrapper)

    expect(labels).toHaveLength(columns.length + 1)
    expect(labels[0]).toBe('Показать все')
  })

  it('снимает и возвращает видимость конкретной колонки', async () => {
    const { wrapper, table, columnVisibility } = mountOptionsMenu({})

    await wrapper.find('button').trigger('click')
    await nextTick()

    const skuItem = wrapper
      .findAll('[data-slot="dropdown-menu-checkbox-item"]')
      .find(item => item.text() === 'SKU')

    await skuItem!.trigger('click')
    await nextTick()

    expect(columnVisibility.value).toEqual({ sku: false })
    expect(table.getColumn('sku')?.getIsVisible()).toBe(false)
  })

  it('возвращает все колонки пунктом «Показать все»', async () => {
    const { wrapper, table, columnVisibility } = mountOptionsMenu({ sku: false, name: false })

    await wrapper.find('button').trigger('click')
    await nextTick()

    const allItem = wrapper
      .findAll('[data-slot="dropdown-menu-checkbox-item"]')
      .find(item => item.text() === 'Показать все')

    await allItem!.trigger('click')
    await nextTick()

    expect(table.getColumn('sku')?.getIsVisible()).toBe(true)
    expect(table.getColumn('name')?.getIsVisible()).toBe(true)
    expect(columnVisibility.value).not.toEqual({ sku: false, name: false })
  })
})

describe('DataGridPagination: футер', () => {
  function mountFooter(overrides: Partial<{
    totalCount: number
    pagination: DataGridPaginationState
    isLoading: boolean
    showPageSizeSelector: boolean
  }> = {}) {
    return mount(DataGridPagination, {
      props: {
        totalCount: 120,
        pagination: { pageIndex: 0, pageSize: 25 },
        ...overrides,
      },
      global: { stubs: { teleport: true } },
    })
  }

  it('показывает диапазон строк текущей страницы от totalCount', () => {
    expect(mountFooter().text()).toContain('1–25 из 120')
    expect(mountFooter({ pagination: { pageIndex: 1, pageSize: 25 } }).text()).toContain('26–50 из 120')
    expect(mountFooter({ totalCount: 0 }).text()).toContain('Ничего не найдено')
  })

  it('обрезает последнюю страницу по остатку, а не по размеру страницы', () => {
    const wrapper = mountFooter({ totalCount: 12, pagination: { pageIndex: 1, pageSize: 10 } })

    expect(wrapper.text()).toContain('11–12 из 12')
  })

  it('эмитит update:pagination при переходе на следующую страницу', async () => {
    const wrapper = mountFooter({ pagination: { pageIndex: 0, pageSize: 25 } })

    await wrapper.find('[data-slot="pagination-next"]').trigger('click')
    await nextTick()

    expect(wrapper.emitted('update:pagination')?.at(-1)).toEqual([{ pageIndex: 1, pageSize: 25 }])
  })

  it('не рендерит блок пагинации при пустом результате', () => {
    const wrapper = mountFooter({ totalCount: 0 })

    expect(wrapper.find('[data-slot="pagination-prev"]').exists()).toBe(false)
  })

  it('скрывает выбор размера страницы по требованию', () => {
    const wrapper = mountFooter({ showPageSizeSelector: false })

    expect(wrapper.text()).not.toContain('Строк:')
  })
})
