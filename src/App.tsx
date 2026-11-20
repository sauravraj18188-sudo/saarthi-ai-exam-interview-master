import { useCallback, useEffect, useState } from 'react';
import {
  AspirantProfile,
  LanguageMode,
  QuizAttemptSummary,
  QuizConfig,
  TabId,
} from './types';
import {
  getLevelInfo,
  loadLanguage,
  loadProfile,
  loadTheme,
  recordActivityStreakAndXP,
  recordQuizResult,
  saveLanguage,
  saveTheme,
} from './lib/storage';
import { TopHeader } from './components/TopHeader';
import { DesktopTabRail, MobileBottomNav } from './components/BottomNav';
import { HomeDashboard } from './components/HomeDashboard';
import { MockQuizEngine } from './components/MockQuizEngine';
import { MockInterviewRoom } from './components/MockInterviewRoom';
import { NotesFlashcardsVault } from './components/NotesFlashcardsVault';
import { StudyPlannerPomodoro } from './components/StudyPlannerPomodoro';
import { OfflineBanner } from './components/OfflineBanner';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [language, setLanguage] = useState<LanguageMode>(() => loadLanguage());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());
  const [profile, setProfile] = useState<AspirantProfile>(() => loadProfile());

  // Quiz cross-tab triggers
  const [quizPreset, setQuizPreset] = useState<Partial<QuizConfig> | null>(null);
  const [sprintTriggerId, setSprintTriggerId] = useState(0);
  const [inExamHall, setInExamHall] = useState(false);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#0F172A' : '#1E1B4B');
    }
  }, [theme]);

  const handleLanguageChange = (nextLang: LanguageMode) => {
    setLanguage(nextLang);
    saveLanguage(nextLang);
  };

  const handleToggleTheme = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };

  const handleStartDailySprint = () => {
    setActiveTab('quiz');
    setSprintTriggerId((id) => id + 1);
  };

  const handleSelectCategory = (preset: Partial<QuizConfig>) => {
    setQuizPreset({ ...preset });
    setActiveTab('quiz');
  };

  const handleContinueLastSession = () => {
    if (profile.lastSession) {
      setQuizPreset({
        examName: profile.lastSession.examName,
        topic: profile.lastSession.topic,
        count: 10,
        difficulty: 'Moderate',
        negativeMarking: 0.25,
      });
    }
    setActiveTab('quiz');
  };

  const handleQuizCompleted = useCallback(
    (
      summary: QuizAttemptSummary,
      subjectBreakdown: Record<string, { attempted: number; correct: number }>
    ) => {
      setProfile((prev) => recordQuizResult(prev, summary, subjectBreakdown));
    },
    []
  );

  const handleAwardXP = useCallback((xp: number) => {
    setProfile((prev) => recordActivityStreakAndXP(prev, xp));
  }, []);

  const levelInfo = getLevelInfo(profile.xp);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <TopHeader
        language={language}
        onLanguageChange={handleLanguageChange}
        streakDays={profile.streakDays}
        level={levelInfo.level}
        levelTitle={levelInfo.title}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onBrandClick={() => setActiveTab('home')}
      />

      {!inExamHall && (
        <DesktopTabRail activeTab={activeTab} onSelectTab={setActiveTab} />
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 py-5 sm:py-8 pb-24 lg:pb-12">
        <div className={activeTab === 'home' ? 'block' : 'hidden'}>
          <HomeDashboard
            profile={profile}
            language={language}
            onStartDailySprint={handleStartDailySprint}
            onSelectCategory={handleSelectCategory}
            onContinueLastSession={handleContinueLastSession}
          />
        </div>

        <div className={activeTab === 'quiz' ? 'block' : 'hidden'}>
          <MockQuizEngine
            language={language}
            presetConfig={quizPreset}
            sprintTriggerId={sprintTriggerId}
            onExamHallStateChange={setInExamHall}
            onQuizCompleted={handleQuizCompleted}
          />
        </div>

        <div className={activeTab === 'interview' ? 'block' : 'hidden'}>
          <MockInterviewRoom
            language={language}
            onInterviewCompleted={handleAwardXP}
          />
        </div>

        <div className={activeTab === 'notes' ? 'block' : 'hidden'}>
          <NotesFlashcardsVault
            language={language}
            onNotesGenerated={handleAwardXP}
          />
        </div>

        <div className={activeTab === 'planner' ? 'block' : 'hidden'}>
          <StudyPlannerPomodoro onFocusSessionCompleted={handleAwardXP} />
        </div>
      </main>

      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        hiddenOnMobile={inExamHall}
      />

      <OfflineBanner />
    </div>
  );
}
