import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Clock,
  Grid,
  Flag,
  Eraser,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Lightbulb,
  Share2,
  Copy,
  Check,
  X,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import {
  LanguageMode,
  MemoryTrickData,
  QuizAttemptSummary,
  QuizConfig,
  QuizQuestion,
} from '../types';
import { generateMemoryTrick, generateQuiz } from '../lib/api';
import { ErrorRetryBanner } from './ErrorRetryBanner';

interface MockQuizEngineProps {
  language: LanguageMode;
  presetConfig: Partial<QuizConfig> | null;
  sprintTriggerId: number;
  onExamHallStateChange: (inExamHall: boolean) => void;
  onQuizCompleted: (
    summary: QuizAttemptSummary,
    subjectBreakdown: Record<string, { attempted: number; correct: number }>
  ) => void;
}

type QuizStage = 'setup' | 'exam' | 'scorecard';

const TRENDING_TOPICS = [
  'Modern History 1857',
  'Percentage & Profit-Loss',
  'Union Budget',
  'Fundamental Rights & DPSP',
  'General Science & Vitamins',
  'Current Affairs & Schemes',
];

const SCHOOL_OLYMPIAD_TOPICS = [
  'Logical Reasoning & Patterns',
  'Number System, Fractions & Mensuration',
  'Force, Light, Electricity & Motion',
  'Plants, Human Body & Nutrition',
  'English Grammar & Comprehension',
  'Algebra, Trigonometry & Calculus (11-12)',
  'Indian Heritage, GK & Current Affairs',
];

const EXAM_OPTIONS = [
  'UPSC CSE Prelims',
  'BPSC / UPPSC State PCS',
  'SSC CGL & CHSL',
  'Railway RRB NTPC',
  'IBPS PO / SBI Banking',
  'Corporate Aptitude',
  'Hindustan Olympiad',
  'SOF IMO (Maths)',
  'SOF NSO (Science)',
  'SOF IEO (English)',
  'SOF IGKO (GK)',
  'SOF ICSO (Computer)',
  'NCERT & CBSE Class 1–12',
];

const GRADE_LEVELS = [
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
];

const LOADING_MESSAGES = [
  'Analyzing previous year exam patterns...',
  'Calibrating distractors and conceptual depth...',
  'Verifying factual accuracy & explanations...',
];

