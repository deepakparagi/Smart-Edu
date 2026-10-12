# Smart Study Portal — Backend Specification

## 1. Backend Goal

The backend is responsible for authentication, authorization, business rules, data persistence, scheduling, quiz management, analytics, notifications, and communication with the ML service.

## 2. Recommended Stack

### Application
- Java 21+
- Spring Boot 3.x
- Spring Web
- Spring Security
- Spring Data JPA
- Hibernate
- Bean Validation
- Flyway or Liquibase
- OpenAPI/Swagger

### Data
- MySQL 8+
- Redis for caching/rate limiting/short-lived job state
- Object storage such as S3-compatible storage for uploaded files

### Infrastructure
- Docker
- Nginx or cloud load balancer
- CI/CD with GitHub Actions or equivalent

---

## 3. Service Architecture

Start as a **modular monolith**, not microservices.

```text
Spring Boot
├── Auth Module
├── User Module
├── Material Module
├── Processing/AI Module
├── Topic Module
├── Planning Module
├── Task Module
├── Quiz Module
├── Progress Module
├── Parent Module
├── Notification Module
└── Admin/Audit Module
```

A modular monolith is simpler for a student project while keeping boundaries clear enough for future extraction.

---

## 4. Authentication

Use:

- Password hashing with Argon2id or BCrypt
- Short-lived access tokens or secure server sessions
- Refresh-token rotation if JWT is used
- Secure, HttpOnly, SameSite cookies where appropriate
- Role-based authorization

Roles:

```text
STUDENT
PARENT
ADMIN
```

Never store plain-text passwords.

---

## 5. Core Data Model

### User

```text
id
name
email
password_hash
role
timezone
created_at
updated_at
```

### StudentProfile

```text
id
user_id
grade
education_level
daily_available_minutes
preferred_study_time
```

### ParentStudentLink

```text
id
parent_id
student_id
status
created_at
```

### StudyMaterial

```text
id
owner_id
title
file_name
mime_type
storage_key
file_size
status
created_at
```

### MaterialProcessingJob

```text
id
material_id
status
job_type
started_at
completed_at
error_message
```

### Topic

```text
id
material_id
name
description
importance
difficulty
```

### Summary

```text
id
material_id
summary_text
model_name
created_at
```

### StudyPlan

```text
id
student_id
start_date
end_date
status
```

### StudyTask

```text
id
plan_id
topic_id
title
scheduled_date
estimated_minutes
priority
status
completed_at
```

### Quiz

```text
id
material_id
title
difficulty
created_at
```

### Question

```text
id
quiz_id
question_text
question_type
explanation
```

### AnswerOption

```text
id
question_id
option_text
is_correct
```

### QuizAttempt

```text
id
quiz_id
student_id
score
started_at
submitted_at
```

### ProgressEvent

```text
id
student_id
event_type
entity_id
value
occurred_at
```

---

## 6. API Design

Use versioned REST APIs.

### Authentication

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
POST /api/v1/auth/forgot-password
```

### Materials

```http
POST   /api/v1/materials
GET    /api/v1/materials
GET    /api/v1/materials/{id}
DELETE /api/v1/materials/{id}
POST   /api/v1/materials/{id}/process
```

### Study Plan

```http
POST /api/v1/plans/generate
GET  /api/v1/plans/current
PATCH /api/v1/tasks/{id}
POST /api/v1/tasks/{id}/complete
```

### Quiz

```http
POST /api/v1/quizzes/generate
GET  /api/v1/quizzes/{id}
POST /api/v1/quizzes/{id}/attempts
POST /api/v1/attempts/{id}/submit
```

### Analytics

```http
GET /api/v1/progress/overview
GET /api/v1/progress/topics
GET /api/v1/progress/trends
```

---

## 7. File Upload Security

Uploaded documents must be treated as untrusted.

Implement:

- MIME/type validation
- File-size limits
- Extension validation
- Malware scanning where feasible
- Random storage keys
- Private object storage
- Authorization before download
- Content extraction in an isolated processing environment

Do not execute uploaded files.

---

## 8. AI/NLP Integration

The Spring Boot backend should orchestrate the ML service.

```text
Client
  ↓
Spring Boot
  ↓
Create processing job
  ↓
Queue
  ↓
Python ML service
  ↓
Store result
  ↓
Spring Boot
  ↓
Client
```

Use asynchronous jobs for expensive processing.

---

## 9. Scheduling Engine

Inputs:

- Topic difficulty
- Topic importance
- Exam/deadline
- Available daily time
- Estimated task duration
- Student preferences
- Previous performance
- Spaced-repetition due date

A transparent priority score can be used:

```text
priority =
    difficulty_weight * difficulty
  + importance_weight * importance
  + urgency_weight * urgency
  + weakness_weight * weakness
  + review_weight * review_due
```

Weights should be configurable and documented.

The planner must respect daily time limits.

---

## 10. Analytics

Calculate:

- Quiz accuracy
- Task completion rate
- Study minutes
- Topic mastery
- Review consistency
- Weekly trend
- Weak-topic frequency

Do not infer sensitive personal characteristics from performance data.

---

## 11. Notifications

Support:

- In-app reminders
- Email notifications
- Optional push notifications

Users must be able to control notification preferences.

---

## 12. Security Requirements

- OWASP-aligned API security
- Input validation
- Authorization checks on every protected resource
- Rate limiting
- CSRF protection where cookie authentication is used
- Secure headers
- Audit logs for sensitive actions
- Secrets stored outside source code
- Database backups
- Encryption in transit
- Encryption at rest where supported

---

## 13. Testing

### Unit tests
- Scheduling logic
- Scoring
- Validation
- Permissions

### Integration tests
- Database repositories
- REST endpoints
- Authentication
- ML-service communication

### Security tests
- Unauthorized access
- IDOR/BOLA attempts
- Malformed uploads
- Rate-limit behavior

---

## 14. Backend Features to Add Later

- Redis-backed job queue
- WebSocket/SSE processing updates
- Multi-device synchronization
- Calendar integrations
- Admin analytics
- Feature flags
- Audit/event stream
- Recommendation engine
- Content versioning
