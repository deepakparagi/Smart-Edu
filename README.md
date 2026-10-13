# Smart Study Portal

An intelligent, full-stack educational platform featuring deterministic NLP document processing, spaced-repetition flashcards, dynamic quizzes, automated study planning, focus tracking, an AI tutor, and dedicated parent and administrative portals.

---

## 🔐 Login Credentials (All 3 Account Types)

The system comes pre-configured with active accounts for testing and evaluation across all roles.

| Role | Email | Password | Primary Capabilities & Features |
| :--- | :--- | :--- | :--- |
| **Student** | `student@test.com` | `Password123!` | • Upload and process study notes (PDF, TXT, DOCX)<br>• Automated topic-ranked study plans & task manager<br>• Focus mode with stopwatch/timer sessions<br>• Dynamic MCQ quizzes with instant scoring<br>• SuperMemo SM-2 spaced repetition flashcards<br>• Source-grounded AI Tutor with citations<br>• Study analytics and mastery tracking |
| **Parent** | `parent@test.com` | `Password123!` | • Link student accounts via email request<br>• Real-time academic progress monitoring<br>• Total focus hours, quiz performance, and task rates<br>• Subject-level breakdown and study activity |
| **Admin** | `admin@test.com` | `Password123!` | • System telemetry and JVM runtime health diagnostics<br>• User account management & role promotions (`STUDENT`, `PARENT`, `ADMIN`)<br>• Platform-wide database metrics and activity counters |

> **Alternative Seeded Credentials:**  
> Student: `alex@example.test` / `password123`  
> Parent: `jordan@example.test` / `password123`  
> Admin: `admin@example.test` / `admin123`

---

## 🏛️ System Architecture

The project consists of 4 decoupled tiers:

```
[ Browser Client ]
       │
       ▼ (Port 3000)
┌───────────────────────────────────────┐
│     Next.js 16 Web Frontend           │
│  React 19 • Tailwind CSS • TanStack   │
└──────────────────┬────────────────────┘
                   │
                   ▼ (Port 8080)
┌───────────────────────────────────────┐
│     Spring Boot 3.4 REST API          │
│  Java 21/25 • Spring Security • JWT   │
└──────────┬─────────────────┬──────────┘
           │                 │
           ▼ (Port 8000)     ▼ (Port 3306)
┌──────────────────────┐   ┌───────────────────────────┐
│   FastAPI ML Engine  │   │      MySQL 8.0 Server     │
│ Python 3.14 • Uvicorn│   │ Database: `smart_study`   │
│ Summarization / NLP  │   │ Flyway Migrations V1-V8   │
└──────────────────────┘   └───────────────────────────┘
```

- **Frontend (`frontend/`)**: Next.js 16 App Router, TypeScript, Tailwind CSS, TanStack Query, Lucide icons.
- **Backend (`backend/`)**: Spring Boot 3.4.2, Java 21+, Spring Security, BCrypt, signed JWT in `HttpOnly; SameSite=Lax` cookies, Flyway migrations (`V1`–`V8`).
- **ML Engine (`ml/`)**: FastAPI, Python 3.11+, deterministic extractive summarization, salient topic/keyword extraction, definition-based quiz generation, and passage retrieval.
- **Database**: MySQL 8.0 relational store.

---

## ⚙️ Prerequisites

Ensure the following tools are installed on your machine:

- **Node.js**: `v20.9+` (Node 26 tested)
- **Java JDK**: `21+` (Java 25 tested)
- **Apache Maven**: `3.9+`
- **Python**: `3.11+` (Python 3.14 tested)
- **MySQL Server**: `8.0+`

---

## 🚀 How to Run the Entire Project

You can run the project either using the automated PowerShell script or by starting each service manually in separate terminal windows.

### Method A: One-Click Startup (PowerShell)

Run the included automated startup script from the project root:

```powershell
.\run-all.ps1
```

This will automatically check ports and start:
1. MySQL daemon on port `3306`
2. FastAPI ML server on port `8000`
3. Spring Boot backend on port `8080`
4. Next.js frontend on port `3000`

---

### Method B: Manual Step-by-Step Startup

If running services individually, open **4 terminal windows** and follow these steps:

#### Step 1: Start MySQL Database
Using the local project data directory:
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --datadir="d:\Smart Edu\mysql-local\data" --port=3306 --console
```
*Note: The configured database is `smart_study` with user `smart_study` and password `dev-password-change-me`.*

#### Step 2: Start the ML Engine (FastAPI)
```powershell
cd "d:\Smart Edu\ml"
# If creating venv for the first time:
# python -m venv .venv
# .venv\Scripts\pip install -r requirements.txt

