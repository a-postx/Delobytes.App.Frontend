import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import type { ColumnDef, RowSelectionState, SortingState, VisibilityState } from '@tanstack/vue-table'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
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
  pagination: Ref<DataGridPaginationState>
  sorting: Ref<SortingState>
  columnVisibility: Ref<VisibilityState>
  rowSelection: Ref<RowSelectionState>
  data: TestRow[]
  totalCount: number
  selectable: boolean
  isLoading: boolean
  actionsColumnId?: string
  gridColumns: ColumnDef<TestRow, unknown>[]
}

interface MountedGrid {
  wrapper: VueWrapper
  state: GridState
}

/**
 * Компонент работает в manual-режиме: состояние принадлежит вызывающей стороне,
 * поэтому тестовый «хозяин» обязан быть реактивным. Со статичными props
 * запись обратно не доходит до таблицы, и любой клик теряет эффект.
 */
function mountGrid(overrides: Partial<GridState> = {}): MountedGrid {
  const state: GridState = {
    pagination: ref({ pageIndex: 0, pageSize: 10 }),
    sorting: ref<SortingState>([]),
    columnVisibility: ref<VisibilityState>({}),
    rowSelection: ref<RowSelectionState>({}),
    data: pageRows,
    totalCount: 42,
    selectable: true,
    isLoading: false,
    gridColumns: columns,
    ...overrides,
  }

  const Host = defineComponent({
    name: 'DataGridHost',
    setup() {
      return () => h(DataGrid as never, {
        data: state.data,
        columns: state.gridColumns,
        totalCount: state.totalCount,
        selectable: state.selectable,
        isLoading: state.isLoading,
        actionsColumnId: state.actionsColumnId,
        'pagination': state.pagination.value,
        'sorting': state.sorting.value,
        'columnVisibility': state.columnVisibility.value,
        'rowSelection': state.rowSelection.value,
        'onUpdate:pagination': (value: DataGridPaginationState) => {
          state.pagination.value = value
        },
        'onUpdate:sorting': (value: SortingState) => {
          state.sorting.value = value
        },
        'onUpdate:columnVisibility': (value: VisibilityState) => {
          state.columnVisibility.value = value
        },
        'onUpdate:rowSelection': (value: RowSelectionState) => {
          state.rowSelection.value = value
        },
      })
    },
  })

  const wrapper = mount(Host, { attachTo: document.body })

  return { wrapper, state }
}

function grid(wrapper: VueWrapper) {
  return wrapper.findComponent(DataGrid)
}

function headerCheckbox(wrapper: VueWrapper) {
  return wrapper.find('thead button[role="checkbox"]')
}

function rowCheckboxes(wrapper: VueWrapper) {
  return wrapper.findAll('tbody button[role="checkbox"]')
}

function sortButtons(wrapper: VueWrapper) {
  return wrapper.findAll('thead button').filter(button => button.attributes('role') !== 'checkbox')
}

async function clickSortHeader(wrapper: VueWrapper, title: string): Promise<void> {
  const button = sortButtons(wrapper).find(candidate => candidate.text().includes(title))

  if (!button) {
    throw new Error(`Кнопка сортировки «${title}» не найдена`)
  }

  await button.trigger('click')
  await nextTick()
}

/**
 * Меню видимости рендерится через портал в `document.body`, поэтому искать
 * пункты внутри обёртки бессмысленно — их там никогда не будет.
 */
function menuItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-checkbox-item"]'))
}

function menuLabels(): string[] {
  return menuItems().map(item => item.textContent?.trim() ?? '')
}

function menuItemByLabel(label: string): HTMLElement | undefined {
  return menuItems().find(item => item.textContent?.trim() === label)
}

