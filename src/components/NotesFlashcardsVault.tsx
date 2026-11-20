import React, { useState } from 'react';
import {
  BookOpen,
  FileText,
  Layers,
  HelpCircle,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { GeneratedNotesPack, LanguageMode } from '../types';
import { generateNotesPack } from '../lib/api';
import { loadNotesVault, removeNoteFromVault, saveNotesToVault } from '../lib/storage';
import { ErrorRetryBanner } from './ErrorRetryBanner';

interface NotesFlashcardsVaultProps {
  language: LanguageMode;
  onNotesGenerated: (xpEarned: number) => void;
}

const SAMPLE_TOPICS = [
  'Constitutional Amendments 42nd & 44th',
  'RBI Monetary Policy Tools (Repo, CRR, SLR)',
  '1857 Revolt Leaders & Centers',
  'SOF NSO Light, Reflection & Lenses',
  'Class 9 Motion & Newton Laws of Motion',
  'Class 12 Electrostatics & Gauss Law',
  'Hindustan Olympiad Logical Reasoning Tricks',
];

const NOTES_LEVELS = [
  { label: 'Competitive / All', value: '' },
  { label: 'Class 1–5', value: 'Class 1 to 5 (Primary NCERT & Olympiad)' },
  { label: 'Class 6–8', value: 'Class 6 to 8 (Middle School NCERT & SOF/Hindustan Olympiad)' },
  { label: 'Class 9–10', value: 'Class 9 to 10 (Board Foundation & Olympiad)' },
  { label: 'Class 11–12', value: 'Class 11 to 12 (Senior Secondary Boards & Olympiad)' },
];

export const NotesFlashcardsVault: React.FC<NotesFlashcardsVaultProps> = ({
  language,
  onNotesGenerated,
}) => {
  const [inputMode, setInputMode] = useState<'topic' | 'text'>('topic');
  const [gradeLevel, setGradeLevel] = useState('');
  const [topicInput, setTopicInput] = useState('Constitutional Amendments 42nd & 44th');
  const [articleInput, setArticleInput] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activePack, setActivePack] = useState<GeneratedNotesPack | null>(null);
  const [activeView, setActiveView] = useState<'notes' | 'flashcards' | 'questions'>('notes');
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  const [vault, setVault] = useState<GeneratedNotesPack[]>(() => loadNotesVault());

  const handleGenerate = async () => {
    const content = inputMode === 'topic' ? topicInput.trim() : articleInput.trim();
    if (!content) return;

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const data = await generateNotesPack({ inputMode, content, language, gradeLevel });
      const pack: GeneratedNotesPack = {
        id: `notes-${Date.now()}`,
        ...data,
        language,
      };
      setActivePack(pack);
      setActiveView('notes');
      setFlippedCards({});
      setRevealedAnswers({});
      onNotesGenerated(25);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to generate revision notes.');
    } finally {
      setIsGenerating(false);
    }
  };

  const isBookmarked = activePack ? vault.some((item) => item.id === activePack.id) : false;

  const handleBookmark = () => {
    if (!activePack) return;
    const next = saveNotesToVault(activePack);
    setVault(next);
  };

  const handleDeleteFromVault = (id: string) => {
    const next = removeNoteFromVault(id);
    setVault(next);
  };

  const handleOpenSaved = (pack: GeneratedNotesPack) => {
    setActivePack(pack);
    setActiveView('notes');
    setFlippedCards({});
    setRevealedAnswers({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTxtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setInputMode('text');
        setArticleInput(reader.result.slice(0, 12000));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header & Input Card */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-[#2563EB] dark:text-blue-400">
              AI Notes, Summarizer &amp; Flashcards
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#1E1B4B] dark:text-white">
              Smart Revision Studio
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bullet Notes · 3D Flip-Cards · 5 Probable Questions
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setInputMode('topic')}
                className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  inputMode === 'topic'
                    ? 'bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Enter Topic Name
              </button>
              <button
                type="button"
                onClick={() => setInputMode('text')}
                className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  inputMode === 'text'
                    ? 'bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Paste Article / Text
              </button>
            </div>

            {inputMode === 'text' && (
              <label className="min-h-[38px] inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <FileText className="w-3.5 h-3.5" />
                <span>Load .TXT File</span>
                <input type="file" accept=".txt,.md" onChange={handleTxtUpload} className="sr-only" />
              </label>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {NOTES_LEVELS.map((lvl) => (
              <button
                key={lvl.label}
                type="button"
                onClick={() => setGradeLevel(lvl.value)}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  gradeLevel === lvl.value
                    ? 'border-[#1E1B4B] bg-[#1E1B4B] text-white dark:border-[#2563EB] dark:bg-[#2563EB]'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          {inputMode === 'topic' ? (
            <div className="space-y-3">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g., Goods and Services Tax (GST) Council, Indus Valley Civilization"
                className="w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#2563EB] focus:outline-none"
              />
              <div className="flex flex-wrap gap-2">
                {SAMPLE_TOPICS.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setTopicInput(sample)}
                    className="min-h-[34px] px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:border-[#2563EB] hover:text-[#2563EB] transition-colors cursor-pointer"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <textarea
              rows={5}
              value={articleInput}
              onChange={(e) => setArticleInput(e.target.value)}
              placeholder="Paste any newspaper editorial, NCERT chapter excerpt, or lecture notes here..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 text-sm text-slate-900 dark:text-white focus:border-[#2563EB] focus:outline-none resize-y"
            />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Output Language: <strong className="text-slate-800 dark:text-slate-200">{language}</strong>
            </span>
            <button
              type="button"
              disabled={
                isGenerating ||
                (inputMode === 'topic' ? !topicInput.trim() : articleInput.trim().length < 20)
              }
              onClick={() => void handleGenerate()}
              className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Distilling Key Facts &amp; Cards...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Notes &amp; Flashcards</span>
                </>
              )}
            </button>
          </div>
        </div>

        {errorMsg && <ErrorRetryBanner message={errorMsg} onRetry={() => void handleGenerate()} />}
      </section>

      {/* Active Generated Pack with 3 Switchable Views */}
      {activePack && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-[#2563EB] dark:text-blue-400">
                {activePack.subjectTag} · {activePack.language}
              </p>
              <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#1E1B4B] dark:text-white">
                {activePack.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleBookmark}
              disabled={isBookmarked}
              className={`min-h-[42px] inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer ${
                isBookmarked
                  ? 'bg-emerald-50 text-[#10B981] border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                  : 'bg-[#1E1B4B] text-white hover:bg-indigo-900 dark:bg-[#2563EB] dark:hover:bg-blue-700'
              }`}
            >
              {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              <span>{isBookmarked ? 'Saved in Vault' : 'Bookmark to Vault'}</span>
            </button>
          </div>

          {/* 3 Switchable Views */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveView('notes')}
              className={`min-h-[42px] flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                activeView === 'notes'
                  ? 'bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="truncate">Bullet Notes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('flashcards')}
              className={`min-h-[42px] flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                activeView === 'flashcards'
                  ? 'bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span className="truncate">Flip-Cards ({activePack.flashcards.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('questions')}
              className={`min-h-[42px] flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                activeView === 'questions'
                  ? 'bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">5 Exam Qs</span>
            </button>
          </div>

          {/* VIEW 1: CRISP BULLET NOTES */}
          {activeView === 'notes' && (
            <div className="space-y-6">
              {activePack.bulletNotes.map((section, sIdx) => (
                <div
                  key={sIdx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 space-y-3"
                >
                  <h3 className="font-display text-base font-bold text-[#1E1B4B] dark:text-blue-300">
                    0{sIdx + 1}. {section.heading}
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                    {section.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-2 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* VIEW 2: INTERACTIVE 3D FLIP-CARDS */}
          {activeView === 'flashcards' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tap any card to flip between the term/question and answer for rapid active recall.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activePack.flashcards.map((card, cIdx) => {
                  const isFlipped = Boolean(flippedCards[cIdx]);
                  return (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() =>
                        setFlippedCards((prev) => ({ ...prev, [cIdx]: !prev[cIdx] }))
                      }
                      className="perspective-1000 w-full h-48 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[#2563EB] rounded-2xl"
                    >
                      <div
                        className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
                          isFlipped ? 'rotate-y-180' : ''
                        }`}
                      >
                        {/* Front */}
                        <div className="absolute inset-0 backface-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-xs font-semibold text-[#2563EB] dark:text-blue-400">
                            <span>Card {cIdx + 1} · Question / Term</span>
                            <RotateCw className="w-3.5 h-3.5" />
                          </div>
                          <p className="font-display text-base font-bold text-[#1E1B4B] dark:text-white leading-snug line-clamp-4">
                            {card.front}
                          </p>
                          <span className="text-[11px] text-slate-400">Tap to reveal answer</span>
                        </div>

                        {/* Back */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl bg-[#1E1B4B] dark:bg-blue-950 text-white border border-[#1E1B4B] dark:border-blue-800 p-5 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-xs font-semibold text-[#F97316]">
                            <span>Answer / Key Fact</span>
                            <RotateCw className="w-3.5 h-3.5" />
                          </div>
                          <p className="text-sm font-medium text-slate-100 leading-relaxed overflow-y-auto max-h-28">
                            {card.back}
                          </p>
                          <span className="text-[11px] text-blue-200">Tap to flip back</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 3: 5 MOST PROBABLE EXAM QUESTIONS */}
          {activeView === 'questions' && (
            <div className="space-y-4">
              {activePack.probableQuestions.map((pq, qIdx) => {
                const isOpen = Boolean(revealedAnswers[qIdx]);
                return (
                  <div
                    key={qIdx}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#F97316]">
                        Probable Q{qIdx + 1} · {pq.examRelevance}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedAnswers((prev) => ({ ...prev, [qIdx]: !prev[qIdx] }))
                        }
                        className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-semibold text-[#2563EB] dark:text-blue-400 cursor-pointer"
                      >
                        {isOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{isOpen ? 'Hide Answer' : 'Reveal Answer'}</span>
                      </button>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                      {pq.question}
                    </p>
                    {isOpen && (
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed">
                        <strong className="text-[#10B981]">Answer: </strong>
                        {pq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* SAVED LIBRARY VAULT */}
      <section aria-labelledby="vault-heading" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 id="vault-heading" className="font-display text-lg sm:text-xl font-bold text-[#1E1B4B] dark:text-white">
            Saved Library
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {vault.length} {vault.length === 1 ? 'pack' : 'packs'} saved
          </span>
        </div>

        {vault.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
            <Bookmark className="w-7 h-7 text-slate-400 mx-auto" />
            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Your Saved Library is empty
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Generate notes above and click &ldquo;Bookmark to Vault&rdquo; for offline-ready revision.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vault.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-start justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => handleOpenSaved(item)}
                  className="min-w-0 flex-1 text-left cursor-pointer"
                >
                  <p className="text-xs font-semibold text-[#2563EB] dark:text-blue-400">
                    {item.subjectTag} · {item.language}
                  </p>
                  <h3 className="mt-1 font-display text-base font-bold text-slate-900 dark:text-white truncate hover:text-[#2563EB]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.flashcards.length} Flip-Cards · {item.probableQuestions.length} Probable Qs
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteFromVault(item.id)}
                  aria-label={`Delete ${item.title}`}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
