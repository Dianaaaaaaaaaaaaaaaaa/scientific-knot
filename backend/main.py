import os
import re
import json
import traceback
from io import BytesIO
from collections import Counter
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


load_dotenv()


# =========================
# ENV
# =========================

USE_MOCK_AI = os.getenv("USE_MOCK_AI", "true").lower() == "true"
ALLOW_AI_FALLBACK = os.getenv("ALLOW_AI_FALLBACK", "true").lower() == "true"

YANDEX_API_KEY = os.getenv("YANDEX_API_KEY", "")
YANDEX_FOLDER_ID = os.getenv("YANDEX_FOLDER_ID", "")
YANDEX_MODEL = os.getenv("YANDEX_MODEL", "yandexgpt-5-lite")

# ВАЖНО:
# для OpenAI-compatible API нужен именно этот base_url
YANDEX_BASE_URL = os.getenv(
    "YANDEX_BASE_URL",
    "https://ai.api.cloud.yandex.net/v1",
)

MAX_TEXT_CHARS = int(os.getenv("MAX_TEXT_CHARS", "18000"))


# =========================
# APP
# =========================

app = FastAPI(
    title="Knowledge Map Backend",
    description="Backend for document analysis and knowledge graph extraction",
    version="1.0.0",
)


# noinspection PyTypeChecker
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# MODELS
# =========================

class Entity(BaseModel):
    id: str
    title: str
    type: str
    description: Optional[str] = None


class Relation(BaseModel):
    source: str
    target: str
    type: str


class AnalyzeResponse(BaseModel):
    mode: str
    filename: str
    summary: str
    entities: List[Entity]
    relations: List[Relation]
    tags: List[str]
    textPreview: str


class AnalyzeTextRequest(BaseModel):
    text: str
    filename: Optional[str] = "manual_text.txt"


class GraphRequest(BaseModel):
    entities: List[Entity]
    relations: List[Relation]


# =========================
# UTILS
# =========================

def normalize_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def safe_json_loads(raw: str) -> Dict[str, Any]:
    """
    Пытается достать JSON даже если модель вернула его внутри ```json ... ```
    """
    raw = raw.strip()

    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?", "", raw, flags=re.IGNORECASE).strip()
        raw = re.sub(r"```$", "", raw).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    start = raw.find("{")
    end = raw.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise ValueError("AI response does not contain JSON")

    return json.loads(raw[start:end + 1])


def make_entity_id(title: str, index: int) -> str:
    base = re.sub(r"[^a-zA-Zа-яА-ЯёЁ0-9]+", "_", title.lower()).strip("_")

    if not base:
        base = f"entity_{index}"

    return f"{base}_{index}"


def build_graph_from_analysis(result: Dict[str, Any]) -> Dict[str, Any]:
    nodes = []
    edges = []

    for entity in result.get("entities", []):
        nodes.append(
            {
                "id": entity["id"],
                "label": entity["title"],
                "type": entity["type"],
                "description": entity.get("description"),
            }
        )

    for relation in result.get("relations", []):
        edges.append(
            {
                "source": relation["source"],
                "target": relation["target"],
                "label": relation["type"],
            }
        )

    return {
        "nodes": nodes,
        "edges": edges,
    }


# =========================
# TEXT EXTRACTION
# =========================

async def extract_text_from_upload(file: UploadFile) -> str:
    filename = file.filename or "unknown"
    ext = filename.lower().split(".")[-1]

    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Файл пустой")

    try:
        if ext in ["txt", "md", "csv"]:
            return extract_text_from_txt(content)

        if ext == "pdf":
            return extract_text_from_pdf(content)

        if ext == "docx":
            return extract_text_from_docx(content)

        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый формат файла: .{ext}. Поддерживаются TXT, PDF, DOCX.",
        )

    except HTTPException:
        raise

    except Exception as exc:
        print("TEXT EXTRACTION ERROR:")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Не удалось прочитать файл: {str(exc)}",
        )


