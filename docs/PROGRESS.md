# Smart Study Portal — Production Hardening Progress Tracker

**Started:** 2026-10-12  
**Branch:** `production-hardening`  
**Target:** All items checked (Definition of Done in CLAUDE_CODE_MASTER_PROMPT.md §2)

---

## Phase 0 — Audit & Baseline

- [x] Read all spec docs, source, migrations, configs; verify versions resolve
- [x] Run all existing build/test/lint commands; record baseline in `docs/AUDIT.md`
- [x] Boot real stack (MySQL via Docker, ML, backend, frontend); exercise every endpoint
- [x] Create `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/HUMAN_ACTIONS.md`, `docs/AUDIT.md`
- [x] Create branch `production-hardening`
- [x] **Verify suspected defects #1–12** (see CLAUDE_CODE_MASTER_PROMPT §3.1)
- [x] **Verify UI defects** (see CLAUDE_CODE_MASTER_PROMPT §3.2)

---

## Phase 1 — Make It Truly Live

- [x] `docker-compose.yml` as single dev entry point (mysql, ml, backend, frontend, mailpit)
- [x] `depends_on: condition: service_healthy` for all services
- [x] Complete, commented `.env.example`; document every variable in `docs/ENVIRONMENT.md`
- [x] Dockerfiles for backend and frontend (multi-stage, non-root, healthcheck, .dockerignore)
- [x] Flyway V1–V8 apply cleanly on empty MySQL 8.4; add V9+ for new changes
- [ ] Migration test (empty DB → latest, via Testcontainers)
- [x] Seed data (dev profile only): demo student/parent/admin + sample materials
- [x] Frontend data layer: typed API client (credentials: include, base URL from env, uniform error parsing, 401→login)
- [x] TanStack Query + zod for caching, retries, mutations
- [x] Smoke test full journey by hand and browser automation (`docs/QA_TEST_REPORT.md`)
- [x] Comprehensive End-to-End Issue Audit and Resolution (`docs/ISSUE_TRACKER.md`)

---

## Phase 2 — Backend Completeness & Hardening

### 2.1 API Conventions
- [ ] RFC 7807 `application/problem+json` errors (code, message, fieldErrors, traceId)
- [x] Bean Validation on every request DTO; reject unknown/oversized payloads
- [x] Pagination (page, size, sort, capped) on every list endpoint; fix N+1
- [ ] OpenAPI via springdoc (dev enabled, prod protected); generate TS types; CI drift check
- [x] Optimistic locking (`@Version`) on mutable aggregates (tasks, flashcards)
- [x] All times stored as UTC `Instant`; user-facing dates computed in user's timezone

