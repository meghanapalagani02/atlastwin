import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Compass, X } from 'lucide-react';
import { useTwin } from '../context/TwinContext';
import { WorkspaceView } from '../types/network';

interface TourStep {
  title: string;
  body: string;
  targetArea: string;
  view?: WorkspaceView;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: '01. Command Center & Live Digital Twin',
    body: 'Monitor 24 segmented banking assets across 7 security zones. Click any asset to inspect CVEs, compute its Blast Radius, or isolate it.',
    targetArea: 'Top-Left Sidebar → Command Center',
    view: 'command-center',
  },
  {
    title: '02. Threat Actor & Monte Carlo Simulator',
    body: 'Switch between Script Kiddie, Ransomware, Insider, and Nation-State APT profiles, or run 1,000 Monte Carlo attack iterations.',
    targetArea: 'Left Sidebar → Threat Simulator',
    view: 'threat-simulator',
  },
  {
    title: '03. What-If Patching, Segmentation & Planner',
    body: 'Simulate CVE patches, block edges directly on the graph, or generate a budgeted 3-phase Remediation Roadmap.',
    targetArea: 'Bottom Workspace Tabs → What-If Patching',
    view: 'command-center',
  },
  {
    title: '04. Compliance & Incident Replay',
    body: 'Track live PCI DSS 4.0, RBI, ISO 27001, and NIST CSF readiness, and scrub through a 10-step scripted ransomware timeline.',
    targetArea: 'Left Sidebar → Compliance & Incident Replay',
    view: 'compliance',
  },
  {
    title: '05. AI Analyst & Executive Reports',
    body: 'Chat with the context-aware AI Analyst or export Board Summary, Technical Deep-Dive, and FAIR USD Loss reports.',
    targetArea: 'Left Sidebar → AI Analyst & Reports',
    view: 'ai-analyst',
  },
  {
    title: '06. Global Search (Ctrl+K) & Shortcuts (?)',
    body: 'Use Ctrl+K anywhere to jump to any node, CVE, or attack path instantly, or press ? to review keyboard shortcuts.',
    targetArea: 'Top Command Bar → Search (Ctrl+K)',
    view: 'command-center',
  },
];

export const OnboardingTour: React.FC = () => {
  const { tourOpen, setTourOpen, setActiveView } = useTwin();
  const [stepIndex, setStepIndex] = useState(0);

  if (!tourOpen) return null;

  const current = TOUR_STEPS[stepIndex];

  const handleStepChange = (nextIdx: number) => {
    setStepIndex(nextIdx);
    const nextView = TOUR_STEPS[nextIdx]?.view;
    if (nextView) setActiveView(nextView);
  };

  const handleFinish = () => {
    try {
      window.localStorage.setItem('atlastwin_tour_completed', '1');
    } catch {
      // ignore storage restriction
    }
    setActiveView('command-center');
    setStepIndex(0);
    setTourOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AtlasTwin Product Tour"
      className="no-print fixed inset-0 z-50 bg-[#0B1F3A]/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
    >
      <div className="w-full max-w-lg bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227] rounded-2xl shadow-2xl p-6 animate-fade-in-smooth">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1B3358] border border-[#C9A227]/60 flex items-center justify-center">
              <Compass className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#E6D49A]">
                Spotlight Tour · Step {stepIndex + 1} of {TOUR_STEPS.length}
              </div>
              <h3 className="font-display text-lg font-bold text-[#FAF7F0]">
                {current.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            aria-label="Close product tour"
            className="p-1.5 rounded-lg text-[#E6D49A] hover:bg-[#1B3358] hover:text-[#FAF7F0] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-[#FAF7F0]/90">{current.body}</p>

        <div className="mt-3 px-3 py-1.5 rounded-lg bg-[#1B3358] border border-[#C9A227]/35 font-mono text-[11px] text-[#E6D49A]">
          Location: {current.targetArea}
        </div>

        {/* Step Dots */}
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Go to step ${idx + 1}`}
                onClick={() => handleStepChange(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === stepIndex ? 'w-6 bg-[#C9A227]' : 'w-2 bg-[#1B3358]'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => handleStepChange(stepIndex - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1B3358] text-[#FAF7F0] hover:bg-[#23406d] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Back</span>
              </button>
            )}

            {stepIndex < TOUR_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => handleStepChange(stepIndex + 1)}
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#C9A227] text-[#0B1F3A] hover:bg-[#d8b43b] cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#C9A227] text-[#0B1F3A] hover:bg-[#d8b43b] cursor-pointer"
              >
                Finish Tour
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