def extract_text_from_txt(content: bytes) -> str:
    for encoding in ["utf-8", "cp1251", "latin-1"]:
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue

    return content.decode("utf-8", errors="ignore")


def extract_text_from_pdf(content: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Для чтения PDF установи зависимость: pip install pypdf",
        )

    reader = PdfReader(BytesIO(content))
    pages_text = []

    for page in reader.pages:
        page_text = page.extract_text() or ""
        pages_text.append(page_text)

    text = "\n".join(pages_text)

    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="Не удалось извлечь текст из PDF. Возможно, это скан без текстового слоя.",
        )

    return text


def extract_text_from_docx(content: bytes) -> str:
    try:
        from docx import Document
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Для чтения DOCX установи зависимость: pip install python-docx",
        )

    document = Document(BytesIO(content))
    paragraphs = [p.text for p in document.paragraphs if p.text.strip()]

    text = "\n".join(paragraphs)

    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="Не удалось извлечь текст из DOCX.",
        )

    return text


# =========================
# MOCK AI
# =========================

RU_STOPWORDS = {
    "который", "которая", "которые", "которое",
    "также", "данный", "данная", "данные", "данных",
    "может", "могут", "более", "менее", "после",
    "перед", "между", "через", "были", "было", "была",
    "этого", "этой", "этот", "этих", "таким", "такая",
    "такие", "таких", "является", "являются", "используется",
    "используются", "получены", "получение", "исследование",
    "работы", "работа", "результаты", "результатов",
    "документ", "документа", "текст", "текста",
}

EN_STOPWORDS = {
    "this", "that", "with", "from", "were", "was", "are",
    "for", "and", "the", "into", "using", "used", "based",
    "study", "result", "results", "research", "method",
    "document", "text", "data",
}

STOPWORDS = RU_STOPWORDS | EN_STOPWORDS


def mock_analyze_text(text: str, filename: str, mode: str = "mock") -> Dict[str, Any]:
    """
    Динамический мок.
    Он не умный как LLM, но зависит от содержимого документа.
    Поэтому для разных файлов JSON будет разным.
    """

    clean_text = normalize_spaces(text)
    preview = clean_text[:700]

    words = re.findall(r"[A-Za-zА-Яа-яЁё0-9\-]{4,}", clean_text.lower())

    filtered_words = [
        word for word in words
        if word not in STOPWORDS and not word.isdigit()
    ]

    counter = Counter(filtered_words)
    top_words = [word for word, _ in counter.most_common(10)]

    if not top_words:
        top_words = ["анализ", "данные", "исследование", "материал"]

    entity_types = [
        "Тема",
        "Материал",
        "Метод",
        "Свойство",
        "Процесс",
        "Результат",
        "Оборудование",
        "Показатель",
    ]

    entities: List[Dict[str, Any]] = []

    for index, word in enumerate(top_words[:8]):
        title = word[:1].upper() + word[1:]

        entities.append(
            {
                "id": make_entity_id(title, index + 1),
                "title": title,
                "type": entity_types[index % len(entity_types)],
                "description": f"Автоматически выделенная сущность из документа «{filename}».",
            }
        )

    relations: List[Dict[str, str]] = []

    relation_types = [
        "связано с",
        "используется в",
        "влияет на",
        "исследуется через",
        "характеризует",
    ]

    for index in range(len(entities) - 1):
        relations.append(
            {
                "source": entities[index]["id"],
                "target": entities[index + 1]["id"],
                "type": relation_types[index % len(relation_types)],
            }
        )

    first_sentence = ""
    sentences = re.split(r"(?<=[.!?])\s+", clean_text)

    if sentences:
        first_sentence = sentences[0][:300]

    summary = (
        first_sentence
        if first_sentence
        else "Документ был обработан в моковом режиме. Выделены ключевые сущности и связи на основе частотных слов."
    )

    return {
        "mode": mode,
        "filename": filename,
        "summary": summary,
        "entities": entities,
        "relations": relations,
        "tags": top_words[:5],
        "textPreview": preview,
    }


