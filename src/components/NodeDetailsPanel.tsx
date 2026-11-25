import React from 'react';
import {
  Bot,
  CheckCircle2,
  Crown,
  Radar,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Terminal,
} from 'lucide-react';
import { useTwin } from '../context/TwinContext';
import { AttackPath, ChokePoint, NetworkNode, Vulnerability } from '../types/network';

interface NodeDetailsPanelProps {
  selectedNode: NetworkNode | null;
  vulns: Record<string, Vulnerability>;
  patchedCveIds: Set<string>;
  onTogglePatchCve: (cveId: string) => void;
  chokePoints: ChokePoint[];
  activePath: AttackPath | null;
  aiInsight: string;
  aiSource: 'gemini' | 'analytical' | null;
  aiLoading: boolean;
  onRefreshAiInsight: () => void;
}

const SEVERITY_BADGE: Record<string, string> = {
  Critical: 'text-[#B3261E] border-[#B3261E]/40 bg-[#B3261E]/8',
  High: 'text-[#D9822B] border-[#D9822B]/40 bg-[#D9822B]/8',
  Medium: 'text-[#9A7A14] border-[#C9A227]/50 bg-[#C9A227]/12',
  Low: 'text-[#5E8C61] border-[#5E8C61]/40 bg-[#5E8C61]/10',
};

