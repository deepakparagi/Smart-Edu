# Smart Study Portal — Environment Variables Reference

**All variables required across frontend, backend, and ML worker.**  
Variables marked **(Required)** must be set in production.  
Variables marked **(Dev Default)** have sensible defaults for local development.  
Variables marked **(Prod Only)** are only used in production profile.

---

## Database (MySQL)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MYSQL_DATABASE` | Database name | `smart_study` | ✅ |
| `MYSQL_USER` | Database user | `smart_study` | ✅ |
| `MYSQL_PASSWORD` | Database user password | `change-me` | ✅ **(Prod: strong secret)** |
| `MYSQL_ROOT_PASSWORD` | Root password for init | `change-me` | ✅ **(Prod: strong secret)** |
| `SPRING_DATASOURCE_URL` | JDBC URL for Spring Boot | `jdbc:mysql://localhost:3306/smart_study?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC` | ✅ |
| `SPRING_DATASOURCE_USERNAME` | DB username (Spring) | `smart_study` | ✅ |
| `SPRING_DATASOURCE_PASSWORD` | DB password (Spring) | `change-me` | ✅ **(Prod: strong secret)** |

---

## Backend (Spring Boot)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SPRING_PROFILES_ACTIVE` | Active Spring profile | `dev` | ✅ **(Prod: `prod`)** |
| `SERVER_PORT` | HTTP port | `8080` | |
| `ML_SERVICE_URL` | ML worker base URL | `http://localhost:8000` | ✅ |
| `UPLOAD_DIR` | Local file upload directory | `./uploads` | ✅ **(Prod: `/data/uploads`)** |
| `STORAGE_BACKEND` | Storage implementation | `local` | ✅ **(Prod: `local` or `s3`)** |
| `JWT_SECRET` | HMAC-SHA key for JWT signing (min 32 chars) | `local-development-secret-key-change-me-please-0123456789` | ✅ **(Prod: 64+ char random)** |
| `JWT_TTL_MINUTES` | Access token lifetime | `60` | |
| `COOKIE_SECURE` | Cookie `Secure` flag | `false` | ✅ **(Prod: `true`)** |
| `COOKIE_DOMAIN` | Cookie `Domain` attribute | *(none)* | **(Prod: if using subdomain topology)** |
| `WEB_ORIGIN` | Allowed CORS origin (frontend URL) | `http://localhost:3000` | ✅ **(Prod: `https://yourdomain.com`)** |
| `ML_INTERNAL_TOKEN` | Shared secret for ML worker auth | *(none)* | ✅ **(Prod: 32+ char random)** |

### Email (Spring Mail) — Required for Password Reset & Verification

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MAIL_HOST` | SMTP host | *(none)* | ✅ **(Prod)** |
| `MAIL_PORT` | SMTP port | `587` | |
| `MAIL_USERNAME` | SMTP username | *(none)* | ✅ **(Prod)** |
| `MAIL_PASSWORD` | SMTP password / API key | *(none)* | ✅ **(Prod)** |
| `MAIL_FROM` | From address | `noreply@localhost` | ✅ **(Prod)** |
| `MAIL_FROM_NAME` | From name | `Smart Study Portal` | |
| `MAIL_PROTOCOL` | `smtp` or `smtps` | `smtp` | |
| `MAIL_SSL_ENABLE` | Use SSL (port 465) | `false` | |
| `MAIL_STARTTLS_ENABLE` | Use STARTTLS (port 587) | `true` | |

### Security & Auth

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REQUIRE_EMAIL_VERIFICATION` | Block unverified users from core features | `false` | |
| `BCRYPT_STRENGTH` | BCrypt cost factor | `12` | |
| `PASSWORD_MIN_LENGTH` | Minimum password length | `10` | |
| `COMMON_PASSWORD_LIST` | Path to common passwords file (one per line) | *(none)* | |
| `RATE_LIMIT_AUTH_PER_MINUTE` | Auth endpoints per IP+email | `5` | |
| `RATE_LIMIT_UPLOAD_PER_HOUR` | Uploads per user | `10` | |
| `RATE_LIMIT_TUTOR_PER_DAY` | Tutor/LLM requests per user | `50` | |
| `RATE_LIMIT_GLOBAL_PER_MINUTE` | Global per IP | `100` | |

### Admin Bootstrap

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `BOOTSTRAP_ADMIN_EMAIL` | Email for first admin (runs once if no admin exists) | *(none)* | **(Prod: recommended)** |
| `BOOTSTRAP_ADMIN_PASSWORD` | Password for first admin (never logged) | *(none)* | **(Prod: if email set)** |

### LLM Provider (AI Tutor) — Optional

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LLM_PROVIDER` | `none` \| `anthropic` \| `openai` \| `ollama` | `none` | |
| `LLM_API_KEY` | Provider API key | *(none)* | **(If provider != none)** |
| `LLM_BASE_URL` | Base URL (for Ollama, Azure, etc.) | *(none)* | **(If provider=ollama or Azure)** |
| `LLM_MODEL` | Model identifier | *(provider default)* | |
| `LLM_DAILY_LIMIT_PER_USER` | Max tutor requests per user per day | `50` | |
| `LLM_MAX_TOKENS_PER_REQUEST` | Max completion tokens | `1024` | |
| `TUTOR_RETRIEVAL_THRESHOLD` | Min retrieval score to call LLM (0–1) | `0.35` | |

### Observability (Optional)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SENTRY_DSN` | Sentry DSN for error tracking | *(none)* | |
| `LOG_LEVEL_ROOT` | Root log level | `INFO` | |
| `LOG_LEVEL_WEB` | Spring Web log level | `INFO` | |
| `LOG_LEVEL_SQL` | Hibernate SQL log level | `WARN` | |

