import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Send,
  UserCheck,
  Award,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Loader2,
  Briefcase,
} from 'lucide-react';
import {
  InterviewDossier,
  InterviewRoundEntry,
  InterviewSetup,
  LanguageMode,
} from '../types';
import { evaluateInterviewAnswer, startInterview } from '../lib/api';
import { ErrorRetryBanner } from './ErrorRetryBanner';

interface MockInterviewRoomProps {
  language: LanguageMode;
  onInterviewCompleted: (xpEarned: number) => void;
}

const TOTAL_ROUNDS = 5;

const ROLE_PRESETS = [
  'IBPS PO / Probationary Officer',
  'UPSC / State PCS Personality Test',
  'Full-Stack Software Engineer',
  'Data Analyst',
  'SSC CGL Assistant Audit Officer',
];

const DEPARTMENT_TYPES = ['PSU / Bank', 'IT Startup', 'MNC', 'Government Board'];

type SpeechRecognitionType = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export const MockInterviewRoom: React.FC<MockInterviewRoomProps> = ({
  language,
  onInterviewCompleted,
}) => {
  const [phase, setPhase] = useState<'setup' | 'live' | 'dossier'>('setup');
  const [setup, setSetup] = useState<InterviewSetup>({
    jobRole: 'IBPS PO / Probationary Officer',
    departmentType: 'PSU / Bank',
    experience: 'Fresher',
    strictness: 'Friendly Mentor',
  });

  const [interviewerInfo, setInterviewerInfo] = useState<{
    name: string;
    role: string;
    greeting: string;
  } | null>(null);

  const [currentRound, setCurrentRound] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentCompetency, setCurrentCompetency] = useState('');
  const [rounds, setRounds] = useState<InterviewRoundEntry[]>([]);
  const [dossier, setDossier] = useState<InterviewDossier | null>(null);

  const [answerText, setAnswerText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'start' | 'evaluate' | null>(null);

  // Voice-to-text state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionType;
      webkitSpeechRecognition?: new () => SpeechRecognitionType;
    };
    setSpeechSupported(Boolean(win.SpeechRecognition || win.webkitSpeechRecognition));
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rounds, currentQuestion, dossier]);

  const handleStartInterview = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setPendingAction('start');
    try {
      const data = await startInterview(setup, language);
      setInterviewerInfo({
        name: data.interviewerName,
        role: data.interviewerRole,
        greeting: data.greeting,
      });
      setCurrentRound(data.questionNumber || 1);
      setCurrentQuestion(data.question);
      setCurrentCompetency(data.focusCompetency);
      setRounds([]);
      setDossier(null);
      setAnswerText('');
      setPhase('live');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to start interview session.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    const trimmed = answerText.trim();
    if (!trimmed || isLoading) return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }

    setIsLoading(true);
    setErrorMsg(null);
    setPendingAction('evaluate');

    try {
      const historyPayload = rounds.map((r) => ({
        question: r.question,
        answer: r.answer,
        score: r.rubric.score,
      }));

      const res = await evaluateInterviewAnswer({
        setup,
        language,
        history: historyPayload,
        currentQuestion,
        userAnswer: trimmed,
        currentRound,
        totalRounds: TOTAL_ROUNDS,
      });

      const completedRound: InterviewRoundEntry = {
        round: currentRound,
        question: currentQuestion,
        focusCompetency: currentCompetency,
        answer: trimmed,
        rubric: res.rubric,
      };

      setRounds((prev) => [...prev, completedRound]);
      setAnswerText('');

      if (res.isComplete || currentRound >= TOTAL_ROUNDS) {
        setDossier(res.finalDossier);
        setPhase('dossier');
        onInterviewCompleted(75);
      } else if (res.hasNextQuestion && res.nextQuestion?.question) {
        setCurrentRound(res.nextQuestion.questionNumber || currentRound + 1);
        setCurrentQuestion(res.nextQuestion.question);
        setCurrentCompetency(res.nextQuestion.focusCompetency || 'Core Competency');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to evaluate your answer.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoiceMic = () => {
    setMicNote(null);
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionType;
      webkitSpeechRecognition?: new () => SpeechRecognitionType;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setMicNote('Voice input is unavailable in this browser. Please type your answer below.');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = language === 'Hindi' ? 'hi-IN' : 'en-IN';

      const baseText = answerText.trim() ? `${answerText.trim()} ` : '';

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          const piece = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            finalTranscript += piece;
          } else {
            interimTranscript += piece;
          }
        }
        setAnswerText(`${baseText}${finalTranscript}${interimTranscript}`.trim());
      };

      rec.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setMicNote('Microphone permission denied. You can still type your response below.');
        } else {
          setMicNote('Voice capture paused. You can continue typing or tap the mic again.');
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      setMicNote('Could not activate microphone. Please type your answer.');
    }
  };

  // SETUP SCREEN
  if (phase === 'setup') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-[#2563EB] dark:text-blue-400">
              AI Mock Interview Simulator
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#1E1B4B] dark:text-white">
              Configure Interview Panel
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            5 Structured Rounds · Voice or Text · Instant Rubric
          </p>
        </div>

        {errorMsg && (
          <ErrorRetryBanner
            message={errorMsg}
            onRetry={() => void handleStartInterview()}
          />
        )}

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 space-y-6">
          <div className="space-y-2.5">
            <label htmlFor="job-role-input" className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
              Target Job Role / Exam Board
            </label>
            <input
              id="job-role-input"
              type="text"
              value={setup.jobRole}
              onChange={(e) => setSetup((s) => ({ ...s, jobRole: e.target.value }))}
              placeholder="e.g., SBI PO, UPSC DAF Panel, React Engineer"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#2563EB] focus:outline-none"
            />
            <div className="flex flex-wrap gap-2">
              {ROLE_PRESETS.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSetup((s) => ({ ...s, jobRole: role }))}
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    setup.jobRole === role
                      ? 'border-[#2563EB] bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
              Company / Department Type
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {DEPARTMENT_TYPES.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSetup((s) => ({ ...s, departmentType: dept }))}
                  className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                    setup.departmentType === dept
                      ? 'border-[#2563EB] bg-blue-50 text-[#2563EB] dark:bg-blue-950/50 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-2">
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                Experience Level
              </span>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {(['Fresher', '1-3 Yrs'] as const).map((exp) => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => setSetup((s) => ({ ...s, experience: exp }))}
                    className={`min-h-[42px] rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                      setup.experience === exp
                        ? 'bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                Panelist Strictness
              </span>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {(['Friendly Mentor', 'Strict Panelist'] as const).map((str) => (
                  <button
                    key={str}
                    type="button"
                    onClick={() => setSetup((s) => ({ ...s, strictness: str }))}
                    className={`min-h-[42px] rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                      setup.strictness === str
                        ? 'bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {str}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {setup.departmentType} · {setup.experience} · {setup.strictness} · {language}
            </p>
            <button
              type="button"
              disabled={isLoading || !setup.jobRole.trim()}
              onClick={() => void handleStartInterview()}
              className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 text-sm sm:text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparing Interview Panel...</span>
                </>
              ) : (
                <>
                  <Briefcase className="w-4 h-4" />
                  <span>Enter Interview Room</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LIVE ROOM + FINAL DOSSIER
  const avgScore =
    rounds.length > 0
      ? (rounds.reduce((acc, r) => acc + r.rubric.score, 0) / rounds.length).toFixed(1)
      : '0.0';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Room Header */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#2563EB] dark:text-blue-400">
            {interviewerInfo?.name || 'Panel Chair'} · {interviewerInfo?.role || setup.departmentType}
          </p>
          <h2 className="font-display text-base sm:text-lg font-bold text-[#1E1B4B] dark:text-white">
            {setup.jobRole} ({setup.strictness})
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">
            {phase === 'dossier' ? 'Completed 5/5' : `Round ${currentRound} / ${TOTAL_ROUNDS}`}
          </span>
          <button
            type="button"
            onClick={() => setPhase('setup')}
            className="min-h-[38px] inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Opening Greeting */}
      {interviewerInfo && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#1E1B4B] text-white flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {interviewerInfo.name} · Panel Opening
            </p>
            <p className="mt-1 text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              {interviewerInfo.greeting}
            </p>
          </div>
        </div>
      )}

      {/* Completed Rounds & Instant Rubric Cards */}
      {rounds.map((entry) => (
        <div key={entry.round} className="space-y-3">
          {/* Question Bubble */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
            <p className="text-xs font-semibold text-[#2563EB] dark:text-blue-400">
              Question {entry.round} · {entry.focusCompetency}
            </p>
            <p className="mt-1.5 text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
              {entry.question}
            </p>
          </div>

          {/* Candidate Answer Bubble */}
          <div className="rounded-2xl bg-[#1E1B4B] text-white p-4 sm:p-5 ml-4 sm:ml-10">
            <p className="text-[11px] font-semibold text-blue-200">Your Response</p>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{entry.answer}</p>
          </div>

          {/* Instant AI Rubric Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#F97316]" />
                <span className="font-display text-sm font-bold text-[#1E1B4B] dark:text-white">
                  Instant Evaluation Rubric · Round {entry.round}
                </span>
              </div>
              <span
                className={`font-mono text-sm font-bold tabular-nums ${
                  entry.rubric.score >= 7
                    ? 'text-[#10B981]'
                    : entry.rubric.score >= 5
                    ? 'text-[#F97316]'
                    : 'text-[#EF4444]'
                }`}
              >
                Score: {entry.rubric.score} / 10
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-1">
                <p className="font-semibold text-[#1E1B4B] dark:text-blue-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <span>Communication &amp; Structure</span>
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {entry.rubric.communicationAndStructure}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-1">
                <p className="font-semibold text-[#1E1B4B] dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#F97316]" />
                  <span>Red Flags / Improvements</span>
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {entry.rubric.redFlagsOrImprovements}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 space-y-1">
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Model 10/10 Answer</span>
              </p>
              <p className="text-xs sm:text-sm text-emerald-950 dark:text-emerald-100 leading-relaxed">
                {entry.rubric.modelAnswer}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Current Active Question & Response Composer */}
      {phase === 'live' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#2563EB]/40 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <p className="text-xs font-semibold text-[#2563EB] dark:text-blue-400">
              Question {currentRound} of {TOTAL_ROUNDS} · {currentCompetency}
            </p>
            <h3 className="mt-1.5 text-base sm:text-lg font-bold text-[#1E1B4B] dark:text-white leading-relaxed">
              {currentQuestion}
            </h3>
          </div>

          {errorMsg && (
            <ErrorRetryBanner
              message={errorMsg}
              onRetry={() => {
                if (pendingAction === 'start') {
                  void handleStartInterview();
                } else {
                  void handleSubmitAnswer();
                }
              }}
            />
          )}

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <textarea
              rows={4}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder={
                speechSupported
                  ? 'Tap the microphone to speak naturally, or type your response here...'
                  : 'Type your structured interview answer here...'
              }
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-white focus:border-[#2563EB] focus:outline-none resize-y"
            />

            {micNote && (
              <p className="text-xs text-[#F97316] font-medium">{micNote}</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={toggleVoiceMic}
                className={`min-h-[44px] inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  isListening
                    ? 'border-[#EF4444] bg-red-50 text-[#EF4444] dark:bg-red-950/40 dark:text-red-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#2563EB]" />}
                <span>{isListening ? 'Listening... Tap to Stop' : 'Speak Answer (Mic)'}</span>
              </button>

              <button
                type="button"
                disabled={isLoading || !answerText.trim()}
                onClick={() => void handleSubmitAnswer()}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer ml-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating Answer...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Answer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINAL SELECTION READINESS REPORT */}
      {phase === 'dossier' && dossier && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-[#2563EB] dark:text-blue-400">
                Final Dossier · 5 Rounds Evaluated
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-[#1E1B4B] dark:text-white">
                Selection Readiness Report
              </h2>
            </div>

            <div className="flex items-center gap-4 font-mono tabular-nums">
              <div className="text-right">
                <p className="font-sans text-xs text-slate-500 dark:text-slate-400">Verdict</p>
                <p
                  className={`font-display text-lg font-bold ${
                    dossier.verdict.includes('Strong') || dossier.verdict === 'Hire'
                      ? 'text-[#10B981]'
                      : dossier.verdict.includes('Hold')
                      ? 'text-[#F97316]'
                      : 'text-[#EF4444]'
                  }`}
                >
                  {dossier.verdict}
                </p>
              </div>
              <div className="rounded-xl bg-[#1E1B4B] text-white px-4 py-2.5 text-center">
                <p className="font-sans text-[11px] text-blue-200">Readiness</p>
                <p className="text-xl font-bold">{dossier.overallScore}/100</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Panel Summary · Average Round Score: {avgScore}/10
            </p>
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
              {dossier.summary}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-display text-base font-bold text-[#1E1B4B] dark:text-white">
              Top 3 Focus Areas Before Your Real Interview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(dossier.topFocusAreas || []).slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 space-y-1.5"
                >
                  <p className="text-xs font-bold text-[#2563EB] dark:text-blue-400">
                    0{idx + 1}. {item.area}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.actionStep}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setPhase('setup')}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start Another Mock Interview</span>
            </button>
          </div>
        </section>
      )}

      <div ref={transcriptEndRef} />
    </div>
  );
};
