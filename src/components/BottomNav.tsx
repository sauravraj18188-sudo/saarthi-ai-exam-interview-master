import React from 'react';
import { Home, FileCheck2, Mic, BookOpen, Timer } from 'lucide-react';
import { TabId } from '../types';

interface NavBarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  hiddenOnMobile?: boolean;
}

const NAV_ITEMS: Array<{ id: TabId; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'home', label: 'Dashboard', shortLabel: 'Home', icon: Home },
  { id: 'quiz', label: 'Mock Quiz', shortLabel: 'Quiz', icon: FileCheck2 },
  { id: 'interview', label: 'Mock Interview', shortLabel: 'Interview', icon: Mic },
  { id: 'notes', label: 'Notes & Cards', shortLabel: 'Notes', icon: BookOpen },
  { id: 'planner', label: 'Study Planner', shortLabel: 'Planner', icon: Timer },
];

export const DesktopTabRail: React.FC<NavBarProps> = ({ activeTab, onSelectTab }) => {
  return (
    <nav
      aria-label="Primary sections"
      className="hidden lg:block border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-6">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`relative py-3.5 px-1 flex items-center gap-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'text-[#2563EB] dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] dark:bg-blue-400 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export const MobileBottomNav: React.FC<NavBarProps> = ({ activeTab, onSelectTab, hiddenOnMobile }) => {
  if (hiddenOnMobile) return null;

  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
    >
      <div className="grid grid-cols-5 items-center h-14">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                active
                  ? 'text-[#2563EB] dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
