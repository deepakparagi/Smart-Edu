# Smart Study Portal — Human Actions Required

**Purpose:** Tasks that require human-only secrets, accounts, approvals, or decisions. The automation implements interfaces with local/dev fallbacks; these items must be completed by a human before production launch.

---

## 1. Email / SMTP Credentials (Required for Password Reset & Verification)

**What:** Real SMTP credentials for sending transactional emails (password reset, email verification, admin alerts).

**Why:** The backend implements Spring Mail abstraction. In dev, Mailpit catches emails at `http://localhost:8025`. Production needs real SMTP (SendGrid, Mailgun, AWS SES, Postmark, or self-hosted).

**Exact Steps:**
1. Create account with an email provider (SendGrid recommended for simplicity).
2. Verify a sender domain or single sender identity.
3. Generate API key or SMTP credentials.
4. Set these environment variables in production:
   - `MAIL_HOST` (e.g., `smtp.sendgrid.net`)
   - `MAIL_PORT` (e.g., `587` for TLS)
   - `MAIL_USERNAME` (e.g., `apikey`)
   - `MAIL_PASSWORD` (the API key)
   - `MAIL_FROM` (e.g., `noreply@yourdomain.com`)
   - `MAIL_FROM_NAME` (e.g., `Smart Study Portal`)
5. Set `SPRING_PROFILES_ACTIVE=prod` to enable email sending.
6. Test: trigger "Forgot password" flow in staging; check Mailpit (dev) or real inbox (prod).

**Fallback:** Dev profile uses Mailpit (started via `docker-compose.yml`). No code changes needed.

---

## 2. LLM Provider API Keys (Optional — Tutoring Enhancement)

**What:** API key for an LLM provider to enable conversational AI tutor (beyond deterministic excerpt mode).

**Why:** The tutor works in `LLM_PROVIDER=none` mode (deterministic, no key needed). For natural-language explanations, a provider is optional but recommended.

**Supported Providers & Current Model IDs (verify before use):**
- **Anthropic:** `claude-3-5-sonnet-20241022` (or latest Sonnet) — `LLM_PROVIDER=anthropic`, `LLM_API_KEY=sk-ant-...`
- **OpenAI-compatible:** `gpt-4o-mini` (or `gpt-4o`) — `LLM_PROVIDER=openai`, `LLM_API_KEY=sk-...`, `LLM_BASE_URL` optional (for Azure, etc.)
- **Ollama (local):** `llama3.1:8b` — `LLM_PROVIDER=ollama`, `LLM_BASE_URL=http://host.docker.internal:11434` (no API key)

**Exact Steps:**
1. Choose provider based on budget/privacy requirements.
2. Obtain API key from provider dashboard.
3. Set env vars in production (see `docs/ENVIRONMENT.md`).
4. Set `LLM_DAILY_LIMIT_PER_USER=50` (or desired limit) to control costs.
5. Test: ask a question in the tutor; verify streaming answer with citations appears.

**Fallback:** `LLM_PROVIDER=none` (default) — deterministic excerpt answers work without any key.

---

## 3. Domain Name & TLS Certificate (Required for Production)

**What:** A registered domain name with valid TLS for production deployment.

**Why:** `COOKIE_SECURE=true` requires HTTPS. Caddy (in `docker-compose.prod.yml`) automates TLS via Let's Encrypt, but needs a real domain.

**Exact Steps:**
1. Register a domain (e.g., `studyportal.example.com`).
2. Create DNS `A` record pointing to the VPS public IP.
3. Ensure ports 80 and 443 are open on the VPS firewall/security group.
4. Set `WEB_ORIGIN=https://studyportal.example.com` and `COOKIE_SECURE=true` in production env.
5. Deploy with `docker-compose.prod.yml` — Caddy will obtain and renew certs automatically.

**Fallback:** Dev uses `http://localhost:3000` with `COOKIE_SECURE=false`.

---

