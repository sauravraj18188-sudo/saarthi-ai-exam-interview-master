import { AspirantProfile, GeneratedNotesPack, LanguageMode, QuizAttemptSummary, StudyTask } from '../types';

const PROFILE_KEY = 'saarthi_aspirant_profile_v1';
const NOTES_VAULT_KEY = 'saarthi_notes_vault_v1';
const TASKS_KEY = 'saarthi_study_tasks_v1';
const LANG_KEY = 'saarthi_language_mode';
const THEME_KEY = 'saarthi_theme';
const POMODORO_KEY = 'saarthi_pomodoro_stats_v1';

export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayDateStr(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLevelInfo(xp: number): { level: number; title: string; nextLevelXp: number; progressPct: number } {
  // 100 XP per level for crisp progression
  const level = Math.floor(xp / 100) + 1;
  const titles = [
    'Aspirant',
    'Scholar',
    'Contender',
    'Strategist',
    'Topper',
    'Master',
    'Ranker',
  ];
  const title = titles[Math.min(level - 1, titles.length - 1)];
  const currentLevelFloor = (level - 1) * 100;
  const nextLevelXp = level * 100;
  const progressPct = Math.min(100, Math.round(((xp - currentLevelFloor) / 100) * 100));
  return { level, title, nextLevelXp, progressPct };
}

export function getStrongestSubject(profile: AspirantProfile): string {
  const entries = Object.entries(profile.subjectStats);
  if (entries.length === 0) return 'Not tested yet';
  let bestSubject = entries[0][0];
  let bestScore = -1;
  for (const [subject, stat] of entries) {
    if (stat.attempted === 0) continue;
    const acc = stat.correct / stat.attempted;
    // Slight weight toward subjects with more attempted questions
    const weighted = acc * 100 + Math.min(stat.attempted, 20) * 0.5;
    if (weighted > bestScore) {
      bestScore = weighted;
      bestSubject = subject;
    }
  }
  return bestSubject;
}

export function loadProfile(): AspirantProfile {
  const today = getTodayDateStr();
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AspirantProfile;
      // Validate streak continuity
      const yesterday = getYesterdayDateStr();
      let streak = parsed.streakDays || 1;
      if (parsed.lastActiveDate !== today && parsed.lastActiveDate !== yesterday) {
        streak = 1;
      }
      const updated: AspirantProfile = {
        xp: parsed.xp ?? 0,
        streakDays: Math.max(1, streak),
        lastActiveDate: parsed.lastActiveDate || today,
        totalAttempted: parsed.totalAttempted ?? 0,
        totalCorrect: parsed.totalCorrect ?? 0,
        subjectStats: parsed.subjectStats ?? {},
        lastSession: parsed.lastSession ?? null,
        recentQuizzes: Array.isArray(parsed.recentQuizzes) ? parsed.recentQuizzes : [],
      };
      return updated;
    }
  } catch {
    // ignore storage errors
  }

  const initial: AspirantProfile = {
    xp: 0,
    streakDays: 1,
    lastActiveDate: today,
    totalAttempted: 0,
    totalCorrect: 0,
    subjectStats: {},
    lastSession: null,
    recentQuizzes: [],
  };
  saveProfile(initial);
  return initial;
}

export function saveProfile(profile: AspirantProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore quota errors
  }
}

export function recordActivityStreakAndXP(profile: AspirantProfile, xpGain: number): AspirantProfile {
  const today = getTodayDateStr();
  const yesterday = getYesterdayDateStr();
  let nextStreak = profile.streakDays;

  if (profile.lastActiveDate === yesterday) {
    nextStreak = profile.streakDays + 1;
  } else if (profile.lastActiveDate !== today) {
    nextStreak = 1;
  }

  const updated: AspirantProfile = {
    ...profile,
    xp: profile.xp + xpGain,
    streakDays: Math.max(1, nextStreak),
    lastActiveDate: today,
  };
  saveProfile(updated);
  return updated;
}

