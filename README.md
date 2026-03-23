# BML Sales CRM

Полнофункциональная CRM-панель для BM Logistics с отправкой КП по email.

## Структура
```
server.js        — Express: API (key-value SQLite) + Mailer (Nodemailer) + Static
public/index.html — React SPA (весь фронтенд в одном файле)
```

## Деплой на Railway

### 1. Создай новый сервис из GitHub

Если уже есть repo `Vanexel89/bml-crm` — пуш туда. Если нет — создай.

```bash
cd bml-crm
git init
git add .
git commit -m "BML CRM v1"
git remote add origin https://github.com/Vanexel89/bml-crm.git
git push -u origin main
```

В Railway: New Project → Deploy from GitHub → выбери repo.

### 2. Переменные окружения (Railway → Variables)

```
API_KEY=твой-секретный-ключ
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=твоя-почта@домен.ru
SMTP_PASS=пароль-приложения-яндекс
FROM_NAME=BM Logistics
FROM_EMAIL=твоя-почта@домен.ru
LOGO_URL=https://ссылка-на-логотип.png
```

### 3. Persistent Volume (для БД)

Railway → сервис → Settings → Volumes → Add Volume:
- Mount path: `/data`
- Добавь переменную: `DATA_DIR=/data`

### 4. Готово

Railway автоматически запустит `npm install && npm start`.
Домен будет вида: `bml-crm-xxx.up.railway.app`

## Использование

1. Открой URL сервиса в браузере
2. Введи API_KEY (тот что в переменных)
3. CRM работает — данные на сервере, письма отправляются

## API

Все запросы требуют заголовок `X-API-Key`.

- `GET /api/kv/:key` — получить значение
- `PUT /api/kv/:key` — сохранить `{ value: "..." }`
- `DELETE /api/kv/:key` — удалить
- `POST /api/kv/bulk` — получить несколько ключей `{ keys: [...] }`
- `POST /api/send` — отправить email `{ to, subject, body }`
- `GET /api/health` — статус сервера

## Миграция данных из артефакта

Если нужно перенести данные из claude.ai артефакта:
1. В консоли браузера на claude.ai: скопируй данные из window.storage
2. Через API загрузи их: `PUT /api/kv/bml-v3-leads` с телом `{ value: "..." }`
