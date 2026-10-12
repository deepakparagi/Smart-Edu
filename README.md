# Smart Study Portal

# Smart Study Portal

## Handoff audit

At handoff, the workspace contained only the five requirements documents (`frontend.md`, `backend.md`, `ml.md`, `design.md`, and `system-design-and-requirements.md`). There was no Git checkout, source tree, lockfile, migration, Docker setup, or test suite to preserve. The work below creates the initial implementation from those specifications; it is a runnable MVP slice, not the fully specified product.

## Architecture

- `frontend/`: Next.js 16 App Router, TypeScript, Tailwind CSS. Landing, authentication, student dashboard, plans/tasks, focus mode, quizzes, flashcards, progress, source-grounded tutor, parent portal, and admin portal.
- `backend/`: Java 21 / Spring Boot REST API, Spring Security, BCrypt, signed short-lived JWT in an HttpOnly cookie, MySQL with Flyway. Registration/login/logout/current-user, role-scoped parent/student linking and progress, limited admin account-role/system views, owner-scoped material endpoints, importance-ranked plan generation, task CRUD, focus sessions, quiz attempts, flashcard reviews, progress analytics, and tutor conversations.
- `ml/`: FastAPI extraction, deterministic keyword/topic extraction and extractive summary draft. Supported files: PDF, TXT and DOCX. Spring persists upload metadata, accepts processing asynchronously and resumes `PROCESSING` records after restart.
- `docker-compose.yml`: MySQL 8.4, API, and ML containers. The Next.js development server is started separately.

No API keys or external AI provider are required for the deterministic baseline. Generated summaries are marked as drafts for verification.

## Setup

Use Node.js 20.9+, Java 21+, Maven 3.9+, Python 3.11+, and Docker Compose (or a MySQL 8 instance). This machine has Node 26, Java 25, Python 3.14, Maven 3.9.6, and a local MySQL 8 service; Docker and Git are not on PATH.

1. Copy `.env.example` to `.env`. Set unique database passwords and a random `JWT_SECRET` of at least 32 bytes. For HTTPS deployment, set `COOKIE_SECURE=true` and set `WEB_ORIGIN` to the frontend origin.
2. Start the data/API/ML services with `docker compose up --build`. Or start MySQL separately, then run each service below. The configured MySQL account needs permission to create/use `smart_study` and apply Flyway migrations.
3. In `frontend/`: `npm ci`, then `npm run dev`. Browse to http://localhost:3000. Use `npm run build` and `npm start` for production.
4. In `backend/`: `mvn spring-boot:run`. Flyway applies `V1` through `V8` on startup. Configure `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD` if not using the sample local defaults.
5. In `ml/`: create/activate a virtual environment, `pip install -r requirements.txt`, and run `python -m uvicorn app.main:app --reload --port 8000`. Health check: http://localhost:8000/ml/v1/health.

The Next.js browser client calls the Spring API at `NEXT_PUBLIC_API_URL` (default `http://localhost:8080/api/v1`). Set that variable at frontend build time when hosting elsewhere. Spring CORS allows only the configured `WEB_ORIGIN`.

## Current implementation and known gaps

Implemented frontend/API flows (not yet browser-to-MySQL verified): student and parent account registration, login/logout and server-issued cookie session; student approval of parent access requests; academic progress summaries for approved parent links; admin aggregate counts and user role management; ownership-scoped materials, PDF/TXT/DOCX upload, file checks, asynchronous extraction with summary/topics/keywords, status polling and retry; topic-ranked plan generation, task CRUD, persisted focus sessions, definition-based quiz generation and scoring, flashcard generation with spaced-repetition intervals, real-data progress, and lexical retrieval of tutor source passages with conversation history. Raw documents are stored under a random key in the configured private local upload directory.

When the API cannot be reached, the student dashboard pages show a clearly labeled preview dataset so the interface can be explored before MySQL is configured. Preview edits and quiz attempts are temporary in-page state; uploaded files and sample records are not sent to or saved in the backend. Once an authenticated API is available, the pages use the signed-in account's real data instead.

Admin accounts are not self-registerable. After the first user registers, promote the intended account using a database administrator connection, for example `UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';`. Sign out and back in so the session token receives the updated role. The admin portal can manage roles for the most recent 100 accounts; it does not expose uploaded documents or tutor conversations. A parent can request access by student email, and the student must approve before progress is shared.

Not implemented yet: password-reset email flow, parent link revocation/cancellation, flashcard review history and card editing, material search/deletion, precise source-page citations, OCR, Redis-backed durable queue, object-storage deployment, and rate limiting/audit logs. Admin capabilities are limited to aggregate counts and role management; there is no account suspension or content moderation. The tutor uses lexical overlap, not an LLM-generated answer. Analytics aggregates real records, with trends built from recent saved history. The current worker queue is Spring `@Async`; outstanding `PROCESSING` records are resubmitted on API restart, but this is not a distributed queue. The plan allocates short tasks in estimated-importance order and respects the selected daily-minutes cap; it does not yet optimize for deadlines, prior mastery, difficulty, or preferred study windows. The deterministic topic/keyword estimates and extractive summary are basic baselines and must not be treated as authoritative.

## Verification run

- Frontend: `npm run lint`, `npm run typecheck`, and production `npm run build` all pass on Next.js 16.3.6.
- Backend: Maven package build passes; `mvn test` passes 4 tests for JWT handling, focus-session state transitions, and spaced-repetition intervals.
- ML: `python -m unittest discover -s tests -v` passes 8 unit tests; FastAPI was started locally and live `/health` and `/summarize` requests returned HTTP 200.
- Full browser-to-MySQL flow was not run: the local MySQL service is running but rejects an unauthenticated root connection, no DB credentials were supplied, and Docker is unavailable. Add valid MySQL credentials to `.env` before first API launch. No credential values are stored in this repo.
