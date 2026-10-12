# Smart Study Portal — Architecture & Implementation Decisions

**Format:** Date | Decision | Alternatives Considered | Reason

---

## 2026-10-12 | Java Toolchain: Pinned to Java 21 LTS (not 25)

**Alternatives:** Java 25 (latest), Java 17 LTS  
**Reason:** The docs mentioned "21 / 25"; Spring Boot 3.4.x officially supports Java 21 LTS as the baseline. Java 25 is not an LTS and may introduce instability. Java 17 is nearing end of premier support. All Dockerfiles, `pom.xml`, and CI will use `eclipse-temurin:21-jdk` / `eclipse-temurin:21-jre`.

---

## 2026-10-12 | Database: MySQL 8.4 LTS via Docker (not MariaDB, not managed cloud for dev)

**Alternatives:** MariaDB 11.x, PostgreSQL 16, PlanetScale, Neon  
**Reason:** Flyway migrations use MySQL-specific syntax (e.g., `MEDIUMTEXT`, `AUTO_INCREMENT`, backticks). MySQL 8.4 is LTS. Docker provides reproducible local dev. Production can swap to managed MySQL (RDS, Cloud SQL) with same connection string.

---

## 2026-10-12 | ML Worker: Internal-only network + shared secret header (`X-Internal-Token`)

**Alternatives:** mTLS, OAuth2 client credentials, no auth (trust internal network)  
**Reason:** Simplicity for modular monolith. The ML worker has no user context; Spring Boot is the security boundary. A shared secret (`ML_INTERNAL_TOKEN`) verified on every request (except `/health`) prevents accidental exposure. In prod compose, ML port is not published.

---

## 2026-10-12 | Session: HttpOnly cookie + `token_version` for revocation (not JWT in localStorage, not Redis session store)

**Alternatives:** JWT in localStorage + refresh token rotation, Spring Session + Redis, opaque session IDs in DB  
**Reason:** HttpOnly cookie mitigates XSS token theft. Stateless JWT avoids Redis dependency for sessions. `token_version` (integer column on `users`) allows instant invalidation on logout/password change/admin deactivation without a denylist table. Cost: one extra DB read per request (negligible with PK lookup).

---

## 2026-10-12 | File Storage: Local filesystem default (`./uploads`), S3/MinIO via `StorageService` interface

**Alternatives:** Direct S3 only, database BLOBs, Azure Blob, GCS  
**Reason:** Local default works for single-node dev and simple VPS deployments. Interface allows swapping to S3-compatible (MinIO, AWS S3, R2) without code changes. `STORAGE_BACKEND=local|s3` env var controls implementation.

---

## 2026-10-12 | Job Queue: DB-backed `processing_jobs` table (not Redis/RabbitMQ/Celery initially)

**Alternatives:** Redis + BullMQ, RabbitMQ + Spring AMQP, Celery + Redis, Temporal  
**Reason:** Zero extra infrastructure for MVP. `SELECT … FOR UPDATE SKIP LOCKED` on MySQL 8 provides reliable claiming. Interface `JobQueue` allows future swap. Virtual threads (Java 21) handle concurrency efficiently. No separate worker process needed — the same Spring Boot app processes jobs.

---

## 2026-10-12 | Timezone Handling: Per-user IANA timezone stored on `users.timezone` (default `Asia/Kolkata`)

**Alternatives:** Server timezone only (UTC), browser-only computation, fixed offset  
**Reason:** "Today", streaks, due flashcards, daily buckets, and plan ranges must align with the user's local day. Storing IANA zone (e.g., `America/New_York`) handles DST correctly. Set from `Intl.DateTimeFormat().resolvedOptions().timeZone` at registration; editable in Settings.

---

## 2026-10-12 | Spaced Repetition: 4 ratings (Again, Hard, Good, Easy) per Appendix A spec

