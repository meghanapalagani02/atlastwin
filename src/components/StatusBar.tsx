import React from 'react';
import { useTwin } from '../context/TwinContext';

export const StatusBar: React.FC = () => {
  const {
    nodes,
    edges,
    lastSynced,
    attackerProfile,
    currentOverall,
    patchedCveIds,
    blockedEdgeIds,
  } = useTwin();

  return (
    <footer className="no-print border-t border-[#E6D49A]/80 bg-[#0B1F3A] text-[#FAF7F0] py-2 px-4 sm:px-6 text-[11px]">
      <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
          <span className="text-[#E6D49A] font-semibold">Twin synchronized</span>
          <span className="text-[#FAF7F0]/40" aria-hidden="true">|</span>
          <span>{nodes.length} nodes · {edges.length} edges</span>
          <span className="text-[#FAF7F0]/40 hidden sm:inline" aria-hidden="true">|</span>
          <span className="hidden sm:inline">
            Last NVD sync: {lastSynced ?? 'Embedded Baseline'}
          </span>
          <span className="text-[#FAF7F0]/40 hidden md:inline" aria-hidden="true">|</span>
          <span className="hidden md:inline">
            Profile: <strong className="text-[#C9A227] font-semibold">{attackerProfile.shortName}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono tabular-nums">
          {(patchedCveIds.size > 0 || blockedEdgeIds.size > 0) && (
            <span className="text-[#9ED1A2]">
              Sim: {patchedCveIds.size} patches · {blockedEdgeIds.size} rules
            </span>
          )}
          <span className="text-[#E6D49A]">
            Risk: <strong className="text-[#FAF7F0]">{currentOverall.overallRisk.toFixed(1)}</strong>/100
          </span>
          <span className="hidden lg:inline text-[#FAF7F0]/60 font-sans">
            Simulated environment for demonstration. Vulnerability data sourced from NVD (NIST).
          </span>
        </div>
      </div>
    </footer>
  );
};
