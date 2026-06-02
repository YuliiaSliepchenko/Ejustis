from flask import Flask, render_template, request, jsonify, session
import json
import os
import re
from datetime import datetime
from openai import OpenAI

# Load .env file from the same directory as app.py
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
try:
    from dotenv import load_dotenv
    _env_path = os.path.join(_BASE_DIR, ".env")
    load_dotenv(_env_path)
    print(f"[eJustice] Looking for .env at: {_env_path}")
    print(f"[eJustice] .env found: {os.path.exists(_env_path)}")
except ImportError:
    print("[eJustice] python-dotenv not installed, skipping .env load")

app = Flask(__name__, template_folder=os.path.join(_BASE_DIR, "templates"), static_folder=os.path.join(_BASE_DIR, "static"))
app.secret_key = os.environ.get("SECRET_KEY", "ejustice-secret-2026")

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
print(f"[eJustice] OPENAI_API_KEY loaded: {'YES (' + OPENAI_API_KEY[:8] + '...)' if OPENAI_API_KEY else 'NO — set it in .env'}")


def get_api_key():
    """Get API key: env variable takes priority, then session."""
    return OPENAI_API_KEY or session.get("openai_api_key", "")

# Load sources database (always relative to app.py)
with open(os.path.join(_BASE_DIR, "data/sources.json"), "r", encoding="utf-8") as f:
    SOURCES_DB = json.load(f)

ALLOWED_DOMAINS = set(SOURCES_DB["allowed_domains"])
SOURCES = {s["id"]: s for s in SOURCES_DB["sources"]}
TOPICS_MAP = SOURCES_DB["topics"]
CONTACTS = SOURCES_DB["contacts"]


def find_relevant_sources(query: str, country: str = "UA") -> list:
    """Find relevant official sources based on query keywords."""
    query_lower = query.lower()
    matched_ids = set()

    for keyword, source_ids in TOPICS_MAP.items():
        if keyword in query_lower:
            matched_ids.update(source_ids)

    # Filter by country and validity
    relevant = []
    for sid in matched_ids:
        source = SOURCES.get(sid)
        if source:
            if source.get("country") in [country, "UNIVERSAL"]:
                relevant.append(source)

    # If nothing matched, return universal sources
    if not relevant:
        relevant = [s for s in SOURCES.values() if s.get("country") in [country, "UNIVERSAL"]][:4]

    return relevant


def build_system_prompt(sources: list, country: str) -> str:
    sources_text = "\n".join([
        f"- [{s['title']}]({s['url']}) (домен: {s['domain']}, статус: {s['status']}, дата: {s.get('date_adopted','')})"
        for s in sources
    ])

    contacts_list = CONTACTS.get(country, [])
    contacts_text = "\n".join([
        f"- {c['name']}: {c['url']}" for c in contacts_list
    ])

    return f"""Ти — AI-помічник правової платформи eJustice. Твоя задача — надавати юридичні консультації з прав людини ВИКЛЮЧНО на основі офіційних джерел.

КРИТИЧНІ ПРАВИЛА:
1. НІКОЛИ не вигадуй правові норми. Якщо не знаєш точної статті — не вказуй її.
2. ЗАВЖДИ посилайся тільки на офіційні джерела з наданого списку.
3. НЕ посилайся на блоги, новини, форуми, приватні сайти.
4. Якщо офіційних джерел недостатньо — чесно повідом про це.
5. Ніколи не гарантуй результат справи.
6. Завжди додавай застереження, що відповідь є інформаційною.

КРАЇНА КОРИСТУВАЧА: {country}

ДОСТУПНІ ОФІЦІЙНІ ДЖЕРЕЛА ДЛЯ ЦЬОГО ЗАПИТУ:
{sources_text}

ОРГАНИ ЗВЕРНЕННЯ ({country}):
{contacts_text}

ФОРМАТ ВІДПОВІДІ (строго дотримуйся структури у вигляді JSON):
{{
  "short_answer": "коротке пояснення простою мовою (2-3 речення)",
  "your_rights": ["право 1", "право 2", "право 3"],
  "legal_basis": [
    {{"title": "назва документа", "article": "стаття або норма", "url": "посилання"}}
  ],
  "steps": ["крок 1", "крок 2", "крок 3"],
  "where_to_go": [
    {{"name": "назва органу", "url": "посилання", "note": "коментар"}}
  ],
  "documents": ["документ 1", "документ 2"],
  "deadlines": ["строк 1 або пусто якщо не відомо"],
  "sources_used": ["url1", "url2"],
  "disclaimer": "Ця відповідь створена AI-системою eJustice на основі офіційних джерел. Вона є первинною правовою інформацією і не замінює консультацію адвоката.",
  "has_sources": true
}}

Якщо не вистачає офіційних джерел — встанови has_sources: false та поясни у short_answer.
Відповідай ТІЛЬКИ валідним JSON, без markdown-блоків, без пояснень поза JSON.
"""