**Alternatives:** 3 ratings (Hard/Good/Easy) as in current code, 5 ratings (Anki-style), FSRS  
**Reason:** Appendix A in the master prompt specifies 4 ratings with explicit formulas. The current code uses 3 ratings (quality 1/2/3) with a different formula. We will migrate to 4 ratings (0=Again, 1=Hard, 2=Good, 3=Easy) and update the SM-2 variant accordingly. This is a breaking change for existing cards; a migration will reset `review_count=0` for all cards.

---

## 2026-10-12 | Demo Mode: Explicit `/demo/*` route group (not silent fallback for authenticated users)

**Alternatives:** Keep silent fallback, feature flag `NEXT_PUBLIC_DEMO_MODE`, separate demo deployment  
**Reason:** Silent fallback is a security/UX bug (real users see fake "Alex" data). Explicit demo routes make it impossible to accidentally enter demo mode while logged in. The banner "Preview — sample data" is always visible. No network writes in demo mode.

---

## 2026-10-12 | Error Format: RFC 7807 `application/problem+json` with stable `code` field

**Alternatives:** Spring Boot default error format, custom envelope, GraphQL-style errors  
**Reason:** RFC 7807 is standard, machine-readable, and the frontend can map stable `code` values to user-friendly messages (e.g., `VALIDATION_ERROR`, `UNAUTHORIZED`, `QUOTA_EXCEEDED`). Includes `traceId` for correlation with logs.

---

## 2026-10-12 | OpenAPI: springdoc-openapi in dev; protected/disabled in prod; TS types generated for frontend

**Alternatives:** Manual TypeScript types, no OpenAPI, Swagger UI always on  
**Reason:** Contract-first prevents drift. Generating TS types in CI and failing on drift ensures backend/frontend sync. Prod protection avoids exposing API surface.

---

## 2026-10-12 | Parent Link: Uniform responses (no email enumeration); status `PENDING` → `APPROVED` → `REVOKED`

**Alternatives:** Reveal if email exists, only `PENDING`/`APPROVED`/`REJECTED`, student-only revoke  
**Reason:** Privacy: parent linking by email must not reveal which emails are registered. Uniform "If an account exists, a link request has been sent" response. Either party can revoke an approved link (new `REVOKED` status) — supports custody changes, student autonomy.

---

## 2026-10-12 | First Admin Bootstrap: `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD` env vars (not manual SQL)

**Alternatives:** Manual SQL, first-register-gets-admin, invite token  
**Reason:** Safe, automated, auditable. Only runs if **no admin exists** at startup. Password never logged. Documented in `ENVIRONMENT.md` and `DEPLOYMENT.md`.

---

## 2026-10-12 | OCR: Tesseract via `pytesseract` + PyMuPDF rendering (not EasyOCR, not cloud OCR)

**Alternatives:** EasyOCR, PaddleOCR, Google Cloud Vision, AWS Textract  
**Reason:** Tesseract is mature, supports 100+ languages, runs offline, small Docker footprint (`apt-get install tesseract-ocr`). `OCR_ENABLED` flag and `OCR_LANGS` (default `eng`) make it optional. Good enough for scanned lecture notes.

---

## 2026-10-12 | Embeddings: `sentence-transformers/all-MiniLM-L6-v2` (384-dim) with `EMBEDDINGS_ENABLED` flag

**Alternatives:** Larger models (BGE, E5), OpenAI embeddings, Cohere, no embeddings (BM25 only)  
**Reason:** MiniLM-L6-v2 is fast (runs on CPU), small (~90 MB), good quality for semantic search. Pre-downloaded at image build. `EMBEDDINGS_ENABLED=false` falls back to BM25-only retrieval (current behavior). No GPU required.

---

## 2026-10-12 | LLM Provider Abstraction: `none` | `anthropic` | `openai` | `ollama`

**Alternatives:** Only one provider, LangChain, custom per-provider code  
**Reason:** Provider abstraction allows local development with `none` (deterministic excerpts, no API costs) and production with any compatible provider. `LLM_PROVIDER` env var selects implementation. Model IDs verified against current provider docs (e.g., `claude-3-5-sonnet-20241022` for Anthropic).

