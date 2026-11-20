export type LanguageMode = 'English' | 'Hinglish' | 'Hindi';

export type TabId = 'home' | 'quiz' | 'interview' | 'notes' | 'planner';

export interface QuizQuestion {
  id: string;
  subject: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizConfig {
  examName: string;
  topic: string;
  gradeLevel?: string;
  count: 5 | 10 | 15 | 20;
  difficulty: 'Easy' | 'Moderate' | 'Hard / Exam-Level';
  negativeMarking: 0 | 0.25 | 0.33;
  isDailySprint?: boolean;
}

export interface MemoryTrickData {
  mnemonicTitle: string;
  trick: string;
  quickFormulaOrFact: string;
}

export interface QuizAttemptSummary {
  id: string;
  quizTitle: string;
  examName: string;
  topic: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  score: number;
  maxScore: number;
  accuracyPercent: number;
  durationSeconds: number;
  negativeMarking: number;
  completedAt: string;
}

export interface SubjectStat {
  attempted: number;
  correct: number;
}

export interface AspirantProfile {
  xp: number;
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  totalAttempted: number;
  totalCorrect: number;
  subjectStats: Record<string, SubjectStat>;
  lastSession: {
    examName: string;
    topic: string;
    scoreLabel: string;
    accuracy: number;
    timestamp: string;
  } | null;
  recentQuizzes: QuizAttemptSummary[];
}

export interface InterviewSetup {
  jobRole: string;
  departmentType: string;
  experience: 'Fresher' | '1-3 Yrs';
  strictness: 'Friendly Mentor' | 'Strict Panelist';
}

export interface InterviewRubric {
  score: number;
  communicationAndStructure: string;
  redFlagsOrImprovements: string;
  modelAnswer: string;
}

export interface InterviewRoundEntry {
  round: number;
  question: string;
  focusCompetency: string;
  answer: string;
  rubric: InterviewRubric;
}

export interface InterviewDossier {
  verdict: 'Strong-Hire' | 'Hire' | 'Hold / Borderline' | 'Needs-Practice' | string;
  overallScore: number;
  summary: string;
  topFocusAreas: Array<{ area: string; actionStep: string }>;
}

export interface NoteSection {
  heading: string;
  points: string[];
}

export interface FlashcardItem {
  front: string;
  back: string;
}

export interface ProbableQuestionItem {
  question: string;
  answer: string;
  examRelevance: string;
}

export interface GeneratedNotesPack {
  id: string;
  title: string;
  subjectTag: string;
  bulletNotes: NoteSection[];
  flashcards: FlashcardItem[];
  probableQuestions: ProbableQuestionItem[];
  savedAt?: string;
  language: LanguageMode;
}

export interface StudyTask {
  id: string;
  title: string;
  subject: string;
  completed: boolean;
  createdAt: string;
}
