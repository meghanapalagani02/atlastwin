import React, { useEffect, useState } from 'react';
import { AtlasLogo } from './AtlasLogo';
import { NetworkMeshBackground } from './NetworkMeshBackground';

interface AuthTransitionProps {
  userName: string;
  onComplete: () => void;
}

export const AuthTransition: React.FC<AuthTransitionProps> = ({
  userName,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'auth' | 'build'>('auth');
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const tBuild = window.setTimeout(() => setPhase('build'), 700);
    const tFade = window.setTimeout(() => setExiting(true), 1180);
    const tDone = window.setTimeout(() => onComplete(), 1420);

    return () => {
      window.clearTimeout(tBuild);
      window.clearTimeout(tFade);
      window.clearTimeout(tDone);
    };
  }, [onComplete]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 bg-[#0B1F3A] text-[#FAF7F0] flex flex-col items-center justify-center px-6 transition-opacity duration-250 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <NetworkMeshBackground density={20} />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full animate-fade-in-smooth">
        <div className="animate-pulse motion-reduce:animate-none">
          <AtlasLogo size="lg" variant="gold" iconOnly />
        </div>

        <h2 className="mt-6 font-display text-xl font-bold text-[#FAF7F0]">
          {phase === 'auth'
            ? `Authenticating as ${userName}...`
            : 'Building your digital twin...'}
        </h2>

        <p className="mt-1.5 font-mono text-xs text-[#E6D49A]/80">
          {phase === 'auth'
            ? 'Verifying operator clearance & session keys'
            : 'Hydrating 24 banking assets & attack-path graph'}
        </p>

        <div className="mt-6 w-full h-[2px] bg-[#1B3358] rounded-full overflow-hidden">
          <div className="h-full w-full bg-[#C9A227] animate-auth-progress" />
        </div>
      </div>
    </div>
  );
};
