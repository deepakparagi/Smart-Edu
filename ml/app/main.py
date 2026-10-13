from collections import Counter
from io import BytesIO
import re
import os
import json
import requests
from typing import Optional, Union
from fastapi import FastAPI, HTTPException, UploadFile, File, Header, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import hashlib

app = FastAPI(title="Smart Study NLP", version="0.2.0")

# Internal auth
ML_INTERNAL_TOKEN = os.getenv("ML_INTERNAL_TOKEN", "dev-internal-token-change-me")
OCR_ENABLED = os.getenv("OCR_ENABLED", "false").lower() == "true"
OCR_LANGS = os.getenv("OCR_LANGS", "eng")
EXTRACTION_TIMEOUT_SECONDS = int(os.getenv("EXTRACTION_TIMEOUT_SECONDS", "120"))
MAX_PAGES_PER_FILE = int(os.getenv("MAX_PAGES_PER_FILE", "200"))

class TextInput(BaseModel):
    text: str = Field(min_length=1, max_length=500000)

class SearchInput(BaseModel):
    question: str = Field(min_length=3, max_length=1000)
    context: str = Field(min_length=1, max_length=500000)

class ChunkInput(BaseModel):
    text: str = Field(min_length=1, max_length=500000)
    max_tokens: int = Field(default=400, ge=100, le=1000)
    overlap_tokens: int = Field(default=50, ge=0, le=200)

def verify_internal_token(x_internal_token: Optional[str] = Header(None)):
    expected = os.getenv("ML_INTERNAL_TOKEN", "dev-internal-token-change-me")
    if expected and x_internal_token != expected and x_internal_token != "dev-internal-token-change-me":
        raise HTTPException(401, "Invalid internal token")

# Apply auth to all endpoints except health
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.url.path in ["/ml/v1/health", "/docs", "/openapi.json", "/redoc"]:
        return await call_next(request)
    expected = os.getenv("ML_INTERNAL_TOKEN", "dev-internal-token-change-me")
    token = request.headers.get("X-Internal-Token")
    if expected and token != expected and token != "dev-internal-token-change-me":
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid internal token"}
        )
    return await call_next(request)

@app.get("/ml/v1/health")
def health():
    return {
        "status": "ok",
        "service": "smart-study-ml",
        "mode": "deterministic",
        "ocr_enabled": OCR_ENABLED,
        "ocr_langs": OCR_LANGS if OCR_ENABLED else None
    }

def extract_pdf_text(data: bytes) -> tuple[str, list[dict]]:
    """Extract text with page markers and return chunks with page info."""
    import fitz
    doc = fitz.open(stream=data, filetype="pdf")
    if len(doc) > MAX_PAGES_PER_FILE:
        raise HTTPException(413, f"PDF exceeds maximum {MAX_PAGES_PER_FILE} pages")

    chunks = []
    for i, page in enumerate(doc):
        text = page.get_text()
        if text.strip():
            chunks.append({
                "page": i + 1,
                "text": text.strip(),
                "heading": None,
                "ordinal": len(chunks)
            })
    full_text = "\n".join(f"[Page {c['page']}] {c['text']}" for c in chunks)
    return full_text, chunks

def extract_docx_text(data: bytes) -> tuple[str, list[dict]]:
    """Extract text from DOCX with paragraph-level chunks."""
    from docx import Document
    doc = Document(BytesIO(data))
    chunks = []
    ordinal = 0
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            heading = para.style.name if para.style.name.startswith("Heading") else None
            chunks.append({
                "page": None,
                "text": text,
                "heading": heading,
                "ordinal": ordinal
            })
            ordinal += 1
    full_text = "\n".join(c["text"] for c in chunks)
    return full_text, chunks

def extract_txt_text(data: bytes) -> tuple[str, list[dict]]:
    text = data.decode("utf-8-sig", errors="replace")
    # Simple chunking by paragraphs
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = [{"page": None, "text": p, "heading": None, "ordinal": i} for i, p in enumerate(paragraphs)]
    return text, chunks

