import {
  GeneratedNotesPack,
  InterviewDossier,
  InterviewRubric,
  InterviewSetup,
  LanguageMode,
  MemoryTrickData,
  QuizConfig,
  QuizQuestion,
} from '../types';

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export interface QuizGenerateResponse {
  quizTitle: string;
  examTag: string;
  questions: QuizQuestion[];
}

export async function generateQuiz(config: QuizConfig, language: LanguageMode): Promise<QuizGenerateResponse> {
  return postJson<QuizGenerateResponse>('/api/quiz/generate', {
    ...config,
    language,
  });
}

export async function generateMemoryTrick(params: {
  question: string;
  correctAnswer: string;
  explanation: string;
  examName: string;
  language: LanguageMode;
}): Promise<MemoryTrickData> {
  return postJson<MemoryTrickData>('/api/quiz/memory-trick', params);
}

export interface InterviewStartResponse {
  interviewerName: string;
  interviewerRole: string;
  greeting: string;
  questionNumber: number;
  question: string;
  focusCompetency: string;
}

export async function startInterview(
  setup: InterviewSetup,
  language: LanguageMode
): Promise<InterviewStartResponse> {
  return postJson<InterviewStartResponse>('/api/interview/start', {
    ...setup,
    language,
  });
}

export interface InterviewEvaluateResponse {
  rubric: InterviewRubric;
  hasNextQuestion: boolean;
  nextQuestion: {
    questionNumber: number;
    question: string;
    focusCompetency: string;
  };
  isComplete: boolean;
  finalDossier: InterviewDossier;
}

export async function evaluateInterviewAnswer(params: {
  setup: InterviewSetup;
  language: LanguageMode;
  history: Array<{ question: string; answer: string; score: number }>;
  currentQuestion: string;
  userAnswer: string;
  currentRound: number;
  totalRounds: number;
}): Promise<InterviewEvaluateResponse> {
  return postJson<InterviewEvaluateResponse>('/api/interview/evaluate', {
    ...params.setup,
    language: params.language,
    history: params.history,
    currentQuestion: params.currentQuestion,
    userAnswer: params.userAnswer,
    currentRound: params.currentRound,
    totalRounds: params.totalRounds,
  });
}

export async function generateNotesPack(params: {
  inputMode: 'topic' | 'text';
  content: string;
  language: LanguageMode;
  gradeLevel?: string;
}): Promise<Omit<GeneratedNotesPack, 'id' | 'language'>> {
  return postJson<Omit<GeneratedNotesPack, 'id' | 'language'>>('/api/notes/generate', params);
}
