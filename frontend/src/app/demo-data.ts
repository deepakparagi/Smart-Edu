const day = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

export const demoMaterials = [
  {
    id: 101,
    title: "Cell Biology — Unit 3",
    fileName: "cell-biology-unit-3.pdf",
    status: "COMPLETED",
    summary: "Cells use specialized structures to keep internal conditions stable. The cell membrane controls what enters and leaves, while mitochondria release usable energy through cellular respiration.",
    topicsJson: "[\"Cell membrane\",\"Organelles\",\"Cellular respiration\"]",
    keywordsJson: "[\"homeostasis\",\"mitochondria\",\"ATP\"]",
  },
  {
    id: 102,
    title: "Algebra — Functions & Graphs",
    fileName: "algebra-functions.docx",
    status: "COMPLETED",
    summary: "A function maps every input to exactly one output. The slope of a linear graph describes its rate of change, and the y-intercept gives the output when x is zero.",
    topicsJson: "[\"Functions\",\"Linear equations\",\"Graph interpretation\"]",
    keywordsJson: "[\"domain\",\"slope\",\"intercept\"]",
  },
  {
    id: 103,
    title: "World History — The Silk Roads",
    fileName: "silk-roads-notes.txt",
    status: "COMPLETED",
    summary: "The Silk Roads connected communities across Asia, Africa, and Europe. Merchants moved goods along the network, while travelers also carried technologies, ideas, and religious traditions.",
    topicsJson: "[\"Trade networks\",\"Cultural exchange\",\"Technology\"]",
    keywordsJson: "[\"caravans\",\"Eurasia\",\"exchange\"]",
  },
];

export const demoPlan = { id: 51, startDate: day(0), endDate: day(6), dailyAvailableMinutes: 75 };

export const demoTasks = [
  { id: 501, title: "Review cell membrane transport", subject: "Biology", scheduledDate: day(0), estimatedMinutes: 25, priority: "HIGH", status: "PENDING" },
  { id: 502, title: "Practice graphing linear functions", subject: "Algebra", scheduledDate: day(0), estimatedMinutes: 30, priority: "MEDIUM", status: "PENDING" },
  { id: 503, title: "Make a timeline for Silk Road trade", subject: "World History", scheduledDate: day(1), estimatedMinutes: 35, priority: "MEDIUM", status: "PENDING" },
  { id: 504, title: "Read notes on cellular respiration", subject: "Biology", scheduledDate: day(-1), estimatedMinutes: 20, priority: "LOW", status: "COMPLETED" },
  { id: 505, title: "Label the main cell organelles", subject: "Biology", scheduledDate: day(-2), estimatedMinutes: 25, priority: "MEDIUM", status: "COMPLETED" },
  { id: 506, title: "Graph three linear relations", subject: "Algebra", scheduledDate: day(-2), estimatedMinutes: 30, priority: "MEDIUM", status: "COMPLETED" },
  { id: 507, title: "Summarize Silk Road cultural exchange", subject: "World History", scheduledDate: day(-3), estimatedMinutes: 25, priority: "MEDIUM", status: "COMPLETED" },
  { id: 508, title: "Make mitochondria flashcards", subject: "Biology", scheduledDate: day(-3), estimatedMinutes: 20, priority: "LOW", status: "COMPLETED" },
  { id: 509, title: "Review function inputs and outputs", subject: "Algebra", scheduledDate: day(-4), estimatedMinutes: 15, priority: "LOW", status: "COMPLETED" },
  { id: 510, title: "Practice Silk Road vocabulary", subject: "World History", scheduledDate: day(-4), estimatedMinutes: 25, priority: "MEDIUM", status: "COMPLETED" },
  { id: 511, title: "Check cell transport definitions", subject: "Biology", scheduledDate: day(-5), estimatedMinutes: 20, priority: "LOW", status: "COMPLETED" },
];

export const demoSessions = [
  { id: 701, taskId: 504, startedAt: new Date(Date.now() - 86_400_000).toISOString(), activeSince: null, durationSeconds: 1_620, status: "COMPLETED" as const },
  { id: 702, taskId: 502, startedAt: new Date(Date.now() - 172_800_000).toISOString(), activeSince: null, durationSeconds: 2_040, status: "COMPLETED" as const },
  { id: 703, taskId: null, startedAt: new Date(Date.now() - 259_200_000).toISOString(), activeSince: null, durationSeconds: 1_380, status: "COMPLETED" as const },
];

