# Delobytes App Frontend

Фронтенд-приложение для системы учета маржинальности товаров электронной коммерции Delobytes.

## Структура проекта

```
src/
├── assets/styles/       # CSS файлы
├── components/
│   ├── common/         # Переиспользуемые UI компоненты
│   ├── layout/         # Компоненты макета
│   └── features/       # Функциональные компоненты
│       ├── ApiTester.vue
│       └── ProductList.vue
├── composables/         # Composition API composables
│   ├── useApi.ts
│   └── useNotification.ts
├── router/              # Vue Router
├── services/api/        # API клиенты
│   ├── client.ts
│   ├── index.ts
│   └── endpoints/
│       ├── health.ts
│       └── products.ts
├── types/               # TypeScript типы
├── utils/               # Утилиты
│   ├── constants.ts
│   └── format.ts
├── views/               # Страницы
│   └── HomeView.vue
├── App.vue
└── main.ts
```

## Установка

```bash
npm install
```

## Разработка

```bash
npm run dev
```

## Сборка

```bash
# Быстрая сборка (без type-check)
npm run build

# Сборка с type-check
npm run build:check
```

## Тестирование

```bash
npm run test              # Запустить тесты
npm run test:watch        # Watch mode
npm run test:coverage     # С покрытием
```

## Основные возможности

- ✅ Vue 3 + TypeScript + Tailwind CSS
- ✅ Composables для переиспользуемой логики
- ✅ Модульная структура API
- ✅ Форматирование валют и процентов
- ✅ Юнит-тесты с Vitest
- ✅ CI/CD с GitHub Actions

## Лицензия

Proprietary - Delobytes
