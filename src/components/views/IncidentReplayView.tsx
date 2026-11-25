import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useTwin } from '../../context/TwinContext';
import { RANSOMWARE_INCIDENT_STEPS } from '../../data/securityFrameworks';
import { NetworkGraph } from '../NetworkGraph';

export const IncidentReplayView: React.FC = () => {
  const {
    nodes,
    edges,
    vulns,
    nodeMap,
    patchedCveIds,
    blockedEdgeIds,
    enabledZones,
    attackPaths,
    baselinePaths,
    chokePoints,
    selectedEntry,
    selectedTarget,
    togglePatchCve,
    toggleBlockEdge,
    setActiveView,
    flyToNode,
  } = useTwin();

  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [showCountermeasures, setShowCountermeasures] = useState(true);

  const currentStep = RANSOMWARE_INCIDENT_STEPS[stepIdx];

  useEffect(() => {
    if (!playing) return;
    const ms = Math.round(1800 / speed);
    const id = window.setInterval(() => {
      setStepIdx((prev) => {
        if (prev >= RANSOMWARE_INCIDENT_STEPS.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [playing, speed]);

  const isMitigatedAtStep =
    (currentStep.breakingCveId && patchedCveIds.has(currentStep.breakingCveId)) ||
    (currentStep.breakingEdgeId && blockedEdgeIds.has(currentStep.breakingEdgeId));

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-4">
      {/* Header + Scrubber Bar */}
      <div className="bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227]/45 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#E6D49A]">
              Forensic Kill-Chain Walkthrough
            </div>
            <h1 className="font-display text-2xl font-bold mt-0.5">
              Ransomware Incident Replay &amp; Counterfactual Timeline
            </h1>
            <p className="text-xs text-[#FAF7F0]/75 mt-1">
              Scrub through a 10-stage banking ransomware intrusion from spearphishing delivery to Core Banking DB &amp; SWIFT impact.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C9A227] text-[#0B1F3A] text-xs font-semibold hover:bg-[#d8b43b] cursor-pointer"
            >
              {playing ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Play Timeline</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setStepIdx(0);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1B3358] border border-[#C9A227]/40 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Restart</span>
            </button>

            <div className="inline-flex rounded-lg bg-[#1B3358] border border-[#C9A227]/35 p-0.5 text-xs font-mono">
              {([1, 2, 4] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSpeed(spd)}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    speed === spd ? 'bg-[#C9A227] text-[#0B1F3A] font-bold' : 'text-[#FAF7F0]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step Scrubber */}
        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={RANSOMWARE_INCIDENT_STEPS.length - 1}
            value={stepIdx}
            onChange={(e) => {
              setPlaying(false);
              setStepIdx(Number(e.target.value));
            }}
            aria-label="Incident timeline scrubber"
            className="w-full accent-[#C9A227] cursor-pointer"
          />
          <div className="grid grid-cols-10 gap-1">
            {RANSOMWARE_INCIDENT_STEPS.map((st, idx) => (
              <button
                key={st.step}
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setStepIdx(idx);
                }}
                className={`py-1 rounded text-[10px] font-mono text-center cursor-pointer transition-colors ${
                  idx === stepIdx
                    ? 'bg-[#C9A227] text-[#0B1F3A] font-bold'
                    : idx < stepIdx
                      ? 'bg-[#1B3358] text-[#E6D49A]'
                      : 'bg-[#1B3358]/40 text-[#FAF7F0]/55'
                }`}
              >
                {st.timestamp.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Split: Live Topology Highlight + Step Card */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7 flex flex-col">
          <NetworkGraph
            nodes={nodes}
            edges={edges}
            vulns={vulns}
            patchedCveIds={patchedCveIds}
            enabledZones={enabledZones}
            attackPaths={attackPaths}
            baselinePaths={baselinePaths}
            selectedPathId={attackPaths[0]?.id ?? null}
            selectedNodeId={currentStep.nodeId}
            onSelectNode={(nid) => {
              setActiveView('command-center');
              flyToNode(nid);
            }}
            chokePoints={chokePoints}
            playbackHopIndex={null}
            zoomTargetRequest={null}
            selectedEntryId={selectedEntry}
            selectedTargetId={selectedTarget}
            simulationActive={patchedCveIds.size > 0 || blockedEdgeIds.size > 0}
            forcedHighlightNodeId={currentStep.nodeId}
            compactControls
          />
        </div>

        <div className="xl:col-span-5 flex flex-col gap-4">
          {/* Active Step Card */}
          <div className="bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-[#0B1F3A] text-[#C9A227]">
                Stage {currentStep.step}/10 · {currentStep.timestamp}
              </span>
              <span
                className={`font-mono text-[11px] font-bold px-2.5 py-1 rounded ${
                  currentStep.siemStatus === 'Caught'
                    ? 'bg-[#5E8C61]/15 text-[#3e6441]'
                    : currentStep.siemStatus === 'Delayed'
                      ? 'bg-[#D9822B]/15 text-[#9c5a18]'
                      : 'bg-[#B3261E]/15 text-[#B3261E]'
                }`}
              >
                SIEM: {currentStep.siemStatus}
              </span>
            </div>

            <div>
              <div className="font-mono text-xs text-[#8C6D14] font-semibold">
                {currentStep.mitreId} · {currentStep.mitreName}
              </div>
              <h2 className="font-display text-lg font-bold text-[#0B1F3A] mt-0.5">
                {currentStep.title}
              </h2>
              <div className="text-xs font-mono text-[#0B1F3A]/70 mt-0.5">
                Target Asset: {nodeMap.get(currentStep.nodeId)?.label ?? currentStep.nodeId}
              </div>
            </div>

            <p className="text-xs leading-relaxed text-[#0B1F3A]/85">
              {currentStep.description}
            </p>

            <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-lg p-3 text-xs">
              <span className="font-semibold text-[#0B1F3A]">Telemetry Note: </span>
              <span className="text-[#0B1F3A]/80">{currentStep.siemNote}</span>
            </div>
          </div>

          {/* Counterfactual: What would have stopped this? */}
          <div className="bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227] rounded-xl p-5 space-y-3 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
                <h3 className="font-display text-base font-bold">
                  What would have stopped this?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCountermeasures((p) => !p)}
                className="text-[11px] font-mono text-[#E6D49A] underline cursor-pointer"
              >
                {showCountermeasures ? 'Hide' : 'Show'}
              </button>
            </div>

            {showCountermeasures && (
              <>
                <p className="text-xs text-[#FAF7F0]/85 leading-relaxed">
                  {currentStep.mitigationHint}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  {currentStep.breakingCveId && (
                    <button
                      type="button"
                      onClick={() => togglePatchCve(currentStep.breakingCveId!)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                        patchedCveIds.has(currentStep.breakingCveId)
                          ? 'bg-[#5E8C61] text-[#FAF7F0]'
                          : 'bg-[#C9A227] text-[#0B1F3A] hover:bg-[#d8b43b]'
                      }`}
                    >
                      {patchedCveIds.has(currentStep.breakingCveId) ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {patchedCveIds.has(currentStep.breakingCveId)
                          ? `${currentStep.breakingCveId} Patched`
                          : `Simulate Patch ${currentStep.breakingCveId}`}
                      </span>
                    </button>
                  )}

                  {currentStep.breakingEdgeId && (
                    <button
                      type="button"
                      onClick={() => toggleBlockEdge(currentStep.breakingEdgeId!)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                        blockedEdgeIds.has(currentStep.breakingEdgeId)
                          ? 'bg-[#5E8C61] text-[#FAF7F0]'
                          : 'bg-[#1B3358] border border-[#C9A227] text-[#FAF7F0]'
                      }`}
                    >
                      <span>
                        {blockedEdgeIds.has(currentStep.breakingEdgeId)
                          ? 'Lateral Edge Blocked'
                          : 'Simulate Firewall Block'}
                      </span>
                    </button>
                  )}
                </div>

                {isMitigatedAtStep && (
                  <div className="mt-2 p-2.5 rounded-lg bg-[#5E8C61]/20 border border-[#5E8C61] text-xs text-[#9ED1A2] font-semibold">
                    Chain Broken: This stage would have been neutralized in your current simulation.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
