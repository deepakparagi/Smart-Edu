import { z } from 'zod';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public fieldErrors?: Record<string, string[]>,
    public traceId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response, schema?: z.ZodSchema<T>): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    let errorData: any = {};
    if (isJson) {
      errorData = await response.json().catch(() => ({}));
    }
    const message = errorData.detail || errorData.message || errorData.error || `HTTP ${response.status}`;
    throw new ApiError(message, response.status, errorData.code, errorData.fieldErrors, errorData.traceId);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!isJson) {
    return undefined as T;
  }

  const data = await response.json();
  if (schema) {
    return schema.parse(data);
  }
  return data;
}

export const api = {
  async get<T>(path: string, schema?: z.ZodSchema<T>, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    return handleResponse(response, schema);
  },

  async post<T>(path: string, body?: unknown, schema?: z.ZodSchema<T>, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(response, schema);
  },

  async patch<T>(path: string, body?: unknown, schema?: z.ZodSchema<T>, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(response, schema);
  },

  async delete<T>(path: string, schema?: z.ZodSchema<T>, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    return handleResponse(response, schema);
  },

  async upload<T>(path: string, file: File, schema?: z.ZodSchema<T>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse(response, schema);
  },

  async download(path: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new ApiError('Download failed', response.status);
    }
    return response.blob();
  },
};

// Zod schemas for API responses
export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['STUDENT', 'PARENT', 'ADMIN']),
  timezone: z.string().optional(),
  emailVerified: z.boolean().optional(),
});

export const MaterialSchema = z.object({
  id: z.number(),
  ownerId: z.number(),
  title: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  fileSize: z.number(),
  status: z.string(),
  summary: z.string().nullable().optional(),
  topicsJson: z.string().nullable().optional(),
  keywordsJson: z.string().nullable().optional(),
  processingError: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const MaterialListSchema = z.object({
  content: z.array(MaterialSchema),
  totalElements: z.number(),
  totalPages: z.number(),
  size: z.number(),
  number: z.number(),
});

export const MaterialDetailSchema = MaterialSchema.extend({
  extractedText: z.string().nullable().optional(),
});

export const FlashcardSchema = z.object({
  id: z.number(),
  ownerId: z.number(),
  materialId: z.number().nullable(),
  front: z.string(),
  back: z.string(),
  sourceReference: z.string().nullable().optional(),
  nextReview: z.string().nullable().optional(),
  intervalDays: z.number(),
  easeFactor: z.number(),
  reviewCount: z.number(),
  createdAt: z.string(),
});

export const FlashcardReviewSchema = z.object({
  id: z.number(),
  flashcardId: z.number(),
  userId: z.number(),
  quality: z.number(),
  previousIntervalDays: z.number(),
  newIntervalDays: z.number(),
  previousEaseFactor: z.number(),
  newEaseFactor: z.number(),
  reviewedAt: z.string(),
});

export const QuizSchema = z.object({
  id: z.number(),
  ownerId: z.number(),
  materialId: z.number(),
  title: z.string(),
  questionsJson: z.string(),
  createdAt: z.string(),
});

export const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.string(),
  correctIndex: z.number().optional(),
  explanation: z.string(),
  difficulty: z.string(),
  sourceReference: z.string(),
});

export const QuizAttemptSchema = z.object({
  id: z.number(),
  quizId: z.number(),
  studentId: z.number(),
  score: z.number(),
  totalQuestions: z.number(),
  answersJson: z.string(),
  submittedAt: z.string(),
});

export const ProgressOverviewSchema = z.object({
  totalStudyMinutes: z.number(),
  completedTasks: z.number(),
  totalTasks: z.number(),
  taskCompletionPercent: z.number(),
  quizAttempts: z.number(),
  quizAccuracyPercent: z.number(),
  streakDays: z.number().optional(),
  weakTopics: z.array(z.object({
    topic: z.string(),
    accuracy: z.number(),
    attempts: z.number(),
  })).optional(),
  flashcardRetention: z.number().optional(),
});

export const ProgressTrendsSchema = z.object({
  studyMinutes: z.array(z.object({ date: z.string(), minutes: z.number() })),
  taskCompletions: z.array(z.object({ date: z.string(), completed: z.number() })),
  quizAccuracy: z.array(z.object({ date: z.string(), percent: z.number() })),
  flashcardReviews: z.array(z.object({ date: z.string(), count: z.number() })).optional(),
});

export const TaskSchema = z.object({
  id: z.number(),
  studentId: z.number(),
  planId: z.number().nullable(),
  title: z.string(),
  subject: z.string().nullable(),
  scheduledDate: z.string().nullable(),
  estimatedMinutes: z.number(),
  priority: z.string(),
  status: z.string(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const FocusSessionSchema = z.object({
  id: z.number(),
  studentId: z.number(),
  taskId: z.number().nullable(),
  startedAt: z.string(),
  activeSince: z.string().nullable(),
  endedAt: z.string().nullable(),
  durationSeconds: z.number(),
  status: z.string(),
});

export const TutorConversationSchema = z.object({
  id: z.number(),
  ownerId: z.number(),
  title: z.string(),
  createdAt: z.string(),
});

export const TutorMessageSchema = z.object({
  id: z.number(),
  conversationId: z.number(),
  role: z.enum(['USER', 'TUTOR']),
  content: z.string(),
  sourcesJson: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const ParentLinkSchema = z.object({
  id: z.number(),
  parentId: z.number(),
  studentId: z.number(),
  status: z.string(),
  createdAt: z.string(),
});

// Type exports
export type User = z.infer<typeof UserSchema>;
export type Material = z.infer<typeof MaterialSchema>;
export type MaterialDetail = z.infer<typeof MaterialDetailSchema>;
export type MaterialList = z.infer<typeof MaterialListSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type FlashcardReview = z.infer<typeof FlashcardReviewSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type QuizAttempt = z.infer<typeof QuizAttemptSchema>;
export type ProgressOverview = z.infer<typeof ProgressOverviewSchema>;
export type ProgressTrends = z.infer<typeof ProgressTrendsSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type FocusSession = z.infer<typeof FocusSessionSchema>;
export type TutorConversation = z.infer<typeof TutorConversationSchema>;
export type TutorMessage = z.infer<typeof TutorMessageSchema>;
export type ParentLink = z.infer<typeof ParentLinkSchema>;