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

def is_placeholder_api_key(api_key: str) -> bool:
    key_lower = api_key.lower()
    return (
        not api_key
        or "your" in key_lower
        or "ваш" in key_lower
        or "example" in key_lower
        or api_key == "sk-your-openai-api-key"
    )

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

LEGAL_SCOPE_KEYWORDS = [
    "прав", "закон", "юрид", "суд", "адвокат", "юрист", "скарг", "заяв",
    "поліц", "полиц", "затрим", "арешт", "обшук", "допит", "штраф",
    "документ", "догов", "роботодав", "звільн", "дискрим", "насиль",
    "військ", "полон", "окупац", "біжен", "омбудс", "єспл", "оон",
    "конституц", "кодекс", "відповідальн", "поруш", "захист",
    "дит", "сім", "освіт", "батьк", "опік", "child", "children", "family", "education",
    "law", "legal", "court", "rights", "police", "detention", "complaint"
]

def is_legal_question(query: str) -> bool:
    query_lower = query.lower()
    if any(keyword in query_lower for keyword in TOPICS_MAP.keys()):
        return True
    return any(keyword in query_lower for keyword in LEGAL_SCOPE_KEYWORDS)

def find_relevant_sources(query: str, country: str = "UA") -> list:
    query_lower = query.lower()
    matched_ids = set()
    for keyword, source_ids in TOPICS_MAP.items():
        if keyword in query_lower:
            matched_ids.update(source_ids)
    query_words = {word for word in re.findall(r"[\wА-Яа-яІіЇїЄєҐґ']{4,}", query_lower)}
    for source in SOURCES.values():
        searchable = " ".join([
            source.get("title", ""),
            source.get("type", ""),
            " ".join(source.get("rights", [])),
            " ".join(source.get("articles", [])),
        ]).lower()
        if any(word in searchable for word in query_words):
            matched_ids.add(source["id"])
    relevant = []
    for sid in sorted(matched_ids):
        source = SOURCES.get(sid)
        if source and source.get("country") in [country, "UNIVERSAL"]:
            relevant.append(source)
    if not relevant:
        relevant = [s for s in SOURCES.values() if s.get("country") in [country, "UNIVERSAL"]]
    return relevant

def build_system_prompt(sources: list, country: str, language: str = "uk") -> str:
    language_name = "English" if language == "en" else "українська"
    sources_text = "\n".join([
        f"- {s['title']} | {s.get('type', '')} | {', '.join(s.get('articles', []))} | {s['url']}"
        for s in sources
    ])
    sources_text = f"Мова відповіді: {language_name}\n" + sources_text
    contacts_text = "\n".join([f"- {c['name']}: {c['url']}" for c in CONTACTS.get(country, [])])
    contacts_text += (
        "\n\nФормат JSON: violation_assessment, case_analysis, fact_assessment, short_answer, your_rights, legal_basis, "
        "steps, where_to_go, documents, deadlines, disclaimer, has_sources. "
        "violation_assessment має бути об'єктом зі status, summary, reasoning. "
        "status має бути одним із: likely_violation, possible_violation, insufficient_facts, likely_no_violation. "
        "Не стверджуй автоматично, що порушення є. Якщо фактів недостатньо, прямо напиши, що потрібні додаткові обставини. "
        "Якщо ознак порушення немає, прямо напиши це і поясни чому. "
        "fact_assessment має бути масивом коротких пунктів: який факт із ситуації на що впливає у правовій оцінці. "
        "Якщо ситуація відбувається на тимчасово окупованій території, поясни, що одночасно релевантні право України, міжнародне гуманітарне право окупації та міжнародні стандарти прав людини. "
        "Для окупованої території не радь автоматично звертатися до місцевих або правоохоронних органів, якщо це може означати окупаційні органи чи створювати ризик. "
        "У таких випадках пріоритет: безпека людини, не провокувати ескалацію, зберегти докази без ризику, звертатися дистанційно до українських органів, омбудсмана, адвоката або правозахисних організацій, якщо це безпечно. "
        "your_rights не має бути шаблонним списком: називай лише ті права, які прямо випливають із ситуації користувача. "
        "Для кожного названого права має бути відповідна legal_basis з конкретним джерелом і статтею, якщо така стаття є у наданих джерелах. "
        "Якщо користувач питає про права дитини, обов'язково перевір Конвенцію ООН про права дитини, якщо вона є серед джерел. "
        "case_analysis має містити розбір справи по суті. "
        "legal_basis: об'єкти з title, article, url. "
        "Використовуй лише надані офіційні джерела."
    )
    return f"""Ти — AI-помічник правової платформи eJustice. Країна користувача: {country}
Джерела:
{sources_text}
Контакти:
{contacts_text}
Відповідь у JSON. Використовуй лише офіційні джерела."""

