import React, { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import {
  AttackPath,
  NetworkNode,
  PatchPlanStep,
  SimulationSummary,
  Vulnerability,
} from '../types/network';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryLabel: string;
  targetLabel: string;
  topPaths: AttackPath[];
  nodeMap: Map<string, NetworkNode>;
  vulns: Record<string, Vulnerability>;
  optimalPlan: PatchPlanStep[];
  simulationSummary: SimulationSummary;
  patchedCveIds: Set<string>;
  aiInsight: string;
  lastSynced: string | null;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  entryLabel,
  targetLabel,
  topPaths,
  nodeMap,
  vulns,
  optimalPlan,
  simulationSummary,
  patchedCveIds,
  aiInsight,
  lastSynced,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      window.print();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const generatedAt = new Date().toLocaleString();
  const top5 = topPaths.slice(0, 5);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Printable Executive Security Report"
      className="fixed inset-0 z-50 bg-[#0B1F3A]/75 backdrop-blur-xs overflow-y-auto p-4 sm:p-8 print-only-container"
    >
      <div className="max-w-4xl mx-auto bg-[#FAF7F0] text-[#0B1F3A] border border-[#C9A227] rounded-xl shadow-2xl overflow-hidden print-only-container">
        {/* Non-print Action Bar */}
        <div className="no-print bg-[#0B1F3A] text-[#FAF7F0] px-6 py-3.5 flex items-center justify-between gap-4">
          <span className="font-display text-sm font-bold text-[#E6D49A]">
            Executive Attack-Path Assessment Preview
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#C9A227] text-[#0B1F3A] hover:bg-[#d8b43b] transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#1B3358] text-[#FAF7F0] hover:bg-[#23406d] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Printable Report Content */}
        <div className="p-8 space-y-7">
          {/* Title Banner */}
          <div className="border-b-2 border-[#C9A227] pb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-[#C9A227]">
                AtlasTwin Executive Security Assessment
              </div>
              <h2 className="font-display text-2xl font-bold text-[#0B1F3A] mt-1">
                Bank Network Attack-Path &amp; Patch Simulation Report
              </h2>
              <p className="text-xs text-[#0B1F3A]/75 mt-1">
                Scope: {entryLabel} → {targetLabel}
              </p>
            </div>
            <div className="text-right text-xs font-mono tabular-nums text-[#0B1F3A]/75">
              <div>Generated: {generatedAt}</div>
              <div>NVD Sync: {lastSynced ?? 'Embedded Baseline'}</div>
            </div>
          </div>

          {/* Executive Summary & Before/After KPIs */}
          <section className="space-y-3">
            <h3 className="font-display text-lg font-bold text-[#0B1F3A]">
              Executive Summary
            </h3>
            <p className="text-xs leading-relaxed text-[#0B1F3A]/90 bg-[#F1ECDD] border border-[#E6D49A] rounded-lg p-4">
              {aiInsight ||
                'Continuous digital twin graph evaluation measures shortest-cost adversary paths across segmented perimeter, corporate, application, management, data, and payments zones.'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-lg p-3">
                <div className="text-[11px] text-[#0B1F3A]/70">Baseline Risk Score</div>
                <div className="text-xl font-bold font-mono tabular-nums text-[#B3261E] mt-1">
                  {simulationSummary.riskBefore.toFixed(1)}/100
                </div>
              </div>
              <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-lg p-3">
                <div className="text-[11px] text-[#0B1F3A]/70">Current / Simulated Risk</div>
                <div className="text-xl font-bold font-mono tabular-nums text-[#0B1F3A] mt-1">
                  {simulationSummary.riskAfter.toFixed(1)}/100
                </div>
              </div>
              <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-lg p-3">
                <div className="text-[11px] text-[#0B1F3A]/70">Risk Reduction</div>
                <div className="text-xl font-bold font-mono tabular-nums text-[#5E8C61] mt-1">
                  -{simulationSummary.riskReductionPercent.toFixed(1)}%
                </div>
              </div>
              <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-lg p-3">
                <div className="text-[11px] text-[#0B1F3A]/70">Simulated Patches</div>
                <div className="text-xl font-bold font-mono tabular-nums text-[#0B1F3A] mt-1">
                  {patchedCveIds.size} CVEs
                </div>
              </div>
            </div>
          </section>

          {/* Top 5 Ranked Attack Paths */}
          <section className="space-y-2.5">
            <h3 className="font-display text-lg font-bold text-[#0B1F3A]">
              Top 5 Exposed Attack Paths ({entryLabel} → {targetLabel})
            </h3>
            <table className="w-full text-left border-collapse border border-[#E6D49A] text-xs">
              <thead>
                <tr className="bg-[#F1ECDD] border-b border-[#E6D49A]">
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Traversal Chain</th>
                  <th className="py-2 px-3 text-right">Hops</th>
                  <th className="py-2 px-3 text-right">Likelihood</th>
                  <th className="py-2 px-3 text-right">Risk</th>
                  <th className="py-2 px-3">Weakest Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D49A]/60">
                {top5.map((p, idx) => (
                  <tr key={p.id}>
                    <td className="py-2 px-3 font-mono tabular-nums font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      {p.nodes.map((id) => nodeMap.get(id)?.shortLabel ?? id).join(' → ')}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {p.hops}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {(p.likelihood * 100).toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-bold">
                      {p.riskScore.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums">
                      {p.weakestLinkCve}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Recommended Optimal Patches */}
          <section className="space-y-2.5">
            <h3 className="font-display text-lg font-bold text-[#0B1F3A]">
              Recommended Priority Remediation Plan
            </h3>
            {optimalPlan.length === 0 ? (
              <p className="text-xs text-[#5E8C61] font-medium">
                All highest-leverage choke-point vulnerabilities are already remediated in the current simulation.
              </p>
            ) : (
              <div className="space-y-2">
                {optimalPlan.map((step) => {
                  const v = vulns[step.cveId];
                  return (
                    <div
                      key={step.cveId}
                      className="bg-[#F1ECDD] border border-[#E6D49A] rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-[#0B1F3A]">
                          #{step.step} {step.cveId}
                        </span>
                        <span className="mx-2 text-[#C9A227]">·</span>
                        <span className="font-medium">{v?.software}</span>
                        <div className="text-[11px] text-[#0B1F3A]/75 mt-0.5">
                          Assets:{' '}
                          {step.affectedNodeIds
                            .map((id) => nodeMap.get(id)?.label ?? id)
                            .join(', ')}
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <div className="font-bold text-[#5E8C61]">
                          -{step.individualReduction.toFixed(1)} pts (Cum. -
                          {step.cumulativeReductionPercent.toFixed(1)}%)
                        </div>
                        <div className="text-[11px] text-[#0B1F3A]/70">
                          Effort: {step.effort}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <footer className="pt-4 border-t border-[#E6D49A] text-[11px] text-[#0B1F3A]/65 flex justify-between">
            <span>AtlasTwin · Continuous Attack-Path Intelligence</span>
            <span>Simulated environment for demonstration. Vulnerability data sourced from NVD (NIST).</span>
          </footer>
        </div>
      </div>
    </div>
  );
};