afterEach(() => {
  document.body.innerHTML = ''
})

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
    const { wrapper } = mountGrid({ totalCount: 42, rowSelection: ref({ 'row-1': true }) })

    expect(wrapper.text()).toContain('1 из 42 выбрано')
  })

  it('показывает skeleton-строки вместо таблицы во время загрузки', () => {
    const { wrapper } = mountGrid({ isLoading: true })

    expect(wrapper.findAll('[data-slot="skeleton"]')).toHaveLength(5)
    expect(wrapper.find('tbody').exists()).toBe(false)
  })

  it('показывает пустое состояние по умолчанию', () => {
    const { wrapper } = mountGrid({ data: [], totalCount: 0, rowSelection: ref({}) })

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
    })

    expect(wrapper.find('.custom-empty').exists()).toBe(true)
  })

  it('эмитит rowClick с исходной строкой, но молчит на клик по чекбоксу', async () => {
    const { wrapper } = mountGrid()

    await wrapper.findAll('tbody tr')[0].findAll('td')[1].trigger('click')
    expect(grid(wrapper).emitted('rowClick')?.[0]).toEqual([pageRows[0]])

    await rowCheckboxes(wrapper)[0].trigger('click')
    await nextTick()

    expect(grid(wrapper).emitted('rowClick')).toHaveLength(1)
  })
})

describe('DataGrid: серверная сортировка', () => {
  it('переключает asc → desc → asc и эмитит update:sorting', async () => {
    const { wrapper, state } = mountGrid()

    await clickSortHeader(wrapper, 'Название')
    expect(state.sorting.value).toEqual([{ id: 'name', desc: false }])

    await clickSortHeader(wrapper, 'Название')
    expect(state.sorting.value).toEqual([{ id: 'name', desc: true }])

    await clickSortHeader(wrapper, 'Название')
    expect(state.sorting.value).toEqual([{ id: 'name', desc: false }])

    expect(grid(wrapper).emitted('update:sorting')).toHaveLength(3)
  })

  it('сбрасывает страницу на первую при смене сортировки', async () => {
    const { wrapper, state } = mountGrid({
      pagination: ref({ pageIndex: 2, pageSize: 10 }),
    })

    await clickSortHeader(wrapper, 'SKU')

    expect(state.sorting.value).toEqual([{ id: 'sku', desc: false }])
    expect(state.pagination.value).toEqual({ pageIndex: 0, pageSize: 10 })
  })

  it('не трогает страницу, если она уже первая', async () => {
    const { wrapper, state } = mountGrid({
      pagination: ref({ pageIndex: 0, pageSize: 10 }),
    })

    await clickSortHeader(wrapper, 'Название')

    expect(state.pagination.value).toEqual({ pageIndex: 0, pageSize: 10 })
    expect(grid(wrapper).emitted('update:pagination')).toBeUndefined()
  })

  it('помечает активную сортировку через aria-sort', () => {
    const { wrapper } = mountGrid({ sorting: ref<SortingState>([{ id: 'name', desc: true }]) })

    const ariaSorts = wrapper.findAll('thead th').map(cell => cell.attributes('aria-sort'))

    expect(ariaSorts).toContain('descending')
    expect(ariaSorts).toContain('none')
  })

  it('не даёт сортировать колонку без enableSorting', () => {
    const staticColumns: ColumnDef<TestRow, unknown>[] = [
      { id: 'sku', accessorKey: 'sku', enableSorting: false, header: 'SKU', meta: { title: 'SKU' }, cell: () => 'static' },
    ]

    const { wrapper } = mountGrid({ gridColumns: staticColumns, selectable: false })

    expect(sortButtons(wrapper)).toHaveLength(0)
  })
})

