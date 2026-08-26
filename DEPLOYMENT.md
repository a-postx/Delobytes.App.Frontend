# Инструкция по развертыванию фронтенда на Ubuntu 20.04

Эта инструкция описывает шаги по развертыванию фронтенд-приложения Delobytes на виртуальной машине с Ubuntu 20.04.

## Предварительные требования

- Виртуальная машина с Ubuntu 20.04 (минимум 1 CPU, 1GB RAM)
- Доступ по SSH
- Доменное имя (например, test.delobytes.ru), указывающее на IP адрес сервера
- Бэкенд API, доступный по адресу api.{domain}

## Шаг 1: Подготовка системы

Обновите систему:

```bash
sudo apt update
sudo apt upgrade -y
```

## Шаг 2: Установка Node.js

Установите Node.js 20.x:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Проверьте установку:

```bash
node --version  # должна быть v20.x.x
npm --version   # должна быть >= 9.x.x
```

## Шаг 3: Установка Nginx

Установите Nginx:

```bash
sudo apt install -y nginx
```

Запустите и включите автозапуск:

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

Проверьте статус:

```bash
sudo systemctl status nginx
```

## Шаг 4: Клонирование и сборка проекта

Создайте директорию для проекта:

```bash
sudo mkdir -p /var/www/delobytes-frontend
sudo chown $USER:$USER /var/www/delobytes-frontend
```

Клонируйте репозиторий:

```bash
cd /var/www
git clone <repository-url> delobytes-frontend
cd delobytes-frontend
```

Установите зависимости:

```bash
npm ci --production=false
```

Создайте production конфигурацию:

```bash
cat > .env.production << 'ENVFILE'
# API автоматически определится из hostname
VITE_API_URL=
ENVFILE
```

Соберите проект:

```bash
npm run build
```

После успешной сборки статические файлы будут в директории `dist/`.

## Шаг 5: Настройка Nginx для фронтенда

Создайте конфигурацию Nginx:

```bash
sudo nano /etc/nginx/sites-available/delobytes-frontend
```

Вставьте следующую конфигурацию (замените `test.delobytes.ru` на ваш домен):

```nginx
server {
    listen 80;
    server_name test.delobytes.ru;
    
    root /var/www/delobytes-frontend/dist;
    index index.html;
    
    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/javascript application/json image/svg+xml;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Vue Router history mode
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Don't cache index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires 0;
    }
    
    # Disable access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

Активируйте конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/delobytes-frontend /etc/nginx/sites-enabled/
```

Проверьте конфигурацию:

```bash
sudo nginx -t
```

Перезагрузите Nginx:

```bash
sudo systemctl reload nginx
```

## Шаг 6: Настройка CORS на бэкенде

Убедитесь, что бэкенд настроен для принятия запросов с фронтенд-домена.

На бэкенде в `appsettings.json` или `appsettings.Production.json` должна быть настройка CORS:

```json
{
  "AllowedOrigins": [
    "http://test.delobytes.ru",
    "https://test.delobytes.ru",
    "http://localhost:3000"
  ]
}
```

В коде бэкенда (например, в `Program.cs`):

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>();
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// После app.Build()
app.UseCors("AllowFrontend");
```

Перезапустите бэкенд после изменений.

## Шаг 7: Проверка работы

Откройте браузер и перейдите на:

```
http://test.delobytes.ru
```

Вы должны увидеть главную страницу приложения.

Проверьте подключение к API:
1. Перейдите на вкладку "API Test"
2. Нажмите "Test /status endpoint"
3. Должен появиться JSON с информацией о статусе бэкенда

## Шаг 8: Настройка HTTPS (рекомендуется)

Установите Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Получите SSL сертификат:

```bash
sudo certbot --nginx -d test.delobytes.ru
```

Следуйте инструкциям Certbot. После успешной установки:
- HTTPS будет автоматически настроен
- HTTP трафик будет перенаправляться на HTTPS
- Сертификат будет автоматически обновляться

Проверьте автообновление:

```bash
sudo certbot renew --dry-run
```

## Шаг 9: Настройка автоматического обновления

Создайте скрипт для обновления приложения:

```bash
sudo nano /usr/local/bin/update-delobytes-frontend.sh
```

Вставьте:

```bash
#!/bin/bash
set -e

cd /var/www/delobytes-frontend

echo "Pulling latest changes..."
git pull origin main

echo "Installing dependencies..."
npm ci --production=false

echo "Building application..."
npm run build

echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "Frontend updated successfully!"
```

Сделайте скрипт исполняемым:

```bash
sudo chmod +x /usr/local/bin/update-delobytes-frontend.sh
```

Теперь для обновления достаточно выполнить:

```bash
/usr/local/bin/update-delobytes-frontend.sh
```

## Шаг 10: Мониторинг

Просмотр логов Nginx:

```bash
# Access log
sudo tail -f /var/log/nginx/access.log

# Error log
sudo tail -f /var/log/nginx/error.log
```

Проверка статуса Nginx:

```bash
sudo systemctl status nginx
```

## Troubleshooting

### Проблема: "502 Bad Gateway"

Возможные причины:
- Бэкенд не запущен
- Неправильный URL API
- Проблемы с CORS

Решение:
1. Проверьте, что бэкенд запущен и доступен
2. Проверьте логи бэкенда
3. Проверьте настройки CORS на бэкенде

### Проблема: "404 Not Found" при перезагрузке страницы

Причина: Неправильная конфигурация для Vue Router history mode

Решение: Убедитесь, что в конфигурации Nginx есть:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Проблема: Старая версия приложения после обновления

Причина: Кэширование браузером

Решение:
1. Очистите кэш браузера (Ctrl+F5)
2. Проверьте, что в Nginx для index.html отключено кэширование
3. Используйте режим инкогнито для тестирования

### Проблема: Не подключается к API

Причина: Неправильная конфигурация URL или CORS

Решение:
1. Откройте Developer Tools в браузере (F12)
2. Перейдите на вкладку Network
3. Попробуйте выполнить запрос к API
4. Проверьте URL запроса и ответ сервера
5. Проверьте наличие CORS ошибок

## Производительность

### Рекомендации по оптимизации

1. **Включите HTTP/2** в Nginx (автоматически с HTTPS)
2. **Настройте CDN** для статических ресурсов (опционально)
3. **Минимизируйте размер bundle** с помощью анализа:
   ```bash
   npm run build -- --report
   ```

### Мониторинг ресурсов

Проверка использования диска:

```bash
df -h
```

Проверка использования памяти:

```bash
free -h
```

## Безопасность

### Firewall

Настройте UFW:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### Обновления системы

Настройте автоматические обновления безопасности:

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

## Резервное копирование

Рекомендуется регулярно создавать резервные копии:
- Конфигурации Nginx
- `.env` файлов
- Снапшоты виртуальной машины (если доступно)

## Заключение

После выполнения всех шагов фронтенд-приложение должно быть полностью развернуто и доступно по адресу вашего домена.

Для обновления приложения используйте скрипт из Шага 9.

При возникновении проблем проверьте логи Nginx и обратитесь к разделу Troubleshooting.
