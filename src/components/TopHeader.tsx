import React from 'react';
import { Flame, Moon, Sun, Award } from 'lucide-react';
import { LanguageMode } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface TopHeaderProps {
  language: LanguageMode;
  onLanguageChange: (lang: LanguageMode) => void;
  streakDays: number;
  level: number;
  levelTitle: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onBrandClick: () => void;
}

const LANGUAGES: LanguageMode[] = ['English', 'Hinglish', 'Hindi'];

export const TopHeader: React.FC<TopHeaderProps> = ({
  language,
  onLanguageChange,
  streakDays,
  level,
  levelTitle,
  theme,
  onToggleTheme,
  onBrandClick,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-12 sm:h-14 flex items-center justify-between gap-2 sm:gap-6">
        {/* Left: App Icon + Saarthi AI */}
        <button
          type="button"
          onClick={onBrandClick}
          className="flex items-center gap-2 shrink-0 text-left focus-visible:outline-2 focus-visible:outline-[#2563EB] rounded-lg cursor-pointer"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden bg-[#1E1B4B] shrink-0 flex items-center justify-center border border-slate-200/40 dark:border-slate-700">
            <img
              src="/src/assets/images/saarthi_app_icon_1795174276542.jpg"
              alt="Saarthi AI logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/icon.svg';
              }}
            />
          </div>
          <span className="font-display font-bold text-sm sm:text-base tracking-tight text-[#1E1B4B] dark:text-white whitespace-nowrap shrink-0">
            Saarthi AI
          </span>
        </button>

        {/* Center: Global Language Switcher */}
        <div
          role="group"
          aria-label="Global language switcher"
          className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shrink-0"
        >
          {LANGUAGES.map((lang) => {
            const active = language === lang;
            return (
              <button
                key={lang}
                type="button"
                onClick={() => onLanguageChange(lang)}
                className={`px-1.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#1E1B4B] text-white dark:bg-[#2563EB] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lang}
              </button>
            );
          })}
        </div>

        {/* Right: Streak, Level, PWA Install & Theme Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div
            className="flex items-center gap-1 text-xs font-semibold text-[#F97316] whitespace-nowrap shrink-0 tabular-nums"
            title={`${streakDays} Day Study Streak`}
          >
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#F97316]/20 text-[#F97316]" />
            <span>{streakDays}</span>
            <span className="hidden sm:inline">{streakDays === 1 ? 'Day' : 'Days'}</span>
          </div>

          <span aria-hidden="true" className="hidden sm:inline text-slate-300 dark:text-slate-700">
            ·
          </span>

          <div
            className="hidden xs:flex sm:flex items-center gap-1 text-xs font-semibold text-[#1E1B4B] dark:text-blue-300 whitespace-nowrap shrink-0 tabular-nums"
            title={`Level ${level} ${levelTitle}`}
          >
            <Award className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
            <span>Lvl {level}</span>
            <span className="hidden md:inline">{levelTitle}</span>
          </div>

          <PWAInstallButton />

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#1E1B4B]" />}
          </button>
        </div>
      </div>
    </header>
  );
};