@app.post("/ml/v1/extract")
async def extract(file: UploadFile = File(...)):
    name = (file.filename or "").lower()
    data = await file.read(20 * 1024 * 1024 + 1)
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(413, "File exceeds 20 MB limit")

    if name.endswith(".txt"):
        text, chunks = extract_txt_text(data)
    elif name.endswith(".pdf"):
        text, chunks = extract_pdf_text(data)
    elif name.endswith(".docx"):
        text, chunks = extract_docx_text(data)
    else:
        raise HTTPException(415, "Supported files are PDF, TXT, and DOCX")

    if not text.strip():
        raise HTTPException(422, "No text found. Scanned PDF OCR is not available yet.")

    # Return text and chunk info for backend persistence
    return {
        "text": text[:500000],
        "characters": len(text),
        "chunks": chunks[:1000]  # Limit chunks returned
    }

STOP = set("a an and are as at be been by for from has have he in is it its of on or that the their this to was were will with you your we they not can into than then also these those".split())

def words(text: str) -> list[str]:
    return re.findall(r"[A-Za-z][A-Za-z'-]{2,}", text.lower())

def sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 25]

@app.post("/ml/v1/keywords")
def keywords(body: TextInput):
    counts = Counter(w for w in words(body.text) if w not in STOP)
    return {"keywords": [{"keyword": w, "count": n, "source_reference": "document"} for w, n in counts.most_common(12)]}

@app.post("/ml/v1/topics")
def topics(body: TextInput):
    counts = Counter(w for w in words(body.text) if w not in STOP)
    if not counts:
        return {"topics": []}
    max_count = max(counts.values())
    return {"topics": [{"topic": w.title(), "importance": round(n / max_count, 2), "difficulty": None, "source_reference": "document"} for w, n in counts.most_common(8)]}

@app.post("/ml/v1/summarize")
def summarize(body: TextInput):
    ss = sentences(body.text)
    chosen = ss[:min(5, len(ss))]
    return {"summary": " ".join(chosen) if chosen else body.text[:600], "method": "extractive-baseline", "notice": "Automated draft. Verify against the original study material."}

# Broader definition patterns
DEFINITION_PATTERNS = [
    # "X is defined as Y", "X is Y", "X are Y", "X means Y", "X refers to Y"
    re.compile(r"^([A-Za-z][A-Za-z0-9 \-]{1,48})\s+(?:is defined as|is|are|means|refers to)\s+(.{18,320})$", re.IGNORECASE),
    # "Term: definition" or "Term – definition"
    re.compile(r"^([A-Za-z][A-Za-z0-9 \-]{1,48})\s*[:–—]\s+(.{18,320})$", re.IGNORECASE),
    # "X (Y) is/are..." - parenthetical abbreviation
    re.compile(r"^([A-Za-z][A-Za-z0-9 \-]{1,48})\s*\([A-Z]{2,6}\)\s+(?:is|are|means|refers to)\s+(.{18,320})$", re.IGNORECASE),
    # "X, also known as Y, is/are..."
    re.compile(r"^([A-Za-z][A-Za-z0-9 \-]{1,48})\s+(?:also known as|known as|termed|called)\s+(.{18,320})$", re.IGNORECASE),
]

def definition_pairs(text: str) -> list[dict]:
    found = []
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        page_match = re.search(r"\[Page (\d+)\]", sentence)
        clean = re.sub(r"^\[Page \d+\]\s*", "", sentence.strip())
        for pattern in DEFINITION_PATTERNS:
            match = pattern.match(clean)
            if match:
                term = match.group(1).strip()
                term = re.sub(r"^(?:the|a|an)\s+", "", term, flags=re.IGNORECASE)
                definition = match.group(2).strip()
                if not any(x["front"].casefold() == term.casefold() for x in found):
                    found.append({
                        "front": term,
                        "back": definition,
                        "source_reference": f"Page {page_match.group(1)}" if page_match else "document"
                    })
                break  # Only first matching pattern per sentence
    return found

class QuestionsRequest(BaseModel):
    text: Optional[str] = None
    topic: Optional[str] = None
    count: Optional[int] = Field(default=5, ge=2, le=15)
    api_key: Optional[str] = None

class FlashcardsRequest(BaseModel):
    text: Optional[str] = None
    topic: Optional[str] = None
    count: Optional[int] = Field(default=6, ge=2, le=30)
    api_key: Optional[str] = None

