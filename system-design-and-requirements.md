# Smart Study Portal — System Design & Requirements

## 1. Project Overview

The Smart Study Portal is a personalized learning platform that converts study material into structured learning support using NLP/ML, scheduling, quizzes, progress analytics, and optional parent monitoring.

The original concept is good, but several points need correction:

### Corrections made

1. **Do not describe the system as a microservice architecture by default.**
   A modular monolith is more realistic for an academic project and easier to deploy.

2. **Do not call AI summaries automatically accurate.**
   AI output needs source references, validation, and a correction mechanism.

3. **Do not store uploaded files directly in a relational database unless there is a specific reason.**
   Store metadata in MySQL and files in private object storage.

4. **Do not run long NLP processing inside a normal synchronous HTTP request.**
   Use asynchronous processing jobs.

5. **Do not put authentication responsibility inside the ML service.**
   Spring Boot remains the security boundary.

6. **Do not make analytics purely decorative.**
   Each metric should support a learning decision.

7. **Do not use streaks as the main learning mechanism.**
   Use mastery, consistency, revision, and understanding as primary signals.

8. **Do not expose AI-generated answers without source context where possible.**
   Provide page/chunk references.

---

# 2. High-Level Architecture

```text
                         ┌──────────────────┐
                         │   Web / Mobile   │
                         │    Frontend      │
                         └────────┬─────────┘
                                  │ HTTPS
                                  ▼
                    ┌──────────────────────────┐
                    │      Spring Boot API     │
                    │ Auth • Users • Plans     │
                    │ Materials • Quiz • Stats │
                    └───────┬─────────┬────────┘
                            │         │
                   ┌────────▼───┐ ┌──▼──────────┐
                   │   MySQL    │ │ Redis       │
                   │ App data   │ │ Cache/Jobs  │
                   └────────────┘ └────┬────────┘
                                       │
                                 ┌─────▼─────┐
                                 │ ML Service │
                                 │ Python     │
                                 └─────┬─────┘
                                       │
                              ┌────────▼────────┐
                              │ NLP / LLM /     │
                              │ Embedding tools │
                              └─────────────────┘

Uploaded files
      │
      ▼
Private Object Storage
```

---

# 3. Functional Requirements

## FR-01 Authentication
The system shall allow users to register, log in, log out, reset passwords, and manage sessions.

## FR-02 Role Management
The system shall support Student, Parent, and Admin roles.

## FR-03 Student Profile
Students shall be able to define subjects, available study time, preferred study periods, goals, and exam dates.

## FR-04 Material Upload
Students shall be able to upload supported documents.

## FR-05 Processing
The system shall process uploaded material asynchronously.

## FR-06 Summarization
The system shall generate concise summaries with source references when available.

## FR-07 Topic Extraction
The system shall identify important topics and concepts.

## FR-08 Study Plan
The system shall generate a study plan using time availability, difficulty, urgency, importance, previous performance, and review requirements.

## FR-09 Task Management
Students shall be able to view, complete, edit, reschedule, and skip tasks.

## FR-10 Quiz Generation
The system shall generate quizzes from approved study material.

## FR-11 Quiz Evaluation
Objective questions shall be automatically evaluated.

## FR-12 Explanations
The system shall provide explanations for quiz answers when available.

## FR-13 Progress
The system shall track study activity, task completion, quiz results, and topic mastery.

## FR-14 Parent Monitoring
Parents shall only see students who have explicitly been linked to their account and have appropriate permissions.

## FR-15 Notifications
The system shall support configurable study reminders.

## FR-16 Search
Users shall be able to search their materials, topics, tasks, and quizzes.

---

# 4. Non-Functional Requirements

## Performance
- Normal API responses should target sub-second response times where practical.
- Large file processing must be asynchronous.
- Lists should be paginated.

## Scalability
The architecture should allow future separation of the ML processing service without redesigning the complete application.

## Security
- Passwords must be securely hashed.
- Protected endpoints require authorization.
- Uploaded files must be validated.
- Secrets must not be committed to source control.

## Availability
The system should gracefully recover from temporary ML/storage failures.

## Usability
A first-time student should be able to upload a document and start studying without training.

## Accessibility
Target WCAG 2.2 AA where practical.

## Maintainability
Use clear module boundaries, API contracts, automated tests, and database migrations.

---

# 5. Main Use Cases

### Student

```text
Register
  ↓
Create profile
  ↓
Upload notes
  ↓
Wait for processing
  ↓
Read summary
  ↓
Review topics
  ↓
Generate plan
  ↓
Study task
  ↓
Take quiz
  ↓
Receive result
  ↓
Review weak topic
  ↓
Repeat
```

### Parent

```text
Login
 ↓
Select linked student
 ↓
View weekly progress
 ↓
View quiz trends
 ↓
View completion consistency
```

### Admin

```text
Login
 ↓
Monitor users
 ↓
Monitor processing jobs
 ↓
Review errors
 ↓
Inspect audit logs
```

---

# 6. Study Plan Logic

The scheduler should not simply distribute chapters equally.

Suggested conceptual score:

```text
Priority =
    0.25 × Difficulty
  + 0.25 × Weakness
  + 0.20 × Urgency
  + 0.15 × Importance
  + 0.15 × ReviewDue
```

These weights are initial configuration values, not scientifically proven constants.

The system should:

