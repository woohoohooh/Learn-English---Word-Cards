import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DataService } from '../services/DataService';
import { ContentType, WordList } from '../types';
import { RotateCcw, Check, Star, ChevronDown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HomeProps {
  type: ContentType;
}

const LEVEL_ORDER = [
  'Beginner', 'Basic', 
  'Intermediate', 
  'Upper-Intermediate', 'Upper', 
  'Advanced'
];

export const Home: React.FC<HomeProps> = ({ type }) => {
  const navigate = useNavigate();
  const { lists, setLists, progress, selectedLevel, selectedTheme, setFilters, resetListProgress, homeScrollPos, setHomeScrollPos } = useAppStore();
  const [showResetModal, setShowResetModal] = useState<{ id: string, name: string } | null>(null);
  const [activeFilterModal, setActiveFilterModal] = useState<'level' | 'theme' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(12);
  const [fileList, setFileList] = useState<string[]>([]);
  const loadingRef = React.useRef(false);

  useEffect(() => {
    const initLoad = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const files = await DataService.fetchFileList(type);
        setFileList(files);
        
        // Always reset display limit and list for new type
        setDisplayLimit(12);
        
        // Check if we need to load data (cache-friendly)
        if (lists[type].length === 0 && files.length > 0) {
          const initialFiles = files.slice(0, 12);
          const loaded: WordList[] = [];
          for (const f of initialFiles) {
            const item = await DataService.fetchListItem(type, f);
            if (item) loaded.push(item);
          }
          setLists(type, loaded);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    };
    initLoad();
  }, [type]); // Only reload when type changes

  // Load more as displayLimit increases
  useEffect(() => {
    const loadMore = async () => {
      if (fileList.length === 0 || loadingRef.current) return;
      const currentCount = lists[type].length;
      
      if (currentCount < displayLimit && currentCount < fileList.length) {
        loadingRef.current = true;
        const nextBatch = fileList.slice(currentCount, displayLimit);
        const loaded: WordList[] = [];
        for (const f of nextBatch) {
          const item = await DataService.fetchListItem(type, f);
          if (item) loaded.push(item);
        }
        if (loaded.length > 0) {
          setLists(type, [...lists[type], ...loaded]);
        }
        loadingRef.current = false;
      }
    };
    loadMore();
  }, [displayLimit, fileList, type]);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && lists[type].length < fileList.length) {
          setDisplayLimit(prev => prev + 12);
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [lists, type, fileList.length]);

  // Restore scroll position
  useEffect(() => {
    if (homeScrollPos > 0) {
      window.scrollTo(0, homeScrollPos);
    }
  }, [homeScrollPos]);

  const currentLists = lists[type];

  const levels = useMemo(() => {
    const set = new Set<string>(currentLists.map(l => l.level).filter(Boolean));
    return Array.from(set).sort((a: string, b: string) => {
      const indexA = LEVEL_ORDER.indexOf(a);
      const indexB = LEVEL_ORDER.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [currentLists]);

  const themes = useMemo(() => {
    const set = new Set<string>(currentLists.filter(l => !selectedLevel || l.level === selectedLevel).map(l => l.theme).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [currentLists, selectedLevel]);

  const filteredLists = useMemo(() => {
    return currentLists
      .filter(l => {
        if (selectedLevel && l.level !== selectedLevel) return false;
        if (selectedTheme && l.theme !== selectedTheme) return false;
        return true;
      })
      .sort((a, b) => {
        const indexA = LEVEL_ORDER.indexOf(a.level);
        const indexB = LEVEL_ORDER.indexOf(b.level);
        
        if (indexA !== indexB) {
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
        }
        
        // Use natural sort on id (filename) to respect numerical order (e.g. list_basic_2 before list_basic_10)
        return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [currentLists, selectedLevel, selectedTheme]);

  const getListStats = (list: WordList) => {
    let known = 0;
    let review = 0;
    list.items.forEach(item => {
      const status = progress[`${list.id}_${item.id}`];
      if (status === 'known') known++;
      if (status === 'review') review++;
    });
    return { known, review, total: list.items.length };
  };

  const handleStartAll = () => {
    if (filteredLists.length === 0) return;
    setHomeScrollPos(window.scrollY);
    navigate('/review/all');
  };

  const handleReset = (listId: string) => {
    resetListProgress(listId);
    setShowResetModal(null);
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
  };

  return (
    <div className="container mx-auto px-5 max-w-[1200px] pb-[env(safe-area-inset-bottom,20px)] pt-[env(safe-area-inset-top,20px)] font-['Nunito']">
      <header className="flex justify-between items-center py-4 mb-8 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-gradient-to-r after:from-transparent after:via-[#333] after:to-transparent">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#4caf50] to-[#2196f3] bg-clip-text text-transparent tracking-tight">
          Learn English - Word Cards
        </h1>
        <div 
          className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center cursor-pointer shadow-[0_4px_20px_rgba(102,126,234,0.25)] active:scale-90 transition-all"
          onClick={() => navigate('/profile')}
        >
          <Star className="text-white fill-white shadow-sm" size={28} />
        </div>
      </header>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-[#4caf50]/20 border-t-[#4caf50] rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading lists...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center mb-8">
          <p className="text-red-400 font-medium mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="bg-[#1e1e1e]/50 backdrop-blur-md rounded-2xl p-4 border border-white/5 mb-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3 w-full">
          {/* Level Filter Button */}
          <div className="flex-1 w-full">
            <button 
              onClick={() => setActiveFilterModal('level')}
              className="w-full h-[48px] bg-[#282828]/80 border border-white/10 rounded-xl px-4 text-white flex items-center justify-between active:scale-[0.98] transition-all"
            >
              <span className="truncate text-sm font-bold tracking-wider text-gray-300">
                {selectedLevel || 'All Levels'}
              </span>
              <ChevronDown size={18} className="text-gray-500" />
            </button>
          </div>
          {/* Theme Filter Button */}
          <div className="flex-1 w-full">
            <button 
              onClick={() => setActiveFilterModal('theme')}
              className="w-full h-[48px] bg-[#282828]/80 border border-white/10 rounded-xl px-4 text-white flex items-center justify-between active:scale-[0.98] transition-all"
            >
              <span className="truncate text-sm font-bold tracking-wider text-gray-300">
                {selectedTheme || 'All Themes'}
              </span>
              <ChevronDown size={18} className="text-gray-500" />
            </button>
          </div>
        </div>
        
        <div className="w-full">
          <button 
            onClick={handleStartAll}
            disabled={filteredLists.length === 0}
            className="w-full h-[48px] px-6 bg-gradient-to-r from-[#4caf50]/15 to-[#2196f3]/15 border border-[#4caf50]/30 rounded-xl font-bold text-[#4caf50] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
          >
            <span>Start All Cards</span>
            {filteredLists.length > 0 && (
              <span className="bg-[#2196f3]/20 text-[#2196f3] px-2.5 py-0.5 rounded-full text-xs border border-[#2196f3]/30">
                {filteredLists.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {filteredLists.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-[#1e1e1e]/30 rounded-2xl border border-dashed border-white/10">
            <p className="text-gray-500 font-medium">No lists found for the selected filters.</p>
          </div>
        ) : (
          filteredLists.slice(0, displayLimit).map(list => {
            const { known, review, total } = getListStats(list);
            const progressPercent = total > 0 ? Math.round(((known + review) / total) * 100) : 0;
            const isComplete = known === total && total > 0;
            const hasProgress = known > 0 || review > 0;

            return (
              <div key={list.id} className="bg-[#1e1e1e]/70 backdrop-blur-md rounded-2xl p-6 border border-white/5 hover:border-[#4caf50]/20 transition-all hover:-translate-y-1 shadow-lg">
                <div className="flex justify-between items-start mb-5">
                  <h3 className="text-xl font-bold leading-tight cursor-pointer hover:text-[#4caf50] transition-colors">
                    {list.theme}
                  </h3>
                  <div className={cn("text-[#4caf50] transition-all", isComplete ? "opacity-100 scale-110" : "opacity-0 scale-90")}>
                    <Check size={24} strokeWidth={3} />
                  </div>
                </div>

                <div className="flex gap-2 mb-6">
                  <span className="px-4 py-2 rounded-xl text-sm font-bold bg-[#ff9800]/20 border border-[#ff9800]/30 text-[#ff9800]">
                    {list.level}
                  </span>
                  <span className="px-4 py-2 rounded-xl text-sm font-bold bg-[#2196f3]/20 border border-[#2196f3]/30 text-[#2196f3]">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                </div>

                <div className="mb-8">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#4caf50] to-[#2196f3] transition-all duration-500" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setHomeScrollPos(window.scrollY);
                      navigate(`/review/${list.id}`);
                    }}
                    disabled={isComplete}
                    className="flex-[3] h-[52px] bg-gradient-to-r from-[#4caf50] to-[#2e7d32] rounded-xl font-bold flex items-center justify-center active:scale-95 transition-all disabled:opacity-40"
                  >
                    {isComplete ? 'All Learned' : `Start Learning (${total - known})`}
                  </button>
                  <button 
                    onClick={() => setShowResetModal({ id: list.id, name: list.theme })}
                    disabled={!hasProgress}
                    className={cn(
                      "w-[52px] h-[52px] rounded-xl flex items-center justify-center transition-all border font-medium",
                      hasProgress 
                        ? "bg-transparent border-[#3a3a3a] text-[#8a8a8a] opacity-90 hover:border-red-500/50 hover:text-red-500 active:scale-95" 
                        : "bg-transparent border-[#2a2a2a] text-[#3a3a3a] opacity-50 cursor-not-allowed"
                    )}
                    title="Reset progress"
                  >
                    <RotateCcw size={20} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {filteredLists.length > displayLimit && (
        <div id="scroll-sentinel" className="h-20 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#4caf50]/20 border-t-[#4caf50] rounded-full animate-spin" />
        </div>
      )}
    </>
  )}

      {/* Filter Modal */}
      {activeFilterModal && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setActiveFilterModal(null)} />
          <div className="relative bg-[#181818] border-t md:border border-white/10 rounded-t-3xl md:rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h3 className="text-xl font-bold tracking-wider text-gray-400">
                Select {activeFilterModal === 'level' ? 'Level' : 'Theme'}
              </h3>
              <button onClick={() => setActiveFilterModal(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <button 
                onClick={() => {
                  if (activeFilterModal === 'level') setFilters('', '');
                  else setFilters(selectedLevel, '');
                  setActiveFilterModal(null);
                }}
                className={cn(
                  "w-full p-4 rounded-xl text-left font-bold transition-all",
                  (activeFilterModal === 'level' ? !selectedLevel : !selectedTheme) 
                    ? "bg-[#4caf50]/20 text-[#4caf50] border border-[#4caf50]/30" 
                    : "bg-white/5 text-gray-300 border border-transparent hover:bg-white/10"
                )}
              >
                All {activeFilterModal === 'level' ? 'Levels' : 'Themes'}
              </button>
              {(activeFilterModal === 'level' ? levels : themes).map(option => (
                <button 
                  key={option}
                  onClick={() => {
                    if (activeFilterModal === 'level') setFilters(option, '');
                    else setFilters(selectedLevel, option);
                    setActiveFilterModal(null);
                  }}
                  className={cn(
                    "w-full p-4 rounded-xl text-left font-bold transition-all",
                    (activeFilterModal === 'level' ? selectedLevel === option : selectedTheme === option) 
                      ? "bg-[#4caf50]/20 text-[#4caf50] border border-[#4caf50]/30" 
                      : "bg-white/5 text-gray-300 border border-transparent hover:bg-white/10"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowResetModal(null)} />
          <div className="relative bg-[#181818] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Confirm Reset</h3>
            <p className="text-gray-400 mb-6">Are you sure you want to reset progress for "{showResetModal.name}"? This will mark all items as new.</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowResetModal(null)}
                className="px-5 py-2.5 rounded-xl border border-white/10 font-bold text-gray-400 hover:bg-white/5"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleReset(showResetModal.id)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2e7d32] to-[#1b5e20] font-bold text-white shadow-lg shadow-green-900/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
