# eJustice — AI-допомога з прав людини

> AI-консультації з прав людини на основі офіційних джерел: законодавства України, міжнародних договорів, рішень ЄСПЛ, документів ООН.

---

## Структура проєкту

```
ejustice/
├── app.py                  # Flask-бекенд, API, логіка AI
├── requirements.txt
├── .env.example            # Приклад змінних середовища
├── data/
│   └── sources.json        # База офіційних джерел (не AI, верифіковані вручну)
├── templates/
│   └── index.html          # Головна сторінка
└── static/
    ├── css/style.css       # Дизайн (рожево-молочна палітра)
    └── js/app.js           # Фронтенд логіка
```

---

## Швидкий старт

### 1. Встановлення залежностей

```bash
cd ejustice
pip install -r requirements.txt
```

### 2. Налаштування змінних середовища

```bash
cp .env.example .env
# Відкрийте .env та вставте ваш OpenAI API ключ
```

### 3. Запуск

```bash
python app.py
```

Відкрийте браузер: http://localhost:5000

---

## Конфігурація OpenAI

У файлі `.env`:
```
OPENAI_API_KEY=sk-ваш-ключ
```

Отримати ключ: https://platform.openai.com/api-keys

---

## Як це працює

1. **Користувач ставить питання** про права людини
2. **Система знаходить релевантні офіційні джерела** з `data/sources.json`
3. **AI (GPT-4o) отримує лише верифіковані джерела** як контекст
4. **AI формує відповідь** строго на основі наданих джерел
5. **Користувач бачить** посилання на офіційні документи

### Захист від "галюцинацій"

- AI не отримує довільний доступ до інтернету
- Дозволені домени прописані в `data/sources.json` → `allowed_domains`
- Системний промпт забороняє вигадувати норми
- Якщо джерел немає — система повідомляє про це явно

---

## Розширення бази джерел

Відкрийте `data/sources.json` та додайте новий запис у масив `sources`:

```json
{
  "id": "unique_id",
  "title": "Назва документа",
  "type": "Закон",
  "country": "UA",
  "url": "https://zakon.rada.gov.ua/...",
  "domain": "zakon.rada.gov.ua",
  "date_adopted": "2020-01-01",
  "status": "чинний",
  "language": "uk",
  "rights": ["право на захист"],
  "articles": ["Стаття 1"]
}
```

Також додайте ключові слова до `topics`:
```json
"нове_ключове_слово": ["unique_id"]
```

---

## API Endpoints

| Метод | URL | Опис |
|-------|-----|------|
| POST | `/api/consult` | AI-консультація |
| GET | `/api/sources?country=UA` | Список джерел |
| GET | `/api/topics` | Список тем |

### POST /api/consult

**Запит:**
```json
{
  "question": "Мене незаконно затримали. Що робити?",
  "country": "UA"
}
```

**Відповідь:**
```json
{
  "short_answer": "...",
  "your_rights": [...],
  "legal_basis": [...],
  "steps": [...],
  "where_to_go": [...],
  "documents": [...],
  "deadlines": [...],
  "sources_verified": [...],
  "disclaimer": "...",
  "has_sources": true,
  "queried_at": "2026-05-12 17:00 UTC"
}
```

---

## Безпека

- HTTPS: налаштуйте через nginx/certbot на продакшені
- SECRET_KEY: завжди змінюйте в продакшені
- OPENAI_API_KEY: зберігайте тільки в .env, не комітьте в git
- Додайте `.env` до `.gitignore`

---

## Технологічний стек

- **Backend:** Python + Flask
- **AI:** OpenAI GPT-4o (через офіційний SDK)
- **Frontend:** HTML + CSS + Vanilla JS
- **База джерел:** JSON (легко розширювати)
- **Дизайн:** рожево-молочна палітра, Cormorant Garamond + DM Sans