## 4. Object Storage (S3/MinIO) for File Uploads (Required for Multi-Node or Persistent Deployments)

**What:** S3-compatible object storage for uploaded study materials.

**Why:** Local filesystem (`./uploads`) works for single-node but loses files on container recreate and doesn't work across multiple API instances. S3/MinIO provides durable, shared storage.

**Exact Steps:**
1. **Option A (MinIO - self-hosted):** Add MinIO service to `docker-compose.prod.yml`, create bucket `smart-study-uploads`, set `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`.
2. **Option B (AWS S3):** Create bucket, IAM user with `PutObject`/`GetObject`/`DeleteObject` on that bucket, get access keys.
3. Set production env vars:
   - `STORAGE_BACKEND=s3`
   - `S3_ENDPOINT` (e.g., `https://s3.us-east-1.amazonaws.com` or `http://minio:9000`)
   - `S3_BUCKET=smart-study-uploads`
   - `S3_ACCESS_KEY=...`
   - `S3_SECRET_KEY=...`
   - `S3_REGION` (if AWS)
   - `S3_FORCE_PATH_STYLE=true` (for MinIO)
4. Test: upload a PDF in production; verify it appears in bucket and downloads work.

**Fallback:** `STORAGE_BACKEND=local` (default) — files stored in Docker volume `uploads`.

---

## 5. First Admin Bootstrap (Required for Initial Admin Access)

**What:** Create the first admin account without manual SQL.

**Why:** Public registration only allows `STUDENT` or `PARENT` roles. The first admin must be bootstrapped securely.

**Exact Steps:**
1. Choose an email for the first admin (e.g., `admin@yourdomain.com`).
2. Generate a strong password (32+ chars, store in password manager).
3. Set production env vars:
   - `BOOTSTRAP_ADMIN_EMAIL=admin@yourdomain.com`
   - `BOOTSTRAP_ADMIN_PASSWORD=<the-strong-password>`
4. On first backend startup with empty DB, the admin user is created with role `ADMIN`.
5. **Immediately after first login:** Change the password via Settings → Change Password.
6. Remove or rotate `BOOTSTRAP_ADMIN_PASSWORD` from env (it only runs once when no admin exists).

**Note:** The password is never logged. The bootstrap logic is in `AdminBootstrapRunner` (to be implemented).

---

## 6. Legal Review: Privacy Policy & Terms of Service (Required Before Launch)

**What:** Legal review of `/privacy` and `/terms` pages by qualified counsel.