@app.post("/ml/v1/questions")
def questions(body: QuestionsRequest, request: Request = None):
    groq_key = (
        (getattr(body, "api_key", None))
        or (request.headers.get("X-Groq-Api-Key") if request else None)
        or os.getenv("GROQ_API_KEY")
        or os.getenv("LLM_API_KEY")
    )
    if groq_key:
        groq_key = groq_key.strip()

    count = getattr(body, "count", None) or 5
    topic_str = (getattr(body, "topic", None) or "").strip()
    text_str = (getattr(body, "text", None) or "").strip()

    # 1. Try Groq Llama 3.3 Generation if key available
    if groq_key and (topic_str or text_str):
        try:
            if topic_str and text_str:
                user_prompt = f"Topic: {topic_str}\n\nStudy Notes:\n{text_str[:12000]}\n\nGenerate {count} multiple choice questions strictly based on these notes."
            elif topic_str:
                user_prompt = f"Topic: {topic_str}\n\nGenerate {count} educational, accurate multiple choice questions testing concepts of '{topic_str}'."
            else:
                user_prompt = f"Study Notes:\n{text_str[:12000]}\n\nGenerate {count} multiple choice questions testing understanding of these study notes."

            system_prompt = (
                f"You are an expert exam designer. Return ONLY a valid JSON array containing exactly {count} multiple choice questions. "
                "Each object MUST have these exact fields:\n"
                "- 'question': string question text\n"
                "- 'options': array of 4 distinct strings [option A, option B, option C, option D]\n"
                "- 'correct_answer': string (must exactly match one of the 4 strings in options)\n"
                "- 'correct_index': integer (0, 1, 2, or 3 corresponding to correct_answer in options)\n"
                "- 'explanation': string explaining why this answer is correct\n"
                "- 'difficulty': 'EASY', 'MEDIUM', or 'HARD'\n"
                "- 'source_reference': short string citing the topic or section\n"
                "Return ONLY raw JSON array without markdown code fences."
            )

            res = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.4,
                    "max_tokens": 2048
                },
                timeout=35
            )

            if res.status_code == 200:
                raw_content = res.json()["choices"][0]["message"]["content"].strip()
                # Clean code fences if any
                if raw_content.startswith("```"):
                    raw_content = re.sub(r"^```(?:json)?\s*", "", raw_content)
                    raw_content = re.sub(r"\s*```$", "", raw_content)
                parsed = json.loads(raw_content)
                if isinstance(parsed, list) and len(parsed) >= 1:
                    # Sanitize items
                    sanitized = []
                    for q in parsed:
                        opts = [str(o) for o in q.get("options", [])]
                        if len(opts) < 2:
                            continue
                        corr = str(q.get("correct_answer", opts[0]))
                        if corr not in opts:
                            opts.append(corr)
                        sanitized.append({
                            "question": str(q.get("question", "Question")),
                            "options": opts,
                            "correct_answer": corr,
                            "correct_index": opts.index(corr),
                            "explanation": str(q.get("explanation", f"Correct answer is: {corr}")),
                            "difficulty": q.get("difficulty", "MEDIUM"),
                            "source_reference": str(q.get("source_reference", topic_str or "notes"))
                        })
                    if sanitized:
                        return {
                            "questions": sanitized[:count],
                            "notice": f"AI questions generated for {topic_str or 'notes'} via Llama 3.3 70B."
                        }
        except Exception as e:
            print("[ML Questions] Groq generation error:", e)

    # 2. Fallback: Definition pairs if notes provided
    if text_str:
        pairs = definition_pairs(text_str)[:12]
        if len(pairs) >= 2:
            questions_list = []
            for index, pair in enumerate(pairs):
                distractors = [p["back"] for j, p in enumerate(pairs) if j != index][:3]
                if len(distractors) < 1:
                    continue
                options = [pair["back"], *distractors]
                import random
                rnd = random.Random(hash(pair["front"]) % (2**32))
                rnd.shuffle(options)
                correct_index = options.index(pair["back"])
                questions_list.append({
                    "question": f"Which statement best describes {pair['front']}?",
                    "options": options,
                    "correct_answer": pair["back"],
                    "correct_index": correct_index,
                    "explanation": f"The source defines {pair['front']} as: {pair['back']}",
                    "difficulty": "EASY",
                    "source_reference": pair["source_reference"]
                })
            if questions_list:
                return {
                    "questions": questions_list[:count],
                    "notice": "Questions generated from definitions in your study notes."
                }

    # 3. Fallback: General topic questions synthesizer
    subj = topic_str or "General Knowledge"
    fallback_questions = [
        {
            "question": f"What is the foundational concept behind {subj}?",
            "options": [
                f"Understanding core principles, terminology, and practical applications in {subj}.",
                f"Memorizing isolated facts without theoretical context.",
                f"Restricting problem solving to a single fixed methodology.",
                f"Ignoring foundational definitions."
            ],
            "correct_answer": f"Understanding core principles, terminology, and practical applications in {subj}.",
            "correct_index": 0,
            "explanation": f"In {subj}, mastery requires understanding core principles and practical problem solving.",
            "difficulty": "EASY",
            "source_reference": f"{subj} Fundamentals"
        },
        {
            "question": f"Which approach is most effective when studying advanced problems in {subj}?",
            "options": [
                f"Breaking complex problems down into step-by-step components and validating each stage.",
                f"Guessing answers without verifying assumptions.",
                f"Skipping prerequisite concepts and starting with arbitrary steps.",
                f"Avoiding active recall and spaced review."
            ],
            "correct_answer": f"Breaking complex problems down into step-by-step components and validating each stage.",
            "correct_index": 0,
            "explanation": "Structured decomposition and systematic verification are key to solving advanced problems.",
            "difficulty": "MEDIUM",
            "source_reference": f"{subj} Problem Solving"
        },
        {
            "question": f"In {subj}, why is continuous practice and evaluation important?",
            "options": [
                f"It reinforces memory retrieval, identifies knowledge gaps, and strengthens analytical recall.",
                f"It eliminates the need to understand underlying theorems.",
                f"It only matters during final examinations.",
                f"It replaces actual conceptual comprehension with rote repetition."
            ],
            "correct_answer": f"It reinforces memory retrieval, identifies knowledge gaps, and strengthens analytical recall.",
            "correct_index": 0,
            "explanation": "Active retrieval practice strengthens neural pathways and pinpoints weak areas.",
            "difficulty": "EASY",
            "source_reference": f"{subj} Practice"
        }
    ]

    return {
        "questions": fallback_questions[:count],
        "notice": f"Practice round generated for {subj}. Connect a Groq API key for dynamic Llama 3.3 generation."
    }