describe('DataGrid: выбор строк', () => {
  it('select-all выделяет только строки текущей страницы', async () => {
    const { wrapper, state } = mountGrid()

    await headerCheckbox(wrapper).trigger('click')
    await nextTick()

    expect(state.rowSelection.value).toEqual({ 'row-1': true, 'row-2': true })
    expect(Object.keys(state.rowSelection.value)).toHaveLength(pageRows.length)
    expect(grid(wrapper).emitted('update:rowSelection')?.at(-1)).toEqual([{ 'row-1': true, 'row-2': true }])
  })

  it('повторный клик по select-all снимает выбор со страницы', async () => {
    const { wrapper, state } = mountGrid({
      rowSelection: ref<RowSelectionState>({ 'row-1': true, 'row-2': true }),
    })

    await headerCheckbox(wrapper).trigger('click')
    await nextTick()

    expect(state.rowSelection.value).toEqual({})
    expect(grid(wrapper).emitted('update:rowSelection')?.at(-1)).toEqual([{}])
  })

  it('не выдумывает id строк, которых нет на странице', async () => {
    const { wrapper, state } = mountGrid()

    await headerCheckbox(wrapper).trigger('click')
    await nextTick()

    expect(Object.keys(state.rowSelection.value).sort()).toEqual(['row-1', 'row-2'])
  })

  it('частичный выбор даёт indeterminate у чекбокса в шапке', () => {
    const { wrapper } = mountGrid({ rowSelection: ref<RowSelectionState>({ 'row-1': true }) })

    const checkbox = headerCheckbox(wrapper)

    expect(checkbox.attributes('data-state')).toBe('indeterminate')
    expect(checkbox.attributes('aria-checked')).toBe('mixed')
  })

  it('полный выбор страницы даёт checked у чекбокса в шапке', () => {
    const { wrapper } = mountGrid({
      rowSelection: ref<RowSelectionState>({ 'row-1': true, 'row-2': true }),
    })

    expect(headerCheckbox(wrapper).attributes('data-state')).toBe('checked')
  })

  it('подсвечивает выбранную строку', () => {
    const { wrapper } = mountGrid({
      rowSelection: ref<RowSelectionState>({ 'row-1': true, 'row-2': true }),
    })

    const rows = wrapper.findAll('tbody tr')

    expect(rows[0].attributes('class')).toContain('bg-muted/60')
    expect(rows[1].attributes('class')).toContain('bg-muted/60')
  })

  it('клик по чекбоксу строки меняет только эту строку', async () => {
    const { wrapper, state } = mountGrid({
      rowSelection: ref<RowSelectionState>({ 'row-2': true }),
    })

    await rowCheckboxes(wrapper)[0].trigger('click')
    await nextTick()

    expect(state.rowSelection.value).toEqual({ 'row-2': true, 'row-1': true })
  })

  it('скрывает колонку выбора при selectable = false', () => {
    const { wrapper } = mountGrid({ selectable: false })

    expect(wrapper.findAll('[data-slot="checkbox"]')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('выбрано')
  })
})

describe('DataGrid: видимость колонок', () => {
  it('скрывает колонку через состояние columnVisibility', () => {
    const { wrapper } = mountGrid({ columnVisibility: ref<VisibilityState>({ sku: false }) })

    expect(wrapper.find('thead').text()).not.toContain('SKU')
    expect(wrapper.find('tbody').text()).not.toContain('cell-sku-row-1')
    expect(wrapper.find('tbody').text()).toContain('cell-name-row-1')
  })

  it('оставляет только включённые колонки', () => {
    const { wrapper } = mountGrid({ columnVisibility: ref<VisibilityState>({ name: false, sku: true }) })

    expect(wrapper.find('thead').text()).toContain('SKU')
    expect(wrapper.find('thead').text()).not.toContain('Название')
  })

  it('переключает видимость колонки через шестерёнку', async () => {
    const columnsWithActions: ColumnDef<TestRow, unknown>[] = [
      ...columns,
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        meta: { title: 'Действия' },
        cell: () => 'cell-actions',
      },
    ]

    const { wrapper, state } = mountGrid({ gridColumns: columnsWithActions, actionsColumnId: 'actions' })

    await wrapper.findComponent(DataGridViewOptions).find('button').trigger('click')
    await nextTick()

    menuItemByLabel('SKU')?.click()
    await nextTick()

    expect(state.columnVisibility.value).toEqual({ sku: false })
  })

  it('исключает колонку действий из меню видимости', async () => {
    const columnsWithActions: ColumnDef<TestRow, unknown>[] = [
      ...columns,
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        meta: { title: 'Действия' },
        cell: () => 'cell-actions',
      },
    ]

    const { wrapper } = mountGrid({ gridColumns: columnsWithActions, actionsColumnId: 'actions' })

    expect(wrapper.find('tbody').text()).toContain('cell-actions')

    await wrapper.findComponent(DataGridViewOptions).find('button').trigger('click')
    await nextTick()

    // Две колонки данных; колонка действий из меню исключена.
    expect(menuItems()).toHaveLength(2)
    expect(menuLabels()).not.toContain('Действия')
  })

  it('держит шестерёнку в заголовке колонки действий, а не в отдельной панели', async () => {
    const columnsWithActions: ColumnDef<TestRow, unknown>[] = [
      ...columns,
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        meta: { title: 'Действия' },
        cell: () => 'cell-actions',
      },
    ]

    const { wrapper } = mountGrid({ gridColumns: columnsWithActions, actionsColumnId: 'actions' })

    const actionsHeader = wrapper.findAll('thead th').at(-1)

    expect(actionsHeader?.findComponent(DataGridViewOptions).exists()).toBe(true)

    // Панель над таблицей удалена вместе со слотом toolbar.
    expect(wrapper.find('[data-slot="toolbar"]').exists()).toBe(false)
    expect(wrapper.find('thead th').text()).toBe('')
  })
})

