import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDown,
  ArrowUp,
  CheckSquare,
  Layers,
  Play,
  RotateCcw,
  Shield,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useTwin } from '../context/TwinContext';
import { PRESET_SEGMENTATION_RULES } from '../data/securityFrameworks';
import {
  computeCombinedRemediationRoadmap,
  recalculateRoadmapCurve,
} from '../engine/attackPathEngine';
import {
  CveRiskImpact,
  NetworkNode,
  PatchPlanStep,
  RemediationEffort,
  RemediationRoadmapItem,
  SimulationSummary,
  Vulnerability,
} from '../types/network';

interface WhatIfPatchingTabProps {
  cveImpacts: CveRiskImpact[];
  vulns: Record<string, Vulnerability>;
  nodeMap: Map<string, NetworkNode>;
  patchedCveIds: Set<string>;
  onTogglePatchCve: (cveId: string) => void;
  onSimulateSelected: (cveIds: string[]) => void;
  onResetSimulation: () => void;
  optimalPlan: PatchPlanStep[];
  onApplyOptimalPlan: () => void;
  simulationSummary: SimulationSummary;
}

const RiskGauge: React.FC<{ label: string; score: number; accent: string }> = ({
  label,
  score,
  accent,
}) => {
  const clamped = Math.min(100, Math.max(0, score));
  const radius = 42;
  const circumference = Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="110" height="68" viewBox="0 0 110 68" aria-label={`${label}: ${score}`}>
        <path
          d="M 13 56 A 42 42 0 0 1 97 56"
          fill="none"
          stroke="#E6D49A"
          strokeOpacity="0.45"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M 13 56 A 42 42 0 0 1 97 56"
          fill="none"
          stroke={accent}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 450ms ease' }}
        />
        <text
          x="55"
          y="53"
          textAnchor="middle"
          className="font-mono tabular-nums font-bold"
          fontSize="17"
          fill="#0B1F3A"
        >
          {clamped.toFixed(1)}
        </text>
      </svg>
      <span className="text-[11px] font-medium text-[#0B1F3A]/75">{label}</span>
    </div>
  );
};