---

## 2026-10-12 | Tutor Grounding: Retrieve → threshold check → if below: refuse (no LLM call) → else call with chunks only

**Alternatives:** Always call LLM with full document, RAG with vector DB, fine-tuned model  
**Reason:** Cost control (no LLM call when answer not in notes), privacy (chunks only, not full docs), safety (refusal when unsupported). Threshold tuned via `TUTOR_RETRIEVAL_THRESHOLD` (default 0.35 cosine/BM25 score). Prompt-injection defense: delimit document text, ignore instructions inside it.

---

## 2026-10-12 | Rate Limiting: Bucket4j in-memory (interface ready for Redis)

**Alternatives:** Spring Cloud Gateway, Redis + custom filter, Nginx rate limiting, no rate limiting  
**Reason:** Bucket4j is lightweight, no extra infra for dev, expressive API (bandwidth, tokens, per-key). Interface `RateLimiter` allows Redis-backed implementation later. Auth endpoints: 5/min per IP+email. Uploads: 10/hour/user. Tutor/LLM: daily per user. Global: 100/min per IP.

---

## 2026-10-12 | Security Headers: CSP with nonces for inline scripts (Next.js), HSTS in prod

**Alternatives:** No CSP, CSP with `unsafe-inline`, Helmet.js (Node), Spring Security headers only  
**Reason:** Next.js requires some inline scripts (hydration, `_next/static`). Nonce-based CSP allows this safely. HSTS (1 year, includeSubDomains, preload) in prod. `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(), microphone=()`, `X-Frame-Options: DENY`.

---

## 2026-10-12 | CI: GitHub Actions with separate `ci.yml` and `security.yml`

**Alternatives:** GitLab CI, CircleCI, Jenkins, single workflow  
**Reason:** GitHub Actions is free for public repos, integrates with Dependabot/CodeQL. Separate workflows: `ci.yml` runs on every PR (fast feedback), `security.yml` runs nightly + on schedule (audits, Trivy, gitleaks, CodeQL). Fail fast, cache dependencies, upload artifacts.

---

## 2026-10-12 | Test Strategy: Testcontainers for backend integration (real MySQL), pytest for ML, Vitest+RTL for frontend, Playwright for E2E

**Alternatives:** H2 for backend tests, mock ML service, Cypress for E2E, no E2E  
**Reason:** Testcontainers gives real MySQL behavior ( Flyway, indexes, constraints, timezone). ML tests with real PyMuPDF/fitz ensure extraction works. Playwright tests real browser against real stack in CI. No mocks in integration paths.

---

## 2026-10-12 | Coverage Targets: Backend service layer ≥75%, ML ≥80%, Frontend critical components/hooks ≥70%

**Alternatives:** 100% everywhere, no targets, only line coverage  
**Reason:** Pragmatic targets focusing on business logic (services, algorithms) not boilerplate (getters, DTOs). Branch coverage tracked but not gated. CI fails if thresholds drop.

---

## 2026-10-12 | Lighthouse Targets: ≥90 Perf/Accessibility/Best Practices/SEO on `/` and `/login`; ≥90 Accessibility on auth pages

**Alternatives:** No Lighthouse gate, lower thresholds, only Accessibility  
**Reason:** The design system (dark green surfaces, lime accent, glass cards) must remain performant and accessible. Landing and login are public entry points — they must score high. Auth pages need high Accessibility for inclusive login/register/reset flows.

---

## 2026-10-12 | Legal Pages: `/privacy` and `/terms` with draft content; flagged for legal review in `HUMAN_ACTIONS.md`

**Alternatives:** No legal pages, link to external ToS, minimal placeholder  
**Reason:** The app serves students (may be minors) and has a parent-link feature. India's DPDP Act and other regulations require proper privacy policy and terms. Draft content provides a starting point; `HUMAN_ACTIONS.md` explicitly notes legal review is required before production launch.