describe('DataGridViewOptions: меню видимости', () => {
  function mountOptionsMenu(initialVisibility: VisibilityState = {}) {
    const columnVisibility = ref<VisibilityState>({ ...initialVisibility })

    const table = useVueTable<TestRow>({
      data: pageRows,
      columns,
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
      attachTo: document.body,
    })

    return { wrapper, table, columnVisibility }
  }

  async function openMenu(wrapper: VueWrapper): Promise<void> {
    await wrapper.find('button').trigger('click')
    await nextTick()
  }

  it('перечисляет только скрываемые колонки, без служебных пунктов', async () => {
    const { wrapper } = mountOptionsMenu({ sku: false })

    await openMenu(wrapper)

    expect(menuLabels()).toEqual(['Название', 'SKU'])
  })

  it('показывает кнопкой только значок, без подписи', async () => {
    const { wrapper } = mountOptionsMenu({})

    const valueOptionsButton = wrapper.findComponent(DataGridViewOptions).find('button')

    expect(valueOptionsButton.text()).toBe('')
    expect(valueOptionsButton.attributes('title')).toBe('Настроить колонки')
    expect(valueOptionsButton.attributes('aria-label')).toBe('Настроить колонки')
  })

  it('снимает и возвращает видимость конкретной колонки', async () => {
    const { wrapper, table, columnVisibility } = mountOptionsMenu({})

    await openMenu(wrapper)
    menuItemByLabel('SKU')?.click()
    await nextTick()

    expect(columnVisibility.value).toEqual({ sku: false })
    expect(table.getColumn('sku')?.getIsVisible()).toBe(false)
  })

  it('не подменяет видимость колонок при отсутствии скрытых колонок', async () => {
    const { wrapper, table } = mountOptionsMenu({ sku: false, name: false })

    await openMenu(wrapper)

    expect(table.getColumn('sku')?.getIsVisible()).toBe(false)
    expect(table.getColumn('name')?.getIsVisible()).toBe(false)
    expect(menuLabels()).toEqual(['Название', 'SKU'])
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
      attachTo: document.body,
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

    await wrapper.find('[aria-label="Следующая страница"]').trigger('click')
    await nextTick()

    expect(wrapper.emitted('update:pagination')?.at(-1)).toEqual([{ pageIndex: 1, pageSize: 25 }])
  })

  it('не рендерит блок пагинации при пустом результате', () => {
    const wrapper = mountFooter({ totalCount: 0 })

    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it('скрывает выбор размера страницы по требованию', () => {
    const wrapper = mountFooter({ showPageSizeSelector: false })

    expect(wrapper.text()).not.toContain('Строк:')
  })
})