def consult_ai(question: str, country: str = "UA") -> dict:
    """Call OpenAI API with verified sources context."""
    api_key = get_api_key()
    if not api_key:
        return {
            "error": True,
            "need_key": True,
            "message": "OpenAI API ключ не налаштовано."
        }

    sources = find_relevant_sources(question, country)
    system_prompt = build_system_prompt(sources, country)

    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question}
            ],
            temperature=0.1,
            max_tokens=2000
        )

        raw = response.choices[0].message.content.strip()

        # Strip markdown code blocks if present
        raw = re.sub(r"^```json\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        result = json.loads(raw)
        result["queried_at"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        result["sources_verified"] = [s["title"] for s in sources]
        return result

    except json.JSONDecodeError as e:
        return {
            "error": True,
            "message": f"Помилка парсингу відповіді AI: {str(e)}"
        }
    except Exception as e:
        return {
            "error": True,
            "message": f"Помилка з'єднання з AI: {str(e)}"
        }


@app.route("/api/set-key", methods=["POST"])
def api_set_key():
    data = request.get_json()
    key = data.get("key", "").strip()
    if not key.startswith("sk-"):
        return jsonify({"error": True, "message": "Невірний формат ключа. Ключ повинен починатися з 'sk-'"}), 400
    # Validate key with a minimal test call
    try:
        client = OpenAI(api_key=key)
        client.models.list()  # lightweight check
        session["openai_api_key"] = key
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": True, "message": f"Ключ не прийнято: {str(e)}"}), 400


@app.route("/api/key-status", methods=["GET"])
def api_key_status():
    has_env = bool(OPENAI_API_KEY)
    has_session = bool(session.get("openai_api_key"))
    return jsonify({"configured": has_env or has_session, "source": "env" if has_env else ("session" if has_session else "none")})


@app.route("/api/clear-key", methods=["POST"])
def api_clear_key():
    session.pop("openai_api_key", None)
    return jsonify({"ok": True})


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/consult", methods=["POST"])
def api_consult():
    data = request.get_json()
    question = data.get("question", "").strip()
    country = data.get("country", "UA").strip()

    if not question:
        return jsonify({"error": True, "message": "Питання не може бути порожнім"}), 400
    if len(question) < 10:
        return jsonify({"error": True, "message": "Питання занадто коротке"}), 400
    if len(question) > 2000:
        return jsonify({"error": True, "message": "Питання занадто довге (максимум 2000 символів)"}), 400

    result = consult_ai(question, country)
    return jsonify(result)


@app.route("/api/sources", methods=["GET"])
def api_sources():
    """Return list of official sources."""
    country = request.args.get("country", "UA")
    sources = [
        {
            "title": s["title"],
            "type": s["type"],
            "url": s["url"],
            "domain": s["domain"],
            "status": s["status"],
            "rights": s.get("rights", [])
        }
        for s in SOURCES.values()
        if s.get("country") in [country, "UNIVERSAL"]
    ]
    return jsonify(sources)


@app.route("/api/topics", methods=["GET"])
def api_topics():
    topics = list(TOPICS_MAP.keys())
    return jsonify(topics)


if __name__ == "__main__":
    app.run(debug=True, port=5000)