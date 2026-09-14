/**
 * Единый реестр вариантов страницы 404, используемый галереей и панелью
 * переключения на каждом варианте. Один источник правды избавляет от
 * рассинхронизации ссылок при добавлении/удалении вариантов.
 */
export interface ErrorPageVariant {
  key: string
  label: string
  shortLabel: string
  routeName: string
  path: string
  summary: string
  tags: string[]
}

export const errorPageVariants: ErrorPageVariant[] = [
  {
    key: 'minimal',
    label: 'A · Минимализм',
    shortLabel: 'Минимализм',
    routeName: 'error-404-minimal',
    path: '/design/errors/404/minimal',
    summary:
      'Тихая типографика и один явный путь выхода. Базовый паттерн, который проще всего размножить на 403/500/503.',
    tags: ['Базовый', 'Нейтральный тон'],
  },
  {
    key: 'hub',
    label: 'B · Полезный хаб',
    shortLabel: 'Полезный хаб',
    routeName: 'error-404-hub',
    path: '/design/errors/404/hub',
    summary:
      'Поиск и подборка популярных разделов вместо тупика — страница не отпускает пользователя, а возвращает его к задаче.',
    tags: ['Поиск', 'Самообслуживание'],
  },
  {
    key: 'console',
    label: 'C · Консоль',
    shortLabel: 'Консоль разработчика',
    routeName: 'error-404-console',
    path: '/design/errors/404/console',
    summary:
      'Лог запроса в терминальном стиле: код ответа, request-id для обращения в поддержку, копирование в один клик.',
    tags: ['Техническая', 'Диагностика'],
  },
  {
    key: 'split',
    label: 'D · Разделённый экран',
    shortLabel: 'Разделённый экран',
    routeName: 'error-404-split',
    path: '/design/errors/404/split',
    summary:
      'Витринный сплит-лейаут с иллюстративной панелью. Премиальная подача, две равнозначные точки выхода.',
    tags: ['Витрина', 'Брендинг'],
  },
  {
    key: 'spotlight',
    label: 'E · Споттлайт',
    shortLabel: 'Споттлайт',
    routeName: 'error-404-spotlight',
    path: '/design/errors/404/spotlight',
    summary:
      'Крупная типографика, мягкая анимация света и лёгкий тон подачи — для публичных и маркетинговых разделов.',
    tags: ['Экспрессивная', 'Анимация'],
  },
]

export default errorPageVariants