**Why:** The application:
- Serves students who may be minors (under 18)
- Has a parent-link feature (parent accesses child's aggregate progress)
- Processes personal data (names, emails, study materials, analytics)
- May fall under India's DPDP Act, GDPR (if EU users), COPPA (if US children), FERPA (if US educational records)

**Current State:** Draft content exists in the frontend at `/privacy` and `/terms` (to be implemented). These are **placeholders only**.

**Exact Steps:**
1. Engage legal counsel familiar with edtech / student data regulations in your target jurisdictions.
2. Review the data flows: what personal data is collected, processed, stored, shared.
3. Review parent-link feature: consent, age verification, data minimization.
4. Update `/privacy` and `/terms` pages with legally compliant content.
5. Add cookie consent banner if required (analytics, marketing cookies).
6. Document the review date and jurisdiction in `docs/LEGAL_REVIEW.md`.

**Do not launch publicly without this review.**

---

## 7. Monitoring & Alerting (Recommended for Production)

**What:** External monitoring for uptime, error rates, performance.

**Why:** The app exposes `/actuator/health` (Spring) and `/ml/v1/health` (ML worker). Production should have active monitoring.

**Options:**
- **Uptime:** UptimeRobot, Pingdom, Better Uptime, Healthchecks.io (ping `/actuator/health`)
- **Errors/APM:** Sentry (set `SENTRY_DSN`), Datadog, New Relic, Grafana Cloud
- **Logs:** Loki + Grafana, Elastic, Datadog, Papertrail
- **Metrics:** Prometheus + Grafana (scrape `/actuator/prometheus`)

**Exact Steps:**
1. Choose monitoring stack based on budget/team familiarity.
2. Configure dashboards for: request latency, error rate, queue depth, ML worker health, DB connections, disk space.
3. Set alerts: 5xx rate > 1%, queue depth > 100, ML worker down > 1 min, disk > 80%.

**Fallback:** Dev relies on manual `docker compose logs` and `curl /actuator/health`.

---

## 8. Backup & Disaster Recovery Test (Required Before Launch)

**What:** Verify the backup/restore procedure works end-to-end.

**Why:** Data loss is unacceptable. The `RUNBOOK.md` documents the procedure; it must be tested.

**Exact Steps:**
1. Deploy to staging with real data.
2. Run backup script: `scripts/backup.sh` (MySQL dump + uploads volume).
3. Simulate disaster: delete the MySQL volume and uploads volume.
4. Run restore script: `scripts/restore.sh <backup-file>`.
4. Verify: all users, materials, progress, flashcards, tutor conversations restored.
5. Document RTO/RPO in `docs/RUNBOOK.md`.

**Do not launch without a successful restore test.**

---

## 9. Security Audit Sign-Off (Recommended)

**What:** Internal or external security review of the deployed application.

**Why:** The security checklist (Phase 7) covers code-level issues. A runtime review catches configuration, infrastructure, and logic gaps.

**Scope:**
- OWASP Top 10 verification
- Authentication/authorization testing (IDOR, BOLA, session fixation)
- File upload testing (malicious files, path traversal, zip bombs)
- Rate limiting effectiveness
- CSP effectiveness (CSP Evaluator)
- Dependency scan results (no high/critical unaddressed)
- Container scan results (Trivy)
- Secrets scanning (gitleaks, trufflehog)

**Deliverable:** `docs/SECURITY_AUDIT.md` with findings, risk ratings, and remediation status.

---

## 10. Accessibility Audit (Recommended)

**What:** Manual accessibility testing beyond automated axe/Lighthouse.

**Why:** Automated tools catch ~30-50% of WCAG issues. Manual testing with screen readers (NVDA, VoiceOver), keyboard-only navigation, and zoom is required for AA compliance.

**Exact Steps:**
1. Test key flows (register, login, upload, quiz, flashcards, focus timer) with:
   - Keyboard only (Tab, Shift+Tab, Enter, Space, arrows)
   - NVDA (Windows) or VoiceOver (Mac/iOS)
   - 200% browser zoom
   - High contrast mode
2. Verify: focus order, aria-live announcements, form labels, error announcements, skip links, color contrast.
3. Document findings in `docs/ACCESSIBILITY_AUDIT.md`.

---

## 11. Performance Baseline Sign-Off (Recommended)

**What:** Load test results documented and accepted.

**Why:** The `docs/PERFORMANCE.md` will contain k6 results. A human should review and approve the baseline before launch.

**Exact Steps:**
1. Run `scripts/load-test.sh` against staging.
2. Review: p95 latency, error rate, throughput, resource utilization (CPU, memory, DB connections, queue depth).
3. Identify bottlenecks; fix or document as known limitations.
4. Sign off in `docs/PERFORMANCE.md`.

---

## 12. Dependency Update Policy Decision (Required for Ongoing Maintenance)

**What:** Decide how dependencies are updated (Dependabot/Renovate config, review process).

**Why:** The project uses many dependencies (Spring Boot, Next.js, React, FastAPI, PyMuPDF, etc.). Unpatched vulnerabilities accumulate.

**Decision Needed:**
- Enable Dependabot (GitHub native) or Renovate?
- Auto-merge for patch/minor with green CI? Major requires manual review?
- Schedule: weekly? Monthly?
- Who approves PRs?

**Document in:** `CONTRIBUTING.md` and `docs/SECURITY_REVIEW.md`.