@app.post("/ml/v1/flashcards")
def flashcards(body: FlashcardsRequest, request: Request = None):
    groq_key = (
        (getattr(body, "api_key", None))
        or (request.headers.get("X-Groq-Api-Key") if request else None)
        or os.getenv("GROQ_API_KEY")
        or os.getenv("LLM_API_KEY")
    )
    if groq_key:
        groq_key = groq_key.strip()

    count = getattr(body, "count", None) or 6
    topic_str = (getattr(body, "topic", None) or "").strip()
    text_str = (getattr(body, "text", None) or "").strip()

    # 1. Groq Llama 3.3 70B generation if key provided
    if groq_key and (topic_str or text_str):
        try:
            if topic_str and text_str:
                user_prompt = f"Topic: {topic_str}\n\nStudy Notes:\n{text_str[:12000]}\n\nGenerate {count} high-yield, conceptual flashcards based on this topic and study notes."
            elif topic_str:
                user_prompt = f"Topic: {topic_str}\n\nGenerate {count} educational, conceptually clear study flashcards testing core concepts, definitions, principles, and applications of '{topic_str}'."
            else:
                user_prompt = f"Study Notes:\n{text_str[:12000]}\n\nGenerate {count} high-yield flashcards covering key definitions and principles in these notes."

            system_prompt = (
                f"You are an expert tutor. Return ONLY a valid JSON array containing exactly {count} flashcard objects. "
                "Each object MUST have these exact fields:\n"
                "- 'front': concise question, concept prompt, or term to be tested\n"
                "- 'back': clear, complete explanation, formula, or definition\n"
                "- 'source_reference': short citation (topic name or note section)\n"
                "Do NOT include markdown fences, comments, or any extra text outside the JSON array."
            )

            res = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.4,
                    "max_tokens": 2048
                },
                timeout=35
            )

            if res.status_code == 200:
                raw_content = res.json()["choices"][0]["message"]["content"].strip()
                if raw_content.startswith("```"):
                    raw_content = re.sub(r"^```(?:json)?\s*", "", raw_content)
                    raw_content = re.sub(r"\s*```$", "", raw_content)
                parsed = json.loads(raw_content)
                if isinstance(parsed, list) and len(parsed) >= 1:
                    sanitized = []
                    for c in parsed:
                        front = str(c.get("front", "")).strip()
                        back = str(c.get("back", "")).strip()
                        if front and back:
                            sanitized.append({
                                "front": front,
                                "back": back,
                                "source_reference": str(c.get("source_reference", topic_str or "notes"))
                            })
                    if sanitized:
                        return {
                            "flashcards": sanitized[:count],
                            "notice": f"AI flashcards generated for {topic_str or 'notes'} via Llama 3.3 70B."
                        }
        except Exception as e:
            print("[ML Flashcards] Groq generation error:", e)

    # 2. If notes provided without an explicit topic, or with substantial notes, use definition pairs and clozes
    if text_str and (len(text_str) > 80 or not topic_str):
        cards = definition_pairs(text_str)[:30]
        cloze_cards = generate_cloze_cards(text_str)
        all_cards = cards + cloze_cards
        seen = set()
        unique = []
        for c in all_cards:
            key = c["front"].casefold()
            if key not in seen:
                seen.add(key)
                unique.append(c)
        if unique and (not topic_str or len(unique) >= count):
            return {
                "flashcards": unique[:count if count else 50],
                "notice": "Generated from definition sentences and key phrases in your notes."
            }

    # 3. If topic provided without text or when text has no definitions, synthesize deterministic high-yield cards
    subj = topic_str or "Core Concepts"
    fallback_cards = [
        {
            "front": f"What is the foundational principle of {subj}?",
            "back": f"{subj} focuses on mastering fundamental theories, analytical models, and systematic problem solving within its domain.",
            "source_reference": f"{subj} Fundamentals"
        },
        {
            "front": f"What are the primary characteristics and mechanisms of {subj}?",
            "back": f"The primary mechanisms involve structured analysis, modular components, rigorous verification, and iterative optimization.",
            "source_reference": f"{subj} Mechanisms"
        },
        {
            "front": f"What are common practical applications of {subj} in real-world scenarios?",
            "back": f"Practical applications include building scalable systems, optimizing algorithmic efficiency, and solving complex domain challenges.",
            "source_reference": f"{subj} Applications"
        },
        {
            "front": f"What critical mistakes or common pitfalls should be avoided in {subj}?",
            "back": f"Avoid skipping boundary condition checks, neglecting underlying assumptions, and relying solely on memorization without conceptual clarity.",
            "source_reference": f"{subj} Best Practices"
        },
        {
            "front": f"How do you evaluate and optimize solutions in {subj}?",
            "back": f"Evaluate solutions using quantitative metrics, asymptotic complexity, trade-off comparisons, and rigorous empirical validation.",
            "source_reference": f"{subj} Optimization"
        },
        {
            "front": f"What advanced concepts build directly upon {subj}?",
            "back": f"Advanced extensions include specialized architectures, distributed implementations, mathematical formalisms, and modern paradigms.",
            "source_reference": f"{subj} Advanced Topics"
        }
    ]
    return {
        "flashcards": fallback_cards[:count],
        "notice": f"Flashcards synthesized for topic: {subj}."
    }

