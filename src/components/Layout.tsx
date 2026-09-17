import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Layout: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show if scrolling up, hide if scrolling down
      if (currentScrollY < lastScrollY.current || currentScrollY < 50) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsVisible(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Always show on route change
  useEffect(() => {
    setIsVisible(true);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <main className="pb-32 pt-[env(safe-area-inset-top)]">
        <Outlet />
      </main>

      <nav className={cn(
        "fixed bottom-0 left-0 right-0 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] z-50 transition-transform duration-300 ease-in-out",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="max-w-md mx-auto flex gap-2 bg-[#1e1e1e]/90 backdrop-blur-xl rounded-2xl p-1.5 border border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
          <TabButton to="/" label="Words" />
          <TabButton to="/phrases" label="Phrases" />
          <TabButton to="/sentences" label="Sentences" />
        </div>
      </nav>
    </div>
  );
};

interface TabButtonProps {
  to: string;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ to, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex-1 py-3 rounded-xl font-bold tracking-wider text-xs transition-all text-center",
          isActive 
            ? "bg-gradient-to-r from-[#4caf50]/20 to-[#2196f3]/20 text-white shadow-lg border border-white/10" 
            : "text-[#aaa] hover:text-white"
        )
      }
    >
      {label}
    </NavLink>
  );
};