export const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({
  selectedNode,
  vulns,
  patchedCveIds,
  onTogglePatchCve,
  chokePoints,
  activePath,
  aiInsight,
  aiSource,
  aiLoading,
  onRefreshAiInsight,
}) => {
  const {
    blastRadiusOriginId,
    setBlastRadiusOriginId,
    isolatedNodeIds,
    toggleIsolateNode,
  } = useTwin();

  const chokeRank = selectedNode
    ? chokePoints.findIndex((c) => c.nodeId === selectedNode.id) + 1
    : 0;
  const isIsolated = selectedNode ? isolatedNodeIds.has(selectedNode.id) : false;
  const isBlastOrigin = selectedNode ? blastRadiusOriginId === selectedNode.id : false;

  return (
    <aside
      aria-label="Selected Asset Details and AI Insight"
      className="no-print w-full lg:w-[340px] shrink-0 flex flex-col gap-4"
    >
      {/* Selected Node Inspector */}
      <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl p-4 shadow-xs flex-1 flex flex-col min-h-[340px]">
        {!selectedNode ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-4">
            <Terminal className="w-8 h-8 text-[#C9A227] mb-2" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-[#0B1F3A]">
              Select a Network Asset
            </h2>
            <p className="text-xs text-[#0B1F3A]/70 mt-1">
              Click any node in the digital twin topology to inspect its vulnerabilities,
              open ports, and test patch mitigations.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-[#0B1F3A] leading-snug">
                  {selectedNode.label}
                </h2>
                {chokeRank > 0 && (
                  <span
                    title="Top 3 Network Choke Point"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#C9A227] text-[#0B1F3A] text-[10px] font-semibold whitespace-nowrap shrink-0"
                  >
                    <Crown className="w-3 h-3" aria-hidden="true" />
                    Choke #{chokeRank}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#0B1F3A]/75">
                <span className="font-medium text-[#0B1F3A]">{selectedNode.zone} Zone</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Criticality {selectedNode.criticality}/10
                </span>
                {selectedNode.isCrownJewel && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-[#B3261E]">Crown Jewel</span>
                  </>
                )}
                {isIsolated && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-[#B3261E]">Isolated</span>
                  </>
                )}
              </div>
            </div>

            {/* Blast Radius & Isolate Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setBlastRadiusOriginId(isBlastOrigin ? null : selectedNode.id)
                }
                className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                  isBlastOrigin
                    ? 'bg-[#C9A227] text-[#0B1F3A] border-[#C9A227]'
                    : 'bg-[#FAF7F0] text-[#0B1F3A] border-[#E6D49A] hover:border-[#0B1F3A]'
                }`}
              >
                <Radar className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isBlastOrigin ? 'Clear Blast' : 'Blast Radius'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleIsolateNode(selectedNode.id)}
                className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                  isIsolated
                    ? 'bg-[#B3261E] text-[#FAF7F0] border-[#B3261E]'
                    : 'bg-[#FAF7F0] text-[#0B1F3A] border-[#E6D49A] hover:border-[#B3261E] hover:text-[#B3261E]'
                }`}
              >
                <ShieldOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isIsolated ? 'Restore Node' : 'Isolate Node'}</span>
              </button>
            </div>

            {/* OS, Software, Ports */}
            <div className="bg-[#FAF7F0] border border-[#E6D49A]/80 rounded-lg p-3 space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-[#0B1F3A]/65 shrink-0">OS / Runtime</span>
                <span className="font-mono text-[#0B1F3A] text-right truncate">
                  {selectedNode.os}
                </span>
              </div>
              <div>
                <span className="text-[#0B1F3A]/65 block mb-1">Installed Software</span>
                <div className="text-[#0B1F3A] font-medium leading-relaxed">
                  {selectedNode.software.join(' · ')}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E6D49A]/50">
                <span className="text-[#0B1F3A]/65">Open Ports</span>
                <span className="font-mono tabular-nums text-[#0B1F3A]">
                  {selectedNode.openPorts.join(', ')}
                </span>
              </div>
            </div>

            {/* Vulnerabilities List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0B1F3A]">
                  Vulnerabilities ({selectedNode.cves.length})
                </span>
                {selectedNode.cves.length > 0 &&
                  selectedNode.cves.every((c) => patchedCveIds.has(c)) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5E8C61]">
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                      All Patched
                    </span>
                  )}
              </div>

              {selectedNode.cves.length === 0 ? (
                <div className="bg-[#FAF7F0] border border-[#E6D49A]/70 rounded-lg p-3 text-xs text-[#0B1F3A]/70">
                  No CVEs tracked on external transit boundary.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[270px] overflow-y-auto pr-1">
                  {selectedNode.cves.map((cveId) => {
                    const v = vulns[cveId];
                    if (!v) return null;
                    const isPatched = patchedCveIds.has(cveId);

                    return (
                      <div
                        key={cveId}
                        className={`rounded-lg border p-3 transition-all duration-200 ${
                          isPatched
                            ? 'bg-[#5E8C61]/8 border-[#5E8C61]/35'
                            : 'bg-[#FAF7F0] border-[#E6D49A]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`font-mono tabular-nums text-xs font-bold ${
                                isPatched ? 'line-through text-[#0B1F3A]/50' : 'text-[#0B1F3A]'
                              }`}
                            >
                              {v.id}
                            </span>
                            <span
                              className={`text-[10px] font-mono tabular-nums font-semibold px-1.5 py-0.5 rounded border ${
                                SEVERITY_BADGE[v.severity]
                              }`}
                            >
                              {v.cvss.toFixed(1)} {v.severity}
                            </span>
                          </div>

                          {/* NVD Status Badge */}
                          {v.nvdStatus === 'live' ? (
                            <span className="text-[10px] font-semibold text-[#5E8C61] bg-[#5E8C61]/12 border border-[#5E8C61]/35 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                              Live NVD
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-[#8C6D14] bg-[#C9A227]/15 border border-[#C9A227]/40 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                              Cached
                            </span>
                          )}
                        </div>

                        <p className="mt-1.5 text-[11px] leading-relaxed text-[#0B1F3A]/80 line-clamp-3">
                          {v.description}
                        </p>

                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            {v.exploitAvailable ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-[#B3261E]">
                                <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                                Exploit Available
                              </span>
                            ) : (
                              <span className="text-[#0B1F3A]/60">No public exploit</span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => onTogglePatchCve(cveId)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] ${
                              isPatched
                                ? 'bg-[#5E8C61] text-[#FAF7F0] hover:bg-[#4e7751]'
                                : 'bg-[#0B1F3A] text-[#FAF7F0] hover:bg-[#1B3358]'
                            }`}
                          >
                            {isPatched ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                <span>Patched</span>
                              </>
                            ) : (
                              <span>Patch</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Executive AI Insight Card */}
      <div className="bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227]/45 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
            <h3 className="font-display text-sm font-bold text-[#FAF7F0]">
              CISO AI Brief
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {aiSource && !aiLoading && (
              <span className="text-[10px] font-mono text-[#E6D49A]/85">
                {aiSource === 'gemini' ? 'Gemini AI' : 'Analytical Model'}
              </span>
            )}
            <button
              type="button"
              onClick={onRefreshAiInsight}
              disabled={aiLoading || !activePath}
              aria-label="Regenerate CISO AI Insight"
              title="Regenerate insight"
              className="p-1 rounded text-[#E6D49A] hover:bg-[#1B3358] hover:text-[#FAF7F0] disabled:opacity-40 cursor-pointer transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {!activePath ? (
          <p className="text-xs text-[#FAF7F0]/70 leading-relaxed">
            No reachable attack path matches the current filter criteria. Adjust zone filters
            or reset simulations to inspect path briefings.
          </p>
        ) : aiLoading ? (
          <div className="space-y-2 py-1" aria-live="polite">
            <div className="text-[11px] text-[#E6D49A] font-medium">
              Generating insight...
            </div>
            <div className="h-3 bg-[#1B3358] rounded animate-pulse w-full" />
            <div className="h-3 bg-[#1B3358] rounded animate-pulse w-11/12" />
            <div className="h-3 bg-[#1B3358] rounded animate-pulse w-4/5" />
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-[#FAF7F0]/90">{aiInsight}</p>
        )}
      </div>
    </aside>
  );
};
