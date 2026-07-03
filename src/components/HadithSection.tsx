import { useState } from 'react';
import { HADITH_DATA, HadithReference } from '../utils/hadithData';
import { BookOpen, Award, Sparkles, Copy, Check } from 'lucide-react';

interface HadithSectionProps {
  activePrayerId: string | null;
}

export default function HadithSection({ activePrayerId }: HadithSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Categories in Bangla
  const categories = [
    { id: 'all', name: 'সকল দলিল' },
    { id: 'general', name: 'সাধারণ নিয়ম' },
    { id: 'fajr', name: 'ফজর' },
    { id: 'dhuhr', name: 'যোহর' },
    { id: 'asr', name: 'আসর' },
    { id: 'maghrib', name: 'মাগরিব' },
    { id: 'isha', name: 'এশা' },
  ];

  const filteredHadiths = HADITH_DATA.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getCategoryNameBn = (cat: string) => {
    switch (cat) {
      case 'general': return 'সাধারণ নিয়ম';
      case 'fajr': return 'ফজর';
      case 'dhuhr': return 'যোহর';
      case 'asr': return 'আসর';
      case 'maghrib': return 'মাগরিব';
      case 'isha': return 'এশা';
      default: return cat;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/40 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-emerald-500/10 transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
          <BookOpen size={22} id="hadith-section-icon" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-850 dark:text-zinc-100 font-sans tracking-tight">
            হাদিস ও কুরআনের আলো (আওয়াল ওয়াক্তের গুরুত্ব)
          </h2>
          <p className="text-xs text-zinc-500 dark:text-slate-400 mt-1">
            আল্লাহর সন্তুষ্টির জন্য আওয়াল ওয়াক্তে নামায আদায়ের সহীহ দলিলসমূহ
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat.id}
            id={`btn-cat-${cat.id}`}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/30 text-white shadow-sm'
                : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-600 dark:text-slate-300'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Hadith List */}
      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-slate-800">
        {filteredHadiths.map((item, index) => (
          <div
            key={index}
            id={`hadith-item-${index}`}
            className="group relative p-4 rounded-2xl bg-zinc-50/70 hover:bg-zinc-100/50 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-100 dark:border-white/5 transition-all"
          >
            {/* Importance badge */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase ${
                item.category === 'general'
                  ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
              }`}>
                {getCategoryNameBn(item.category)}
              </span>

              {item.importance === 'high' && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                  <Award size={10} /> মূল দলিল
                </span>
              )}
            </div>

            <p className="text-sm leading-relaxed text-zinc-700 dark:text-slate-300 italic pr-6 font-sans">
              "{item.text}"
            </p>

            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-zinc-500 dark:text-slate-400 border-t border-zinc-100/50 dark:border-white/5 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-zinc-700 dark:text-slate-300">{item.source}</span>
                {item.international && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded font-sans font-medium">
                    Int: {item.international}
                  </span>
                )}
              </div>
              
              <button
                id={`btn-copy-${index}`}
                onClick={() => handleCopy(`${item.text} — ${item.source}${item.international ? ` (International: ${item.international})` : ''}`, index)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-zinc-200 dark:hover:bg-white/5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-350 cursor-pointer flex items-center gap-1 self-end sm:self-auto"
                title="কপি করুন"
              >
                {copiedIndex === index ? (
                  <>
                    <Check size={12} className="text-emerald-500 animate-pulse" />
                    <span>কপি হয়েছে</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>কপি করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}

        {filteredHadiths.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="mx-auto text-zinc-300 dark:text-zinc-700 mb-2" size={32} />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">এই ক্যাটাগরিতে কোনো নির্দিষ্ট দলিল পাওয়া যায়নি।</p>
          </div>
        )}
      </div>
    </div>
  );
}