# =========================
# YANDEX AI
# =========================

def build_yandex_model_name() -> str:
    """
    Можно использовать два варианта в .env:

    YANDEX_MODEL=yandexgpt-5-lite

    или уже готовый полный путь:

    YANDEX_MODEL=gpt://folder_id/yandexgpt-5-lite
    """

    if YANDEX_MODEL.startswith("gpt://"):
        return YANDEX_MODEL

    if not YANDEX_FOLDER_ID:
        return YANDEX_MODEL

    return f"gpt://{YANDEX_FOLDER_ID}/{YANDEX_MODEL}"


def build_yandex_prompt(text: str, filename: str) -> str:
    cropped_text = text[:MAX_TEXT_CHARS]

    return f"""
Ты — система анализа научных и R&D-документов.

Твоя задача:
1. Кратко описать содержание документа.
2. Извлечь ключевые сущности.
3. Извлечь связи между сущностями.
4. Вернуть строго валидный JSON без markdown.

Формат ответа строго такой:

{{
  "summary": "краткое описание документа",
  "entities": [
    {{
      "id": "unique_id",
      "title": "Название сущности",
      "type": "Материал | Метод | Свойство | Процесс | Результат | Оборудование | Автор | Организация | Тема | Другое",
      "description": "краткое описание"
    }}
  ],
  "relations": [
    {{
      "source": "id исходной сущности",
      "target": "id целевой сущности",
      "type": "тип связи"
    }}
  ],
  "tags": ["тег1", "тег2", "тег3"]
}}

Требования:
- source и target в relations должны ссылаться на id из entities.
- id сущностей делай латиницей или транслитом без пробелов.
- Не добавляй пояснений вне JSON.
- Не используй markdown.
- Не возвращай текст до или после JSON.
- Если каких-то данных нет, верни пустой массив.
- Не выдумывай то, чего нет в тексте.

Имя файла:
{filename}

Текст документа:
{cropped_text}
""".strip()


def analyze_with_yandex(text: str, filename: str) -> Dict[str, Any]:
    """
    Реальный анализ через Yandex AI Studio.

    ВАЖНО:
    Здесь используется client.chat.completions.create(...),
    а НЕ client.responses.create(...).
    """

    if not YANDEX_API_KEY:
        raise RuntimeError("YANDEX_API_KEY is empty")

    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError("OpenAI SDK is not installed. Run: pip install openai")

    client = OpenAI(
        api_key=YANDEX_API_KEY,
        project=YANDEX_FOLDER_ID,
        base_url=YANDEX_BASE_URL,
    )

    prompt = build_yandex_prompt(text=text, filename=filename)
    model_name = build_yandex_model_name()

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {
                "role": "system",
                "content": "Ты извлекаешь карту знаний из документов и возвращаешь только валидный JSON.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        temperature=0.2,
        max_tokens=3000,
    )

    raw_output = response.choices[0].message.content

    if not raw_output:
        raise RuntimeError("Yandex AI returned empty response")

    parsed = safe_json_loads(raw_output)

    parsed["mode"] = "yandex"
    parsed["filename"] = filename
    parsed["textPreview"] = normalize_spaces(text)[:700]

    parsed.setdefault("summary", "")
    parsed.setdefault("entities", [])
    parsed.setdefault("relations", [])
    parsed.setdefault("tags", [])

    return parsed


# =========================
# VALIDATION / CLEANUP
# =========================

