# BML Sales CRM v4.0.0

Модульная CRM на Vite + React для BM Logistics.

## Что изменилось (Sprint 1 — Модуляризация)

**Было:** 1 файл `index.html` — 2767 строк, Babel CDN, всё в одном месте.

**Стало:** 23 модуля, средний размер 50-170 строк, Vite сборка.

```
src/
├── main.jsx                     — точка входа (7 строк)
├── api.js                       — API слой (30)
├── utils.js                     — утилиты (25)
├── constants.js                 — STATUS, GRADE, стили C (62)
├── index.css                    — глобальные стили (22)
├── components/
│   ├── Root.jsx                 — auth wrapper (10)
│   ├── App.jsx                  — главный: табы, state (129)
│   ├── LoginScreen.jsx          — логин (47)
│   ├── Dashboard.jsx            — мой день (149)
│   ├── LeadsList.jsx            — список лидов + импорт (245)
│   ├── LeadDetail.jsx           — карточка лида (239)
│   ├── TouchRow.jsx             — строка касания (38)
│   ├── RatesTab.jsx             — ставки (121)
│   ├── CalcTab.jsx              — калькулятор (171)
│   ├── ProposalsTab.jsx         — КП (392)
│   ├── PatternsTab.jsx          — паттерны (28)
│   ├── SettingsTab.jsx          — настройки (114)
│   └── ui.jsx                   — Badge, Chip, Combobox (67)
├── rates/
│   ├── parseRateExcel.js        — парсинг Excel (125)
│   ├── calcChain.js             — калькулятор цепочки (250)
│   └── weightSurcharge.js       — надбавка за вес (60)
├── import/
│   └── parseBitrix.js           — импорт Битрикс + CSV экспорт (137)
└── kp/
    └── buildKPEmail.js          — сборка КП письма (168)
```

## Разработка

```bash
npm install          # установка зависимостей
npm run dev          # Vite dev server (порт 5173, прокси на Express :3000)
npm run build        # сборка → public/
npm start            # Express production сервер
```

### Workflow разработки

1. В одном терминале: `npm start` (Express API на :3000)
2. В другом: `npm run dev` (Vite на :5173 с HMR)
3. Открываешь http://localhost:5173

### Деплой на RUVDS

```bash
cd ~/bml-crm
git pull
npm install
npm run build        # собирает фронт в public/
pm2 restart bml-crm  # перезапуск Express
```

## API

Без изменений — тот же `server.js` с SQLite KV + SMTP.

## Переменные окружения

```
API_KEY=...
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=dorofeev@bml-dv.com
SMTP_PASS=...
FROM_NAME=BM Logistics
FROM_EMAIL=dorofeev@bml-dv.com
LOGO_URL=https://...
DATA_DIR=/data
```
