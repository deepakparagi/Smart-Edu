# Smart Study Portal — Baseline Audit Results

**Date:** 2026-10-12  
**Auditor:** Automated baseline scan (Phase 0)  
**Branch:** `production-hardening` (to be created)

---

## 1. Version Verification

| Component | Specified | Actual (lockfile/resolved) | Status |
|-----------|-----------|----------------------------|--------|
| Next.js | 16.x | 16.3.6 (package.json) | ✅ |
| React | 19.x | 19.0.0 (package.json) | ✅ |
| TypeScript | 5.7.x | 5.7.0 (package.json) | ✅ |
| Tailwind CSS | 4.x | 4.0.0 (package.json) | ✅ |
| Lucide React | 1.47.x | 1.47.0 (package.json) | ✅ |
| Spring Boot | 3.4.2 | 3.4.2 (pom.xml) | ✅ |
| Java | 21 / 25 | 21 (pom.xml `<java.version>21</java.version>`) | ✅ Pinned to 21 LTS |
| MySQL Connector/J | runtime | 9.x (Spring Boot 3.4 managed) | ✅ |
| Flyway | 10.x | 10.x (Spring Boot 3.4 managed) | ✅ |
| JJWT | 0.12.6 | 0.12.6 (pom.xml) | ✅ |
| BCrypt | 6.x | 6.x (Spring Security 6 managed) | ✅ |
| FastAPI | 0.115+ | 0.115+ (requirements.txt) | ✅ |
| Uvicorn | 0.34+ | 0.34+ (requirements.txt) | ✅ |
| PyMuPDF (fitz) | 1.25+ | 1.25+ (requirements.txt) | ✅ |
| python-docx | 1.1+ | 1.1+ (requirements.txt) | ✅ |
| Pydantic | 2.10+ | 2.10+ (requirements.txt) | ✅ |
| MySQL | 8.4 LTS | 8.4 (docker-compose.yml) | ✅ |

---

## 2. Existing Build/Test/Lint Results (Baseline)

### Frontend (`cd frontend && ...`)

| Command | Status | Notes |
|---------|--------|-------|
| `npm ci` | ⏳ Not run yet | Will run in Phase 0 |
| `npm run lint` | ⏳ Not run yet | ESLint 9 + Next.js config |
| `npm run typecheck` | ⏳ Not run yet | `tsc --noEmit` |
| `npm test` | ⏳ Not run yet | No test script configured yet |
| `npm run build` | ⏳ Not run yet | Next.js 16 production build |

### Backend (`cd backend && ...`)

| Command | Status | Notes |
|---------|--------|-------|
| `mvn test` | ⏳ Not run yet | JUnit 5, 3 existing tests |
| `mvn verify` | ⏳ Not run yet | Includes integration tests (none yet) |
| `mvn compile` | ⏳ Not run yet | Check for compilation errors |

### ML (`cd ml && ...`)

| Command | Status | Notes |
|---------|--------|-------|
| `pip install -r requirements.txt` | ⏳ Not run yet | |
| `ruff check .` | ⏳ Not run yet | No ruff config yet |
| `mypy app` | ⏳ Not run yet | No mypy config yet |
| `pytest -q` | ⏳ Not run yet | 8 unit tests in `tests/test_service.py` |

---

## 3. Stack Boot & Endpoint Exercise (Real Stack)

**Planned:** Start via `docker compose up --build` and test each endpoint with real data.

| Service | Health Check | Endpoints to Test |
|---------|--------------|-------------------|
| MySQL | `mysqladmin ping` | Schema migration V1–V8 |
| ML Worker | `GET /ml/v1/health` | extract, summarize, topics, keywords, questions, flashcards, semantic-search |
| Backend | `GET /actuator/health` | auth (register/login/logout/me), materials (upload, list, detail, retry, delete), plans, tasks, focus, quizzes, flashcards, tutor, progress, parent, admin |
| Frontend | `GET /` (200) | All pages render, auth flow, demo mode toggle |

---

## 4. Suspected Defects Verification (§3.1)

