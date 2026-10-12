# Smart Study Portal — Frontend Specification

## 1. Frontend Goal

The frontend should feel like a polished modern learning product: calm, fast, accessible, responsive, and focused on the student's next action.

The UI should use an **Apple-inspired design language** without copying Apple's proprietary UI, branding, or assets.

### Recommended stack

- **React + TypeScript**
- Vite or Next.js
- CSS Modules / Tailwind CSS
- TanStack Query for server state
- React Hook Form + Zod for forms and validation
- Recharts or Apache ECharts for analytics
- Lucide icons or another consistent open-source icon set
- PDF.js for browser-side PDF preview where appropriate

If the academic requirement specifically requires plain HTML/CSS/JavaScript, the same information architecture can be implemented without React.

---

## 2. Main User Roles

### Student
- Dashboard
- Upload study material
- AI summary
- Topics and key concepts
- Study planner
- Daily tasks
- Focus session
- Quiz
- Progress analytics
- Streaks
- Profile/settings

### Parent
- Linked students
- Progress overview
- Weekly report
- Attendance/activity indicators
- Quiz and completion trends
- Notifications

### Admin
- User management
- Content/moderation tools
- System health
- AI usage monitoring
- Audit logs
- Analytics

---

## 3. Information Architecture

```text
App
├── Authentication
│   ├── Login
│   ├── Register
│   ├── Forgot Password
│   └── Account Verification
│
├── Student
│   ├── Dashboard
│   ├── Materials
│   ├── Material Detail
│   ├── AI Summary
│   ├── Topics
│   ├── Study Planner
│   ├── Daily Tasks
│   ├── Focus Mode
│   ├── Quizzes
│   ├── Quiz Result
│   ├── Progress
│   └── Settings
│
├── Parent
│   ├── Dashboard
│   ├── Student Progress
│   ├── Reports
│   └── Settings
│
└── Admin
    ├── Users
    ├── Content
    ├── AI/Jobs
    ├── System Health
    └── Audit Logs
```

---

## 4. Core Screens

### Dashboard
Show only high-value information above the fold:

- Greeting
- Today's priority task
- Study progress
- Current streak
- Upcoming tasks
- Recent quiz performance
- Recommended next action

Avoid filling the dashboard with too many cards.

### Materials
- Drag-and-drop upload
- PDF/document preview
- Processing status
- Search/filter
- Subject and topic tags
- Summary availability
- Delete/archive actions

### Study Planner
- Day/week/month views
- Drag-and-drop task adjustment
- Estimated duration
- Priority
- Difficulty
- Deadline
- Completed/remaining workload

### Quiz
- One question at a time for focus mode
- Progress indicator
- Timer only when the quiz requires it
- Answer review
- Explanation after submission
- Final score
- Weak-topic recommendations

### Analytics
- Accuracy
- Completion rate
- Study time
- Quiz trend
- Topic mastery
- Weak topics
- Consistency
- Comparison against the student's own historical performance

Avoid unnecessary competitive ranking.

---

## 5. Frontend State Model

Separate state into:

### Server state
- User
- Materials
- summaries
- schedules
- tasks
- quizzes
- results
- analytics

Use TanStack Query or equivalent.

### Local UI state
- Modal open/close
- Selected tab
- Filters
- Sidebar state
- Theme
- Temporary form values

Do not store sensitive authentication information in ordinary localStorage when a safer cookie-based approach is available.

---

## 6. API Integration

Recommended API style:

```text
/api/v1/auth/*
/api/v1/users/*
/api/v1/materials/*
/api/v1/summaries/*
/api/v1/topics/*
/api/v1/plans/*
/api/v1/tasks/*
/api/v1/quizzes/*
/api/v1/progress/*
/api/v1/parents/*
```

For long-running AI jobs, the frontend should show:

```text
Uploaded
   ↓
Queued
   ↓
Processing
   ↓
Ready
   ↓
Failed → Retry
```

Do not make the browser wait synchronously for large NLP jobs.

---

## 7. Accessibility

Target WCAG 2.2 AA where practical.

Requirements:

- Keyboard navigation
- Visible focus states
- Semantic HTML
- Proper labels
- Accessible error messages
- Sufficient contrast
- Reduced-motion support
- Screen-reader-friendly charts/alternatives
- Touch targets large enough for mobile use

---

## 8. Performance

- Lazy-load large pages
- Compress/resize preview images
- Paginate material lists
- Virtualize very long lists
- Cache frequently used API responses
- Debounce search
- Avoid unnecessary re-renders
- Use skeleton loading rather than blank screens

Target a fast first meaningful interaction on normal mobile and desktop connections.

---

## 9. Frontend Error Handling

Every important async operation needs:

- Loading state
- Success state
- Empty state
- Error state
- Retry action

Example:

```text
No materials yet
Upload your first PDF to create summaries, topics and quizzes.
[ Upload Material ]
```

---

## 10. Recommended Advanced Features

- Global command/search palette
- Offline-friendly task viewing
- Calendar integration
- Focus/Pomodoro mode
- Keyboard shortcuts
- Smart reminders
- Resume-last-study-session
- AI chat grounded only in uploaded/approved study material
- Explain-this-topic action
- Flashcards
- Spaced-repetition review
- Exam countdown
- Accessibility preferences
- Export study plan/report as PDF
- Installable PWA

---

## 11. Frontend Definition of Done

A frontend feature is complete only when it has:

- Responsive layout
- Loading state
- Empty state
- Error state
- Validation
- Accessibility support
- API integration
- Mobile behavior
- Success feedback
- Basic automated tests
