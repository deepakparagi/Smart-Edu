# Smart Study Portal — UI/UX & Design System

## 1. Design Vision

Create a **minimal, premium, Apple-inspired educational interface**:

- Calm
- Spacious
- Content-first
- Highly readable
- Subtle motion
- Clear hierarchy
- Very few unnecessary controls

Apple-inspired here means using principles such as simplicity, whitespace, hierarchy, restrained motion, and polished interaction — not copying Apple's proprietary visual assets.

---

## 2. Design Principles

### 1. One primary action
Every major screen should make the next action obvious.

### 2. Reduce cognitive load
Students should see what matters now before seeing everything the system knows.

### 3. Progressive disclosure
Advanced analytics and controls should appear only when useful.

### 4. Consistency
The same action should look and behave the same everywhere.

### 5. Calm feedback
Use subtle transitions and clear status indicators rather than excessive animations.

---

## 3. Visual Language

### Typography

Recommended:

```text
Primary: Inter / SF Pro-like system stack
Headings: strong but not oversized
Body: 15–17px
Secondary text: 13–14px
```

Use a system font stack where licensing/availability matters.

### Shape

- Soft rounded cards
- Consistent corner radius
- Thin borders
- Very subtle shadows
- Generous spacing

Avoid excessive glassmorphism.

### Color

Use a restrained neutral palette:

```text
Background: near-white / soft neutral
Surface: white
Primary text: near-black
Secondary text: muted gray
Accent: one brand accent
Success: restrained green
Warning: restrained amber
Error: restrained red
```

Do not use a rainbow dashboard.

---

## 4. Layout

Desktop:

```text
┌────────────────────────────────────────────────────┐
│ Logo        Search              Notifications User │
├────────────┬───────────────────────────────────────┤
│ Sidebar    │ Main content                          │
│            │                                       │
│ Dashboard  │ Today's focus                         │
│ Materials  │ ┌───────────────────────────────────┐ │
│ Planner    │ │ Primary task                       │ │
│ Quizzes    │ └───────────────────────────────────┘ │
│ Progress   │                                       │
│ Settings   │ Progress / upcoming / recommendations │
└────────────┴───────────────────────────────────────┘
```

Mobile:

```text
┌──────────────────────┐
│ Greeting       Avatar│
├──────────────────────┤
│ Today's Focus        │
│                      │
├──────────────────────┤
│ Progress             │
├──────────────────────┤
│ Upcoming Tasks       │
├──────────────────────┤
│ Bottom Navigation    │
└──────────────────────┘
```

---

## 5. Dashboard Hierarchy

Recommended order:

1. Today's focus
2. Progress snapshot
3. Upcoming tasks
4. Continue studying
5. Weak topics
6. Recent activity

Do not place ten unrelated statistics at the top.

---

## 6. Material Experience

The material page should feel like a document workspace.

```text
Material title
Subject • 8 pages • Ready

[ Read ] [ Summary ] [ Topics ] [ Quiz ]

Summary
────────────────────────
Key ideas...

Topics
• Topic A
• Topic B

[ Generate Quiz ]
```

---

## 7. Study Planner UX

Use visual time blocks.

Each task should show:

```text
Topic
Estimated duration
Difficulty
Priority
Review status
```

Allow:

- Drag to reschedule
- Quick complete
- Edit duration
- Move to another day
- Skip with reason

---

## 8. Focus Mode

Focus Mode should remove distractions.

```text
Topic
      ↓
Current task
      ↓
25:00

[ Pause ] [ Complete ]

Notes
```

Optional:

- Pomodoro
- Ambient sound
- Full-screen mode
- Progress indicator

---

## 9. Analytics UX

Prefer meaningful trends over decorative charts.

Useful charts:

- Weekly study time
- Quiz accuracy trend
- Topic mastery
- Completion consistency

Each chart should answer a question.

Bad:

> Random chart with no explanation.

Better:

> "Your DBMS quiz accuracy increased from 62% to 78% over the last 3 attempts."

---

## 10. Empty States

Every empty screen needs:

1. Explanation
2. Benefit
3. One primary action

Example:

> Your study plan is empty.  
> Generate a plan using your available time and upcoming exam date.  
> **Generate Study Plan**

---

## 11. Motion

Use motion for:

- Page transitions
- Modal entry
- Progress changes
- Completion feedback

Avoid:

- Constant bouncing
- Decorative particle effects
- Long animations
- Motion that delays interaction

Respect `prefers-reduced-motion`.

---

## 12. Accessibility

- Keyboard support
- Visible focus
- Semantic labels
- Contrast
- Reduced motion
- Screen-reader-friendly controls
- Never communicate information by color alone

---

## 13. Design Tokens

Example:

```css
--radius-sm: 10px;
--radius-md: 16px;
--radius-lg: 24px;

--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
```

Keep tokens centralized so the whole application can be redesigned consistently.

---

## 14. Premium Features

- Command palette
- Beautiful document reader
- Focus mode
- Smart animations
- Keyboard shortcuts
- Dark mode
- Custom accent
- Personal study goals
- Calendar visualization
- AI tutor with citations
- Smooth onboarding
- Personalized dashboard widgets

---

## 15. Design Anti-Patterns to Avoid

- Too many cards
- Excessive gradients
- Excessive glassmorphism
- Tiny text
- Huge dashboards
- Too many colors
- Confusing navigation
- AI buttons everywhere
- Unexplained scores
- Gamification that distracts from learning
