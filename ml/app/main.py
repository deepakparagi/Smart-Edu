from collections import Counter
from io import BytesIO
import re
import os
from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Header, Depends
from pydantic import BaseModel, Field
import hashlib

app = FastAPI(title="Smart Study NLP", version="0.2.0")

# Internal auth
ML_INTERNAL_TOKEN = os.getenv("ML_INTERNAL_TOKEN", "")
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
    if not ML_INTERNAL_TOKEN:
        raise HTTPException(500, "ML_INTERNAL_TOKEN not configured on server")
    if x_internal_token != ML_INTERNAL_TOKEN:
        raise HTTPException(401, "Invalid internal token")

# Apply auth to all endpoints except health
@app.middleware("http")
async def auth_middleware(request, call_next):
    if request.url.path in ["/ml/v1/health", "/docs", "/openapi.json", "/redoc"]:
        return await call_next(request)
    token = request.headers.get("X-Internal-Token")
    if token != ML_INTERNAL_TOKEN:
        return HTTPException(401, "Invalid internal token").__call__(request, call_next)
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
                "heading": None  # Could be enhanced with font analysis
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

@app.post("/ml/v1/questions")
def questions(body: TextInput):
    pairs = definition_pairs(body.text)[:12]
    if len(pairs) < 2:
        return {"questions": [], "notice": "At least two clear definition statements are needed to create source-grounded multiple-choice questions."}
    questions_list = []
    for index, pair in enumerate(pairs):
        distractors = [p["back"] for j, p in enumerate(pairs) if j != index][:3]
        # Need at least 1 distractor (2 options total) to make a valid MCQ
        if len(distractors) < 1:
            continue
        options = [pair["back"], *distractors]
        # Shuffle options deterministically based on term hash
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
    return {"questions": questions_list, "notice": "Draft questions generated from definition sentences. Verify them against the uploaded source."}

@app.post("/ml/v1/flashcards")
def flashcards(body: TextInput):
    cards = definition_pairs(body.text)[:30]
    # Also generate cloze deletions from key sentences
    cloze_cards = generate_cloze_cards(body.text)
    all_cards = cards + cloze_cards
    # Deduplicate
    seen = set()
    unique = []
    for c in all_cards:
        key = c["front"].casefold()
        if key not in seen:
            seen.add(key)
            unique.append(c)
    return {"flashcards": unique[:50], "notice": "Generated from definition sentences and key phrases. Review and edit each card before studying."}

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