---

## Frontend (Next.js)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8080/api/v1` | ✅ |
| `NEXT_PUBLIC_DEMO_MODE` | Enable explicit demo routes | `false` | |
| `NEXT_PUBLIC_APP_NAME` | App name for UI | `Smart Study` | |
| `NEXT_PUBLIC_DEFAULT_TIMEZONE` | Default IANA timezone for new users | `Asia/Kolkata` | |

---

## ML Worker (FastAPI)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ML_SERVICE_PORT` | HTTP port | `8000` | |
| `ML_INTERNAL_TOKEN` | Must match backend `ML_INTERNAL_TOKEN` | *(none)* | ✅ **(Prod)** |
| `OCR_ENABLED` | Enable Tesseract OCR fallback | `false` | |
| `OCR_LANGS` | Tesseract language codes (comma-separated) | `eng` | |
| `EMBEDDINGS_ENABLED` | Enable sentence-transformers embeddings | `false` | |
| `EMBEDDINGS_MODEL` | Model name (pre-downloaded at build) | `sentence-transformers/all-MiniLM-L6-v2` | |
| `EXTRACTION_TIMEOUT_SECONDS` | Max time per file extraction | `120` | |
| `MAX_PAGES_PER_FILE` | Max PDF pages to process | `200` | |
| `MAX_UNCOMPRESSED_SIZE_MB` | Max DOCX uncompressed size | `50` | |
| `MAX_ZIP_ENTRIES` | Max entries in DOCX zip | `1000` | |

---

## Object Storage (S3/MinIO) — Required if `STORAGE_BACKEND=s3`

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `S3_ENDPOINT` | S3 endpoint URL | *(none)* | ✅ |
| `S3_BUCKET` | Bucket name | *(none)* | ✅ |
| `S3_ACCESS_KEY` | Access key ID | *(none)* | ✅ |
| `S3_SECRET_KEY` | Secret access key | *(none)* | ✅ |
| `S3_REGION` | AWS region (ignored for MinIO) | `us-east-1` | |
| `S3_FORCE_PATH_STYLE` | Use path-style URLs (required for MinIO) | `false` | **(MinIO: `true`)** |

---

## Docker Compose Profiles

### Dev (default)
```bash
docker compose up --build
```
- MySQL, ML, Backend, Frontend, **Mailpit** (port 8025)
- `COOKIE_SECURE=false`, `STORAGE_BACKEND=local`, `LLM_PROVIDER=none`
- Mailpit at `http://localhost:8025` for email testing

### Prod
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```
- Adds **Caddy** reverse proxy (auto TLS via Let's Encrypt)
- Internal networks: `backend-internal` (DB, ML), `frontend-public` (Caddy ↔ Frontend)
- No published ports for MySQL (3306) or ML (8000)
- `COOKIE_SECURE=true`, `STORAGE_BACKEND=s3` (recommended), real `JWT_SECRET`, real `MAIL_*`

### Optional Profiles
- `docker compose --profile scan up` — adds ClamAV scanner sidecar for uploads
- `docker compose --profile minio up` — adds MinIO for local S3 testing

---

## Variable Precedence

1. **Docker Compose `.env` file** (loaded by `docker compose`)
2. **Shell environment** (exported before `docker compose`)
3. **Application defaults** (in `application.yml`, `next.config.ts`, `ml/app/main.py`)
4. **Hardcoded fallbacks** (in code)

> **Never commit `.env` files.** Use `.env.example` as template. Secrets via Docker secrets, GitHub Actions secrets, or cloud secret manager in production.

---

## Quick Reference: Minimum Production Set

```bash
# Database
MYSQL_DATABASE=smart_study
MYSQL_USER=smart_study
MYSQL_PASSWORD=<strong-random>
MYSQL_ROOT_PASSWORD=<strong-random>

# Backend
SPRING_PROFILES_ACTIVE=prod
ML_SERVICE_URL=http://ml:8000
UPLOAD_DIR=/data/uploads
STORAGE_BACKEND=s3
JWT_SECRET=<64-char-random-base64>
JWT_TTL_MINUTES=60
COOKIE_SECURE=true
WEB_ORIGIN=https://yourdomain.com
ML_INTERNAL_TOKEN=<32-char-random>

# Email (required for password reset)
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=<sendgrid-api-key>
MAIL_FROM=noreply@yourdomain.com

# Admin bootstrap (first deploy only)
BOOTSTRAP_ADMIN_EMAIL=admin@yourdomain.com
BOOTSTRAP_ADMIN_PASSWORD=<strong-random>

# Frontend
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1

# ML Worker
ML_INTERNAL_TOKEN=<same-as-backend>

# S3/MinIO
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
S3_BUCKET=smart-study-uploads
S3_ACCESS_KEY=<access-key>
S3_SECRET_KEY=<secret-key>
S3_REGION=us-east-1
```

---

## Validation Rules (Enforced at Startup in `prod` Profile)

| Check | Failure Action |
|-------|----------------|
| `JWT_SECRET` length < 32 chars or equals default | **Refuse to start** |
| `COOKIE_SECURE=false` | **Refuse to start** |
| `WEB_ORIGIN` not HTTPS | **Refuse to start** |
| `ML_INTERNAL_TOKEN` not set | **Refuse to start** |
| `MAIL_HOST` not set (when `REQUIRE_EMAIL_VERIFICATION=true` or password reset used) | **Warn + disable email features** |
| `BOOTSTRAP_ADMIN_EMAIL` set but `BOOTSTRAP_ADMIN_PASSWORD` not set | **Refuse to start** |
| `STORAGE_BACKEND=s3` but S3 vars missing | **Refuse to start** |