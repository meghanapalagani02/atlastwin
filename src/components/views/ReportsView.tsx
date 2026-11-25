import React, { useMemo, useState } from 'react';
import { Check, Copy, DollarSign, Printer } from 'lucide-react';
import { useTwin } from '../../context/TwinContext';
import { computeZoneRiskMap } from '../../engine/attackPathEngine';
import { AtlasLogo } from '../AtlasLogo';

type ReportTemplate = 'board' | 'technical' | 'compliance';

function formatUsd(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

export const ReportsView: React.FC = () => {
  const {
    nodes,
    vulns,
    nodeMap,
    patchedCveIds,
    blockedEdgeIds,
    attackerProfile,
    effectiveSkillMultiplier,
    currentOverall,
    baselineOverall,
    attackPaths,
    cveImpacts,
    optimalPlan,
    simulationSummary,
    complianceResults,
    cyberRiskUsd,
  } = useTwin();

  const [template, setTemplate] = useState<ReportTemplate>('board');
  const [copied, setCopied] = useState(false);

  const zoneRisks = useMemo(
    () => computeZoneRiskMap(nodes, vulns, patchedCveIds, effectiveSkillMultiplier),
    [nodes, vulns, patchedCveIds, effectiveSkillMultiplier]
  );

  const top5Risks = useMemo(() => cveImpacts.slice(0, 5), [cveImpacts]);

  const executiveNarrative = useMemo(() => {
    const topPath = attackPaths[0];
    const reductionPct =
      baselineOverall.overallRisk > 0
        ? ((baselineOverall.overallRisk - currentOverall.overallRisk) /
            baselineOverall.overallRisk) *
          100
        : 0;
    return [
      `Under the ${attackerProfile.name} threat model, the banking digital twin measures an overall network risk score of ${currentOverall.overallRisk.toFixed(1)}/100 across ${nodes.length} monitored assets (${currentOverall.totalExposedPaths} exposed crown-jewel routes).`,
      topPath
        ? `Primary exposure chain (${topPath.nodes.map((id) => nodeMap.get(id)?.shortLabel ?? id).join(' → ')}) carries a ${topPath.riskScore.toFixed(1)}/100 risk rating driven by ${topPath.weakestLinkCve}.`
        : 'All primary entry-to-crown-jewel routes are contained under active simulated controls.',
      patchedCveIds.size > 0 || blockedEdgeIds.size > 0
        ? `Active remediation simulation (${patchedCveIds.size} patches, ${blockedEdgeIds.size} firewall rules) lowers overall risk by ${reductionPct.toFixed(1)}% and reduces annualized expected cyber loss from ${formatUsd(cyberRiskUsd.annualizedLossBeforeUsd)} to ${formatUsd(cyberRiskUsd.annualizedLossAfterUsd)}.`
        : `FAIR Cyber Risk Quantification estimates ${formatUsd(cyberRiskUsd.expectedUsd)} in expected annual exposure (range ${formatUsd(cyberRiskUsd.lowUsd)} – ${formatUsd(cyberRiskUsd.highUsd)}).`,
    ].join(' ');
  }, [
    attackerProfile.name,
    currentOverall,
    baselineOverall.overallRisk,
    nodes.length,
    attackPaths,
    nodeMap,
    patchedCveIds.size,
    blockedEdgeIds.size,
    cyberRiskUsd,
  ]);

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(executiveNarrative);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* Toolbar */}
      <div className="no-print bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227]/45 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#E6D49A]">
            Executive Intelligence &amp; FAIR Quantification
          </div>
          <h1 className="font-display text-2xl font-bold mt-0.5">
            Board &amp; Audit Reports
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ['board', 'Board Summary (1 page)'],
                ['technical', 'Technical Deep-Dive'],
                ['compliance', 'Compliance Report'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTemplate(id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  template === id
                    ? 'bg-[#C9A227] text-[#0B1F3A]'
                    : 'bg-[#1B3358] text-[#FAF7F0] border border-[#C9A227]/35 hover:border-[#C9A227]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1B3358] border border-[#C9A227]/40 hover:border-[#C9A227] text-xs font-semibold cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#9ED1A2]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#C9A227]" />
            )}
            <span>{copied ? 'Copied Summary' : 'Copy summary'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C9A227] text-[#0B1F3A] hover:bg-[#d8b43b] text-xs font-semibold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Ivory Report Sheet */}
      <div className="print-only-container bg-[#FAF7F0] text-[#0B1F3A] border border-[#C9A227] rounded-2xl p-6 sm:p-8 shadow-md space-y-6">
        {/* Report Masthead */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E6D49A]">
          <AtlasLogo size="md" variant="navy" />
          <div className="text-right text-xs font-mono text-[#0B1F3A]/75">
            <div className="font-bold text-[#0B1F3A]">
              {template === 'board'
                ? 'BOARD CYBER RISK SUMMARY'
                : template === 'technical'
                  ? 'TECHNICAL ATTACK-PATH DEEP DIVE'
                  : 'REGULATORY COMPLIANCE ATTESTATION'}
            </div>
            <div>Generated {new Date().toLocaleDateString()}</div>
            <div>Persona: {attackerProfile.shortName}</div>
          </div>
        </div>

        {/* Key Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#0B1F3A]/65">
              Overall Network Risk
            </div>
            <div className="font-mono text-2xl font-bold mt-1">
              {currentOverall.overallRisk.toFixed(1)}
              <span className="text-xs font-normal text-[#0B1F3A]/60">/100</span>
            </div>
          </div>
          <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#0B1F3A]/65">
              Exposed Crown-Jewel Paths
            </div>
            <div className="font-mono text-2xl font-bold mt-1">
              {currentOverall.totalExposedPaths}
            </div>
          </div>
          <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#0B1F3A]/65">
              Simulated Mitigations
            </div>
            <div className="font-mono text-2xl font-bold mt-1">
              {patchedCveIds.size} <span className="text-xs font-normal">CVEs</span> ·{' '}
              {blockedEdgeIds.size} <span className="text-xs font-normal">Rules</span>
            </div>
          </div>
          <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#0B1F3A]/65">
              PCI DSS 4.0 Readiness
            </div>
            <div className="font-mono text-2xl font-bold mt-1">
              {complianceResults['pci-dss'].score}%
            </div>
          </div>
        </div>

        {/* Cyber Risk Quantification (FAIR USD Card) */}
        <div className="bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227] rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#C9A227]">
                <DollarSign className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Cyber Risk Quantification (FAIR Annualized Loss Model)</span>
              </div>
              <div className="mt-2 flex flex-wrap items-baseline gap-6 font-mono">
                <div>
                  <span className="text-[10px] text-[#E6D49A]/80 block">Low (10th pct)</span>
                  <span className="text-lg font-bold">{formatUsd(cyberRiskUsd.lowUsd)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#E6D49A] block">Expected Annual Loss</span>
                  <span className="text-2xl font-bold text-[#C9A227]">
                    {formatUsd(cyberRiskUsd.expectedUsd)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#E6D49A]/80 block">High (90th pct)</span>
                  <span className="text-lg font-bold">{formatUsd(cyberRiskUsd.highUsd)}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#1B3358] border border-[#C9A227]/35 rounded-lg px-4 py-2.5 text-xs font-mono">
              <div className="text-[#E6D49A]/80 text-[10px]">Before → After Mitigation</div>
              <div className="font-bold mt-0.5">
                {formatUsd(cyberRiskUsd.annualizedLossBeforeUsd)} →{' '}
                <span className="text-[#9ED1A2]">
                  {formatUsd(cyberRiskUsd.annualizedLossAfterUsd)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#C9A227]/25 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
            {cyberRiskUsd.topDrivers.map((d) => (
              <div key={d.nodeId} className="bg-[#1B3358]/70 rounded p-2">
                <div className="text-[#E6D49A] truncate">{d.label}</div>
                <div className="font-bold mt-0.5">{formatUsd(d.exposureUsd)}</div>
                <div className="text-[10px] text-[#FAF7F0]/65">
                  {(d.breachProb * 100).toFixed(1)}% breach prob
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Executive AI Narrative */}
        <div className="bg-[#F1ECDD]/80 border border-[#E6D49A] rounded-xl p-4">
          <h2 className="font-display text-sm font-bold text-[#0B1F3A] mb-1.5">
            Executive Briefing Narrative
          </h2>
          <p className="text-xs leading-relaxed text-[#0B1F3A]/85">{executiveNarrative}</p>
        </div>

        {/* Per-Zone Risk Sparklines */}
        <div>
          <h2 className="font-display text-sm font-bold text-[#0B1F3A] mb-2">
            Security Zone Exposure Breakdown
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {zoneRisks.map((zr) => (
              <div
                key={zr.zone}
                className="bg-[#F1ECDD]/70 border border-[#E6D49A] rounded-lg p-2.5"
              >
                <div className="text-[11px] font-semibold">{zr.zone}</div>
                <div className="font-mono text-base font-bold mt-0.5">
                  {zr.risk.toFixed(0)}
                </div>
                <div className="mt-1.5 h-1.5 bg-[#FAF7F0] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, zr.risk)}%`,
                      backgroundColor:
                        zr.risk >= 65 ? '#B3261E' : zr.risk >= 40 ? '#C9A227' : '#5E8C61',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Template-Specific Sections */}
        {template !== 'compliance' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 border border-[#E6D49A] rounded-xl overflow-hidden">
              <div className="bg-[#F1ECDD] px-4 py-2.5 border-b border-[#E6D49A] font-display text-sm font-bold">
                Top 5 Remediation Leverage Risks
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F1ECDD]/50 border-b border-[#E6D49A] text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-3">CVE</th>
                    <th className="py-2 px-3">Affected Assets</th>
                    <th className="py-2 px-3 text-right">CVSS</th>
                    <th className="py-2 px-3 text-right">Risk Drop</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6D49A]/50">
                  {top5Risks.map((r) => (
                    <tr key={r.cveId}>
                      <td className="py-2 px-3 font-mono font-bold">{r.cveId}</td>
                      <td className="py-2 px-3">
                        {r.affectedNodeIds
                          .map((id) => nodeMap.get(id)?.shortLabel ?? id)
                          .join(', ')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {vulns[r.cveId]?.cvss.toFixed(1) ?? '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#5E8C61]">
                        -{r.riskReduction.toFixed(1)} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:col-span-5 bg-[#F1ECDD]/70 border border-[#E6D49A] rounded-xl p-4 space-y-2.5 text-xs">
              <h3 className="font-display text-sm font-bold">
                Before vs After Patch Impact
              </h3>
              <div className="flex justify-between font-mono py-1.5 border-b border-[#E6D49A]/60">
                <span>Network Risk Score</span>
                <span>
                  {simulationSummary.riskBefore.toFixed(1)} →{' '}
                  <strong>{simulationSummary.riskAfter.toFixed(1)}</strong>
                </span>
              </div>
              <div className="flex justify-between font-mono py-1.5 border-b border-[#E6D49A]/60">
                <span>Viable Crown-Jewel Paths</span>
                <span>
                  {simulationSummary.viablePathsBefore} →{' '}
                  <strong>{simulationSummary.viablePathsAfter}</strong>
                </span>
              </div>
              <div className="pt-1">
                <div className="font-semibold mb-1">Next Optimal Steps:</div>
                {optimalPlan.length === 0 ? (
                  <span className="text-[#5E8C61]">Top high-leverage steps applied.</span>
                ) : (
                  <ul className="space-y-1 font-mono text-[11px]">
                    {optimalPlan.map((s) => (
                      <li key={s.cveId}>
                        #{s.step} {s.cveId} (-{s.individualReduction.toFixed(1)} pts)
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.values(complianceResults).map((fw) => (
              <div
                key={fw.id}
                className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl p-4"
              >
                <div className="font-display text-sm font-bold">{fw.shortName}</div>
                <div className="font-mono text-2xl font-bold mt-1">{fw.score}%</div>
                <div className="text-[11px] font-mono text-[#0B1F3A]/75 mt-1">
                  {fw.compliantCount} Compliant · {fw.partialCount} Partial · {fw.gapCount} Gaps
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