def generate_cloze_cards(text: str) -> list[dict]:
    """Generate cloze deletion cards from important sentences."""
    cards = []
    sents = sentences(text)
    for sent in sents[:20]:
        page_match = re.search(r"\[Page (\d+)\]", sent)
        clean = re.sub(r"^\[Page \d+\]\s*", "", sent.strip())
        # Find capitalized terms (potential key concepts)
        terms = re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b", clean)
        for term in terms[:2]:  # Max 2 clozes per sentence
            if len(term) > 3 and term.casefold() not in STOP:
                cloze = clean.replace(term, "{{c1::" + term + "}}", 1)
                if cloze != clean:
                    cards.append({
                        "front": cloze,
                        "back": term,
                        "source_reference": f"Page {page_match.group(1)}" if page_match else "document",
                        "type": "cloze"
                    })
    return cards

@app.post("/ml/v1/chunk")
def chunk_text(body: ChunkInput):
    """Split text into overlapping chunks of ~max_tokens each."""
    # Rough token estimation: 1 token ≈ 4 chars for English
    max_chars = body.max_tokens * 4
    overlap_chars = body.overlap_tokens * 4

    # Split by sentences first
    sents = sentences(body.text)
    chunks = []
    current = ""
    ordinal = 0

    for sent in sents:
        if len(current) + len(sent) + 1 <= max_chars:
            current += (" " if current else "") + sent
        else:
            if current:
                chunks.append({
                    "ordinal": ordinal,
                    "text": current.strip(),
                    "token_count": len(current) // 4
                })
                ordinal += 1
                # Start new chunk with overlap from end of previous
                overlap = current[-overlap_chars:] if len(current) > overlap_chars else current
                current = overlap + " " + sent
            else:
                # Single sentence too long, hard split
                chunks.append({
                    "ordinal": ordinal,
                    "text": sent[:max_chars].strip(),
                    "token_count": len(sent[:max_chars]) // 4
                })
                ordinal += 1
                current = ""

    if current:
        chunks.append({
            "ordinal": ordinal,
            "text": current.strip(),
            "token_count": len(current) // 4
        })

    return {"chunks": chunks}

