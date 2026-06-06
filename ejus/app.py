import os
import json
import re
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session

# -------------------- .env підтримка --------------------
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_BASE_DIR, ".env"))  # локально підхоплюємо .env
except ImportError:
    pass

# -------------------- Flask --------------------
app = Flask(
    __name__,
    template_folder=os.path.join(_BASE_DIR, "templates"),
    static_folder=os.path.join(_BASE_DIR, "static")
)

# Використовуємо SECRET_KEY і OPENAI_API_KEY із середовища
app.secret_key = os.environ.get("SECRET_KEY", "ejustice-secret-2026")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

def get_api_key():
    return OPENAI_API_KEY or session.get("openai_api_key", "")

# -------------------- Завантаження JSON --------------------
with open(os.path.join(_BASE_DIR, "data", "sources.json"), "r", encoding="utf-8") as f:
    full_data = json.load(f)

ALLOWED_DOMAINS = set(full_data["allowed_domains"])
SOURCES = {s["id"]: s for s in full_data["sources"]}
TOPICS_MAP = full_data["topics"]
CONTACTS = full_data["contacts"]

PAGE_SIZE = 2  # кількість елементів на сторінку

# -------------------- AI консультації --------------------
from openai import OpenAI

def find_relevant_sources(query: str, country: str = "UA") -> list:
    query_lower = query.lower()
    matched_ids = set()
    for keyword, source_ids in TOPICS_MAP.items():
        if keyword in query_lower:
            matched_ids.update(source_ids)
    relevant = []
    for sid in matched_ids:
        source = SOURCES.get(sid)
        if source and source.get("country") in [country, "UNIVERSAL"]:
            relevant.append(source)
    if not relevant:
        relevant = [s for s in SOURCES.values() if s.get("country") in [country, "UNIVERSAL"]][:4]
    return relevant

def build_system_prompt(sources: list, country: str) -> str:
    sources_text = "\n".join([f"- [{s['title']}]({s['url']})" for s in sources])
    contacts_text = "\n".join([f"- {c['name']}: {c['url']}" for c in CONTACTS.get(country, [])])
    return f"""Ти — AI-помічник правової платформи eJustice. Країна користувача: {country}
Джерела:
{sources_text}
Контакти:
{contacts_text}
Відповідь у JSON. Використовуй лише офіційні джерела."""

def consult_ai(question: str, country: str = "UA") -> dict:
    api_key = get_api_key()
    if not api_key:
        return {"error": True, "need_key": True, "message": "OpenAI API ключ не налаштовано."}
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
        raw = re.sub(r"^```json\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        result = json.loads(raw)
        result["queried_at"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        result["sources_verified"] = [s["title"] for s in sources]
        return result
    except Exception as e:
        return {"error": True, "message": str(e)}

# -------------------- API маршрути --------------------
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
    return jsonify(consult_ai(question, country))

@app.route("/api/sources", methods=["GET"])
def api_sources():
    country = request.args.get("country", "UA")
    page = int(request.args.get("page", 1))
    sources_list = [s for s in SOURCES.values() if s.get("country") in [country, "UNIVERSAL"]]
    total_pages = (len(sources_list) + PAGE_SIZE - 1) // PAGE_SIZE
    start = (page - 1) * PAGE_SIZE
    end = start + PAGE_SIZE
    return jsonify({"page": page, "total_pages": total_pages, "sources": sources_list[start:end]})

@app.route("/api/topics", methods=["GET"])
def api_topics():
    page = int(request.args.get("page", 1))
    topics_keys = list(TOPICS_MAP.keys())
    total_pages = (len(topics_keys) + PAGE_SIZE - 1) // PAGE_SIZE
    start = (page - 1) * PAGE_SIZE
    end = start + PAGE_SIZE
    return jsonify({"page": page, "total_pages": total_pages, "topics": {k: TOPICS_MAP[k] for k in topics_keys[start:end]}})

@app.route("/api/contacts", methods=["GET"])
def api_contacts():
    country = request.args.get("country", "UA")
    return jsonify(CONTACTS.get(country, {}))

@app.route("/api/domains", methods=["GET"])
def api_domains():
    return jsonify(list(ALLOWED_DOMAINS))

@app.route("/api/set-key", methods=["POST"])
def api_set_key():
    data = request.get_json()
    key = data.get("key", "").strip()
    if not key.startswith("sk-"):
        return jsonify({"error": True, "message": "Невірний формат ключа"}), 400
    session["openai_api_key"] = key
    return jsonify({"ok": True})

@app.route("/api/key-status", methods=["GET"])
def api_key_status():
    has_env = bool(OPENAI_API_KEY)
    has_session = bool(session.get("openai_api_key"))
    return jsonify({"configured": has_env or has_session, "source": "env" if has_env else ("session" if has_session else "none")})

@app.route("/api/clear-key", methods=["POST"])
def api_clear_key():
    session.pop("openai_api_key", None)
    return jsonify({"ok": True})

# -------------------- Main --------------------
if __name__ == "__main__":
    app.run(debug=True, port=5000)