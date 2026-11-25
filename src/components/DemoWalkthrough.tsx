import React from 'react';
import { Award, FastForward, ShieldCheck, X } from 'lucide-react';

export interface DemoStepInfo {
  step: number;
  totalSteps: number;
  title: string;
  caption: string;
  progressPct: number;
  isComplete: boolean;
  riskReductionPercent?: number;
}

interface DemoWalkthroughProps {
  demoInfo: DemoStepInfo | null;
  onSkip: () => void;
  onCloseComplete: () => void;
}

export const DemoWalkthrough: React.FC<DemoWalkthroughProps> = ({
  demoInfo,
  onSkip,
  onCloseComplete,
}) => {
  if (!demoInfo) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[92vw] max-w-2xl bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227] rounded-xl shadow-2xl px-5 py-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#1B3358] border border-[#C9A227]/60 flex items-center justify-center shrink-0 mt-0.5">
            {demoInfo.isComplete ? (
              <Award className="w-5 h-5 text-[#C9A227]" aria-hidden="true" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-[#C9A227]" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-[#E6D49A]">
              <span>
                Guided Scenario · Step {demoInfo.step} of {demoInfo.totalSteps}
              </span>
            </div>
            <h3 className="font-display text-base font-bold text-[#FAF7F0] mt-0.5">
              {demoInfo.isComplete
                ? `Risk reduced by ${(demoInfo.riskReductionPercent ?? 0).toFixed(1)}%`
                : demoInfo.title}
            </h3>
            <p className="text-xs text-[#FAF7F0]/85 mt-1 leading-relaxed">
              {demoInfo.caption}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={demoInfo.isComplete ? onCloseComplete : onSkip}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1B3358] text-[#FAF7F0] border border-[#C9A227]/40 hover:border-[#C9A227] hover:bg-[#23406d] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {demoInfo.isComplete ? (
            <>
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Dismiss</span>
            </>
          ) : (
            <>
              <FastForward className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
              <span>Skip</span>
            </>
          )}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 w-full h-1.5 bg-[#1B3358] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#C9A227] transition-all duration-500"
          style={{ width: `${demoInfo.progressPct}%` }}
        />
      </div>
    </div>
  );
};