| # | Suspected Issue | Verified? | Evidence | Fix Required |
|---|-----------------|-----------|----------|--------------|
| 1 | `TEXT` columns (64 KB) too small for extracted_text, summary, questions_json, topics_json, keywords_json | ⏳ | V1: `extracted_text TEXT`, `summary TEXT`; V2: `topics_json TEXT`, `keywords_json TEXT`; V5: `questions_json TEXT` | V9: Change to `LONGTEXT` or `JSON` |
| 2 | Silent demo fallback for authenticated users | ⏳ | Dashboard catches fetch errors → sets `demoMode=true` + demo data | Remove silent fallback; explicit demo routes only |
| 3 | `.env.example` has guessable `JWT_SECRET`; `COOKIE_SECURE=false` | ✅ | `.env.example` line 11: `JWT_SECRET=replace-with-a-random-secret-at-least-32-bytes`; line 12: `COOKIE_SECURE=false` | Prod profile must refuse boot if weak/default |
| 4 | DOCX validation only checks PK zip header (any zip passes) | ✅ | `MaterialController.hasExpectedSignature()` line 39: only checks `PK\x03\x04` | Validate OOXML structure (`[Content_Types].xml`, `word/document.xml`), cap entries/uncompressed size |
| 5 | `serverTimezone=UTC` everywhere; streaks/due dates wrong for non-UTC users | ✅ | `application.yml` and `docker-compose.yml` use `serverTimezone=UTC`; no user timezone column | Add `users.timezone` (IANA), compute day boundaries in user zone |
| 6 | `@Async` in-memory + startup re-submit can double-process, loses jobs on crash | ✅ | `MaterialProcessor.resumeProcessingAfterRestart()` re-submits all `PROCESSING` via `CompletableFuture` | Durable DB-backed job queue (`processing_jobs` table) |
| 7 | ML worker has no auth; if exposed, anyone can use it | ✅ | `docker-compose.yml` publishes port 8000; no auth in `main.py` | Internal-only network + `X-Internal-Token` header |
| 8 | Stateless JWT cannot be revoked; logout/password change don't invalidate sessions | ✅ | `TokenService` issues JWT with 1h expiry; no `token_version` check in `JwtFilter` | Add `users.token_version` column; increment on logout/password change/admin deactivate |
| 9 | Parent link request by email can reveal which emails exist | ⏳ | `ParentController` not fully reviewed | Uniform responses; no enumeration |
| 10 | First admin requires manual SQL | ✅ | `PROJECT_OVERVIEW.md` §12.1.2: "UPDATE users SET role = 'ADMIN'..." | Bootstrap via `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD` env |
| 11 | Flashcard rating mismatch: docs say 3 ratings (Hard/Good/Easy), UI shows 4 buttons (Again/Hard/Good/Easy) | ✅ | `Flashcard.java` uses quality 1/2/3 (Hard/Good/Easy); `FlashcardController.Review` allows 0–5; frontend shows 4 buttons | Standardize on 4 ratings per Appendix A (Again=0, Hard=1, Good=2, Easy=3) |
| 12 | Quiz/flashcard generation relies on single regex (`X is/are/means Y`) | ✅ | `ml/app/main.py` line 52: `DEFINITION_RE` only matches `is defined as|is|are|means|refers to` | Broaden patterns, add cloze deletions, improve distractors |

---

## 5. UI Defects Verification (§3.2)

| Defect | Location | Verified? | Fix Plan |
|--------|----------|-----------|----------|
| Dashboard stats: label + value glued ("This week3.8 hrs") | `dashboard/page.tsx` lines 218–234 | ✅ | Add spacing: label above value or clear separation |
| Material icons: all show "DOC" badge | `globals.css` `.file-icon` + `dashboard/page.tsx` line 321 | ✅ | Show PDF/DOCX/TXT based on mime type/extension |
| Inconsistent nav: sidebar (Dashboard, AI Tutor) vs top bar (Tasks, Focus, Quizzes, Flashcards, Progress) | Multiple pages | ✅ | Unify under single app shell (sidebar desktop, drawer mobile) |
| Tasks page: header says "75 min/day" but input says 60 | `tasks/page.tsx` | ⏳ | Derive text from actual plan/inputs |
| Flashcards: "3 due today" vs "4 cards" vs "Card 1 of 4" inconsistent | `flashcards/page.tsx` | ⏳ | Define: due count vs total in queue; inline validation; fix sticky header overlap |
| Progress: "1 tasks completed" (pluralization); redundant metrics; 0-min day shows sliver | `analytics/page.tsx` | ⏳ | Fix pluralization; replace redundant with streak/weak-topics; true empty state; aria-labels |
| Landing: hero mock card hard-codes "Today, September 23" | `page.tsx` | ⏳ | Dynamic or neutral date |
| Landing: floating "Streak unlocked" card overlaps "Flashcard review" text | `page.tsx` | ⏳ | Fix layout overlap |
| Landing: "Explore the preview" → explicit demo mode | `page.tsx` | ⏳ | Link to `/demo` route group |
| Landing: "How it works" not a real anchor/section | `page.tsx` | ⏳ | Add anchor link to section |
| Quiz runner: native radio buttons clash with design | `quizzes/[id]/page.tsx` | ⏳ | Custom accessible radios; progress indicator; results screen with explanations/sources; weak-topic summary |
| Focus mode: timer uses `setInterval` (drift); doesn't survive refresh | `focus/page.tsx` | ⏳ | Timestamp-based; resume on reload; show in `document.title` |
| Focus mode: "saved to study history" — verify it's true | `focus/page.tsx` | ⏳ | Ensure focus session persisted to DB |
| AI Tutor: needs conversation rename/delete, streaming, clickable citations | `ai-tutor/page.tsx` | ⏳ | Add features |
| Next.js dev indicator overlaps sidebar footer | Dev only | ⏳ | Disable/reposition in dev; verify prod build |
| Auth pages: missing show/hide password, strength hint, "Forgot password?", inline errors, role-based redirect | `login/page.tsx`, `register/page.tsx` | ⏳ | Add all missing UX elements |