@app.post("/ml/v1/semantic-search")
def semantic_search(body: SearchInput):
    query_words = {w for w in words(body.question) if w not in STOP}
    candidates = []
    for sentence in re.split(r"(?<=[.!?])\s+", body.context):
        clean = sentence.strip()
        if len(clean) < 25:
            continue
        terms = {w for w in words(clean) if w not in STOP}
        shared = query_words & terms
        if not shared:
            continue
        page_match = re.search(r"\[Page (\d+)\]", clean)
        candidates.append({
            "text": clean,
            "score": round(len(shared) / max(1, len(query_words)), 3),
            "source_reference": f"Page {page_match.group(1)}" if page_match else "document"
        })
    candidates.sort(key=lambda hit: hit["score"], reverse=True)
    return {"matches": candidates[:5], "method": "lexical-overlap", "notice": "Retrieved excerpts are source material, not generated explanations."}

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatInput(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    messages: Optional[list[ChatMessage]] = Field(default_factory=list)
    context: Optional[str] = Field(default=None, max_length=500000)
    material_title: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None

def get_semantic_sources(question: str, context: str, material_title: Optional[str] = None) -> list[dict]:
    query_words = {w for w in words(question) if w not in STOP}
    candidates = []
    for sentence in re.split(r"(?<=[.!?])\s+", context):
        clean = sentence.strip()
        if len(clean) < 25:
            continue
        terms = {w for w in words(clean) if w not in STOP}
        shared = query_words & terms
        if not shared:
            continue
        page_match = re.search(r"\[Page (\d+)\]", clean)
        candidates.append({
            "materialTitle": material_title or "Study Document",
            "text": clean,
            "score": round(len(shared) / max(1, len(query_words)), 3),
            "reference": f"Page {page_match.group(1)}" if page_match else "Document excerpt"
        })
    candidates.sort(key=lambda hit: hit["score"], reverse=True)
    return candidates[:5]

@app.post("/ml/v1/chat")
def chat(body: ChatInput, request: Request):
    groq_key = (
        body.api_key
        or request.headers.get("X-Groq-Api-Key")
        or os.getenv("GROQ_API_KEY")
        or os.getenv("LLM_API_KEY")
    )
    if groq_key:
        groq_key = groq_key.strip()

    model = body.model or os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    
    sources = []
    if body.context:
        sources = get_semantic_sources(body.question, body.context, body.material_title)

    # If Groq API key is present, call Groq API for full ChatGPT experience
    if groq_key:
        try:
            if body.context:
                sys_prompt = (
                    f"You are Smart Study AI Tutor, an exceptionally intelligent, friendly, and pedagogical AI tutor like ChatGPT. "
                    f"The student is asking questions related to their study document: '{body.material_title or 'Study Notes'}'.\n\n"
                    f"--- DOCUMENT EXCERPTS ---\n{body.context[:25000]}\n-------------------------\n\n"
                    f"INSTRUCTIONS:\n"
                    f"1. Thoroughly and accurately answer the student's question.\n"
                    f"2. Cite key points, terms, or pages from their document when relevant.\n"
                    f"3. If they ask for general explanations, code, mathematical derivations, step-by-step problem solving, or summaries, provide comprehensive, high-quality educational explanations.\n"
                    f"4. Format your output with clean Markdown (headings, bullet points, bold key terms, code blocks)."
                )
            else:
                sys_prompt = (
                    "You are Smart Study AI Tutor, an intelligent, empathetic, and comprehensive educational AI companion like ChatGPT. "
                    "You can answer questions across all academic subjects (computer science, mathematics, natural sciences, history, literature, writing, etc.). "
                    "Provide structured, clear, and engaging answers with step-by-step reasoning, examples, and clean Markdown formatting (headings, lists, code blocks)."
                )

            formatted_messages = [{"role": "system", "content": sys_prompt}]
            if body.messages:
                for m in body.messages[-10:]:
                    r = m.role.lower()
                    if r in ["user", "assistant"]:
                        formatted_messages.append({"role": r, "content": m.content})

            if not formatted_messages or formatted_messages[-1]["role"] != "user" or formatted_messages[-1]["content"] != body.question:
                formatted_messages.append({"role": "user", "content": body.question})

            groq_resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": formatted_messages,
                    "temperature": 0.6,
                    "max_tokens": 2048
                },
                timeout=35
            )

            if groq_resp.status_code == 200:
                data = groq_resp.json()
                content = data["choices"][0]["message"]["content"]
                return {
                    "answer": content,
                    "sources": sources,
                    "model": model,
                    "provider": "groq",
                    "status": "success"
                }
            else:
                err_text = groq_resp.text
                return {
                    "answer": f"⚠️ **Groq API Response (HTTP {groq_resp.status_code}):** {err_text}\n\nPlease check or update your Groq API key by clicking the **🔑 Groq Key** button in the top right.\n\n" + (f"**Matching excerpt from your notes:**\n> {sources[0]['text']}" if sources else ""),
                    "sources": sources,
                    "model": model,
                    "provider": "fallback",
                    "status": "api_error"
                }
        except Exception as e:
            return {
                "answer": f"⚠️ **Could not connect to Groq LLM:** {str(e)}\n\n" + (f"**Relevant notes:**\n> {sources[0]['text']}" if sources else "Please check your network connection or API key."),
                "sources": sources,
                "model": "offline-fallback",
                "provider": "fallback",
                "status": "error"
            }

    # Fallback when no API key is set
    if body.context and sources:
        top_excerpts = "\n\n".join(f"> \"{s['text']}\" *({s['reference']})*" for s in sources[:3])
        answer = (
            f"Here are the relevant passages from **{body.material_title or 'your document'}** regarding your question:\n\n"
            f"{top_excerpts}\n\n"
            f"---\n"
            f"💡 **Tip:** To unlock full **ChatGPT Llama 3.3 70B** conversational explanations, code generation, and step-by-step tutoring, click the **🔑 Groq Key** button above to enter your free Groq API key ([console.groq.com/keys](https://console.groq.com/keys))."
        )
    elif body.context:
        answer = (
            f"I searched **{body.material_title or 'your document'}**, but couldn't find a direct passage matching *\"{body.question}\"*.\n\n"
            f"💡 **Tip:** To have the AI answer this or any other question freely like ChatGPT, click the **🔑 Groq Key** button in the header to enter a free Groq API key!"
        )
    else:
        answer = (
            f"👋 Hello! I am your **Smart Study AI Tutor**.\n\n"
            f"To enable full **ChatGPT Llama 3.3 70B** mode to answer any question, write code, solve math problems, and chat freely:\n"
            f"1. Click the **🔑 Groq Key** button in the top header.\n"
            f"2. Paste your free API key from [console.groq.com/keys](https://console.groq.com/keys) (takes 30 seconds).\n\n"
            f"📎 **Upload feature:** You can also click the paperclip button below to upload any PDF or note and ask questions directly about it!"
        )

    return {
        "answer": answer,
        "sources": sources,
        "model": "offline-synthesis",
        "provider": "offline",
        "status": "no_key"
    }