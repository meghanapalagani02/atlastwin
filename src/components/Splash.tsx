import React, { useEffect, useRef, useState } from 'react';
import { AtlasLogo } from './AtlasLogo';
import { NetworkMeshBackground } from './NetworkMeshBackground';

interface SplashProps {
  onComplete: () => void;
}

const STATUS_MESSAGES = [
  'Initializing digital twin...',
  'Loading network topology...',
  'Syncing vulnerability intelligence...',
  'Ready.',
];

export const Splash: React.FC<SplashProps> = ({ onComplete }) => {
  const [statusIndex, setStatusIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const finishedRef = useRef(false);

  const triggerExit = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setExiting(true);
    window.setTimeout(() => {
      onComplete();
    }, 260);
  };

  useEffect(() => {
    const t1 = window.setTimeout(() => setStatusIndex(1), 850);
    const t2 = window.setTimeout(() => setStatusIndex(2), 1800);
    const t3 = window.setTimeout(() => setStatusIndex(3), 2800);
    const tDone = window.setTimeout(() => triggerExit(), 3500);

    const onKeyDown = () => {
      triggerExit();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(tDone);
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onClick={triggerExit}
      role="presentation"
      className={`fixed inset-0 z-50 bg-[#0B1F3A] text-[#FAF7F0] flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-opacity duration-300 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <NetworkMeshBackground density={30} />

      <div className="relative z-10 flex flex-col items-center text-center px-6 animate-fade-in-smooth">
        <AtlasLogo size="xl" variant="gold" animated />

        <p className="mt-6 font-display italic text-lg sm:text-xl text-[#FAF7F0]/90 tracking-wide">
          Know the path before the attacker does.
        </p>
      </div>

      {/* Bottom Progress Line & Status */}
      <div className="absolute bottom-8 left-0 right-0 z-10 px-6 sm:px-10 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-2.5">
          <span
            aria-live="polite"
            className="font-mono text-xs text-[#E6D49A]/90 tabular-nums"
          >
            {STATUS_MESSAGES[statusIndex]}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerExit();
            }}
            className="text-xs font-medium text-[#E6D49A]/80 hover:text-[#FAF7F0] underline underline-offset-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] rounded px-1.5 py-0.5"
          >
            Skip
          </button>
        </div>

        <div className="w-full h-[2px] bg-[#1B3358] rounded-full overflow-hidden">
          <div className="h-full w-full bg-[#C9A227] animate-splash-progress" />
        </div>
      </div>
    </div>
  );
};
