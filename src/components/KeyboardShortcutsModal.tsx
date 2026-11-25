import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { useTwin } from '../context/TwinContext';

const SHORTCUTS = [
  { keys: 'Ctrl + K', desc: 'Open global search & command palette' },
  { keys: '?', desc: 'Toggle keyboard shortcuts reference' },
  { keys: '1 – 8', desc: 'Switch across workspace views' },
  { keys: 'Esc', desc: 'Close active dialog, palette, or tour' },
];

export const KeyboardShortcutsModal: React.FC = () => {
  const { shortcutsOpen, setShortcutsOpen } = useTwin();
  if (!shortcutsOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
      onClick={() => setShortcutsOpen(false)}
      className="no-print fixed inset-0 z-50 bg-[#0B1F3A]/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#FAF7F0] text-[#0B1F3A] border border-[#C9A227] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-smooth"
      >
        <div className="px-5 py-4 bg-[#0B1F3A] text-[#FAF7F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
            <h3 className="font-display text-base font-bold">Keyboard Shortcuts</h3>
          </div>
          <button
            type="button"
            onClick={() => setShortcutsOpen(false)}
            aria-label="Close shortcuts dialog"
            className="p-1 rounded text-[#E6D49A] hover:text-[#FAF7F0] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 divide-y divide-[#E6D49A]/60">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="py-3 flex items-center justify-between gap-4">
              <span className="text-xs text-[#0B1F3A]/85">{s.desc}</span>
              <kbd className="px-2.5 py-1 rounded bg-[#F1ECDD] border border-[#E6D49A] font-mono text-xs font-semibold text-[#0B1F3A] shrink-0">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
