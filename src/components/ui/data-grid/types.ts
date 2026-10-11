import type { Component } from 'vue'
import type {
  ColumnDef,
  ExpandedState,
  Row,
  RowData,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from '@tanstack/vue-table'

/**
 * Заголовок колонки для меню видимости: `header` умеет быть функцией или
 * компонентом, а «шестерёнке» нужна плоская строка.
 */
declare module '@tanstack/vue-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    title?: string
  }
}

/**
 * Строка обязана иметь стабильный `id`: он уходит в `getRowId` таблицы и во все
 * состояния, которые принадлежат вызывающей странице (выбор строк, ключи Vue).
 */
export type DataGridRow = {
  id: string
}

export interface DataGridPaginationState {
  pageIndex: number
  pageSize: number
}

export interface DataGridProps<T extends DataGridRow> {
  /** Только строки текущей страницы: данные приходят уже отфильтрованными и нарезанными сервером. */
  data: T[]
  columns: ColumnDef<T, unknown>[]
  /** Общее число строк на сервере — по нему строится футер, а не по `data.length`. */
  totalCount: number
  pagination: DataGridPaginationState
  sorting: SortingState
  columnVisibility: VisibilityState
  rowSelection: RowSelectionState
  /** Рендерит колонку с чекбоксами; выбор всегда ограничен текущей страницей. */
  selectable?: boolean
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: Component
  /** Id колонки действий. Исключается из меню видимости и из нумерации. */
  actionsColumnId?: string
  /** Показывает выбор размера страницы в футере. */
  showPageSizeSelector?: boolean
  /**
   * Подстроки, рендерящиеся прямо под родительской, без собственной пагинации. Используется для
   * истории версий товара: сервер страничит товары, так что страница всегда несёт каждую версию
   * товаров на ней.
   */
  getSubRows?: (row: T) => T[] | undefined
  /** Подсвечивает вложенные строки, чтобы строка деталей не читалась как ровня родительской. */
  subRowsClassName?: string
}

export const DATA_GRID_PAGE_SIZES: readonly number[] = [10, 25, 50, 100]

/** Id служебной колонки с чекбоксами: в `columns` её не передают, обёртка рендерит сама. */
export const DATA_GRID_SELECT_COLUMN_ID = '__select'

export const DATA_GRID_EMPTY_TITLE = 'Нет товаров'
export const DATA_GRID_EMPTY_DESCRIPTION = 'В этом разделе пока ничего нет'

export type { ColumnDef, ExpandedState, Row, RowSelectionState, SortingState, VisibilityState }