export const WhatIfPatchingTab: React.FC<WhatIfPatchingTabProps> = ({
  cveImpacts,
  vulns,
  nodeMap,
  patchedCveIds,
  onTogglePatchCve,
  onSimulateSelected,
  onResetSimulation,
  optimalPlan,
  onApplyOptimalPlan,
  simulationSummary,
}) => {
  const {
    nodes,
    edges,
    blockedEdgeIds,
    toggleBlockEdge,
    blockEdgeBatch,
    segmentationRecommendations,
    engineOpts,
    applyCombinedPlan,
    resetAllSimulations,
  } = useTwin();

  const [subTab, setSubTab] = useState<'patching' | 'segmentation' | 'planner'>('patching');
  const [checkedCves, setCheckedCves] = useState<Set<string>>(new Set());
  const [showOptimalPlan, setShowOptimalPlan] = useState(false);

  // Module 5: Remediation Planner state
  const [budgetHours, setBudgetHours] = useState(40);
  const [downtimeTolerance, setDowntimeTolerance] = useState<RemediationEffort>('Medium');
  const [customOrderItems, setCustomOrderItems] = useState<RemediationRoadmapItem[] | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const generatedRoadmap = useMemo(
    () =>
      computeCombinedRemediationRoadmap(
        budgetHours,
        downtimeTolerance,
        nodes,
        edges,
        vulns,
        patchedCveIds,
        blockedEdgeIds,
        engineOpts
      ),
    [budgetHours, downtimeTolerance, nodes, edges, vulns, patchedCveIds, blockedEdgeIds, engineOpts]
  );

  // Reset manual drag order whenever optimizer inputs change
  useEffect(() => {
    setCustomOrderItems(null);
  }, [generatedRoadmap]);

  const activeRoadmap = useMemo(() => {
    if (!customOrderItems) return generatedRoadmap;
    return recalculateRoadmapCurve(
      customOrderItems,
      nodes,
      edges,
      vulns,
      patchedCveIds,
      blockedEdgeIds,
      engineOpts
    );
  }, [customOrderItems, generatedRoadmap, nodes, edges, vulns, patchedCveIds, blockedEdgeIds, engineOpts]);

  const moveRoadmapItem = (fromIdx: number, toIdx: number) => {
    const base = [...activeRoadmap.items];
    if (toIdx < 0 || toIdx >= base.length || fromIdx === toIdx) return;
    const [moved] = base.splice(fromIdx, 1);
    base.splice(toIdx, 0, moved);
    setCustomOrderItems(base);
  };

  const allUnpatchedOrPatchedList = useMemo(() => {
    const unpatchedIds = new Set(cveImpacts.map((c) => c.cveId));
    const patchedItems: CveRiskImpact[] = Array.from(patchedCveIds)
      .filter((id) => !unpatchedIds.has(id) && vulns[id])
      .map((cveId) => {
        const affectedNodeIds = Array.from(nodeMap.values())
          .filter((n) => n.cves.includes(cveId))
          .map((n) => n.id);
        return {
          cveId,
          affectedNodeIds,
          riskBefore: simulationSummary.riskBefore,
          riskAfter: simulationSummary.riskAfter,
          riskReduction: 0,
          reductionPercent: 0,
          effort: vulns[cveId].remediationEffort,
        };
      });
    return [...cveImpacts, ...patchedItems];
  }, [cveImpacts, patchedCveIds, vulns, nodeMap, simulationSummary]);

  const toggleCheck = (cveId: string) => {
    setCheckedCves((prev) => {
      const next = new Set(prev);
      if (next.has(cveId)) next.delete(cveId);
      else next.add(cveId);
      return next;
    });
  };

  const handleSimulateChecked = () => {
    if (checkedCves.size === 0) return;
    onSimulateSelected(Array.from(checkedCves));
  };

  const handleResetAll = () => {
    setCheckedCves(new Set());
    setShowOptimalPlan(false);
    onResetSimulation();
    resetAllSimulations();
  };

  const blockedEdgeObjects = useMemo(
    () => edges.filter((e) => blockedEdgeIds.has(e.id)),
    [edges, blockedEdgeIds]
  );

  return (
    <div className="space-y-4">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('patching')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              subTab === 'patching'
                ? 'bg-[#0B1F3A] text-[#FAF7F0]'
                : 'bg-[#FAF7F0] text-[#0B1F3A] border border-[#E6D49A] hover:border-[#0B1F3A]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
            <span>CVE Patching</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('segmentation')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              subTab === 'segmentation'
                ? 'bg-[#0B1F3A] text-[#FAF7F0]'
                : 'bg-[#FAF7F0] text-[#0B1F3A] border border-[#E6D49A] hover:border-[#0B1F3A]'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
            <span>Segmentation ({blockedEdgeIds.size})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('planner')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              subTab === 'planner'
                ? 'bg-[#0B1F3A] text-[#FAF7F0]'
                : 'bg-[#FAF7F0] text-[#0B1F3A] border border-[#E6D49A] hover:border-[#0B1F3A]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
            <span>Remediation Planner</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleResetAll}
          disabled={
            patchedCveIds.size === 0 &&
            blockedEdgeIds.size === 0 &&
            checkedCves.size === 0 &&
            !showOptimalPlan
          }
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#FAF7F0] text-[#0B1F3A] border border-[#E6D49A] hover:border-[#0B1F3A] disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset Simulation</span>
        </button>
      </div>

      {/* === SUB-TAB 1: CVE PATCHING === */}
      {subTab === 'patching' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF7F0] border border-[#E6D49A] rounded-xl px-4 py-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSimulateChecked}
                disabled={checkedCves.size === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B1F3A] text-[#FAF7F0] hover:bg-[#1B3358] disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
                <span>Simulate ({checkedCves.size} Selected)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowOptimalPlan((p) => !p)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#C9A227] text-[#0B1F3A] hover:bg-[#d8b43b] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Recommend Optimal Patch Plan</span>
              </button>
            </div>
            <span className="text-[11px] font-mono text-[#0B1F3A]/70">
              {patchedCveIds.size} patches applied · {blockedEdgeIds.size} edges blocked
            </span>
          </div>

          {showOptimalPlan && (
            <div className="bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227] rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-display text-base font-bold text-[#FAF7F0]">
                    Greedy Optimal 3-Step Remediation Plan
                  </h3>
                  <p className="text-xs text-[#E6D49A]/85 mt-0.5">
                    Computed to deliver maximum cumulative network risk reduction in minimal patching cycles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onApplyOptimalPlan}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#C9A227] text-[#0B1F3A] hover:bg-[#d8b43b] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Apply Optimal Plan</span>
                </button>
              </div>

              {optimalPlan.length === 0 ? (
                <p className="text-xs text-[#FAF7F0]/75">
                  All high-impact vulnerabilities have already been remediated in the current simulation.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {optimalPlan.map((step) => {
                    const v = vulns[step.cveId];
                    return (
                      <div
                        key={step.cveId}
                        className="bg-[#1B3358] border border-[#C9A227]/40 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono tabular-nums text-xs font-bold text-[#C9A227]">
                            Step 0{step.step} · {step.cveId}
                          </span>
                          <span className="text-[11px] font-mono text-[#E6D49A]">
                            Effort: {step.effort}
                          </span>
                        </div>
                        <div className="mt-1.5 text-xs text-[#FAF7F0]/90 font-medium">
                          {v?.software ?? step.cveId}
                        </div>
                        <div className="mt-1 text-[11px] text-[#FAF7F0]/70">
                          Assets:{' '}
                          {step.affectedNodeIds
                            .map((id) => nodeMap.get(id)?.shortLabel ?? id)
                            .join(', ')}
                        </div>
                        <div className="mt-2 pt-2 border-t border-[#C9A227]/25 flex items-center justify-between text-[11px] font-mono tabular-nums">
                          <span className="text-[#9ED1A2]">
                            -{step.individualReduction.toFixed(1)} pts
                          </span>
                          <span className="text-[#E6D49A]">
                            Cumulative: -{step.cumulativeReductionPercent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="xl:col-span-7 overflow-x-auto bg-[#FAF7F0] border border-[#E6D49A] rounded-xl max-h-[420px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-[#F1ECDD] border-b border-[#E6D49A] text-[11px] font-semibold uppercase tracking-wider text-[#0B1F3A]/80">
                  <tr>
                    <th className="py-2.5 px-3 w-10">Sel</th>
                    <th className="py-2.5 px-3">CVE &amp; Affected Assets</th>
                    <th className="py-2.5 px-3 text-right">CVSS</th>
                    <th className="py-2.5 px-3 text-right">Est. Drop</th>
                    <th className="py-2.5 px-3">Effort</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6D49A]/55 text-xs">
                  {allUnpatchedOrPatchedList.map((item) => {
                    const v = vulns[item.cveId];
                    if (!v) return null;
                    const isPatched = patchedCveIds.has(item.cveId);
                    const isChecked = checkedCves.has(item.cveId);

                    return (
                      <tr
                        key={item.cveId}
                        className={
                          isPatched
                            ? 'bg-[#5E8C61]/8'
                            : isChecked
                              ? 'bg-[#C9A227]/12'
                              : 'hover:bg-[#F1ECDD]/60'
                        }
                      >
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isPatched}
                            onChange={() => toggleCheck(item.cveId)}
                            aria-label={`Select ${item.cveId} for simulation`}
                            className="accent-[#0B1F3A] cursor-pointer disabled:opacity-40"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-mono tabular-nums font-semibold text-[#0B1F3A]">
                            {item.cveId}
                          </div>
                          <div className="text-[11px] text-[#0B1F3A]/70">
                            {item.affectedNodeIds
                              .map((id) => nodeMap.get(id)?.shortLabel ?? id)
                              .join(', ')}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#0B1F3A]">
                          {v.cvss.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#5E8C61]">
                          {isPatched ? 'Applied' : `-${item.riskReduction.toFixed(1)}`}
                        </td>
                        <td className="py-2.5 px-3 text-[#0B1F3A]/80">{item.effort}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onTogglePatchCve(item.cveId)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              isPatched
                                ? 'bg-[#5E8C61] text-[#FAF7F0] hover:bg-[#4b734e]'
                                : 'bg-[#0B1F3A] text-[#FAF7F0] hover:bg-[#1B3358]'
                            }`}
                          >
                            {isPatched ? (
                              <>
                                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                                <span>Patched</span>
                              </>
                            ) : (
                              <span>Apply Patch</span>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="xl:col-span-5 bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-4 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-base font-bold text-[#0B1F3A]">
                    Before vs After Simulation
                  </h3>
                  {simulationSummary.riskReductionPercent > 0 && (
                    <span className="font-mono tabular-nums text-xs font-bold text-[#5E8C61]">
                      -{simulationSummary.riskReductionPercent.toFixed(1)}% Risk
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 bg-[#F1ECDD] border border-[#E6D49A]/80 rounded-lg p-3">
                  <RiskGauge
                    label="Baseline Risk"
                    score={simulationSummary.riskBefore}
                    accent="#B3261E"
                  />
                  <RiskGauge
                    label="Simulated Risk"
                    score={simulationSummary.riskAfter}
                    accent={simulationSummary.riskAfter < 45 ? '#5E8C61' : '#C9A227'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                  <div className="bg-[#F1ECDD]/70 border border-[#E6D49A]/60 rounded-lg p-2.5">
                    <div className="text-[#0B1F3A]/65 text-[11px]">Viable Attack Paths</div>
                    <div className="mt-1 font-mono tabular-nums font-bold text-[#0B1F3A]">
                      {simulationSummary.viablePathsBefore} → {simulationSummary.viablePathsAfter}
                    </div>
                  </div>
                  <div className="bg-[#F1ECDD]/70 border border-[#E6D49A]/60 rounded-lg p-2.5">
                    <div className="text-[#0B1F3A]/65 text-[11px]">Top Selected Path Risk</div>
                    <div className="mt-1 font-mono tabular-nums font-bold text-[#0B1F3A]">
                      {simulationSummary.topPathRiskBefore.toFixed(1)} →{' '}
                      {simulationSummary.topPathRiskAfter.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-[190px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={simulationSummary.zoneRiskComparison}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E6D49A" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="zone"
                      tick={{ fill: '#0B1F3A', fontSize: 10 }}
                      axisLine={{ stroke: '#E6D49A' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: '#0B1F3A', fontSize: 10 }}
                      axisLine={{ stroke: '#E6D49A' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0B1F3A',
                        borderColor: '#C9A227',
                        borderRadius: '8px',
                        color: '#FAF7F0',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="before" name="Baseline" fill="#0B1F3A" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="after" name="Post-Patch" fill="#C9A227" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === SUB-TAB 2: NETWORK SEGMENTATION WHAT-IF (MODULE 4) === */}
      {subTab === 'segmentation' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Preset Rules + Recommended 3-Edge Cut */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-display text-sm font-bold text-[#0B1F3A]">
                      Preset Micro-Segmentation Policies
                    </h3>
                    <p className="text-[11px] text-[#0B1F3A]/70">
                      Toggle policy bundles or click any directed edge directly on the network graph to block it.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRESET_SEGMENTATION_RULES.map((rule) => {
                    const allBlocked = rule.edgeIds.every((id) => blockedEdgeIds.has(id));
                    return (
                      <div
                        key={rule.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          allBlocked
                            ? 'bg-[#5E8C61]/10 border-[#5E8C61]'
                            : 'bg-[#F1ECDD]/70 border-[#E6D49A]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-semibold text-[#0B1F3A]">
                            {rule.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (allBlocked) {
                                rule.edgeIds.forEach((id) => toggleBlockEdge(id));
                              } else {
                                blockEdgeBatch(rule.edgeIds);
                              }
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-semibold shrink-0 cursor-pointer ${
                              allBlocked
                                ? 'bg-[#5E8C61] text-[#FAF7F0]'
                                : 'bg-[#0B1F3A] text-[#FAF7F0] hover:bg-[#1B3358]'
                            }`}
                          >
                            {allBlocked ? 'Active' : 'Enforce'}
                          </button>
                        </div>
                        <p className="text-[11px] text-[#0B1F3A]/70 mt-1">{rule.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommend Best Segmentation (Greedy 3-Edge Cut) */}
              <div className="bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227] rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-display text-sm font-bold">
                      Recommend Best Segmentation (Top 3 Cuts)
                    </h3>
                    <p className="text-[11px] text-[#E6D49A]/80">
                      Greedy edge-cut optimizer maximizing crown-jewel risk drop without patching hosts.
                    </p>
                  </div>
                  {segmentationRecommendations.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        blockEdgeBatch(segmentationRecommendations.map((r) => r.edgeId))
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#C9A227] text-[#0B1F3A] text-xs font-semibold hover:bg-[#d8b43b] cursor-pointer"
                    >
                      Apply Top 3 Cuts
                    </button>
                  )}
                </div>

                {segmentationRecommendations.length === 0 ? (
                  <p className="text-xs text-[#FAF7F0]/75">
                    No remaining high-impact single-edge cuts available.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {segmentationRecommendations.map((rec) => {
                      const src = nodeMap.get(rec.sourceId)?.shortLabel ?? rec.sourceId;
                      const tgt = nodeMap.get(rec.targetId)?.shortLabel ?? rec.targetId;
                      return (
                        <div
                          key={rec.edgeId}
                          className="bg-[#1B3358] border border-[#C9A227]/40 rounded-lg p-3 flex flex-col justify-between gap-2"
                        >
                          <div>
                            <div className="text-xs font-semibold text-[#FAF7F0]">
                              {src} → {tgt}
                            </div>
                            <div className="text-[11px] font-mono text-[#E6D49A] mt-0.5">
                              {rec.protocol} / Port {rec.port}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-[#9ED1A2]">
                              -{rec.riskReduction.toFixed(1)} pts · -{rec.pathsEliminated} paths
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleBlockEdge(rec.edgeId)}
                              className="px-2 py-0.5 rounded bg-[#C9A227] text-[#0B1F3A] font-semibold cursor-pointer"
                            >
                              Block
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Firewall Rule Table + Impact Summary */}
            <div className="lg:col-span-5 bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-[#0B1F3A]">
                  Simulated Firewall Deny Rules
                </h3>
                <span className="font-mono text-xs text-[#0B1F3A]/75">
                  Risk: {simulationSummary.riskBefore.toFixed(1)} →{' '}
                  <strong className="text-[#5E8C61]">{simulationSummary.riskAfter.toFixed(1)}</strong>
                </span>
              </div>

              <div className="text-[11px] text-[#0B1F3A]/75 bg-[#F1ECDD] rounded-lg px-3 py-2 font-mono">
                Paths eliminated: {Math.max(0, simulationSummary.viablePathsBefore - simulationSummary.viablePathsAfter)} (
                {simulationSummary.viablePathsBefore} → {simulationSummary.viablePathsAfter})
              </div>

              <div className="border border-[#E6D49A] rounded-lg overflow-hidden flex-1 max-h-[260px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F1ECDD] border-b border-[#E6D49A] text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-2.5">Source</th>
                      <th className="py-2 px-2.5">Destination</th>
                      <th className="py-2 px-2.5">Port/Proto</th>
                      <th className="py-2 px-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6D49A]/50">
                    {blockedEdgeObjects.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-[#0B1F3A]/60">
                          No firewall rules enforced. Click any edge on the graph or use a preset rule.
                        </td>
                      </tr>
                    ) : (
                      blockedEdgeObjects.map((edge) => (
                        <tr key={edge.id} className="hover:bg-[#F1ECDD]/50">
                          <td className="py-2 px-2.5 font-medium">
                            {nodeMap.get(edge.source)?.shortLabel ?? edge.source}
                          </td>
                          <td className="py-2 px-2.5 font-medium">
                            {nodeMap.get(edge.target)?.shortLabel ?? edge.target}
                          </td>
                          <td className="py-2 px-2.5 font-mono">
                            {edge.protocol}/{edge.port}
                          </td>
                          <td className="py-2 px-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => toggleBlockEdge(edge.id)}
                              className="px-2 py-0.5 rounded bg-[#B3261E]/12 text-[#B3261E] font-mono text-[10px] font-bold hover:bg-[#B3261E] hover:text-[#FAF7F0] cursor-pointer"
                            >
                              DENY (Unblock)
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === SUB-TAB 3: COMBINED REMEDIATION PLANNER (MODULE 5) === */}
      {subTab === 'planner' && (
        <div className="space-y-4">
          <div className="bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#0B1F3A]/75 mb-1">
                  Person-Hour Budget: <span className="font-mono text-[#0B1F3A]">{budgetHours}h</span>
                </label>
                <input
                  type="range"
                  min={8}
                  max={120}
                  step={4}
                  value={budgetHours}
                  onChange={(e) => setBudgetHours(Number(e.target.value))}
                  className="w-44 accent-[#C9A227] cursor-pointer"
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#0B1F3A]/75 mb-1">
                  Downtime Tolerance
                </span>
                <div className="inline-flex rounded-lg border border-[#E6D49A] overflow-hidden">
                  {(['Low', 'Medium', 'High'] as RemediationEffort[]).map((tol) => (
                    <button
                      key={tol}
                      type="button"
                      onClick={() => setDowntimeTolerance(tol)}
                      className={`px-3 py-1 text-xs font-semibold cursor-pointer ${
                        downtimeTolerance === tol
                          ? 'bg-[#0B1F3A] text-[#FAF7F0]'
                          : 'bg-[#FAF7F0] text-[#0B1F3A] hover:bg-[#F1ECDD]'
                      }`}
                    >
                      {tol}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right font-mono text-xs">
                <div className="text-[#0B1F3A]/70">
                  {activeRoadmap.totalHours}h planned · {activeRoadmap.items.length} actions
                </div>
                <div className="font-bold text-[#5E8C61]">
                  Risk {activeRoadmap.riskBefore.toFixed(1)} → {activeRoadmap.riskAfter.toFixed(1)} (-
                  {activeRoadmap.totalReductionPercent.toFixed(1)}%)
                </div>
              </div>

              <button
                type="button"
                disabled={activeRoadmap.items.length === 0}
                onClick={() => {
                  const cves = activeRoadmap.items
                    .filter((i) => i.kind === 'patch' && i.cveId)
                    .map((i) => i.cveId!);
                  const edgeIds = activeRoadmap.items
                    .filter((i) => i.kind === 'segmentation' && i.edgeIds)
                    .flatMap((i) => i.edgeIds!);
                  applyCombinedPlan(cves, edgeIds);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A227] text-[#0B1F3A] text-xs font-semibold hover:bg-[#d8b43b] disabled:opacity-45 cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Apply Entire Plan</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            {/* Reorderable Roadmap List */}
            <div className="xl:col-span-7 bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-4 space-y-2.5 max-h-[380px] overflow-y-auto">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-[#0B1F3A]">
                  Prioritized 3-Phase Roadmap (Drag or reorder steps to recalculate curve)
                </span>
              </div>

              {activeRoadmap.items.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#0B1F3A]/65">
                  Increase person-hour budget or downtime tolerance to generate roadmap actions.
                </div>
              ) : (
                activeRoadmap.items.map((item, idx) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDragIndex(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null) {
                        moveRoadmapItem(dragIndex, idx);
                        setDragIndex(null);
                      }
                    }}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#F1ECDD]/70 border border-[#E6D49A] hover:border-[#0B1F3A] cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-[#0B1F3A] text-[#C9A227] font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-[#0B1F3A]">
                            {item.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#0B1F3A]/10 text-[#0B1F3A] font-mono text-[10px]">
                            {item.phase}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#C9A227]/20 text-[#8C6D14] font-mono text-[10px]">
                            {item.effortHours}h · {item.downtime} downtime
                          </span>
                        </div>
                        <div className="text-[11px] text-[#0B1F3A]/75 truncate mt-0.5">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveRoadmapItem(idx, idx - 1)}
                        aria-label="Move step earlier"
                        className="p-1 rounded hover:bg-[#FAF7F0] disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === activeRoadmap.items.length - 1}
                        onClick={() => moveRoadmapItem(idx, idx + 1)}
                        aria-label="Move step later"
                        className="p-1 rounded hover:bg-[#FAF7F0] disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cumulative Risk Reduction Gold Line Chart */}
            <div className="xl:col-span-5 bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-4 flex flex-col">
              <h3 className="font-display text-sm font-bold text-[#0B1F3A] mb-1">
                Cumulative Risk Reduction Curve
              </h3>
              <p className="text-[11px] text-[#0B1F3A]/70 mb-3">
                Updates live as roadmap steps are reordered across Immediate 24h, This Week, and This Month.
              </p>
              <div className="flex-1 min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={activeRoadmap.curve}
                    margin={{ top: 10, right: 14, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E6D49A" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#0B1F3A', fontSize: 10 }}
                      axisLine={{ stroke: '#E6D49A' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: '#0B1F3A', fontSize: 10 }}
                      axisLine={{ stroke: '#E6D49A' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0B1F3A',
                        borderColor: '#C9A227',
                        borderRadius: '8px',
                        color: '#FAF7F0',
                        fontSize: '11px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="risk"
                      name="Network Risk"
                      stroke="#C9A227"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#0B1F3A', stroke: '#C9A227', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