export const MockQuizEngine: React.FC<MockQuizEngineProps> = ({
  language,
  presetConfig,
  sprintTriggerId,
  onExamHallStateChange,
  onQuizCompleted,
}) => {
  const [stage, setStage] = useState<QuizStage>('setup');
  const [config, setConfig] = useState<QuizConfig>({
    examName: 'SSC CGL & CHSL',
    topic: 'Modern History 1857',
    gradeLevel: '',
    count: 10,
    difficulty: 'Moderate',
    negativeMarking: 0.25,
  });

  // Loading & Error
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastLaunchWasSprint, setLastLaunchWasSprint] = useState(false);

  // Active Quiz State
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  // Scorecard & Mnemonic State
  const [summary, setSummary] = useState<QuizAttemptSummary | null>(null);
  const [memoryTricks, setMemoryTricks] = useState<Record<number, MemoryTrickData>>({});
  const [trickLoading, setTrickLoading] = useState<Record<number, boolean>>({});
  const [trickErrors, setTrickErrors] = useState<Record<number, string>>({});
  const [copiedShare, setCopiedShare] = useState(false);

  const lastSprintRef = useRef<number>(0);

  // Apply preset from Home Dashboard
  useEffect(() => {
    if (presetConfig) {
      setConfig((prev) => ({
        ...prev,
        ...presetConfig,
      }));
      if (stage !== 'exam') {
        setStage('setup');
      }
    }
  }, [presetConfig]);

  // Trigger Daily 5-Minute Sprint automatically when clicked on Home
  useEffect(() => {
    if (sprintTriggerId > 0 && sprintTriggerId !== lastSprintRef.current) {
      lastSprintRef.current = sprintTriggerId;
      void launchQuiz(
        {
          examName: 'UPSC / SSC / Banking Mixed',
          topic: 'Daily Current Affairs & Static GK Sprint',
          count: 5,
          difficulty: 'Moderate',
          negativeMarking: 0.25,
          isDailySprint: true,
        },
        true
      );
    }
  }, [sprintTriggerId]);

  // Notify parent when entering/leaving distraction-free Exam Hall
  useEffect(() => {
    onExamHallStateChange(stage === 'exam');
    return () => onExamHallStateChange(false);
  }, [stage, onExamHallStateChange]);

  // Loading text cycler
  useEffect(() => {
    if (!isGenerating) return;
    const id = window.setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => window.clearInterval(id);
  }, [isGenerating]);

  // Exam timer
  useEffect(() => {
    if (stage !== 'exam') return;
    const id = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [stage]);

  const launchQuiz = async (targetConfig: QuizConfig, isSprint = false) => {
    setIsGenerating(true);
    setErrorMsg(null);
    setLastLaunchWasSprint(isSprint);

    try {
      const data = await generateQuiz(targetConfig, language);
      setQuizTitle(data.quizTitle || `${targetConfig.examName} Mock Test`);
      setQuestions(data.questions);
      setCurrentIdx(0);
      setAnswers({});
      setMarkedForReview({});
      setElapsedSeconds(0);
      setMemoryTricks({});
      setTrickLoading({});
      setTrickErrors({});
      setSummary(null);
      setStage('exam');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate mock quiz.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitTest = () => {
    setSubmitModalOpen(false);
    setPaletteOpen(false);

    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;
    const subjectBreakdown: Record<string, { attempted: number; correct: number }> = {};

    questions.forEach((q, idx) => {
      const choice = answers[idx];
      const subj = q.subject || 'General';
      if (!subjectBreakdown[subj]) {
        subjectBreakdown[subj] = { attempted: 0, correct: 0 };
      }

      if (choice === undefined) {
        unattemptedCount += 1;
      } else {
        subjectBreakdown[subj].attempted += 1;
        if (choice === q.correctIndex) {
          correctCount += 1;
          subjectBreakdown[subj].correct += 1;
        } else {
          wrongCount += 1;
        }
      }
    });

    const rawScore = correctCount - wrongCount * config.negativeMarking;
    const attemptedCount = correctCount + wrongCount;
    const accuracyPercent = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;

    const attemptSummary: QuizAttemptSummary = {
      id: `quiz-${Date.now()}`,
      quizTitle,
      examName: lastLaunchWasSprint
        ? 'Daily 5-Min GK Sprint'
        : config.gradeLevel
        ? `${config.examName} (${config.gradeLevel})`
        : config.examName,
      topic: lastLaunchWasSprint ? 'Current Affairs & GK' : config.topic,
      totalQuestions: questions.length,
      correctCount,
      wrongCount,
      unattemptedCount,
      score: rawScore,
      maxScore: questions.length,
      accuracyPercent,
      durationSeconds: Math.max(1, elapsedSeconds),
      negativeMarking: lastLaunchWasSprint ? 0.25 : config.negativeMarking,
      completedAt: new Date().toISOString(),
    };

    setSummary(attemptSummary);
    setStage('scorecard');
    onQuizCompleted(attemptSummary, subjectBreakdown);
  };

  const handleFetchMemoryTrick = async (qIdx: number) => {
    const q = questions[qIdx];
    if (!q || trickLoading[qIdx]) return;

    setTrickLoading((prev) => ({ ...prev, [qIdx]: true }));
    setTrickErrors((prev) => {
      const next = { ...prev };
      delete next[qIdx];
      return next;
    });

    try {
      const data = await generateMemoryTrick({
        question: q.question,
        correctAnswer: q.options[q.correctIndex] || '',
        explanation: q.explanation,
        examName: config.examName,
        language,
      });
      setMemoryTricks((prev) => ({ ...prev, [qIdx]: data }));
    } catch (err) {
      setTrickErrors((prev) => ({
        ...prev,
        [qIdx]: err instanceof Error ? err.message : 'Could not fetch mnemonic.',
      }));
    } finally {
      setTrickLoading((prev) => ({ ...prev, [qIdx]: false }));
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getWhatsAppShareText = () => {
    if (!summary) return '';
    return [
      `Saarthi AI Mock Test Scorecard`,
      `Exam: ${summary.examName}`,
      `Topic: ${summary.topic}`,
      `Score: ${summary.score.toFixed(summary.negativeMarking > 0 ? 2 : 0)} / ${summary.maxScore} (Neg: -${summary.negativeMarking})`,
      `Accuracy: ${summary.accuracyPercent}% | Correct: ${summary.correctCount} | Wrong: ${summary.wrongCount} | Skipped: ${summary.unattemptedCount}`,
      `Time Taken: ${formatTime(summary.durationSeconds)}`,
    ].join('\n');
  };

  const handleCopyShare = async () => {
    const text = getWhatsAppShareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 2200);
    } catch {
      // ignore clipboard errors
    }
  };

  // Loading Overlay
  if (isGenerating) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center mx-auto">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <h2 className="mt-5 font-display text-xl font-bold text-[#1E1B4B] dark:text-white">
          Building Your Adaptive Mock Paper
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {LOADING_MESSAGES[loadingMsgIdx]}
        </p>
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          {lastLaunchWasSprint ? 'Daily 5-Minute GK Sprint' : `${config.examName} · ${config.topic}`} · {language}
        </p>
      </div>
    );
  }

  // STEP A: CONFIGURATION
  if (stage === 'setup') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#2563EB] dark:text-blue-400">
              AI Adaptive Mock Quiz Engine
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#1E1B4B] dark:text-white">
              Configure Your Mock Test
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Language: <strong className="text-slate-800 dark:text-slate-200">{language}</strong>
          </p>
        </div>

        {errorMsg && (
          <ErrorRetryBanner
            message={errorMsg}
            onRetry={() =>
              void launchQuiz(
                lastLaunchWasSprint
                  ? {
                      examName: 'UPSC / SSC / Banking Mixed',
                      topic: 'Daily Current Affairs & Static GK Sprint',
                      count: 5,
                      difficulty: 'Moderate',
                      negativeMarking: 0.25,
                      isDailySprint: true,
                    }
                  : config,
                lastLaunchWasSprint
              )
            }
          />
        )}

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 space-y-6">
          {/* Exam Name */}
          <div className="space-y-2.5">
            <label htmlFor="exam-name-input" className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
              Target Exam Name
            </label>
            <input
              id="exam-name-input"
              type="text"
              value={config.examName}
              onChange={(e) => setConfig((c) => ({ ...c, examName: e.target.value }))}
              placeholder="e.g., UPSC CSE, BPSC, SSC CGL, IBPS PO"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#2563EB] focus:outline-none"
            />
            <div className="flex flex-wrap gap-2">
              {EXAM_OPTIONS.map((exam) => {
                const isSchoolExam = /hindustan|sof|ncert|cbse|class/i.test(exam);
                return (
                  <button
                    key={exam}
                    type="button"
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        examName: exam,
                        gradeLevel: isSchoolExam && !c.gradeLevel ? 'Class 8' : isSchoolExam ? c.gradeLevel : '',
                        negativeMarking: isSchoolExam ? 0 : c.negativeMarking,
                      }))
                    }
                    className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                      config.examName === exam
                        ? 'border-[#2563EB] bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {exam}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class / Grade Selector (Class 1 to 12 for School & Olympiads) */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Class / Grade (for Hindustan Olympiad, SOF &amp; School 1–12)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {config.gradeLevel || 'Competitive / Graduate Level'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, gradeLevel: '' }))}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  !config.gradeLevel
                    ? 'border-[#1E1B4B] bg-[#1E1B4B] text-white dark:border-[#2563EB] dark:bg-[#2563EB]'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Competitive / All
              </button>
              {GRADE_LEVELS.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, gradeLevel: grade }))}
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    config.gradeLevel === grade
                      ? 'border-[#2563EB] bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          {/* Specific Topic */}
          <div className="space-y-2.5">
            <label htmlFor="topic-input" className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
              Specific Topic or Subject
            </label>
            <input
              id="topic-input"
              type="text"
              value={config.topic}
              onChange={(e) => setConfig((c) => ({ ...c, topic: e.target.value }))}
              placeholder="Enter any syllabus topic..."
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#2563EB] focus:outline-none"
            />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                {config.gradeLevel || /hindustan|sof|ncert|cbse|class/i.test(config.examName)
                  ? 'Trending School & Olympiad Topics'
                  : 'Trending Exam Topics'}
              </p>
              <div className="flex flex-wrap gap-2">
                {(config.gradeLevel || /hindustan|sof|ncert|cbse|class/i.test(config.examName)
                  ? SCHOOL_OLYMPIAD_TOPICS
                  : TRENDING_TOPICS
                ).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, topic: t }))}
                    className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                      config.topic === t
                        ? 'border-[#F97316] bg-orange-50 text-[#F97316] dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row: Count, Difficulty, Negative Marking */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Question Count */}
            <div className="space-y-2">
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                Question Count
              </span>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {([5, 10, 15, 20] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, count: cnt }))}
                    className={`min-h-[40px] rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      config.count === cnt
                        ? 'bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                Difficulty Level
              </span>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {(['Easy', 'Moderate', 'Hard / Exam-Level'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, difficulty: diff }))}
                    className={`min-h-[40px] px-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer truncate ${
                      config.difficulty === diff
                        ? 'bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {diff === 'Hard / Exam-Level' ? 'Hard' : diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Negative Marking */}
            <div className="space-y-2">
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                Negative Marking
              </span>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {(
                  [
                    { label: 'None', val: 0 },
                    { label: '-0.25', val: 0.25 },
                    { label: '-0.33', val: 0.33 },
                  ] as const
                ).map((neg) => (
                  <button
                    key={neg.label}
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, negativeMarking: neg.val }))}
                    className={`min-h-[40px] rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      config.negativeMarking === neg.val
                        ? 'bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {neg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Start Test CTA */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {config.count} MCQs · {config.gradeLevel ? `${config.gradeLevel} · ` : ''}{config.difficulty} · Marking: +1 / -{config.negativeMarking}
            </p>
            <button
              type="button"
              disabled={!config.examName.trim() || !config.topic.trim()}
              onClick={() => void launchQuiz(config, false)}
              className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 text-sm sm:text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Mock Test</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP B: DISTRACTION-FREE EXAM HALL
  if (stage === 'exam' && questions.length > 0) {
    const q = questions[currentIdx];
    const selectedOpt = answers[currentIdx];
    const isMarked = Boolean(markedForReview[currentIdx]);
    const answeredCount = Object.keys(answers).length;
    const markedCount = Object.values(markedForReview).filter(Boolean).length;
    const unattemptedCount = questions.length - answeredCount;
    const optionLetters = ['A', 'B', 'C', 'D'];

    return (
      <div className="max-w-4xl mx-auto pb-24 sm:pb-8 space-y-5">
        {/* Top Exam Status Bar */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:px-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {quizTitle}
            </p>
            <p className="font-mono text-sm font-bold text-[#1E1B4B] dark:text-white tabular-nums">
              Question {currentIdx + 1} of {questions.length}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 font-mono text-sm font-bold text-[#1E1B4B] dark:text-white tabular-nums">
              <Clock className="w-4 h-4 text-[#2563EB]" />
              <span>{formatTime(elapsedSeconds)}</span>
            </div>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Grid className="w-4 h-4" />
              <span>Palette</span>
            </button>

            <button
              type="button"
              onClick={() => setSubmitModalOpen(true)}
              className="min-h-[40px] rounded-lg bg-[#10B981] px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              Submit Test
            </button>
          </div>
        </div>

        {/* Question Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[#2563EB] dark:text-blue-400">
              {q.subject} · +1 / -{lastLaunchWasSprint ? 0.25 : config.negativeMarking}
            </span>
            {isMarked && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#F97316]">
                <Flag className="w-3.5 h-3.5 fill-[#F97316]" />
                Marked for Review
              </span>
            )}
          </div>

          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-50 leading-relaxed">
            {q.question}
          </h2>

          {/* Options A B C D */}
          <div className="space-y-3">
            {q.options.map((opt, optIdx) => {
              const isSelected = selectedOpt === optIdx;
              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, [currentIdx]: optIdx }))}
                  className={`w-full min-h-[52px] rounded-xl border p-3.5 sm:p-4 text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#2563EB] bg-blue-50/80 dark:bg-blue-950/50 dark:border-blue-500 ring-1 ring-[#2563EB]'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {optionLetters[optIdx]}
                  </span>
                  <span className="text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-snug pt-0.5">
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Question Action Controls */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setAnswers((prev) => {
                    const next = { ...prev };
                    delete next[currentIdx];
                    return next;
                  })
                }
                disabled={selectedOpt === undefined}
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <Eraser className="w-4 h-4" />
                <span>Clear Selection</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setMarkedForReview((prev) => ({ ...prev, [currentIdx]: !prev[currentIdx] }))
                }
                className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  isMarked
                    ? 'border-[#F97316] bg-orange-50 text-[#F97316] dark:bg-orange-950/40 dark:text-orange-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Flag className="w-4 h-4" />
                <span>{isMarked ? 'Unmark Review' : 'Mark for Review'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                className="min-h-[44px] inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              {currentIdx < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                  className="min-h-[44px] inline-flex items-center gap-1 rounded-xl bg-[#2563EB] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
                >
                  <span>Save &amp; Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(true)}
                  className="min-h-[44px] inline-flex items-center gap-1 rounded-xl bg-[#10B981] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-600 cursor-pointer"
                >
                  <span>Finish &amp; Submit</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Palette Bottom Sheet / Modal */}
        {paletteOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4">
            <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xl">
              <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-bold text-[#1E1B4B] dark:text-white">
                  Question Palette
                </h3>
                <button
                  type="button"
                  onClick={() => setPaletteOpen(false)}
                  aria-label="Close palette"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#10B981]" />
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#F97316]" />
                  <span>Review ({markedCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-700" />
                  <span>Left ({unattemptedCount})</span>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2.5">
                {questions.map((_, idx) => {
                  const ans = answers[idx] !== undefined;
                  const rev = Boolean(markedForReview[idx]);
                  const isCurr = idx === currentIdx;

                  let styleClass =
                    'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700';
                  if (rev && ans) {
                    styleClass = 'bg-[#1E1B4B] text-white border-[#F97316] ring-2 ring-[#F97316]/60';
                  } else if (rev) {
                    styleClass = 'bg-[#F97316] text-white border-[#F97316]';
                  } else if (ans) {
                    styleClass = 'bg-[#10B981] text-white border-[#10B981]';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCurrentIdx(idx);
                        setPaletteOpen(false);
                      }}
                      className={`min-h-[44px] rounded-xl border font-mono text-sm font-bold transition-transform cursor-pointer ${styleClass} ${
                        isCurr ? 'ring-2 ring-[#2563EB] ring-offset-2 dark:ring-offset-slate-900' : ''
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Submit Confirmation Modal */}
        {submitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4">
            <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
              <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
              <h3 className="font-display text-lg font-bold text-[#1E1B4B] dark:text-white">
                Submit Mock Test?
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Review your attempt summary before finalizing your scorecard.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center rounded-xl bg-slate-50 dark:bg-slate-800 p-3 font-mono tabular-nums">
                <div>
                  <p className="text-lg font-bold text-[#10B981]">{answeredCount}</p>
                  <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">Answered</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-[#F97316]">{markedCount}</p>
                  <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">Marked</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-600 dark:text-slate-300">{unattemptedCount}</p>
                  <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">Unattempted</p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Resume Test
                </button>
                <button
                  type="button"
                  onClick={handleSubmitTest}
                  className="flex-1 min-h-[44px] rounded-xl bg-[#10B981] text-sm font-semibold text-white hover:bg-emerald-600 cursor-pointer"
                >
                  Confirm Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // STEP C: DEEP POST-TEST SCORECARD
  if (stage === 'scorecard' && summary) {
    const timePerQ = Math.round(summary.durationSeconds / Math.max(1, summary.totalQuestions));
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(getWhatsAppShareText())}`;
    const optionLetters = ['A', 'B', 'C', 'D'];

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Scorecard Hero */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#10B981]">
                Test Submitted · {summary.examName}
              </p>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#1E1B4B] dark:text-white">
                {summary.quizTitle}
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Topic: {summary.topic} · Negative Marking: -{summary.negativeMarking}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#10B981] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share on WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={handleCopyShare}
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {copiedShare ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
                <span>{copiedShare ? 'Copied' : 'Copy Summary'}</span>
              </button>

              <button
                type="button"
                onClick={() => setStage('setup')}
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>New Quiz</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 font-mono tabular-nums">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-4">
              <p className="font-sans text-xs text-slate-500 dark:text-slate-400">Net Score</p>
              <p className="mt-1 text-2xl font-bold text-[#1E1B4B] dark:text-white">
                {summary.score.toFixed(summary.negativeMarking > 0 ? 2 : 0)}
                <span className="text-sm font-normal text-slate-400">/{summary.maxScore}</span>
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-4">
              <p className="font-sans text-xs text-slate-500 dark:text-slate-400">Accuracy</p>
              <p className="mt-1 text-2xl font-bold text-[#10B981]">{summary.accuracyPercent}%</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-4">
              <p className="font-sans text-xs text-slate-500 dark:text-slate-400">Time / Question</p>
              <p className="mt-1 text-2xl font-bold text-[#2563EB] dark:text-blue-400">{timePerQ}s</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-4">
              <p className="font-sans text-xs text-slate-500 dark:text-slate-400">Breakdown</p>
              <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {summary.correctCount} Right · {summary.wrongCount} Wrong · {summary.unattemptedCount} Skip
              </p>
            </div>
          </div>
        </section>

        {/* Question-by-Question Review */}
        <section className="space-y-4">
          <h2 className="font-display text-lg sm:text-xl font-bold text-[#1E1B4B] dark:text-white">
            Question-by-Question Review
          </h2>

          {questions.map((q, idx) => {
            const userChoice = answers[idx];
            const isCorrect = userChoice === q.correctIndex;
            const isSkipped = userChoice === undefined;
            const trick = memoryTricks[idx];
            const isLoadingTrick = Boolean(trickLoading[idx]);
            const trickErr = trickErrors[idx];

            return (
              <div
                key={q.id || idx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Q{idx + 1} · {q.subject}
                  </span>

                  {isSkipped ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <MinusCircle className="w-4 h-4" />
                      Skipped (0)
                    </span>
                  ) : isCorrect ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10B981]">
                      <CheckCircle2 className="w-4 h-4" />
                      Correct (+1)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#EF4444]">
                      <XCircle className="w-4 h-4" />
                      Incorrect (-{summary.negativeMarking})
                    </span>
                  )}
                </div>

                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                  {q.question}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
                  <div
                    className={`rounded-xl border p-3 ${
                      isSkipped
                        ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                        : isCorrect
                        ? 'border-[#10B981]/40 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                        : 'border-[#EF4444]/40 bg-red-50/70 dark:bg-red-950/30 text-red-900 dark:text-red-200'
                    }`}
                  >
                    <span className="block text-[11px] font-semibold opacity-75">Your Choice</span>
                    <span className="mt-0.5 block font-medium">
                      {isSkipped
                        ? 'Not attempted'
                        : `${optionLetters[userChoice]} · ${q.options[userChoice]}`}
                    </span>
                  </div>

                  <div className="rounded-xl border border-[#10B981]/40 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 text-emerald-900 dark:text-emerald-200">
                    <span className="block text-[11px] font-semibold opacity-75">Correct Answer</span>
                    <span className="mt-0.5 block font-medium">
                      {optionLetters[q.correctIndex]} · {q.options[q.correctIndex]}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-[#1E1B4B] dark:text-blue-300">
                      Why it&apos;s right
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>

                  {!trick && (
                    <button
                      type="button"
                      disabled={isLoadingTrick}
                      onClick={() => void handleFetchMemoryTrick(idx)}
                      className="min-h-[40px] inline-flex items-center gap-2 rounded-xl border border-[#F97316]/40 bg-orange-50 dark:bg-orange-950/30 px-3.5 py-2 text-xs font-semibold text-[#F97316] dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {isLoadingTrick ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Lightbulb className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isLoadingTrick ? 'Creating shortcut...' : '💡 Memory Trick / Shortcut'}
                      </span>
                    </button>
                  )}

                  {trickErr && (
                    <ErrorRetryBanner
                      message={trickErr}
                      onRetry={() => void handleFetchMemoryTrick(idx)}
                      retryLabel="Retry Trick"
                    />
                  )}

                  {trick && (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                        <Lightbulb className="w-4 h-4 text-[#F97316]" />
                        <span>{trick.mnemonicTitle}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-amber-950 dark:text-amber-100 leading-relaxed">
                        {trick.trick}
                      </p>
                      <p className="text-xs font-mono font-semibold text-[#F97316] dark:text-amber-300 pt-1">
                        Takeaway: {trick.quickFormulaOrFact}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    );
  }

  return null;
};