export function recordQuizResult(
  profile: AspirantProfile,
  summary: QuizAttemptSummary,
  subjectBreakdown: Record<string, { attempted: number; correct: number }>
): AspirantProfile {
  const xpGain = Math.max(15, summary.correctCount * 15 + 10);
  const nextProfile = recordActivityStreakAndXP(profile, xpGain);

  const mergedSubjects = { ...nextProfile.subjectStats };
  for (const [subj, delta] of Object.entries(subjectBreakdown)) {
    const prev = mergedSubjects[subj] ?? { attempted: 0, correct: 0 };
    mergedSubjects[subj] = {
      attempted: prev.attempted + delta.attempted,
      correct: prev.correct + delta.correct,
    };
  }

  const attemptedInThisQuiz = summary.correctCount + summary.wrongCount;

  const updated: AspirantProfile = {
    ...nextProfile,
    totalAttempted: nextProfile.totalAttempted + attemptedInThisQuiz,
    totalCorrect: nextProfile.totalCorrect + summary.correctCount,
    subjectStats: mergedSubjects,
    lastSession: {
      examName: summary.examName,
      topic: summary.topic,
      scoreLabel: `${summary.score.toFixed(summary.negativeMarking > 0 ? 2 : 0)}/${summary.maxScore}`,
      accuracy: summary.accuracyPercent,
      timestamp: summary.completedAt,
    },
    recentQuizzes: [summary, ...nextProfile.recentQuizzes].slice(0, 10),
  };
  saveProfile(updated);
  return updated;
}

export function loadNotesVault(): GeneratedNotesPack[] {
  try {
    const raw = localStorage.getItem(NOTES_VAULT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveNotesToVault(pack: GeneratedNotesPack): GeneratedNotesPack[] {
  const current = loadNotesVault();
  const filtered = current.filter((item) => item.id !== pack.id);
  const next = [{ ...pack, savedAt: pack.savedAt || new Date().toISOString() }, ...filtered];
  try {
    localStorage.setItem(NOTES_VAULT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function removeNoteFromVault(id: string): GeneratedNotesPack[] {
  const next = loadNotesVault().filter((item) => item.id !== id);
  try {
    localStorage.setItem(NOTES_VAULT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function loadStudyTasks(): StudyTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  const defaults: StudyTask[] = [
    {
      id: 'task-1',
      title: 'Revise Laxmikanth Fundamental Rights (Articles 12-35)',
      subject: 'Polity',
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-2',
      title: 'Practice 25 Percentage & Ratio DI sets',
      subject: 'Quant',
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-3',
      title: 'Daily Current Affairs & Editorial Summary',
      subject: 'Current Affairs',
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ];
  saveStudyTasks(defaults);
  return defaults;
}

export function saveStudyTasks(tasks: StudyTask[]): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch {
    // ignore
  }
}

export function loadPomodoroCountToday(): number {
  try {
    const raw = localStorage.getItem(POMODORO_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { date: string; count: number };
      if (parsed.date === getTodayDateStr()) {
        return parsed.count || 0;
      }
    }
  } catch {
    // ignore
  }
  return 0;
}

export function incrementPomodoroCountToday(): number {
  const next = loadPomodoroCountToday() + 1;
  try {
    localStorage.setItem(POMODORO_KEY, JSON.stringify({ date: getTodayDateStr(), count: next }));
  } catch {
    // ignore
  }
  return next;
}

export function loadLanguage(): LanguageMode {
  try {
    const val = localStorage.getItem(LANG_KEY);
    if (val === 'English' || val === 'Hinglish' || val === 'Hindi') {
      return val;
    }
  } catch {
    // ignore
  }
  return 'English';
}

export function saveLanguage(lang: LanguageMode): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // ignore
  }
}

export function loadTheme(): 'light' | 'dark' {
  try {
    const val = localStorage.getItem(THEME_KEY);
    if (val === 'dark' || val === 'light') return val;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // ignore
  }
  return 'light';
}

export function saveTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
}
