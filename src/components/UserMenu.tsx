import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Compass, LogOut } from 'lucide-react';
import { useTwin } from '../context/TwinContext';
import { UserSession } from '../types/auth';

interface UserMenuProps {
  user: UserSession;
  onSignOut: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user, onSignOut }) => {
  const { setTourOpen } = useTwin();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-xl bg-[#1B3358]/90 border border-[#C9A227]/45 hover:border-[#C9A227] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]"
      >
        <span className="w-7 h-7 rounded-full bg-[#0B1F3A] border border-[#C9A227] text-[#FAF7F0] font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
          {user.initials}
        </span>
        <span className="hidden sm:inline text-xs font-medium text-[#FAF7F0] whitespace-nowrap max-w-[120px] truncate">
          {user.name}
        </span>
        <span className="hidden md:inline-block px-1.5 py-0.5 rounded bg-[#C9A227]/15 border border-[#C9A227]/40 text-[10px] font-mono font-semibold text-[#E6D49A] whitespace-nowrap">
          {user.role}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#E6D49A] transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="User session menu"
          className="absolute right-0 mt-2 w-60 bg-[#FAF7F0] text-[#0B1F3A] border border-[#C9A227] rounded-xl shadow-xl py-2 z-50 animate-fade-in-smooth"
        >
          <div className="px-4 py-2.5 border-b border-[#E6D49A]/70">
            <div className="text-xs font-semibold text-[#0B1F3A] truncate">
              {user.name}
            </div>
            <div className="text-[11px] font-mono text-[#0B1F3A]/65 truncate mt-0.5">
              {user.email}
            </div>
            <div className="mt-1.5 inline-block px-2 py-0.5 rounded bg-[#0B1F3A] text-[#C9A227] text-[10px] font-mono font-semibold">
              {user.role}
            </div>
          </div>

          <div className="px-2 pt-1.5 space-y-0.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setTourOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#0B1F3A] hover:bg-[#F1ECDD] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]"
            >
              <Compass className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
              <span>Take the tour</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#B3261E] hover:bg-[#B3261E]/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