1. Calculate available daily minutes.
2. Calculate topic workload.
3. Rank tasks.
4. Allocate high-priority tasks.
5. Reserve revision time.
6. Avoid overloading a day.
7. Recalculate after major progress changes.

---

# 7. Progress Model

Track at least:

```text
Study minutes
Tasks assigned
Tasks completed
Quiz attempts
Quiz accuracy
Topic mastery
Revision consistency
Last activity
```

### Mastery

A topic mastery score should combine recent evidence rather than only the latest quiz.

Example conceptual model:

```text
Mastery =
    recent quiz performance
  + repeated performance
  + completion evidence
  + review evidence
```

The exact formula should be documented and tested.

---

# 8. Recommended Database Relationships

```text
User
 ├── StudentProfile
 ├── ParentStudentLink
 ├── StudyMaterial
 │     ├── Summary
 │     ├── Topic
 │     └── Quiz
 │           └── Question
 │                 └── AnswerOption
 │
 └── StudyPlan
       └── StudyTask

Student
 └── QuizAttempt
       └── Answer

Student
 └── ProgressEvent
```

---

# 9. Processing State Machine

```text
UPLOADED
   ↓
QUEUED
   ↓
EXTRACTING
   ↓
PROCESSING
   ↓
READY
```

Failure path:

```text
ANY PROCESSING STATE
        ↓
      FAILED
        ↓
      RETRY
        ↓
      QUEUED
```

Store error information for debugging.

---

# 10. AI Safety & Quality

The platform should:

- Show that AI output may require verification.
- Preserve source references.
- Allow users to edit summaries/flashcards where appropriate.
- Log model/version information.
- Avoid inventing source references.
- Avoid using private student content for external model training without appropriate authorization.
- Provide a "Report incorrect content" action.

---

# 11. Requirements for Parent Module

Parent access must be privacy-aware.

Parents should see:

- Completion trends
- Study time
- Quiz performance
- General progress

Parents should not automatically see:

- Private notes
- Personal messages
- Raw AI conversations
- Sensitive information unrelated to academic progress

Exact visibility should be configurable according to the application's intended user population and applicable requirements.

---

# 12. Recommended Advanced Features

## A. AI Study Tutor
Ask questions about uploaded material and receive answers grounded in the student's sources.

## B. Flashcards
Automatic flashcard generation plus spaced repetition.

## C. Adaptive Quizzes
Difficulty changes based on performance.

## D. Exam Mode
Select an exam date and generate a revision countdown.

## E. Weak Topic Recovery
Automatically create a short recovery plan for weak areas.

## F. Concept Map
Show relationships between topics.

## G. OCR
Process scanned PDFs and images.

## H. Multilingual Learning
Support English plus regional languages such as Kannada where model quality permits.

## I. Voice Study
Read summaries aloud and accept voice questions.

## J. Calendar Integration
Sync study tasks with Google/Apple/Outlook calendars.

## K. PWA
Install the portal like an app.

## L. Smart Notifications
Notify only when a reminder is useful instead of sending excessive alerts.

## M. Document Versioning
Track updated versions of notes.

## N. Source-Grounded AI
Every AI-generated claim can point to a source page/chunk when possible.

## O. Teacher Mode
Teachers can create classes, share materials, assign quizzes, and monitor aggregate class progress.

## P. Collaborative Study
Optional study groups, shared resources, and discussion.

## Q. Gamification
Use restrained achievements, milestones, and personal goals rather than aggressive leaderboards.

---

# 13. MVP vs Future Scope

## MVP

```text
Authentication
Material upload
PDF/text extraction
Summary
Topic extraction
Study plan
Tasks
Quiz
Quiz scoring
Basic analytics
Student dashboard
```

## Version 2

```text
Flashcards
Spaced repetition
AI tutor
OCR
Advanced analytics
Notifications
Parent dashboard
Calendar integration
```

## Version 3

```text
Voice
Multilingual support
Teacher portal
Concept graph
Adaptive learning
Mobile/PWA improvements
Advanced recommendation engine
```

---

# 14. Testing Strategy

### Unit
- Scheduling
- Scoring
- Validation
- Permission rules

### Integration
- Authentication
- Database
- File processing
- ML API
- Quiz flow

### End-to-End
Test the complete path:

```text
Register
→ Upload
→ Process
→ Summary
→ Plan
→ Task
→ Quiz
→ Result
→ Analytics
```

### ML Evaluation
Maintain a fixed evaluation dataset and measure summary, topic, question, and recommendation quality.

---

# 15. Deployment

Recommended deployment:

```text
Frontend
   ↓
Static hosting/CDN

Spring Boot API
   ↓
Docker container

Python ML
   ↓
Docker container

MySQL
   ↓
Managed database where possible

Redis
   ↓
Managed Redis where possible

Object Storage
   ↓
Private bucket
```

Use separate development, testing, and production configurations.

---

# 16. Final Product Vision

The strongest version of the Smart Study Portal should not feel like:

> "A website with an AI summarizer and some charts."

It should feel like:

> **A personal learning operating system that turns a student's material, available time, performance, and goals into a clear daily learning path.**

The central loop should remain simple:

```text
LEARN
  ↓
PRACTICE
  ↓
MEASURE
  ↓
IDENTIFY WEAKNESS
  ↓
REVISE
  ↓
IMPROVE
```

Every feature should strengthen this loop.
