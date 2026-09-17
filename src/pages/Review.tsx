import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { WordItem, WordStatus } from '../types';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { DataService } from '../services/DataService';

export const Review: React.FC = () => {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const { lists, progress, updateWordStatus, voice, selectedContentType } = useAppStore();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwapped, setIsSwapped] = useState(false);
  const [isUIHidden, setIsUIHidden] = useState(true);
  const [dragRatio, setDragRatio] = useState(0);
  const [dragAxis, setDragAxis] = useState<'x' | 'y' | null>(null);
  const isDragging = useRef(false);

  const wordRef = useRef<HTMLHeadingElement>(null);

  const isMobile = useMemo(() => {
    return typeof window !== 'undefined' && (window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const currentList = useMemo(() => {
    if (listId === 'all') {
      const allItems: (WordItem & { listId: string })[] = [];
      lists[selectedContentType].forEach(list => {
        list.items.forEach(item => {
          if (progress[`${list.id}_${item.id}`] !== 'known') {
            allItems.push({ ...item, listId: list.id });
          }
        });
      });
      return {
        id: 'all',
        theme: 'Combined Review',
        items: shuffleArray(allItems)
      };
    }
    
    const list = Object.values(lists).flat().find(l => l.id === listId);
    if (!list) return null;
    
    const itemsToReview = list.items.filter(item => progress[`${list.id}_${item.id}`] !== 'known');
    return {
      ...list,
      items: shuffleArray(itemsToReview)
    };
  }, [listId, lists, progress, selectedContentType]);

  const currentWord = currentList?.items[currentIndex];

  useEffect(() => {
    if (currentWord) {
      playAudio(currentWord);
      setIsSwapped(false);
      setIsUIHidden(true);
    }
  }, [currentIndex, currentWord]);

  const playAudio = (word: any) => {
    const audioPath = DataService.getAudioPath(word.english, voice, selectedContentType);
    const audio = new Audio(audioPath);
    audio.play().catch(e => console.warn('Audio play failed', e));
  };

  const handleAction = (status: WordStatus) => {
    if (!currentWord) return;
    
    const actualListId = (currentWord as any).listId || listId;
    updateWordStatus(actualListId!, currentWord.id, status);
    
    if (navigator.vibrate) navigator.vibrate(20);
    
    if (currentIndex < (currentList?.items.length || 0) - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      navigate(-1);
    }
  };

  // Text fitting logic similar to HTML
  useEffect(() => {
    if (wordRef.current && currentWord) {
      const elem = wordRef.current;
      const initialSize = window.innerWidth <= 768 ? 48 : 64;
      const maxWidth = window.innerWidth - 40;
      
      let fontSize = initialSize;
      elem.style.fontSize = fontSize + 'px';
      
      // Simple fit logic
      while (elem.scrollWidth > maxWidth && fontSize > 12) {
        fontSize -= 2;
        elem.style.fontSize = fontSize + 'px';
      }
    }
  }, [currentWord, isSwapped]);

  if (!currentList || !currentWord) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-[#121212]">
        <h2 className="text-2xl font-bold mb-4">No cards to review!</h2>
        <button 
          onClick={() => navigate(-1)}
          className="bg-[#4caf50] px-8 py-3 rounded-xl font-bold active:scale-95 transition-transform"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-[#121212] font-['Nunito'] select-none">
      {/* Background Overlays */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Gradient Overlays */}
        <div 
          className="absolute inset-0 transition-opacity duration-150"
          style={{ 
            opacity: dragRatio > 0 && ((isMobile && dragAxis === 'y') || (!isMobile && dragAxis === 'x')) ? dragRatio * 0.45 : 0,
            background: 'radial-gradient(circle at center, rgba(255,152,0,0) 0%, rgba(255,152,0,0.12) 30%, rgba(255,152,0,0.28) 60%, rgba(255,152,0,0.45) 100%)'
          }} 
        />
        <div 
          className="absolute inset-0 transition-opacity duration-150"
          style={{ 
            opacity: dragRatio < 0 && ((isMobile && dragAxis === 'y') || (!isMobile && dragAxis === 'x')) ? Math.abs(dragRatio) * 0.45 : 0,
            background: 'radial-gradient(circle at center, rgba(76,175,80,0) 0%, rgba(76,175,80,0.12) 30%, rgba(76,175,80,0.28) 60%, rgba(76,175,80,0.45) 100%)'
          }} 
        />

        {/* Background Icons - Mobile */}
        {isMobile && (
          <>
            <div className={cn(
              "absolute top-[12%] left-1/2 -translate-x-1/2 text-[120px] font-extrabold text-[#4caf50] transition-opacity duration-300 pointer-events-none",
              dragRatio < 0 ? 'opacity-[0.08]' : 'opacity-0'
            )} style={{ filter: 'drop-shadow(0 0 8px rgba(76,175,80,0.15))' }}>✓</div>
            <div className={cn(
              "absolute bottom-[12%] left-1/2 -translate-x-1/2 text-[100px] font-extrabold text-[#ff9800] transition-opacity duration-300 pointer-events-none",
              dragRatio > 0 ? 'opacity-[0.08]' : 'opacity-0'
            )} style={{ filter: 'drop-shadow(0 0 8px rgba(255,152,0,0.15))' }}>↻</div>
          </>
        )}

        {/* Background Icons - PC */}
        {!isMobile && (
          <>
            <div className={cn(
              "absolute top-1/2 left-[8%] -translate-y-1/2 text-[140px] font-extrabold text-[#4caf50] transition-opacity duration-300 pointer-events-none",
              dragRatio < 0 ? 'opacity-[0.06]' : 'opacity-0'
            )} style={{ filter: 'drop-shadow(0 0 12px rgba(76,175,80,0.12))' }}>✓</div>
            <div className={cn(
              "absolute top-1/2 right-[8%] -translate-y-1/2 text-[140px] font-extrabold text-[#ff9800] transition-opacity duration-300 pointer-events-none",
              dragRatio > 0 ? 'opacity-[0.06]' : 'opacity-0'
            )} style={{ filter: 'drop-shadow(0 0 12px rgba(255,152,0,0.12))' }}>↻</div>
          </>
        )}
      </div>

      {/* Top Area */}
      <header className={cn(
        "absolute top-[calc(0.5cm+env(safe-area-inset-top,0px))] left-0 right-0 h-[72px] flex items-center justify-center z-30 transition-opacity duration-300",
        isUIHidden ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        <div className="w-full max-w-[900px] flex items-center justify-between px-5">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigate(-1);
            }} 
            className="w-11 h-11 flex items-center justify-center bg-white/[0.02] rounded-xl border border-white/[0.04] active:scale-90 transition-all"
          >
            <ChevronLeft size={24} className="text-white/40" />
          </button>
          <h2 className="font-bold text-white">{currentList.theme}</h2>
          <div className="text-[#aaa] font-normal">
            {currentIndex + 1} / {currentList.items.length}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div 
        className="flex-1 flex items-center justify-center relative z-20"
        onClick={() => {
          if (!isDragging.current) {
            setIsUIHidden(!isUIHidden);
          }
        }}
      >
        <SwipeCard 
          key={currentWord.id}
          word={currentWord}
          isSwapped={isSwapped}
          isMobile={isMobile}
          wordRef={wordRef}
          onSwipe={(dir) => handleAction(dir === 'known' ? 'known' : 'review')}
          onDrag={(offset, axis) => {
            const ratio = Math.min(Math.abs(offset) / 200, 1) * (offset < 0 ? -1 : 1);
            setDragRatio(ratio);
            setDragAxis(axis);

            // Hysteresis logic for word swap
            // Word starts at 50%. 15% from edge means it moved 35% (0.5 - 0.15)
            const threshold = (axis === 'x' ? window.innerWidth : window.innerHeight) * 0.35;
            // Return to 25% from edge means it moved back to 25% from center (0.5 - 0.25)
            const hideThreshold = (axis === 'x' ? window.innerWidth : window.innerHeight) * 0.25;
            
            const dist = Math.abs(offset);
            if (dist > threshold) {
              setIsSwapped(true);
            } else if (dist < hideThreshold && isSwapped) {
              setIsSwapped(false);
            }
          }}
          onDragStart={() => {
            isDragging.current = true;
            setIsUIHidden(true);
          }}
          onDragEnd={() => {
            // Delay resetting isDragging to catch the click event
            setTimeout(() => {
              isDragging.current = false;
            }, 50);
          }}
        />
      </div>

      {/* Bottom Hint */}
      <footer className={cn(
        "absolute bottom-[calc(0.8cm+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 text-[#999] text-[13px] z-30 transition-opacity duration-300 whitespace-nowrap max-w-[calc(100%-40px)] overflow-hidden text-ellipsis",
        isUIHidden ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        {isMobile ? 'Вверх — слово знаете, вниз — для повтора' : 'Влево — слово знаете, вправо — для повтора'}
      </footer>
    </div>
  );
};

interface SwipeCardProps {
  word: WordItem;
  isSwapped: boolean;
  isMobile: boolean;
  wordRef: React.RefObject<HTMLHeadingElement>;
  onSwipe: (direction: 'known' | 'review') => void;
  onDrag: (offset: number, axis: 'x' | 'y') => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ word, isSwapped, isMobile, wordRef, onSwipe, onDrag, onDragStart, onDragEnd }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotate = useTransform(
    isMobile ? y : x, 
    [-300, 300], 
    [-5, 5]
  );
  
  const opacity = useTransform(
    isMobile ? y : x, 
    [-400, -300, 0, 300, 400], 
    [0, 1, 1, 1, 0]
  );
  
  const scale = useTransform(
    isMobile ? y : x, 
    [-200, 0, 200], 
    [1.14, 1, 1.14]
  );
  
  const color = useTransform(
    isMobile ? y : x, 
    [-200, 0, 200], 
    ['#4caf50', '#ffffff', '#ff9800']
  );

  return (
    <motion.div
      drag={isMobile ? "y" : "x"}
      dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
      dragElastic={1} // Remove "force" resistance, make it 1:1 with finger
      onDragStart={onDragStart}
      onDrag={(_, info) => {
        const offset = isMobile ? info.offset.y : info.offset.x;
        onDrag(offset, isMobile ? 'y' : 'x');
      }}
      onDragEnd={(_, info) => {
        onDragEnd();
        const offset = isMobile ? info.offset.y : info.offset.x;
        const threshold = 40;
        
        onDrag(0, isMobile ? 'y' : 'x');

        if (Math.abs(offset) > threshold) {
          const direction = offset < 0 ? 'known' : 'review';
          const target = offset < 0 
            ? -(isMobile ? window.innerHeight : window.innerWidth) - 200
            : (isMobile ? window.innerHeight : window.innerWidth) + 200;
          
          animate(isMobile ? y : x, target, { duration: 0.25 }).then(() => onSwipe(direction));
        } else {
          animate(x, 0, { type: 'spring', stiffness: 300, damping: 20 });
          animate(y, 0, { type: 'spring', stiffness: 300, damping: 20 });
        }
      }}
      className="absolute inset-0 flex items-center justify-center text-center cursor-grab active:cursor-grabbing touch-none select-none"
    >
      <motion.h3 
        ref={wordRef}
        style={{ x, y, rotate, opacity, scale, color }}
        className="font-extrabold leading-[1.2] break-words transition-colors duration-80 px-5"
      >
        {isSwapped ? (word.translation || word.russian) : word.english}
      </motion.h3>
    </motion.div>
  );
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
