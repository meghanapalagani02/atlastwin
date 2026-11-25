import { AttackPath, NetworkNode, Vulnerability } from '../types/network';

export interface AiInsightResult {
  text: string;
  source: 'gemini' | 'analytical';
}

export function buildTemplateInsight(
  path: AttackPath,
  nodeMap: Map<string, NetworkNode>,
  vulns: Record<string, Vulnerability>,
  entryLabel: string,
  targetLabel: string
): string {
  const pathLabels = path.nodes.map((id) => nodeMap.get(id)?.shortLabel ?? id);
  const weakestNode = nodeMap.get(path.weakestLinkNode);
  const weakestVuln = vulns[path.weakestLinkCve];
  const likelihoodPct = (path.likelihood * 100).toFixed(1);
  const cvssStr = weakestVuln ? `CVSS ${weakestVuln.cvss.toFixed(1)}` : 'elevated severity';

  const s1 = `An adversary originating from ${entryLabel} can traverse ${path.hops} segmented hops (${pathLabels.join(' → ')}) to compromise ${targetLabel} with a modeled ${likelihoodPct}% path likelihood and ${path.riskScore.toFixed(1)}/100 risk index.`;
  const s2 = weakestVuln
    ? `The critical pivot along this chain is ${weakestNode?.label ?? path.weakestLinkNode}, where ${weakestVuln.id} (${cvssStr}, ${weakestVuln.software}) provides ${weakestVuln.exploitAvailable ? 'publicly weaponized' : 'privileged'} execution.`
    : `The critical pivot along this chain is ${weakestNode?.label ?? path.weakestLinkNode}, where baseline credential or configuration exposure permits lateral progression.`;
  const s3 = `This route aligns with ${path.mitreTactics.slice(0, 4).join(' → ')} tactics, bypassing perimeter controls to threaten high-criticality financial settlement and customer data.`;
  const s4 = weakestVuln
    ? `Prioritizing emergency remediation of ${weakestVuln.id} on ${weakestNode?.shortLabel ?? path.weakestLinkNode} (${weakestVuln.remediationEffort.toLowerCase()} effort) immediately severs this primary vector and materially lowers crown-jewel exposure.`
    : `Enforcing micro-segmentation and strict privilege isolation around ${weakestNode?.shortLabel ?? path.weakestLinkNode} will immediately sever this attack trajectory.`;

  return `${s1} ${s2} ${s3} ${s4}`;
}

export async function fetchAiPathInsight(
  path: AttackPath,
  nodeMap: Map<string, NetworkNode>,
  vulns: Record<string, Vulnerability>,
  entryLabel: string,
  targetLabel: string
): Promise<AiInsightResult> {
  const pathLabels = path.nodes.map((id) => nodeMap.get(id)?.label ?? id);
  const weakestNode = nodeMap.get(path.weakestLinkNode);
  const weakestVuln = vulns[path.weakestLinkCve];

  try {
    const res = await fetch('/api/ai-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pathLabels,
        hops: path.hops,
        likelihoodPct: path.likelihood * 100,
        riskScore: path.riskScore,
        weakestLinkCve: path.weakestLinkCve,
        weakestLinkNode: weakestNode?.label ?? path.weakestLinkNode,
        weakestLinkCvss: weakestVuln?.cvss,
        weakestLinkSoftware: weakestVuln?.software,
        mitreTactics: path.mitreTactics,
        targetLabel,
        entryLabel,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as { insight?: string };
    if (!data.insight) {
      throw new Error('Empty insight');
    }

    return { text: data.insight, source: 'gemini' };
  } catch {
    return {
      text: buildTemplateInsight(path, nodeMap, vulns, entryLabel, targetLabel),
      source: 'analytical',
    };
  }
}
