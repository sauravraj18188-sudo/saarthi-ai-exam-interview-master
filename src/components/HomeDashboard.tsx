import React from 'react';
import {
  Zap,
  Train,
  Landmark,
  Banknote,
  FlaskConical,
  Scale,
  Briefcase,
  ArrowRight,
  Target,
  CheckCircle2,
  Award,
  History,
  Trophy,
  Atom,
  GraduationCap,
} from 'lucide-react';
import { AspirantProfile, LanguageMode, QuizConfig } from '../types';
import { getLevelInfo, getStrongestSubject } from '../lib/storage';

interface HomeDashboardProps {
  profile: AspirantProfile;
  language: LanguageMode;
  onStartDailySprint: () => void;
  onSelectCategory: (preset: Partial<QuizConfig>) => void;
  onContinueLastSession: () => void;
}

const EXAM_CATEGORIES: Array<{
  id: string;
  title: string;
  subtitle: string;
  examName: string;
  topic: string;
  gradeLevel?: string;
  negativeMarking?: 0 | 0.25 | 0.33;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
}> = [
  {
    id: 'ssc-rail',
    title: 'SSC & Railway',
    subtitle: 'CGL · CHSL · RRB NTPC',
    examName: 'SSC CGL & Railway RRB',
    topic: 'Percentage, Ratio & General Awareness',
    icon: Train,
    accentClass: 'bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400',
  },
  {
    id: 'state-pcs',
    title: 'State PCS (BPSC/UPPSC)',
    subtitle: 'BPSC · UPPSC · RAS Prelims',
    examName: 'BPSC / UPPSC State PCS',
    topic: 'Modern History 1857 & Indian Geography',
    icon: Landmark,
    accentClass: 'bg-indigo-50 text-[#1E1B4B] dark:bg-indigo-950/60 dark:text-indigo-300',
  },
  {
    id: 'banking',
    title: 'Banking & Finance',
    subtitle: 'IBPS PO · SBI · RBI Grade B',
    examName: 'IBPS PO / SBI Banking',
    topic: 'Banking Awareness, Union Budget & Economy',
    icon: Banknote,
    accentClass: 'bg-emerald-50 text-[#10B981] dark:bg-emerald-950/60 dark:text-emerald-400',
  },
  {
    id: 'science',
    title: 'General Science',
    subtitle: 'Physics · Chemistry · Biology',
    examName: 'UPSC & SSC General Science',
    topic: 'Everyday Science, Vitamins & Space Tech',
    icon: FlaskConical,
    accentClass: 'bg-amber-50 text-[#F97316] dark:bg-amber-950/60 dark:text-amber-400',
  },
  {
    id: 'polity',
    title: 'Indian Polity & History',
    subtitle: 'UPSC CSE · Laxmikanth · Spectrum',
    examName: 'UPSC Civil Services',
    topic: 'Fundamental Rights, Parliament & Freedom Struggle',
    icon: Scale,
    accentClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400',
  },
  {
    id: 'corporate',
    title: 'Corporate HR Prep',
    subtitle: 'Aptitude · Logical · Placement',
    examName: 'Corporate Placement & HR',
    topic: 'Logical Reasoning, Verbal & Situational Ethics',
    icon: Briefcase,
    accentClass: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400',
  },
  {
    id: 'hindustan-olympiad',
    title: 'Hindustan Olympiad',
    subtitle: 'Class 1–12 · Maths · Science · Reasoning',
    examName: 'Hindustan Olympiad',
    topic: 'Logical Reasoning, Maths & General Awareness',
    gradeLevel: 'Class 6',
    negativeMarking: 0,
    icon: Trophy,
    accentClass: 'bg-orange-50 text-[#F97316] dark:bg-orange-950/60 dark:text-orange-400',
  },
  {
    id: 'sof-olympiad',
    title: 'SOF Olympiads (IMO/NSO)',
    subtitle: 'IMO · NSO · IEO · IGKO · ICSO',
    examName: 'SOF National Science Olympiad (NSO)',
    topic: 'Science, Logical Reasoning & Achievers HOTS',
    gradeLevel: 'Class 8',
    negativeMarking: 0,
    icon: Atom,
    accentClass: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400',
  },
  {
    id: 'school-1-12',
    title: 'Class 1 to 12 (NCERT)',
    subtitle: 'Class 1–9 Foundation · 10 & 12 Boards',
    examName: 'NCERT & CBSE Class 1–12',
    topic: 'Mathematics, Science & Social Studies',
    gradeLevel: 'Class 9',
    negativeMarking: 0,
    icon: GraduationCap,
    accentClass: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
  },
];

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  profile,
  language,
  onStartDailySprint,
  onSelectCategory,
  onContinueLastSession,
}) => {
  const accuracy =
    profile.totalAttempted > 0
      ? Math.round((profile.totalCorrect / profile.totalAttempted) * 100)
      : 0;
  const strongestSubject = getStrongestSubject(profile);
  const levelInfo = getLevelInfo(profile.xp);

  const greetingText =
    language === 'Hindi'
      ? 'नमस्ते अभ्यर्थी! आज का लक्ष्य पूरा करें।'
      : language === 'Hinglish'
      ? 'Namaste Aspirant! Aaj ka target crack karein.'
      : 'Namaste Aspirant!';

  const subtext =
    language === 'Hindi'
      ? 'दैनिक 5-मिनट करंट अफेयर्स और GK स्प्रिंट से अपनी तैयारी की शुरुआत करें।'
      : language === 'Hinglish'
      ? 'Daily 5-Minute Current Affairs & GK Sprint se apni preparation start karein.'
      : 'Stay exam-ready with adaptive mock drills, instant memory tricks, and structured interview practice.';

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-5 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide text-[#F97316]">
                Daily Target · {levelInfo.title} Level {levelInfo.level} · {profile.xp} XP
              </p>
              <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#1E1B4B] dark:text-white tracking-tight text-balance leading-tight">
                {greetingText}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                {subtext}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  onClick={onStartDailySprint}
                  className="min-h-[48px] inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#2563EB] px-5 py-3 text-sm sm:text-base font-semibold text-white hover:bg-blue-700 active:scale-[0.99] transition-all shadow-sm cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-[#F97316] fill-[#F97316]" />
                  <span>Daily 5-Minute Current Affairs &amp; GK Sprint</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                5 mixed UPSC, SSC &amp; Banking questions · Instant scorecard · +85 XP potential
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[180px] sm:min-h-[220px] lg:min-h-full bg-[#1E1B4B] overflow-hidden">
            <img
              src="/src/assets/images/hero_study_desk_1795174277395.jpg"
              alt="Focused competitive exam study desk at dawn"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E1B4B]/80 via-[#1E1B4B]/20 to-transparent flex items-end p-5">
              <div className="text-white">
                <p className="text-xs font-medium text-blue-200">Next Level Progress</p>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="w-36 sm:w-44 h-2 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full bg-[#F97316] rounded-full transition-all duration-300"
                      style={{ width: `${levelInfo.progressPct}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs tabular-nums text-white">
                    {profile.xp}/{levelInfo.nextLevelXp} XP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Progress & Analytics Strip */}
      <section aria-labelledby="analytics-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 id="analytics-heading" className="font-display text-lg sm:text-xl font-bold text-[#1E1B4B] dark:text-white">
            Your Readiness Analytics
          </h2>
          {profile.lastSession && (
            <button
              type="button"
              onClick={onContinueLastSession}
              className="min-h-[40px] inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB] dark:text-blue-400 hover:underline self-start sm:self-auto cursor-pointer"
            >
              <History className="w-4 h-4" />
              <span>Continue Last Session ({profile.lastSession.examName})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Questions Attempted</p>
              <p className="mt-1 font-mono text-2xl font-bold text-[#1E1B4B] dark:text-white tabular-nums">
                {profile.totalAttempted}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-[#2563EB] dark:text-blue-400">
              <Target className="w-5 h-5" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overall Accuracy</p>
              <p className="mt-1 font-mono text-2xl font-bold text-[#10B981] tabular-nums">
                {accuracy}%
              </p>
            </div>
            <div className="w-11 h-11 relative flex items-center justify-center">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  className="text-slate-100 dark:text-slate-800"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3.5"
                  strokeDasharray={`${accuracy}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <CheckCircle2 className="w-4 h-4 text-[#10B981] absolute" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Strongest Subject</p>
              <p className="mt-1 font-display text-base sm:text-lg font-bold text-[#1E1B4B] dark:text-white truncate">
                {strongestSubject}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-[#F97316] shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <button
            type="button"
            onClick={onContinueLastSession}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex items-center justify-between text-left hover:border-[#2563EB] dark:hover:border-blue-500 transition-colors cursor-pointer"
          >
            <div className="min-w-0 pr-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Continue Last Session</p>
              <p className="mt-1 font-display text-sm font-bold text-[#2563EB] dark:text-blue-400 truncate">
                {profile.lastSession
                  ? `${profile.lastSession.topic}`
                  : 'Start your first mock'}
              </p>
              {profile.lastSession && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {profile.lastSession.scoreLabel} · {profile.lastSession.accuracy}%
                </p>
              )}
            </div>
            <ArrowRight className="w-5 h-5 text-[#2563EB] dark:text-blue-400 shrink-0" />
          </button>
        </div>
      </section>

      {/* Exam Category Grid */}
      <section aria-labelledby="categories-heading" className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="categories-heading" className="font-display text-lg sm:text-xl font-bold text-[#1E1B4B] dark:text-white">
            Exam Categories
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Tap any track to configure a mock
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXAM_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  onSelectCategory({
                    examName: cat.examName,
                    topic: cat.topic,
                    gradeLevel: cat.gradeLevel ?? '',
                    count: 10,
                    difficulty: 'Moderate',
                    negativeMarking: cat.negativeMarking ?? 0.25,
                  })
                }
                className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 text-left hover:border-[#2563EB] dark:hover:border-blue-500 transition-all flex items-start gap-4 cursor-pointer min-h-[84px]"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cat.accentClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors truncate">
                      {cat.title}
                    </h3>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                    {cat.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent Activity History */}
      {profile.recentQuizzes.length > 0 && (
        <section aria-labelledby="recent-heading" className="space-y-3">
          <h2 id="recent-heading" className="font-display text-lg font-bold text-[#1E1B4B] dark:text-white">
            Recent Mock Tests
          </h2>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            {profile.recentQuizzes.slice(0, 5).map((q) => (
              <div key={q.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {q.quizTitle}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {q.examName} · {q.totalQuestions} Qs · {new Date(q.completedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right shrink-0 font-mono tabular-nums">
                  <p className="text-sm font-bold text-[#1E1B4B] dark:text-white">
                    {q.score.toFixed(q.negativeMarking > 0 ? 2 : 0)} / {q.maxScore}
                  </p>
                  <p className="text-xs font-semibold text-[#10B981]">
                    {q.accuracyPercent}% Acc
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
