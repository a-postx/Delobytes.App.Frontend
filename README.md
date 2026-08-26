# Delobytes App Frontend

Фронтенд-приложение для системы учета маржинальности товаров электронной коммерции Delobytes.

## Технологии

- **Vue 3** - прогрессивный JavaScript фреймворк
- **TypeScript** - типизированный JavaScript
- **Vite** - быстрый инструмент сборки
- **Tailwind CSS** - утилитарный CSS фреймворк
- **Axios** - HTTP клиент
- **Vue Router** - официальный роутер для Vue.js
- **Vitest** - фреймворк для тестирования

## Структура проекта

```
frontend/
├── .github/
│   └── workflows/
│       └── ci.yml           # GitHub Actions CI конфигурация
├── public/                  # Статические файлы
├── src/
│   ├── assets/             # Ресурсы (изображения, шрифты)
│   ├── components/         # Vue компоненты
│   │   ├── ApiTester.vue   # Компонент тестирования API
│   │   └── ProductList.vue # Компонент списка продуктов
│   ├── router/             # Конфигурация роутера
│   │   └── index.ts
│   ├── services/           # API сервисы
│   │   └── api.ts          # API клиент
│   ├── types/              # TypeScript типы
│   │   └── index.ts
│   ├── views/              # Страницы приложения
│   │   └── HomeView.vue
│   ├── App.vue             # Корневой компонент
│   ├── main.ts             # Точка входа
│   └── style.css           # Глобальные стили
├── tests/                  # Тесты
│   ├── api.test.ts
│   ├── components.test.ts
│   └── setup.ts
├── .env.development        # Переменные окружения для разработки
├── .env.production         # Переменные окружения для продакшена
├── .env.example            # Пример переменных окружения
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Требования

- Node.js >= 18.x
- npm >= 9.x

## Установка

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd frontend
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env.development` (или скопируйте из `.env.example`):
```bash
cp .env.example .env.development
```

4. Настройте URL API в `.env.development`:
```
VITE_API_URL=http://localhost:5000
```

## Разработка

Запустите dev-сервер:
```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:5173`

## Сборка

Соберите приложение для продакшена:
```bash
npm run build
```

Собранные файлы будут в директории `dist/`

## Тестирование

Запустите тесты:
```bash
npm run test
```

Запустите тесты в watch-режиме:
```bash
npm run test:watch
```

## Линтинг

Проверьте код линтером:
```bash
npm run lint
```

## Конфигурация API

API клиент автоматически определяет URL бэкенда на основе окружения:

- **Разработка**: `http://localhost:5000` (по умолчанию)
- **Тестовое окружение**: `https://api.test.delobytes.ru`
- **Продакшен**: `https://api.app.delobytes.ru`

### Переопределение URL

Вы можете переопределить URL API через переменную окружения `VITE_API_URL`:

```bash
# .env.development
VITE_API_URL=http://localhost:5000

# .env.production
VITE_API_URL=https://api.app.delobytes.ru
```

### Логика определения URL

Клиент использует следующую логику для определения URL API:

1. Проверяет переменную окружения `VITE_API_URL`
2. Если не задана, определяет по hostname:
   - `test.delobytes.ru` → `api.test.delobytes.ru`
   - `app.delobytes.ru` → `api.app.delobytes.ru`
3. По умолчанию использует `http://localhost:5000`

## Развертывание

### Сборка Docker образа

```bash
docker build -t delobytes-frontend .
```

### Запуск контейнера

```bash
docker run -p 80:80 delobytes-frontend
```

### Nginx конфигурация

Для продакшена рекомендуется использовать Nginx. Пример конфигурации:

```nginx
server {
    listen 80;
    server_name app.delobytes.ru;
    
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API прокси (опционально)
    location /api {
        proxy_pass https://api.app.delobytes.ru;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## CI/CD

Проект использует GitHub Actions для непрерывной интеграции.

При каждом push или pull request в ветки `main` или `develop`:
1. Устанавливаются зависимости
2. Запускается линтер
3. Выполняется проверка типов
4. Запускаются тесты
5. Собирается production-версия

## Функциональность

### Реализованные возможности

- ✅ Подключение к бэкенду API
- ✅ Тестирование подключения к API
- ✅ Отображение метрик и статуса системы
- ✅ CRUD операции с продуктами:
  - Получение списка продуктов
  - Создание нового продукта
  - Обновление существующего продукта
  - Удаление продукта
- ✅ Типизация данных с TypeScript
- ✅ Юнит-тесты
- ✅ CI конфигурация

### Планируемые функции

- Аутентификация и авторизация
- Расширенные фильтры и поиск
- Экспорт данных
- Дашборд с аналитикой
- E2E тесты

## API Endpoints

Приложение взаимодействует со следующими endpoint'ами бэкенда:

- `GET /status` - Проверка статуса API
- `GET /metrics` - Получение метрик системы
- `GET /api/products` - Получение списка продуктов
- `GET /api/products/:id` - Получение одного продукта
- `POST /api/products` - Создание продукта
- `PUT /api/products/:id` - Обновление продукта
- `DELETE /api/products/:id` - Удаление продукта

## Поддержка

При возникновении проблем создайте issue в репозитории проекта.

## Лицензия

Proprietary - Delobytes