### 2.2 Auth & Accounts
- [x] Password reset: `POST /auth/forgot-password` (always 200), `POST /auth/reset-password`
- [x] Tokens: random, stored hashed (SHA-256), 30–60 min TTL, single-use, rate-limited
- [x] Email via Spring Mail (Mailpit in dev); pages: `/forgot-password`, `/reset-password`
- [x] Email verification (token flow) with resend endpoint; unverified users can use app with banner
- [x] Change password (requires current password) + invalidate all sessions via `users.token_version`
- [x] Logout invalidates server-side (version bump or jti denylist with expiry cleanup)
- [x] Account deletion + data export (student's own data as JSON); delete DB rows AND stored files
- [ ] Brute-force protection: per IP + per email limits, constant-time responses
- [x] Account `enabled` flag (admin can deactivate)

### 2.3 Materials Lifecycle
- [x] `DELETE /materials/{id}` removes DB rows (material, chunks, derived quizzes/flashcards per FK) AND stored file; idempotent; ownership-checked
- [x] `GET /materials`, `GET /materials/{id}` (summary, topics, keywords, status, error, page count)
- [x] `GET /materials/{id}/text` (paginated), `POST /materials/{id}/reprocess`
- [x] `GET /materials/{id}/file` (owner-only download with Content-Disposition, X-Content-Type-Options: nosniff)
- [x] Search: `GET /materials/search?q=` over user's own text (MySQL FULLTEXT on chunks) → snippets with page numbers
- [x] Persist chunks: `material_chunks(material_id, ordinal, page, heading, text, token_count, embedding NULLABLE)`
- [x] Per-user storage quota and per-file limits (configurable); friendly 4xx messages

### 2.4 Planning, Focus, Progress (Correctness)
- [ ] Planner spec (Appendix B): idempotent regen, daily cap never exceeded, carry-over, spaced review, manual tasks preserved, 422 when no materials
- [x] Add `users.timezone` (IANA, default `Asia/Kolkata`, set from browser at registration, editable in Settings)
- [ ] Use timezone for: "today", due flashcards, streaks, daily/weekly buckets, plan ranges
- [ ] Focus sessions: server-side timestamps; exactly one active session/user; auto-close stale (cap 4h); `GET /focus/active` to restore; optional auto-complete linked task
- [ ] Progress: `GET /progress/overview` and `/trends` with streak, weekly focus time, quiz accuracy, task completion, flashcard retention, **weak topics** (per-topic quiz accuracy, lowest first); SQL with indexes; tests with fixed clocks across TZ/DST

### 2.5 Parent & Admin
- [ ] Parent: link request by email with **uniform responses**; student approves/rejects; either side can revoke (status `REVOKED`); aggregate-only view
- [ ] Parents **cannot** read materials, text, chat, quiz answers, flashcards (server-side enforced + tests)
- [ ] Admin: paginated/searchable user list, role change (guard: cannot demote/disable last admin or self), deactivate/reactivate, aggregate overview
- [x] `audit_log` table (actor, action, target, ip, time) for role changes, deactivations, deletions, link changes, logins/failed logins; admin audit view with pagination
- [ ] First-admin bootstrap: if `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD` set and no admin exists, create/promote once at startup; never log password

### 2.6 Flashcards
- [x] Full CRUD: create, edit, delete, list/filter (by material, due, search); optional deck/tag
- [x] Generation de-duplicates against existing cards
- [x] Review endpoint implements Appendix A (4 ratings) + records review history (`flashcard_reviews`) for retention analytics

---

## Phase 3 — Frontend Feature Completeness

### 3.1 App Shell & Routing
- [ ] Route groups: `(marketing)`, `(auth)`, `(app)` with shared shell
- [ ] Next middleware guards routes by cookie presence; server verifies session; role-based nav/redirects; 404/500/not-authorized pages

### 3.2 Pages to Build or Complete
- [ ] **Materials** (`/materials`, `/materials/[id]`): drag-drop multi-file upload + progress, client validation, live status (poll/SSE), retry, delete, reprocess; detail with summary (labeled "Draft — verify"), topics, keywords, extracted-text viewer with page markers, search within material, "Generate quiz/flashcards/tasks" actions
- [ ] **Tasks/Planner**: create/edit/delete forms, filters (today/week/all/completed), real plan range, regenerate with preview, overdue/carry-over indicators
- [ ] **Focus**: timestamp-based timer (no drift; survives refresh/sleep/throttling); resume active session on reload; show running time in `document.title`; Pomodoro presets; task link; session notes; history with real durations
- [ ] **Quizzes**: list, generate (choose material + count), runner, results/review, history
- [ ] **Flashcards**: queue, flip, 4-button rating with interval preview ("Good → 3 days"), create/edit/delete, search, per-material filter
- [ ] **AI Tutor**: streaming answers, citations, conversation rename/delete, modes "Explain simply"/"Quiz me on this"
- [ ] **Progress**: fixed pluralization, remove redundant metrics, add streak/weak-topics, true empty state for 0-min days, bar chart text alternatives
- [ ] **Parent** (`/parent`): link by email (generic confirmation), pending/approved lists, per-student weekly consistency, revoke
- [ ] **Admin** (`/admin`): users table (search, pagination, role/active controls), overview, audit log
- [ ] **Settings** (`/settings`): name, timezone, default daily minutes, change password, verify email, export data, delete account
- [ ] **Legal**: `/privacy`, `/terms` with draft content; footer links; note in `HUMAN_ACTIONS.md` for legal review (DPDP Act, minors)

---

## Phase 4 — ML / AI Upgrade (`ml/`)

- [x] **Extraction**: keep `[Page N]` markers; remove headers/footers; fix hyphenation/whitespace; detect headings; handle encrypted/corrupt files with clear error codes; per-file time/page limits
- [ ] **OCR fallback** (Tesseract via `pytesseract` + PyMuPDF rendering) for low-text pages; languages configurable (`OCR_LANGS`, default `eng`); install Tesseract in Docker; `OCR_ENABLED` flag
- [x] **Chunking**: ~300–500 token passages with overlap, carrying `page` and `heading`; returned to backend for `material_chunks` persistence
- [ ] **Keywords/topics**: phrase-aware (TF-IDF/RAKE/YAKE), stop-word handling, importance ∈ [0,1], stable ordering
- [ ] **Summary**: extractive (TextRank/MMR), length-controlled, always flagged draft; optional abstractive with LLM provider, still flagged draft
- [x] **Questions**: broaden definition detection (`is/are/means/refers to/is defined as/is called/known as/termed`, "Term: definition", parenthetical abbreviations); both directions; distractors from same material, similar type/length, de-duplicated, never substring; randomized answer positions (seeded for tests); return `explanation`, `source_reference`, difficulty; if too few valid items, return what exists + clear message (never filler); optional LLM must pass grounding check or be discarded
- [x] **Flashcards**: definition cards + cloze deletions from key sentences; include `source_reference`
- [ ] **Retrieval**: hybrid BM25 + optional embeddings (`sentence-transformers/all-MiniLM-L6-v2`, `EMBEDDINGS_ENABLED`); top-k chunks with page, heading, score; works (BM25 only) when embeddings disabled; pre-download models at image build
- [x] **Internal auth**: every endpoint except health requires `X-Internal-Token` = `ML_INTERNAL_TOKEN`; run as non-root; no public port in prod compose

### 4.5 Source-Grounded AI Tutor
- [ ] Provider abstraction `LLMProvider`: `none` (deterministic excerpt), `anthropic`, `openai`-compatible, `ollama`; configure via `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`
- [ ] Flow: Spring auth + ownership → retrieve top-k chunks → if best score < threshold: "I couldn't find this in your notes" (no LLM call) → else call provider with only retrieved chunks
- [ ] Prompt: answer only from passages; cite `[Page N]`/chunk ids; say when insufficient; low temp; token caps; treat doc text as untrusted (delimit; ignore instructions inside — prompt-injection defense)
- [ ] Post-check: every citation references retrieved chunk; strip/flag unsupported claims; store `sources_json` per message
- [ ] UX: streaming (SSE) through Spring → UI; conversation rename/delete; per-user daily request/token limits (`LLM_DAILY_LIMIT_PER_USER`); modes "Explain simply"/"Quiz me on this"
- [ ] Tests: unit tests for grounding/refusal logic using fake provider; never call real providers in CI

---

## Phase 5 — Frontend Quality

### 5.1 Demo Mode vs Real Mode
- [ ] Real mode: API failure → typed error UI (retry, status text); 401 → login; offline banner; **never** fake data for authenticated users
- [ ] Demo mode: explicit `/demo/*` route group (or `NEXT_PUBLIC_DEMO_MODE=true`); persistent "Preview — sample data" banner; no network writes; landing "Explore preview" links here; keep `demo-data.ts` only for this

### 5.2 Experience
- [ ] Every data view: loading skeletons, empty states with CTA, error states; toasts for mutations; optimistic updates for task toggles + flashcard ratings with rollback
- [ ] Forms: react-hook-form + zod, inline field errors, disabled-while-submitting, double-submit protection
- [ ] Responsive at 360, 768, 1280, 1920 px; no horizontal scroll; sidebar→drawer on mobile
- [ ] Dates/numbers via `Intl` using user's timezone/locale

### 5.3 Accessibility, SEO, Performance
- [ ] WCAG 2.2 AA: contrast of muted labels/eyebrows, visible `:focus-visible`, skip-to-content, semantic landmarks/headings, labelled inputs, `aria-live` for toasts/timer, `prefers-reduced-motion` support, keyboard-operable quiz/flashcards
- [ ] Metadata API, Open Graph/Twitter images, `sitemap.xml`, `robots.txt`, favicon/manifest, canonical URLs
- [ ] `next/font`, no layout shift, dynamic-import heavy code, bundle analysis, remove dead weight
- [ ] Security headers/CSP; render AI/user text safely (no `dangerouslySetInnerHTML` on untrusted content)

---

## Phase 6 — Scalability & Reliability

### 6.1 Durable Job Queue (replace `@Async`)
- [ ] Table `processing_jobs(id, type, payload, status, attempts, max_attempts, run_after, locked_by, locked_until, last_error, created_at, updated_at)`
- [ ] Workers claim with `SELECT … FOR UPDATE SKIP LOCKED`, lease with `locked_until`, exponential backoff retry, move to `DEAD` after max attempts, idempotent
- [ ] Hide behind `JobQueue` interface (Redis/RabbitMQ replaceable later)
- [ ] On startup: expired leases re-claimed (no blind re-submit)
- [ ] Virtual threads or bounded pool; expose queue depth as metric
- [ ] Material status transitions consistent under crashes; test by killing worker mid-job

### 6.2 Storage Abstraction
- [ ] `StorageService` interface with `LocalStorage` (default) and `S3Storage` (S3/MinIO via `STORAGE_BACKEND=s3`)
- [ ] Streamed uploads/downloads, deletion on material/account removal, MinIO in optional compose profile
- [ ] Optional ClamAV scan hook (compose profile `scan`)

### 6.3 Rate Limiting & Abuse Control
- [ ] Bucket4j (in-memory, interface ready for Redis): auth endpoints strict (5/min per IP+email), uploads (10/hour/user), tutor/LLM (daily), global per-IP
- [ ] Return `429` with `Retry-After`; correct client-IP behind reverse proxy (`X-Forwarded-For` trust config)

### 6.4 Performance
- [ ] Index review with `EXPLAIN` on hot queries; connection pool tuning (HikariCP); response compression; HTTP caching for static assets; avoid loading `LONGTEXT` unless needed
- [ ] Load-test script (k6) + results in `docs/PERFORMANCE.md`; fix hot spots

---

## Phase 7 — Security Hardening Checklist

- [ ] Prod profile refuses boot with weak/default `JWT_SECRET` (<32 chars or known default), `COOKIE_SECURE=false`, wildcard CORS, missing `ML_INTERNAL_TOKEN`
- [ ] Cookie: `HttpOnly`, `Secure` (prod), `SameSite=Lax`, scoped `Path`/`Domain`; document deployment topology
- [ ] CSRF protection: `Origin`/`Referer` validation + custom header or double-submit token; CORS limited to `WEB_ORIGIN`
- [ ] Authorization on **every** endpoint via ownership checks in service layer (not just controller annotations); no IDOR; parents/admins cannot read private content
- [ ] Session invalidation (`token_version`), short-lived tokens, sliding renewal policy documented; BCrypt strength 12; password policy (≥10 chars, deny common passwords)
- [ ] Upload hardening: random storage keys, no path traversal, safe filenames, size/page/entry limits, extraction time/memory limits; ML worker resource limits
- [ ] Security headers on frontend and API: CSP (no unsafe-inline where feasible, nonces), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`, HSTS (prod)
- [ ] Input validation + output encoding everywhere; parameterized queries only; no stack traces/secrets in responses/logs; PII-aware logging
- [ ] Secrets only via env/secret store; `.env` git-ignored; `gitleaks` in CI
- [ ] Prompt-injection defenses for tutor; cap on retrieved context size
- [ ] Dependency policy: latest patched stable versions (Spring Boot 3.4.x/3.5.x, Next.js, React, FastAPI, PyMuPDF, etc.); run audits; enable Dependabot/Renovate
- [ ] Write `SECURITY.md` (threat model, reporting process) and `docs/SECURITY_REVIEW.md` (what checked, results)

---

## Phase 8 — Testing & CI

- [ ] **Backend**: unit tests (services, SM-2, planner, focus, token); `@DataJpaTest`/slice tests; **Testcontainers MySQL** integration tests for every controller; migration test; clock-injected tests for TZ/DST/streak; job-queue crash/retry tests
- [ ] **Authorization matrix** (generated/table-driven): every endpoint × {anonymous, student owner, other student, parent unlinked, parent linked & approved, parent revoked, admin} → expected 2xx/401/403/404; explicitly assert parents get nothing from materials, tutor, quiz answers, flashcards
- [ ] **ML**: `pytest` with fixture PDFs (text, scanned, encrypted, corrupt, multi-page), DOCX, TXT (UTF-8 + bad bytes); golden tests for extraction, questions, flashcards, retrieval; OCR test when enabled
- [ ] **Frontend**: Vitest + RTL for critical components/hooks (API client, forms, flashcard queue, quiz runner, focus timer with fake timers); `axe` checks on key pages
- [ ] **E2E (Playwright)**: full journey (section 2) against `docker compose` in CI with fixture files in `e2e/fixtures/`; mobile viewport smoke tests; screenshot sanity for §3.2 UI defects
- [ ] **CI** (`.github/workflows/`): `ci.yml` (frontend, backend, ml, e2e, docker builds, OpenAPI-types drift); `security.yml` (CodeQL, dependency audits, Trivy image scan, gitleaks); cache deps; fail fast; upload test/coverage/Playwright reports

---

## Phase 9 — DevOps, Observability, Docs

### 9.1 Deployment Artifacts
- [ ] `docker-compose.yml` (dev) and `docker-compose.prod.yml` (Caddy with auto TLS, restart policies, resource limits, internal networks for DB/ML, named volumes, no published DB/ML ports); non-root containers, healthchecks, pinned images
- [ ] `scripts/` helpers (`.ps1` Windows, `.sh` Linux/macOS): dev up/down, run tests, smoke test, backup/restore (MySQL dump + uploads), seed
- [ ] `docs/DEPLOYMENT.md`: step-by-step to single VPS with Docker (domain, TLS, env checklist, first-admin bootstrap, backups, updating, rollback)

### 9.2 Observability
- [ ] Spring Actuator health/readiness (DB, ML reachability, queue); JSON structured logs with request/trace ID propagated Next → Spring → ML; Micrometer metrics (queue depth, processing time, error rates) on internal-only endpoint; optional Sentry-compatible error reporting behind env flag
- [ ] Python worker: structured logs + `/ml/v1/health` reporting OCR/embeddings availability

### 9.3 Data Safety
- [ ] Backup/restore procedure tested once + documented; retention note; `docs/RUNBOOK.md` for common incidents (stuck jobs, ML down, disk full, DB restore, rotating `JWT_SECRET`)

### 9.4 Documentation to Deliver
- [ ] `README.md` (quickstart, architecture, screenshots)
- [ ] Updated `PROJECT_OVERVIEW.md` (status, remove completed gaps from "Known Limitations", tick roadmap items)
- [ ] `docs/ARCHITECTURE.md`
- [ ] `docs/ENVIRONMENT.md`
- [ ] `docs/DEPLOYMENT.md`
- [ ] `docs/RUNBOOK.md`
- [ ] `docs/PERFORMANCE.md`
- [ ] `docs/SECURITY_REVIEW.md`
- [ ] `SECURITY.md`
- [ ] `CONTRIBUTING.md`
- [ ] `docs/DECISIONS.md`
- [ ] `docs/HUMAN_ACTIONS.md`
- [ ] `docs/FINAL_REPORT.md`

---

## Phase 10 — Final Verification

- [ ] Fresh clone → follow only `README.md`; fix every doc gap
- [ ] Full gate (14.1) + Playwright from scratch; Lighthouse + axe; audits + image scans
- [ ] Independent reviewer subagent: *"Try to break authorization, uploads, sessions, planner, SM-2, tutor grounding, deployment docs"* → fix all findings → re-run gate
- [ ] Write `docs/FINAL_REPORT.md`: what built, verified (command output summaries), test/coverage numbers, security findings/fixes, performance numbers, known limitations, remaining human actions, exact commands to run everything
- [ ] Confirm every box in `docs/PROGRESS.md` and Definition of Done checked