& "d:\Smart Edu\ml\.venv\Scripts\python.exe" -m uvicorn app.main:app --port 8000
```
- Health Check: [http://localhost:8000/ml/v1/health](http://localhost:8000/ml/v1/health)

#### Step 3: Start the Backend REST API (Spring Boot)
```powershell
cd "d:\Smart Edu\backend"
mvn spring-boot:run "-Dspring-boot.run.arguments=--spring.datasource.password=dev-password-change-me"
```
- Flyway will automatically apply migrations (`V1` through `V8`).
- REST API Base: [http://localhost:8080/api/v1](http://localhost:8080/api/v1)

#### Step 4: Start the Frontend Web App (Next.js)
```powershell
cd "d:\Smart Edu\frontend"
# If running for the first time:
# npm install

npm run dev
```
- Open browser at: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Verification & End-to-End Tests

To verify that all services and integration points are functioning correctly, execute the end-to-end integration test suite:

```powershell
& "d:\Smart Edu\ml\.venv\Scripts\python.exe" e2e_test.py
```

### Expected Output:
```text
========================================
STARTING FULL END-TO-END SYSTEM TEST
========================================
[PASS] 1. ML Engine Health Endpoint
[PASS] 2. Student Authentication (Login & Session Cookie)
[PASS] 3. Quiz Generation by Topic & Attempt Evaluation (Score: 3/3, 100%)
[PASS] 4. Flashcard Generation & SM-2 Spaced Repetition Review
[PASS] 5. Study Tasks CRUD Lifecycle (Create -> Complete -> Delete)
[PASS] 6. Focus Mode Timer Lifecycle (Start -> Pause -> Resume -> Finish)
[PASS] 7. AI Tutor (ChatGPT Mode / NLP Query)
[PASS] 8. Parent Portal (Children linked & live progress)
[PASS] 9. Admin Portal (Telemetry, JVM diagnostics & user management)
========================================
ALL 9 CRITICAL E2E INTEGRATION SUITES PASSED!
========================================
```

---

## 🌐 Service URLs Reference

| Service | Address | Description |
| :--- | :--- | :--- |
| **Web Application** | `http://localhost:3000` | Main user interface |
| **Student Dashboard** | `http://localhost:3000/dashboard` | Study tools & overview |
| **Parent Portal** | `http://localhost:3000/parent` | Student link & progress view |
| **Admin Portal** | `http://localhost:3000/admin` | System telemetry & role control |
| **API Endpoints** | `http://localhost:8080/api/v1` | Spring Boot REST API |
| **ML Health Check** | `http://localhost:8000/ml/v1/health` | FastAPI health & readiness |
| **Database** | `localhost:3306` | MySQL server (`smart_study`) |

---

## 🛠️ Environment Configuration (`.env`)

Key configuration flags available in `.env`:

```ini
# Database
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/smart_study?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
SPRING_DATASOURCE_USERNAME=smart_study
SPRING_DATASOURCE_PASSWORD=dev-password-change-me

# Backend
SERVER_PORT=8080
ML_SERVICE_URL=http://localhost:8000
WEB_ORIGIN=http://localhost:3000
JWT_SECRET=local-development-secret-key-change-me-please-0123456789
COOKIE_SECURE=false

# ML Engine
ML_SERVICE_PORT=8000
ML_INTERNAL_TOKEN=dev-internal-token-change-me
OCR_ENABLED=false
```

---

## 📁 Repository Structure

```
Smart-Edu/
├── backend/                  # Java 21 / Spring Boot REST API
│   ├── src/main/java/        # Controllers, services, security, domain models
│   ├── src/main/resources/   # Flyway migrations (db/migration/V1__... to V8__...)
│   └── pom.xml               # Maven dependencies and build setup
├── frontend/                 # Next.js 16 Web Application
│   ├── src/app/              # App Router pages (login, dashboard, focus, quizzes, etc.)
│   ├── src/components/       # UI components & layouts
│   ├── src/hooks/            # TanStack Query custom hooks
│   └── src/lib/              # Typed API client & query provider
├── ml/                       # FastAPI NLP Engine
│   ├── app/main.py           # Text extraction, summarization, quiz generation
│   └── requirements.txt      # Python dependencies
├── mysql-local/data/         # Local MySQL data files and tables
├── docs/                     # Specifications, progress, and feature matrix
├── e2e_test.py               # 9-suite End-to-End integration test runner
├── run-all.ps1               # Automated startup script
├── stop-all.ps1              # Automated shutdown script
└── README.md                 # Project documentation & credentials
```
