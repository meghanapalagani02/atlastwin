import {
  AttackPath,
  AttackerProfile,
  ChokePoint,
  CveRiskImpact,
  CyberRiskQuantification,
  NetworkNode,
  PatchPlanStep,
  Vulnerability,
} from '../types/network';

export interface TwinContextSummary {
  overallRiskScore: number;
  exposedPathsCount: number;
  attackerProfile: string;
  selectedEntry: string;
  selectedTarget: string;
  topPath: {
    chain: string[];
    hops: number;
    likelihoodPct: number;
    riskScore: number;
    weakestLinkCve: string;
    weakestLinkNode: string;
  } | null;
  topChokePoints: { label: string; pathCount: number }[];
  topRecommendedPatches: { cveId: string; reductionPts: number; effort: string }[];
  patchedCount: number;
  blockedEdgesCount: number;
  expectedAnnualLossUsd: number;
}

export interface AnalystChatResponse {
  answer: string;
  source: 'gemini' | 'analytical';
}

function buildRuleBasedAnswer(
  question: string,
  ctx: TwinContextSummary,
  nodeMap: Map<string, NetworkNode>,
  vulns: Record<string, Vulnerability>,
  topPaths: AttackPath[],
  cveImpacts: CveRiskImpact[],
  optimalPlan: PatchPlanStep[],
  attackerProfile: AttackerProfile,
  cyberRisk: CyberRiskQuantification
): string {
  const q = question.toLowerCase();

  if (q.includes('board') || q.includes('executive') || q.includes('summary')) {
    const firstPatch = optimalPlan[0];
    return [
      `Executive Risk Briefing: AtlasTwin currently measures an overall bank network risk score of ${ctx.overallRiskScore.toFixed(1)}/100 under the ${attackerProfile.name} threat model, with ${ctx.exposedPathsCount} viable attack routes reaching crown-jewel systems and $${(cyberRisk.expectedUsd / 1_000_000).toFixed(2)}M in expected annualized cyber loss exposure.`,
      ctx.topPath
        ? `The primary exposure chain (${ctx.topPath.chain.join(' -> ')}) carries a ${ctx.topPath.likelihoodPct.toFixed(1)}% breach likelihood driven by ${ctx.topPath.weakestLinkCve} on ${ctx.topPath.weakestLinkNode}.`
        : 'All primary entry-to-target paths are currently mitigated under the active filters.',
      firstPatch
        ? `Executing the top 3-step remediation plan—starting with ${firstPatch.cveId} (${firstPatch.effort} effort)—reduces overall exposure by ${optimalPlan[optimalPlan.length - 1]?.cumulativeReductionPercent.toFixed(1) ?? firstPatch.cumulativeReductionPercent.toFixed(1)}% within current maintenance windows.`
        : 'All prioritized critical choke-point vulnerabilities are already patched in the active simulation.',
    ].join('\n\n');
  }

  if (q.includes('patch first') || q.includes('priorit') || q.includes('remediat')) {
    const top3 = optimalPlan.slice(0, 3);
    if (top3.length === 0) {
      return 'All high-leverage CVEs have already been patched in the active simulation. Consider applying network segmentation rules in What-If -> Segmentation to eliminate remaining baseline credential paths.';
    }
    const lines = top3.map((step) => {
      const v = vulns[step.cveId];
      const assets = step.affectedNodeIds
        .map((id) => nodeMap.get(id)?.shortLabel ?? id)
        .join(', ');
      return `${step.step}. ${step.cveId} (${v?.software ?? 'Critical component'}, CVSS ${v?.cvss.toFixed(1) ?? 'N/A'}) on ${assets} — drops risk by ${step.individualReduction.toFixed(1)} pts (${step.effort} effort).`;
    });
    return `Based on greedy cumulative risk reduction across all crown jewels, patch these vulnerabilities first:\n\n${lines.join('\n')}\n\nCompleting all ${top3.length} reduces overall network risk by ${top3[top3.length - 1].cumulativeReductionPercent.toFixed(1)}%.`;
  }

  if (q.includes('ransomware') && q.includes('apt')) {
    return [
      `Threat Actor Comparison (Ransomware vs Nation-State APT):`,
      `1. Cybercrime Ransomware (0.90x exploit skill, 0.55 stealth) prioritizes phishing entry via Employee Workstations, SMB lateral movement (EternalBlue), AD takeover (Zerologon), and Core Banking DB / Backup destruction.`,
      `2. Nation-State APT (1.15x exploit skill, 0.90 stealth) sustains 15% higher exploit success per hop across Vendor VPN and Internet perimeter paths, targeting the SWIFT Gateway and Core Banking Server while evading ~35% more SIEM detections per hop.`,
      `Mitigation takeaway: patching ${cveImpacts[0]?.cveId ?? 'top choke-point CVEs'} and isolating Vendor VPN from Management degrades both actor classes simultaneously.`,
    ].join('\n\n');
  }

  if (
    q.includes('core banking') ||
    q.includes('why') ||
    q.includes('risk') ||
    q.includes('database')
  ) {
    const primary = topPaths[0];
    if (!primary) {
      return `There are currently 0 reachable paths to ${ctx.selectedTarget} under your active patches and segmentation rules. Overall network risk stands at ${ctx.overallRiskScore.toFixed(1)}/100.`;
    }
    const chain = primary.nodes.map((id) => nodeMap.get(id)?.shortLabel ?? id).join(' → ');
    const weakVuln = vulns[primary.weakestLinkCve];
    return [
      `${ctx.selectedTarget} is exposed via ${topPaths.length} viable paths from ${ctx.selectedEntry}. The highest-risk trajectory (${primary.riskScore.toFixed(1)}/100, ${(primary.likelihood * 100).toFixed(2)}% likelihood) traverses: ${chain}.`,
      weakVuln
        ? `The critical weakest link is ${weakVuln.id} (CVSS ${weakVuln.cvss.toFixed(1)}) on ${nodeMap.get(primary.weakestLinkNode)?.label ?? primary.weakestLinkNode}, which enables ${weakVuln.exploitAvailable ? 'weaponized' : 'privileged'} execution.`
        : `The chain relies on baseline credential/configuration trust across ${primary.hops} hops.`,
      ctx.topChokePoints[0]
        ? `Additionally, ${ctx.topChokePoints[0].label} acts as a central choke point traversed by ${ctx.topChokePoints[0].pathCount} crown-jewel paths.`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  // General intelligent fallback anchored on live twin state
  return [
    `Twin Telemetry Summary: Overall risk is ${ctx.overallRiskScore.toFixed(1)}/100 (${ctx.exposedPathsCount} exposed crown-jewel paths, ${ctx.patchedCount} simulated patches applied, ${ctx.blockedEdgesCount} blocked edges).`,
    ctx.topPath
      ? `Top active path: ${ctx.topPath.chain.join(' → ')} (${ctx.topPath.riskScore.toFixed(1)}/100, weakest link ${ctx.topPath.weakestLinkCve}).`
      : 'No active path matches current filters.',
    cveImpacts[0]
      ? `Highest single-patch leverage right now is ${cveImpacts[0].cveId} (-${cveImpacts[0].riskReduction.toFixed(1)} risk points).`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export async function askAiAnalyst(
  question: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  ctx: TwinContextSummary,
  nodeMap: Map<string, NetworkNode>,
  vulns: Record<string, Vulnerability>,
  topPaths: AttackPath[],
  cveImpacts: CveRiskImpact[],
  optimalPlan: PatchPlanStep[],
  attackerProfile: AttackerProfile,
  cyberRisk: CyberRiskQuantification
): Promise<AnalystChatResponse> {
  try {
    const res = await fetch('/api/ai-analyst', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        history,
        twinContext: ctx,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as { answer?: string };
    if (!data.answer) {
      throw new Error('Empty AI Analyst answer');
    }

    return { answer: data.answer, source: 'gemini' };
  } catch {
    return {
      answer: buildRuleBasedAnswer(
        question,
        ctx,
        nodeMap,
        vulns,
        topPaths,
        cveImpacts,
        optimalPlan,
        attackerProfile,
        cyberRisk
      ),
      source: 'analytical',
    };
  }
}
