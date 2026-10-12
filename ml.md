# Smart Study Portal — ML/NLP Specification

## 1. ML Goal

The ML layer converts raw study material into useful learning objects:

```text
Document
   ↓
Text extraction
   ↓
Cleaning/chunking
   ↓
Topic detection
   ↓
Summary
   ↓
Keywords/concepts
   ↓
Questions/flashcards
   ↓
Difficulty & mastery signals
   ↓
Personalized recommendations
```

The ML system should be designed as an assistive layer. It must not silently present uncertain AI output as guaranteed fact.

---

## 2. Recommended ML Stack

- Python 3.11+
- FastAPI
- Pydantic
- PyMuPDF/pdfplumber for PDF extraction
- spaCy for NLP utilities
- scikit-learn for classical ML
- sentence-transformers for embeddings
- Optional LLM provider for advanced summarization/question generation
- FAISS or a vector database if semantic search is required

The project can begin with deterministic/classical NLP and add an LLM later.

---

## 3. ML Service API

```http
POST /ml/v1/extract
POST /ml/v1/summarize
POST /ml/v1/topics
POST /ml/v1/keywords
POST /ml/v1/questions
POST /ml/v1/flashcards
POST /ml/v1/semantic-search
GET  /ml/v1/health
```

The ML service should not directly manage authentication or user permissions. Spring Boot remains the system-of-record API.

---

## 4. Document Processing

### Step 1 — Detect document type

Supported initial formats:

- PDF
- TXT
- DOCX

### Step 2 — Extract text

Capture:

- Page number
- Paragraph
- Heading
- Tables when extraction quality permits

### Step 3 — Clean

- Remove repeated headers/footers
- Normalize whitespace
- Detect duplicate content
- Preserve important headings
- Identify OCR-required pages

### Step 4 — Chunk

Split long content into semantically meaningful chunks.

Avoid arbitrary cuts in the middle of a sentence where possible.

---

## 5. Summarization

Provide multiple levels:

```text
Quick Summary
Standard Summary
Detailed Summary
```

For every summary, preserve:

- Important definitions
- Formulas
- Named concepts
- Relationships
- Important warnings/exceptions

Where possible, store source-page references so the student can verify the summary against the original material.

---

## 6. Topic Extraction

Possible approach:

1. Detect headings.
2. Extract candidate noun phrases/keyphrases.
3. Generate embeddings.
4. Cluster related concepts.
5. Merge duplicate topic names.
6. Rank topics using frequency, document position, heading structure, and semantic relevance.

Output:

```json
{
  "topic": "Normalization",
  "importance": 0.91,
  "difficulty": 0.68,
  "source_pages": [4, 5, 6]
}
```

These values are estimates, not objective truths.

---

## 7. Keyword Extraction

Use:

- TF-IDF
- KeyBERT-style embedding similarity
- spaCy noun chunks
- Named entities where useful

Return both:

- keyword
- supporting source location

---

## 8. Quiz Generation

Generate:

- Multiple choice
- True/false
- Short answer
- Fill in the blank

Each generated question should contain:

```text
question
options
correct_answer
explanation
difficulty
source_reference
```

### Quality controls

Reject or flag questions when:

- Answer is ambiguous
- Explanation conflicts with source material
- Correct answer is not supported by the source
- Options contain obvious formatting errors
- Duplicate questions are detected

---

## 9. Flashcards

Generate:

```text
Front: What is normalization?
Back: ...
Source: Page 5
Topic: DBMS
```

Support manual editing because AI-generated cards may require correction.

---

## 10. Personalized Recommendation Engine

Inputs:

- Quiz results
- Topic accuracy
- Completion behavior
- Review history
- Upcoming exam
- Available study time

Outputs:

- Next topic
- Review topics
- Recommended quiz
- Suggested study duration

Do not use opaque recommendations when a simple explanation can be shown to the student.

Example:

> Review "Normalization" because your last two attempts were below your target accuracy.

---

## 11. Spaced Repetition

A future version can implement an SM-2-inspired or FSRS-style review model.

Basic states:

```text
New → Learning → Review → Mature
```

Store:

- last reviewed
- next review
- recall quality
- interval
- difficulty estimate

---

## 12. Retrieval-Augmented AI Tutor

An advanced feature:

```text
Student Question
      ↓
Query embedding
      ↓
Retrieve relevant chunks
      ↓
LLM receives only relevant approved context
      ↓
Answer + source references
```

The tutor should say when the uploaded material does not contain enough information.

---

## 13. ML Evaluation

Create a test dataset containing representative study material.

Measure:

### Summaries
- Factual consistency
- Coverage
- Human usefulness

### Questions
- Answer correctness
- Source support
- Ambiguity rate
- Duplicate rate

### Topic extraction
- Precision
- Recall
- Human agreement

### Recommendations
- Completion rate
- Improvement after recommendation
- Student feedback

Avoid claiming model accuracy without a defined evaluation dataset and metric.

---

## 14. Privacy

- Do not use student documents for model training without appropriate consent and policy.
- Minimize stored raw content.
- Support deletion.
- Keep access controls outside the ML service.
- Log model/version information for reproducibility.
- Avoid sending unnecessary personal data to third-party AI APIs.

---

## 15. ML Features to Add Later

- OCR for scanned PDFs
- Diagram/image understanding
- Handwritten-note extraction
- Multilingual summaries
- Kannada/English study support
- Voice question answering
- Pronunciation support
- Concept graphs
- Automatic exam-paper analysis
- Adaptive difficulty
- Knowledge tracing
- Personalized revision predictions