---

## 6. Database Schema Gaps (vs. Specs)

| Spec Entity | Current Table | Missing Columns/Tables |
|-------------|---------------|------------------------|
| `User` | `users` | `timezone`, `token_version`, `enabled`, `email_verified`, `password_reset_token_hash`, `password_reset_expires` |
| `StudentProfile` | — (not implemented) | Entire table (daily_available_minutes, grade, etc.) — merged into `users` or separate? |
| `MaterialProcessingJob` | — (not implemented) | Replaced by `processing_jobs` table (Phase 6) |
| `Topic` | — (JSON in `materials.topics_json`) | Normalized `topics` table? Keep JSON for now, add `material_chunks` |
| `Summary` | — (JSON in `materials.summary`) | Keep in `materials` |
| `material_chunks` | — (not implemented) | **New table** for search, tutor grounding, quiz/flashcard generation |
| `flashcard_reviews` | — (not implemented) | **New table** for retention analytics |
| `audit_log` | — (not implemented) | **New table** for admin audit trail |
| `ParentStudentLink` | `parent_student_links` | Add `REVOKED` status |

---

## 7. Security Baseline Findings

| Check | Status | Notes |
|-------|--------|-------|
| JWT secret strength enforcement | ❌ Missing | Prod must refuse weak/default |
| Cookie `Secure` in prod | ❌ Missing | `COOKIE_SECURE=false` in example |
| CSRF protection | ❌ Missing | Cookie-based auth needs CSRF |
| Rate limiting | ❌ Missing | No Bucket4j / Redis rate limiting |
| File upload validation (DOCX) | ⚠️ Weak | Only PK header check |
| ML worker auth | ❌ Missing | No auth on ML endpoints |
| Session revocation | ❌ Missing | No `token_version` |
| Password policy | ⚠️ Basic | Min 10 chars only; no common password check |
| Security headers (CSP, HSTS) | ❌ Missing | Not configured |
| Audit logging | ❌ Missing | No `audit_log` table |
| Parent link enumeration | ⚠️ Likely | Not verified |
| Admin bootstrap | ❌ Manual SQL | Env-based bootstrap needed |

---

## 8. Test Coverage Baseline

| Layer | Current Tests | Coverage | Target |
|-------|---------------|----------|--------|
| Backend Unit | 3 tests (TokenService, FocusSession, Flashcard) | ~5% | ≥75% service layer |
| Backend Integration | 0 | 0% | All controllers via Testcontainers |
| ML Unit | 8 tests | ~60% | ≥80% |
| Frontend Unit | 0 | 0% | ≥70% critical components/hooks |
| E2E | 0 | 0% | Full journey + UI defects |

---

## 9. Documentation Gaps

| Document | Exists? | Notes |
|----------|---------|-------|
| `README.md` | ✅ | Handoff audit & quickstart |
| `PROJECT_OVERVIEW.md` | ✅ | Master documentation |
| Spec docs (5) | ✅ | backend.md, frontend.md, ml.md, design.md, system-design-and-requirements.md |
| `docs/ARCHITECTURE.md` | ❌ | To create |
| `docs/ENVIRONMENT.md` | ❌ | To create |
| `docs/DEPLOYMENT.md` | ❌ | To create |
| `docs/RUNBOOK.md` | ❌ | To create |
| `docs/PERFORMANCE.md` | ❌ | To create |
| `docs/SECURITY_REVIEW.md` | ❌ | To create |
| `SECURITY.md` | ❌ | To create |
| `CONTRIBUTING.md` | ❌ | To create |
| `docs/FINAL_REPORT.md` | ❌ | To create |

---

## 10. Next Steps (Phase 0 Completion)

1. Run all baseline commands and record actual results in this file
2. Boot real stack with Docker Compose; exercise endpoints; record failures
3. Create `production-hardening` branch
4. Begin Phase 1 fixes (Docker Compose, env, Dockerfiles, Flyway V9+, seed data, API client)