def consult_ai(question: str, country: str = "UA", language: str = "uk") -> dict:
    if not is_legal_question(question):
        if language == "en":
            return {
                "has_sources": False,
                "out_of_scope": True,
                "short_answer": (
                    "This does not look like a legal or human-rights situation, "
                    "so eJustice did not select legal sources. Please describe the legal aspect: "
                    "a rights violation, complaint, authority, court, document, or liability."
                ),
                "sources_verified": [],
                "queried_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
            }
        return {
            "has_sources": False,
            "out_of_scope": True,
            "short_answer": (
                "Це питання не виглядає як правова або правозахисна ситуація, "
                "тому eJustice не підбирає до нього юридичні джерела. "
                "Сформулюйте, будь ласка, який саме правовий аспект потрібно перевірити: "
                "наприклад, порушення права, скарга, звернення до органу, суд, документи або відповідальність."
            ),
            "sources_verified": [],
            "queried_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        }

    api_key = get_api_key()
    if not api_key:
        return {"error": True, "need_key": True, "message": "OpenAI API ключ не налаштовано."}
    if is_placeholder_api_key(api_key):
        return {
            "error": True,
            "need_key": True,
            "message": "У .env вказано приклад OpenAI API ключа. Замініть OPENAI_API_KEY на реальний ключ з platform.openai.com."
        }
    sources = find_relevant_sources(question, country)
    system_prompt = build_system_prompt(sources, country, language)
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
        result.setdefault("has_sources", bool(sources))
        result.setdefault("violation_assessment", {
            "status": "insufficient_facts",
            "summary": "Потрібна додаткова оцінка обставин.",
            "reasoning": "Модель не повернула окрему оцінку наявності порушення, тому висновок не слід вважати остаточним."
        })
        result["queried_at"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        result["sources_verified"] = [s["title"] for s in sources]
        result["source_documents"] = sources
        return result
    except Exception as e:
        message = str(e)
        if "invalid_api_key" in message or "Incorrect API key" in message or "401" in message:
            message = "OpenAI API ключ недійсний. Перевірте OPENAI_API_KEY у файлі .env або створіть новий ключ у platform.openai.com."
        return {"error": True, "message": message}

# -------------------- API маршрути --------------------
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/sources")
def sources_page():
    sources_list = sorted(SOURCES.values(), key=lambda source: (source.get("country", ""), source.get("title", "")))
    return render_template("sources.html", sources=sources_list)

@app.route("/api/consult", methods=["POST"])
def api_consult():
    data = request.get_json()
    question = data.get("question", "").strip()
    country = data.get("country", "UA").strip()
    language = data.get("language", "uk").strip()
    if not question:
        return jsonify({"error": True, "message": "Питання не може бути порожнім"}), 400
    return jsonify(consult_ai(question, country, language))

@app.route("/api/sources", methods=["GET"])
def api_sources():
    country = request.args.get("country", "UA")
    page = int(request.args.get("page", 1))
    sources_list = [s for s in SOURCES.values() if s.get("country") in [country, "UNIVERSAL"]]
    if request.args.get("all", "1") == "1":
        return jsonify(sources_list)
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
    app.run(debug=True, port=5000, use_reloader=False)