def normalize_analysis_result(result: Dict[str, Any], filename: str) -> Dict[str, Any]:
    entities = result.get("entities", [])
    relations = result.get("relations", [])
    tags = result.get("tags", [])

    normalized_entities = []

    for index, entity in enumerate(entities):
        title = str(entity.get("title") or entity.get("name") or f"Сущность {index + 1}")
        entity_id = str(entity.get("id") or make_entity_id(title, index + 1))
        entity_type = str(entity.get("type") or "Другое")
        description = entity.get("description")

        normalized_entities.append(
            {
                "id": entity_id,
                "title": title,
                "type": entity_type,
                "description": str(description) if description else None,
            }
        )

    entity_ids = {entity["id"] for entity in normalized_entities}

    normalized_relations = []

    for relation in relations:
        source = str(relation.get("source", ""))
        target = str(relation.get("target", ""))
        relation_type = str(relation.get("type") or relation.get("label") or "связано с")

        if source in entity_ids and target in entity_ids and source != target:
            normalized_relations.append(
                {
                    "source": source,
                    "target": target,
                    "type": relation_type,
                }
            )

    normalized_tags = [str(tag) for tag in tags if str(tag).strip()]

    return {
        "mode": str(result.get("mode", "unknown")),
        "filename": str(result.get("filename", filename)),
        "summary": str(result.get("summary", "")),
        "entities": normalized_entities,
        "relations": normalized_relations,
        "tags": normalized_tags,
        "textPreview": str(result.get("textPreview", "")),
    }


def analyze_text_pipeline(text: str, filename: str) -> Dict[str, Any]:
    text = normalize_spaces(text)

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Не удалось извлечь текст из документа.",
        )

    if USE_MOCK_AI:
        result = mock_analyze_text(text=text, filename=filename, mode="mock")
        return normalize_analysis_result(result, filename)

    try:
        result = analyze_with_yandex(text=text, filename=filename)
        return normalize_analysis_result(result, filename)

    except Exception as exc:
        print("YANDEX AI ERROR:")
        traceback.print_exc()

        if ALLOW_AI_FALLBACK:
            result = mock_analyze_text(
                text=text,
                filename=filename,
                mode="fallback_mock",
            )
            return normalize_analysis_result(result, filename)

        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при запросе к Yandex AI Studio: {str(exc)}",
        )


# =========================
# ROUTES
# =========================

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Knowledge Map Backend",
        "useMockAi": USE_MOCK_AI,
        "allowAiFallback": ALLOW_AI_FALLBACK,
        "yandexBaseUrl": YANDEX_BASE_URL,
        "yandexModel": YANDEX_MODEL,
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "useMockAi": USE_MOCK_AI,
        "allowAiFallback": ALLOW_AI_FALLBACK,
        "yandexModel": YANDEX_MODEL,
        "yandexModelFull": build_yandex_model_name(),
        "yandexBaseUrl": YANDEX_BASE_URL,
        "hasYandexApiKey": bool(YANDEX_API_KEY),
        "hasYandexFolderId": bool(YANDEX_FOLDER_ID),
    }


@app.get("/demo-data", response_model=AnalyzeResponse)
def demo_data():
    text = (
        "В работе Иванова исследовался графен с применением метода спектроскопии Raman. "
        "Эксперименты проводились в лаборатории наноматериалов. "
        "Получены данные о высокой электропроводности образцов."
    )

    result = mock_analyze_text(
        text=text,
        filename="demo_graphene.txt",
        mode="demo",
    )

    return normalize_analysis_result(result, "demo_graphene.txt")


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_document(file: UploadFile = File(...)):
    filename = file.filename or "document"
    text = await extract_text_from_upload(file)

    return analyze_text_pipeline(text=text, filename=filename)


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_document_alias(file: UploadFile = File(...)):
    return await analyze_document(file)


@app.post("/api/analyze-text", response_model=AnalyzeResponse)
async def analyze_text(request: AnalyzeTextRequest):
    filename = request.filename or "manual_text.txt"

    return analyze_text_pipeline(text=request.text, filename=filename)


@app.post("/analyze-text", response_model=AnalyzeResponse)
async def analyze_text_alias(request: AnalyzeTextRequest):
    return await analyze_text(request)


@app.post("/api/graph")
def build_graph(request: GraphRequest):
    result = {
        "entities": [entity.dict() for entity in request.entities],
        "relations": [relation.dict() for relation in request.relations],
    }

    return build_graph_from_analysis(result)


@app.post("/graph")
def build_graph_alias(request: GraphRequest):
    return build_graph(request)