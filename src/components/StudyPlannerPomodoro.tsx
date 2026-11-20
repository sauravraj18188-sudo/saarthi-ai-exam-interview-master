import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Flame,
  Plus,
  Check,
  Trash2,
  ListChecks,
} from 'lucide-react';
import { StudyTask } from '../types';
import {
  incrementPomodoroCountToday,
  loadPomodoroCountToday,
  loadStudyTasks,
  saveStudyTasks,
} from '../lib/storage';

interface StudyPlannerPomodoroProps {
  onFocusSessionCompleted: (xpEarned: number) => void;
}

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

const SUBJECT_TAGS = ['Polity', 'History', 'Quant', 'Reasoning', 'Science', 'Current Affairs', 'Interview'];

function playCompletionChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.46);
  } catch {
    // ignore audio block
  }
}

export const StudyPlannerPomodoro: React.FC<StudyPlannerPomodoroProps> = ({
  onFocusSessionCompleted,
}) => {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(() => loadPomodoroCountToday());

  const [tasks, setTasks] = useState<StudyTask[]>(() => loadStudyTasks());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('Polity');

  const totalDuration = mode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS;
  const progressRatio = (totalDuration - secondsLeft) / totalDuration;
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          playCompletionChime();
          if (mode === 'focus') {
            const nextCount = incrementPomodoroCountToday();
            setSessionsToday(nextCount);
            onFocusSessionCompleted(30);
            setMode('break');
            return BREAK_SECONDS;
          } else {
            setMode('focus');
            return FOCUS_SECONDS;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isRunning, mode, onFocusSessionCompleted]);

  const switchMode = (nextMode: 'focus' | 'break') => {
    setIsRunning(false);
    setMode(nextMode);
    setSecondsLeft(nextMode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(mode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    const next: StudyTask[] = [
      {
        id: `task-${Date.now()}`,
        title,
        subject: newTaskSubject,
        completed: false,
        createdAt: new Date().toISOString(),
      },
      ...tasks,
    ];
    setTasks(next);
    saveStudyTasks(next);
    setNewTaskTitle('');
  };

  const toggleTask = (id: string) => {
    const next = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setTasks(next);
    saveStudyTasks(next);
  };

  const deleteTask = (id: string) => {
    const next = tasks.filter((t) => t.id !== id);
    setTasks(next);
    saveStudyTasks(next);
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold text-[#2563EB] dark:text-blue-400">
          Deep Focus &amp; Daily Target Execution
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#1E1B4B] dark:text-white">
          Study Planner &amp; Pomodoro Timer
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Pomodoro Focus Ring */}
        <section className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col items-center space-y-6">
          <div className="w-full grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => switchMode('focus')}
              className={`min-h-[40px] flex items-center justify-center gap-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                mode === 'focus'
                  ? 'bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Flame className="w-4 h-4 text-[#F97316]" />
              <span>25m Study</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('break')}
              className={`min-h-[40px] flex items-center justify-center gap-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                mode === 'break'
                  ? 'bg-white dark:bg-slate-900 text-[#10B981] shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Coffee className="w-4 h-4 text-[#10B981]" />
              <span>5m Break</span>
            </button>
          </div>

          {/* Visual SVG Progress Ring */}
          <div className="relative w-52 h-52 flex items-center justify-center">
            <svg className="w-52 h-52 -rotate-90" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-slate-100 dark:text-slate-800"
              />
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={mode === 'focus' ? '#2563EB' : '#10B981'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {mode === 'focus' ? 'Deep Study' : 'Short Break'}
              </span>
              <span className="mt-1 font-mono text-4xl font-bold text-[#1E1B4B] dark:text-white tabular-nums">
                {formatTimer(secondsLeft)}
              </span>
              <span className="mt-1.5 text-xs font-medium text-[#F97316] tabular-nums">
                {sessionsToday} {sessionsToday === 1 ? 'cycle' : 'cycles'} today
              </span>
            </div>
          </div>

          <div className="w-full flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsRunning((r) => !r)}
              className={`flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer ${
                isRunning
                  ? 'bg-[#F97316] hover:bg-orange-600'
                  : mode === 'focus'
                  ? 'bg-[#2563EB] hover:bg-blue-700'
                  : 'bg-[#10B981] hover:bg-emerald-600'
              }`}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isRunning ? 'Pause Timer' : 'Start Timer'}</span>
            </button>

            <button
              type="button"
              onClick={resetTimer}
              aria-label="Reset timer"
              className="min-h-[46px] min-w-[46px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Right: Daily Study Targets Checklist */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-[#2563EB]" />
              <h2 className="font-display text-lg font-bold text-[#1E1B4B] dark:text-white">
                Today&apos;s Study Checklist
              </h2>
            </div>
            <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              {completedCount}/{tasks.length} Done
            </span>
          </div>

          <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add a study target (e.g., Solve 30 SSC Mensuration PYQs)..."
              className="flex-1 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-[#2563EB] focus:outline-none"
            />
            <select
              value={newTaskSubject}
              onChange={(e) => setNewTaskSubject(e.target.value)}
              aria-label="Subject category"
              className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:border-[#2563EB] focus:outline-none"
            >
              {SUBJECT_TAGS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!newTaskTitle.trim()}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Target</span>
            </button>
          </form>

          {tasks.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No study targets added yet. Add your first daily goal above.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {tasks.map((task) => (
                <li key={task.id} className="py-3.5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    className="flex items-start gap-3 text-left flex-1 min-w-0 cursor-pointer group"
                  >
                    <span
                      className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                        task.completed
                          ? 'bg-[#10B981] border-[#10B981] text-white'
                          : 'border-slate-300 dark:border-slate-600 group-hover:border-[#2563EB]'
                      }`}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5 stroke-[2.8]" />}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium leading-snug ${
                          task.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {task.subject}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    aria-label={`Remove ${task.title}`}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