export const demoQuizzes = [
  {
    id: 201,
    title: "Cell Biology — Quick Check",
    materialId: 101,
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    questions: [
      { question: "Which structure regulates the movement of substances into and out of a cell?", options: ["Cell membrane", "Ribosome", "Nucleus", "Golgi apparatus"], correctAnswer: "Cell membrane", explanation: "The selectively permeable cell membrane helps maintain a stable internal environment.", difficulty: "easy", source_reference: "Cell Biology — Unit 3, section 1" },
      { question: "Which organelle is the main site of cellular respiration?", options: ["Chloroplast", "Mitochondrion", "Vacuole", "Lysosome"], correctAnswer: "Mitochondrion", explanation: "Mitochondria release energy from nutrients and transfer it into ATP.", difficulty: "medium", source_reference: "Cell Biology — Unit 3, section 2" },
      { question: "What is the cell's ability to keep internal conditions relatively stable called?", options: ["Diffusion", "Homeostasis", "Osmosis", "Synthesis"], correctAnswer: "Homeostasis", explanation: "Homeostasis describes the regulation of a stable internal environment.", difficulty: "easy", source_reference: "Cell Biology — Unit 3, section 1" },
    ],
  },
  {
    id: 202,
    title: "Functions & Graphs — Practice",
    materialId: 102,
    createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    questions: [
      { question: "What must be true for a relation to be a function?", options: ["Each input has exactly one output", "Each output has exactly one input", "The graph must be a straight line", "Inputs and outputs must be equal"], correctAnswer: "Each input has exactly one output", explanation: "A function assigns exactly one output to every input in its domain.", difficulty: "easy", source_reference: "Algebra — Functions & Graphs, section 1" },
      { question: "In y = 3x + 2, what does 3 represent?", options: ["The y-intercept", "The slope", "The domain", "The output"], correctAnswer: "The slope", explanation: "In slope-intercept form y = mx + b, m is the slope.", difficulty: "medium", source_reference: "Algebra — Functions & Graphs, section 2" },
    ],
  },
];

export const demoFlashcards = [
  { id: 301, materialId: 101, front: "What is homeostasis?", back: "The regulation of relatively stable internal conditions in a cell or organism.", sourceReference: "Cell Biology — Unit 3, section 1", nextReview: day(0), reviewCount: 2, intervalDays: 1 },
  { id: 302, materialId: 101, front: "What is the role of mitochondria?", back: "They release usable energy from nutrients during cellular respiration and help produce ATP.", sourceReference: "Cell Biology — Unit 3, section 2", nextReview: day(0), reviewCount: 1, intervalDays: 1 },
  { id: 303, materialId: 102, front: "What is the slope of a line?", back: "A measure of the line's rate of change: the change in y divided by the change in x.", sourceReference: "Algebra — Functions & Graphs, section 2", nextReview: day(1), reviewCount: 3, intervalDays: 3 },
  { id: 304, materialId: 103, front: "What moved along the Silk Roads besides goods?", back: "Technologies, ideas, and religious traditions also traveled through cultural contact.", sourceReference: "World History — The Silk Roads, section 1", nextReview: day(0), reviewCount: 0, intervalDays: 0 },
];

export const demoOverview = { totalStudyMinutes: 286, completedTasks: 8, totalTasks: 11, taskCompletionPercent: 73, quizAttempts: 4, quizAccuracyPercent: 84 };
export const demoTrends = {
  studyMinutes: [
    { date: day(-6), minutes: 28 }, { date: day(-5), minutes: 42 }, { date: day(-4), minutes: 0 },
    { date: day(-3), minutes: 36 }, { date: day(-2), minutes: 51 }, { date: day(-1), minutes: 44 }, { date: day(0), minutes: 32 },
  ],
  taskCompletions: [
    { date: day(-6), completed: 1 }, { date: day(-5), completed: 2 }, { date: day(-4), completed: 0 },
    { date: day(-3), completed: 1 }, { date: day(-2), completed: 2 }, { date: day(-1), completed: 1 }, { date: day(0), completed: 1 },
  ],
  quizAccuracy: [
    { date: day(-6), percent: 75 }, { date: day(-5), percent: 0 }, { date: day(-4), percent: 0 },
    { date: day(-3), percent: 80 }, { date: day(-2), percent: 0 }, { date: day(-1), percent: 90 }, { date: day(0), percent: 84 },
  ],
};

export const demoConversations = [
  { id: 901, title: "How does the cell membrane help?", createdAt: new Date().toISOString() },
  { id: 902, title: "Understanding the slope", createdAt: new Date(Date.now() - 86_400_000).toISOString() },
];

export const demoTutorMessages = [
  { id: 1, role: "USER", content: "How does the cell membrane help a cell maintain balance?", sources: [] },
  { id: 2, role: "TUTOR", content: "Your notes say the cell membrane controls what enters and leaves the cell. By regulating this movement, the membrane helps the cell keep its internal conditions stable, a process called homeostasis.", sources: [{ materialTitle: "Cell Biology — Unit 3", reference: "Section 1 · Cell membrane", text: "The selectively permeable cell membrane regulates the movement of substances into and out of the cell, helping the cell maintain homeostasis." }] },
];

export const demoQuizResult = (questions: typeof demoQuizzes[number]["questions"], answers: string[]) => {
  const results = questions.map((question, index) => ({
    question: question.question,
    selectedAnswer: answers[index],
    correctAnswer: question.correctAnswer,
    correct: answers[index] === question.correctAnswer,
    explanation: question.explanation,
    sourceReference: question.source_reference,
  }));
  const score = results.filter((item) => item.correct).length;
  return { score, total: results.length, accuracyPercent: results.length ? Math.round(score * 100 / results.length) : 0, results, notice: "Demo quiz result — practice answers are stored only in this page preview." };
};
