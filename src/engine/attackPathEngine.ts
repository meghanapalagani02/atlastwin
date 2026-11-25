import { ENTRY_POINTS, TARGET_CROWN_JEWELS } from '../data/bankNetwork';
import {
  COMPLIANCE_CONTROLS,
  COMPLIANCE_FRAMEWORK_META,
} from '../data/securityFrameworks';
import {
  AlertItem,
  AttackPath,
  BlastRadiusNode,
  BlastRadiusResult,
  ChokePoint,
  ComplianceFrameworkId,
  ComplianceFrameworkResult,
  ComplianceStatus,
  CveRiskImpact,
  CyberRiskQuantification,
  EvaluatedControl,
  NetworkEdge,
  NetworkNode,
  NetworkZone,
  PatchPlanStep,
  RemediationEffort,
  RemediationRoadmap,
  RemediationRoadmapItem,
  SegmentationRecommendation,
  Severity,
  SimulationSummary,
  Vulnerability,
} from '../types/network';

const SEVERITY_RANK: Record<Severity, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const EFFORT_HOURS_MAP: Record<RemediationEffort, number> = {
  Low: 4,
  Medium: 12,
  High: 28,
};

const DOWNTIME_RANK: Record<RemediationEffort, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

/**
 * Computes a node's single-step exploit probability based on its highest-impact
 * unpatched vulnerability: p = (CVSS / 10) * (exploitAvailable ? 1.0 : 0.6) * skillMultiplier.
 * Nodes with zero unpatched vulnerabilities retain a 0.05 credential/misconfig baseline.
 */
export function getNodeExploitProbability(
  node: NetworkNode,
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>,
  skillMultiplier = 1.0
): number {
  const unpatched = node.cves
    .filter((id) => !patchedCveIds.has(id))
    .map((id) => vulns[id])
    .filter((v): v is Vulnerability => Boolean(v));

  if (unpatched.length === 0) {
    return Math.min(0.99, Math.max(0.02, 0.05 * skillMultiplier));
  }

  let bestProb = 0.05;
  for (const v of unpatched) {
    const p = (v.cvss / 10) * (v.exploitAvailable ? 1.0 : 0.6) * skillMultiplier;
    if (p > bestProb) {
      bestProb = p;
    }
  }
  return Math.min(0.99, Math.max(0.02, bestProb));
}

export function getNodeMaxSeverity(
  node: NetworkNode,
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>
): Severity | 'Patched' | 'None' {
  if (node.cves.length === 0) return 'None';
  const unpatched = node.cves
    .filter((id) => !patchedCveIds.has(id))
    .map((id) => vulns[id])
    .filter((v): v is Vulnerability => Boolean(v));

  if (unpatched.length === 0) return 'Patched';

  let maxSev: Severity = 'Low';
  for (const v of unpatched) {
    if (SEVERITY_RANK[v.severity] > SEVERITY_RANK[maxSev]) {
      maxSev = v.severity;
    }
  }
  return maxSev;
}

export function getNodeBestUnpatchedCve(
  node: NetworkNode,
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>
): Vulnerability | null {
  const unpatched = node.cves
    .filter((id) => !patchedCveIds.has(id))
    .map((id) => vulns[id])
    .filter((v): v is Vulnerability => Boolean(v));

  if (unpatched.length === 0) return null;

  return unpatched.reduce((best, curr) => {
    const bestScore = (best.cvss / 10) * (best.exploitAvailable ? 1.0 : 0.6);
    const currScore = (curr.cvss / 10) * (curr.exploitAvailable ? 1.0 : 0.6);
    return currScore > bestScore ? curr : best;
  });
}

function clampProb(p: number): number {
  return Math.min(0.9999, Math.max(0.0001, p));
}

function computeEdgeCost(edge: NetworkEdge, destProb: number): number {
  const effective = clampProb(edge.reachability * destProb);
  return -Math.log(effective);
}

interface DijkstraResult {
  nodes: string[];
  edges: string[];
  cost: number;
}

function runDijkstra(
  sourceId: string,
  targetId: string,
  nodeMap: Map<string, NetworkNode>,
  adjacency: Map<string, NetworkEdge[]>,
  nodeProbs: Map<string, number>,
  excludedNodes: Set<string>,
  excludedEdges: Set<string>
): DijkstraResult | null {
  if (excludedNodes.has(sourceId) || excludedNodes.has(targetId)) return null;

  const dist = new Map<string, number>();
  const prevNode = new Map<string, string>();
  const prevEdge = new Map<string, string>();
  const visited = new Set<string>();

  for (const id of nodeMap.keys()) {
    dist.set(id, Infinity);
  }
  dist.set(sourceId, 0);

  while (true) {
    let u: string | null = null;
    let bestDist = Infinity;

    for (const [id, d] of dist.entries()) {
      if (!visited.has(id) && !excludedNodes.has(id) && d < bestDist) {
        bestDist = d;
        u = id;
      }
    }

    if (u === null || bestDist === Infinity) break;
    if (u === targetId) break;

    visited.add(u);
    const outEdges = adjacency.get(u) ?? [];
    for (const edge of outEdges) {
      if (excludedEdges.has(edge.id) || excludedNodes.has(edge.target)) continue;
      const destProb = nodeProbs.get(edge.target) ?? 0.05;
      const w = computeEdgeCost(edge, destProb);
      const alt = bestDist + w;
      if (alt < (dist.get(edge.target) ?? Infinity)) {
        dist.set(edge.target, alt);
        prevNode.set(edge.target, u);
        prevEdge.set(edge.target, edge.id);
      }
    }
  }

  const finalCost = dist.get(targetId);
  if (finalCost === undefined || finalCost === Infinity) return null;

  const pathNodes: string[] = [];
  const pathEdges: string[] = [];
  let curr: string | undefined = targetId;

  while (curr !== undefined) {
    pathNodes.unshift(curr);
    const eId = prevEdge.get(curr);
    if (eId) pathEdges.unshift(eId);
    curr = prevNode.get(curr);
  }

  if (pathNodes[0] !== sourceId) return null;

  return {
    nodes: pathNodes,
    edges: pathEdges,
    cost: finalCost,
  };
}

function deriveMitreTactics(
  pathNodes: string[],
  nodeMap: Map<string, NetworkNode>
): string[] {
  const tactics: string[] = [];
  const pushUnique = (t: string) => {
    if (!tactics.includes(t)) tactics.push(t);
  };

  for (let i = 0; i < pathNodes.length; i++) {
    const node = nodeMap.get(pathNodes[i]);
    if (!node) continue;

    if (i === 0) {
      if (node.id === 'internet') {
        pushUnique('Reconnaissance');
      } else {
        pushUnique('Initial Access');
      }
      continue;
    }

    if (i === 1 && tactics[0] === 'Reconnaissance') {
      pushUnique('Initial Access');
    }

    if (node.type === 'workstation') {
      pushUnique('Execution');
    } else if (node.type === 'identity') {
      pushUnique('Credential Access');
      pushUnique('Privilege Escalation');
    } else if (node.type === 'security') {
      pushUnique('Defense Evasion');
    } else if (node.zone === 'DMZ' || node.zone === 'Corporate') {
      pushUnique('Initial Access');
    } else if (node.zone === 'Application' || node.zone === 'Management') {
      pushUnique('Lateral Movement');
    }

    if (i === pathNodes.length - 1) {
      if (node.type === 'database') {
        pushUnique('Collection');
        pushUnique('Exfiltration');
      } else {
        pushUnique('Impact');
      }
    }
  }

  if (tactics.length < 2) {
    pushUnique('Impact');
  }
  return tactics;
}

/**
 * Computes SIEM detection probability across a path based on node zone telemetry
 * coverage, SIEM health, and attacker stealth factor.
 */
export function computePathDetectionProbability(
  pathNodes: string[],
  nodeMap: Map<string, NetworkNode>,
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>,
  stealthFactor = 0.55
): number {
  const siemNode = nodeMap.get('siem-soc');
  const siemUnpatched = siemNode
    ? siemNode.cves.filter((c) => !patchedCveIds.has(c)).length
    : 0;
  // Patched SIEM catches more per hop
  const siemHealth = siemUnpatched === 0 ? 1.0 : 0.72;

  const zoneSensorCoverage: Record<NetworkZone, number> = {
    Internet: 0.08,
    DMZ: 0.34,
    Corporate: 0.28,
    Application: 0.36,
    Management: 0.48,
    Data: 0.52,
    Payments: 0.55,
  };

  let evadeProb = 1.0;
  for (let i = 1; i < pathNodes.length; i++) {
    const n = nodeMap.get(pathNodes[i]);
    if (!n) continue;
    const baseDetect = zoneSensorCoverage[n.zone] ?? 0.3;
    const hopDetect = Math.min(
      0.85,
      Math.max(0.04, baseDetect * siemHealth * (1.15 - stealthFactor * 0.75))
    );
    evadeProb *= 1 - hopDetect;
  }

  return Math.min(0.99, Math.max(0.05, 1 - evadeProb));
}

export interface EngineOptions {
  allowedZones?: Set<NetworkZone>;
  blockedEdgeIds?: Set<string>;
  isolatedNodeIds?: Set<string>;
  skillMultiplier?: number;
  stealthFactor?: number;
}

/**
 * Computes top-K loopless attack paths from sourceId to targetId using Yen's algorithm.
 */
export function findTopKAttackPaths(
  sourceId: string,
  targetId: string,
  k: number,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>,
  allowedZonesOrOpts?: Set<NetworkZone> | EngineOptions
): AttackPath[] {
  const opts: EngineOptions =
    allowedZonesOrOpts instanceof Set
      ? { allowedZones: allowedZonesOrOpts }
      : allowedZonesOrOpts ?? {};

  const {
    allowedZones,
    blockedEdgeIds = new Set<string>(),
    isolatedNodeIds = new Set<string>(),
    skillMultiplier = 1.0,
    stealthFactor = 0.55,
  } = opts;

  if (isolatedNodeIds.has(sourceId) || isolatedNodeIds.has(targetId)) {
    return [];
  }

  const nodeMap = new Map<string, NetworkNode>();
  const adjacency = new Map<string, NetworkEdge[]>();
  const nodeProbs = new Map<string, number>();

  for (const n of nodes) {
    if (isolatedNodeIds.has(n.id)) continue;
    if (
      allowedZones &&
      !allowedZones.has(n.zone) &&
      n.id !== sourceId &&
      n.id !== targetId
    ) {
      continue;
    }
    nodeMap.set(n.id, n);
    adjacency.set(n.id, []);
    nodeProbs.set(
      n.id,
      getNodeExploitProbability(n, vulns, patchedCveIds, skillMultiplier)
    );
  }

  if (!nodeMap.has(sourceId) || !nodeMap.has(targetId)) {
    return [];
  }

  const edgeMap = new Map<string, NetworkEdge>();
  for (const e of edges) {
    if (blockedEdgeIds.has(e.id)) continue;
    edgeMap.set(e.id, e);
    if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
      adjacency.get(e.source)!.push(e);
    }
  }

  const first = runDijkstra(
    sourceId,
    targetId,
    nodeMap,
    adjacency,
    nodeProbs,
    new Set(),
    new Set()
  );
  if (!first) return [];

  const accepted: DijkstraResult[] = [first];
  const candidates: DijkstraResult[] = [];
  const seenKeys = new Set<string>([first.nodes.join('>')]);

  for (let i = 1; i < k; i++) {
    const prevPath = accepted[i - 1];

    for (let spurIdx = 0; spurIdx < prevPath.nodes.length - 1; spurIdx++) {
      const spurNode = prevPath.nodes[spurIdx];
      const rootNodes = prevPath.nodes.slice(0, spurIdx + 1);
      const rootEdges = prevPath.edges.slice(0, spurIdx);

      const excludedEdges = new Set<string>();
      for (const p of accepted) {
        if (
          p.nodes.length > spurIdx &&
          p.nodes.slice(0, spurIdx + 1).every((id, idx) => id === rootNodes[idx])
        ) {
          const nextEdge = p.edges[spurIdx];
          if (nextEdge) excludedEdges.add(nextEdge);
        }
      }

      const excludedNodes = new Set<string>(rootNodes.slice(0, -1));
      const spurResult = runDijkstra(
        spurNode,
        targetId,
        nodeMap,
        adjacency,
        nodeProbs,
        excludedNodes,
        excludedEdges
      );

      if (spurResult) {
        const totalNodes = [...rootNodes.slice(0, -1), ...spurResult.nodes];
        const totalEdges = [...rootEdges, ...spurResult.edges];
        const key = totalNodes.join('>');

        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          let rootCost = 0;
          for (const eId of rootEdges) {
            const e = edgeMap.get(eId);
            if (e) {
              rootCost += computeEdgeCost(e, nodeProbs.get(e.target) ?? 0.05);
            }
          }
          candidates.push({
            nodes: totalNodes,
            edges: totalEdges,
            cost: rootCost + spurResult.cost,
          });
        }
      }
    }

    if (candidates.length === 0) break;
    candidates.sort((a, b) => a.cost - b.cost);
    const bestCandidate = candidates.shift()!;
    accepted.push(bestCandidate);
  }

  const targetNode = nodeMap.get(targetId)!;

  return accepted.map((res, idx) => {
    const likelihood = Math.min(0.99, Math.exp(-res.cost));
    const riskScore = Math.min(100, Math.max(0, likelihood * targetNode.criticality * 10));

    let weakestCve = 'Credential/Misconfig';
    let weakestNode = res.nodes[res.nodes.length - 1];
    let highestVulnProb = -1;

    for (let j = 1; j < res.nodes.length; j++) {
      const n = nodeMap.get(res.nodes[j]);
      if (!n) continue;
      const bestVuln = getNodeBestUnpatchedCve(n, vulns, patchedCveIds);
      if (bestVuln) {
        const vp = (bestVuln.cvss / 10) * (bestVuln.exploitAvailable ? 1.0 : 0.6);
        if (vp > highestVulnProb) {
          highestVulnProb = vp;
          weakestCve = bestVuln.id;
          weakestNode = n.id;
        }
      }
    }

    const detectionProbability = computePathDetectionProbability(
      res.nodes,
      nodeMap,
      vulns,
      patchedCveIds,
      stealthFactor
    );

    return {
      id: `${sourceId}->${targetId}#${idx + 1}`,
      nodes: res.nodes,
      edges: res.edges,
      hops: Math.max(0, res.nodes.length - 1),
      likelihood,
      riskScore,
      weakestLinkCve: weakestCve,
      weakestLinkNode: weakestNode,
      mitreTactics: deriveMitreTactics(res.nodes, nodeMap),
      cost: res.cost,
      detectionProbability,
    };
  });
}

const ENTRY_WEIGHTS: Record<string, number> = {
  internet: 1.0,
  'vendor-vpn': 0.9,
  'emp-workstation': 0.85,
};

export function computeOverallRiskScore(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>,
  opts?: EngineOptions
): { overallRisk: number; totalExposedPaths: number } {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  let weightedSum = 0;
  let totalWeight = 0;
  let totalExposedPaths = 0;

  for (const entry of ENTRY_POINTS) {
    if (!nodeMap.has(entry.id)) continue;
    const eWeight = ENTRY_WEIGHTS[entry.id] ?? 0.85;
    for (const target of TARGET_CROWN_JEWELS) {
      const targetNode = nodeMap.get(target.id);
      if (!targetNode) continue;

      const paths = findTopKAttackPaths(
        entry.id,
        target.id,
        3,
        nodes,
        edges,
        vulns,
        patchedCveIds,
        opts
      );

      totalExposedPaths += paths.filter((p) => p.riskScore >= 2.5).length;

      const topRisk = paths[0]?.riskScore ?? 0;
      const secondaryAvg =
        paths.length > 1
          ? paths.slice(1).reduce((s, p) => s + p.riskScore, 0) / (paths.length - 1)
          : topRisk * 0.5;

      const pairRisk = Math.min(100, topRisk * 0.78 + secondaryAvg * 0.22);
      const weight = eWeight * targetNode.criticality;
      weightedSum += pairRisk * weight;
      totalWeight += weight;
    }
  }

  const rawAvg = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const overallRisk = Math.min(100, Math.round(rawAvg * 1.45 * 10) / 10);

  return { overallRisk, totalExposedPaths };
}

export function computeChokePoints(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>,
  opts?: EngineOptions
): ChokePoint[] {
  const counts = new Map<string, number>();
  for (const n of nodes) {
    counts.set(n.id, 0);
  }

  let totalPathsAnalyzed = 0;
  for (const entry of ENTRY_POINTS) {
    for (const target of TARGET_CROWN_JEWELS) {
      const paths = findTopKAttackPaths(
        entry.id,
        target.id,
        4,
        nodes,
        edges,
        vulns,
        patchedCveIds,
        opts
      );
      for (const path of paths) {
        totalPathsAnalyzed++;
        for (let i = 1; i < path.nodes.length - 1; i++) {
          const nid = path.nodes[i];
          counts.set(nid, (counts.get(nid) ?? 0) + 1);
        }
      }
    }
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 0)
    .map(([nodeId, pathCount]) => ({
      nodeId,
      pathCount,
      score: totalPathsAnalyzed > 0 ? Math.round((pathCount / totalPathsAnalyzed) * 100) : 0,
    }))
    .sort((a, b) => b.pathCount - a.pathCount)
    .slice(0, 3);
}

export function rankCvesByRiskReduction(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>,
  opts?: EngineOptions
): CveRiskImpact[] {
  const { overallRisk: baselineRisk } = computeOverallRiskScore(
    nodes,
    edges,
    vulns,
    patchedCveIds,
    opts
  );

  const cveToNodes = new Map<string, string[]>();
  for (const node of nodes) {
    for (const cveId of node.cves) {
      if (patchedCveIds.has(cveId)) continue;
      if (!cveToNodes.has(cveId)) cveToNodes.set(cveId, []);
      cveToNodes.get(cveId)!.push(node.id);
    }
  }

  const impacts: CveRiskImpact[] = [];
  for (const [cveId, affectedNodeIds] of cveToNodes.entries()) {
    const testPatched = new Set(patchedCveIds);
    testPatched.add(cveId);
    const { overallRisk: riskAfter } = computeOverallRiskScore(
      nodes,
      edges,
      vulns,
      testPatched,
      opts
    );
    const riskReduction = Math.max(0, Math.round((baselineRisk - riskAfter) * 10) / 10);
    const reductionPercent =
      baselineRisk > 0 ? Math.round((riskReduction / baselineRisk) * 1000) / 10 : 0;

    impacts.push({
      cveId,
      affectedNodeIds,
      riskBefore: baselineRisk,
      riskAfter,
      riskReduction,
      reductionPercent,
      effort: vulns[cveId]?.remediationEffort ?? 'Medium',
    });
  }

  return impacts.sort((a, b) => b.riskReduction - a.riskReduction);
}

export function computeOptimalPatchPlan(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vulns: Record<string, Vulnerability>,
  initialPatched: Set<string>,
  stepsCount = 3,
  opts?: EngineOptions
): PatchPlanStep[] {
  const { overallRisk: startRisk } = computeOverallRiskScore(
    nodes,
    edges,
    vulns,
    initialPatched,
    opts
  );

  const workingPatched = new Set(initialPatched);
  const plan: PatchPlanStep[] = [];
  let prevRisk = startRisk;

  for (let step = 1; step <= stepsCount; step++) {
    const ranked = rankCvesByRiskReduction(nodes, edges, vulns, workingPatched, opts);
    if (ranked.length === 0 || ranked[0].riskReduction <= 0) break;

    const best = ranked[0];
    workingPatched.add(best.cveId);

    const cumulativeReductionPercent =
      startRisk > 0
        ? Math.round(((startRisk - best.riskAfter) / startRisk) * 1000) / 10
        : 0;

    plan.push({
      step,
      cveId: best.cveId,
      affectedNodeIds: best.affectedNodeIds,
      individualReduction: Math.round((prevRisk - best.riskAfter) * 10) / 10,
      cumulativeRiskAfter: best.riskAfter,
      cumulativeReductionPercent,
      effort: best.effort,
    });

    prevRisk = best.riskAfter;
  }

  return plan;
}

export function computeZoneRiskMap(
  nodes: NetworkNode[],
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>,
  skillMultiplier = 1.0
): { zone: NetworkZone; risk: number; unpatchedCount: number }[] {
  const zones: NetworkZone[] = [
    'Internet',
    'DMZ',
    'Corporate',
    'Application',
    'Management',
    'Data',
    'Payments',
  ];

  return zones.map((zone) => {
    const zNodes = nodes.filter((n) => n.zone === zone);
    if (zNodes.length === 0) {
      return { zone, risk: 0, unpatchedCount: 0 };
    }

    let weighted = 0;
    let weights = 0;
    let unpatchedCount = 0;

    for (const n of zNodes) {
      const p = getNodeExploitProbability(n, vulns, patchedCveIds, skillMultiplier);
      const unpatchedOnNode = n.cves.filter((c) => !patchedCveIds.has(c)).length;
      unpatchedCount += unpatchedOnNode;
      weighted += p * n.criticality * 10;
      weights += n.criticality;
    }

    const avgRisk = weights > 0 ? Math.min(100, Math.round((weighted / weights) * 10 * 10) / 10) : 0;
    return {
      zone,
      risk: avgRisk,
      unpatchedCount,
    };
  });
}

export function computeSimulationSummary(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vulns: Record<string, Vulnerability>,
  selectedEntry: string,
  selectedTarget: string,
  maxPaths: number,
  simulatedPatched: Set<string>,
  opts?: EngineOptions
): SimulationSummary {
  const emptyPatched = new Set<string>();
  const baselineOpts: EngineOptions = {
    skillMultiplier: opts?.skillMultiplier,
    stealthFactor: opts?.stealthFactor,
  };
  const before = computeOverallRiskScore(nodes, edges, vulns, emptyPatched, baselineOpts);
  const after = computeOverallRiskScore(nodes, edges, vulns, simulatedPatched, opts);

  const pathsBefore = findTopKAttackPaths(
    selectedEntry,
    selectedTarget,
    maxPaths,
    nodes,
    edges,
    vulns,
    emptyPatched,
    baselineOpts
  );
  const pathsAfter = findTopKAttackPaths(
    selectedEntry,
    selectedTarget,
    maxPaths,
    nodes,
    edges,
    vulns,
    simulatedPatched,
    opts
  );

  const zoneBefore = computeZoneRiskMap(nodes, vulns, emptyPatched, opts?.skillMultiplier ?? 1);
  const zoneAfter = computeZoneRiskMap(nodes, vulns, simulatedPatched, opts?.skillMultiplier ?? 1);

  const riskDelta = Math.round((after.overallRisk - before.overallRisk) * 10) / 10;
  const riskReductionPercent =
    before.overallRisk > 0
      ? Math.round(((before.overallRisk - after.overallRisk) / before.overallRisk) * 1000) / 10
      : 0;

  return {
    riskBefore: before.overallRisk,
    riskAfter: after.overallRisk,
    riskDelta,
    riskReductionPercent,
    viablePathsBefore: before.totalExposedPaths,
    viablePathsAfter: after.totalExposedPaths,
    topPathRiskBefore: pathsBefore[0]?.riskScore ?? 0,
    topPathRiskAfter: pathsAfter[0]?.riskScore ?? 0,
    zoneRiskComparison: zoneBefore.map((zb, idx) => ({
      zone: zb.zone,
      before: zb.risk,
      after: zoneAfter[idx]?.risk ?? 0,
    })),
  };
}

/**
 * Computes exposure score (0-100) for every node based on exploit probability,
 * criticality, and choke-point centrality. Used by Heatmap Mode & Asset Inventory.
 */
export function computeNodeExposureMap(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>,
  opts?: EngineOptions
): Map<string, number> {
  const chokePoints = computeChokePoints(nodes, edges, vulns, patchedCveIds, opts);
  const chokeMap = new Map(chokePoints.map((c) => [c.nodeId, c.score]));
  const map = new Map<string, number>();

  for (const n of nodes) {
    if (opts?.isolatedNodeIds?.has(n.id)) {
      map.set(n.id, 0);
      continue;
    }
    const p = getNodeExploitProbability(
      n,
      vulns,
      patchedCveIds,
      opts?.skillMultiplier ?? 1.0
    );
    const chokeBonus = (chokeMap.get(n.id) ?? 0) * 0.25;
    const score = Math.min(
      100,
      Math.round((p * 65 + (n.criticality / 10) * 25 + chokeBonus) * 10) / 10
    );
    map.set(n.id, score);
  }
  return map;
}

/**
 * Module 3: Blast Radius BFS from an origin node with probability threshold (0.05 - 0.80).
 */
export function computeBlastRadius(
  originNodeId: string,
  threshold: number,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>,
  assetValues: Record<number, number>,
  opts?: EngineOptions
): BlastRadiusResult {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const originNode = nodeMap.get(originNodeId);
  if (!originNode || opts?.isolatedNodeIds?.has(originNodeId)) {
    return {
      originNodeId,
      threshold,
      reachableNodes: [],
      crownJewelsExposed: [],
      estimatedExposureUsd: 0,
    };
  }

  const blocked = opts?.blockedEdgeIds ?? new Set<string>();
  const isolated = opts?.isolatedNodeIds ?? new Set<string>();
  const skill = opts?.skillMultiplier ?? 1.0;

  const adj = new Map<string, NetworkEdge[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    if (blocked.has(e.id) || isolated.has(e.source) || isolated.has(e.target)) continue;
    adj.get(e.source)?.push(e);
  }

  const bestProb = new Map<string, number>([[originNodeId, 1.0]]);
  const minDepth = new Map<string, number>([[originNodeId, 0]]);
  const queue: string[] = [originNodeId];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currProb = bestProb.get(curr) ?? 0;
    const currDepth = minDepth.get(curr) ?? 0;

    for (const edge of adj.get(curr) ?? []) {
      const targetNode = nodeMap.get(edge.target);
      if (!targetNode) continue;
      const destP = getNodeExploitProbability(targetNode, vulns, patchedCveIds, skill);
      const nextProb = currProb * edge.reachability * destP;
      if (nextProb >= threshold && nextProb > (bestProb.get(edge.target) ?? 0)) {
        bestProb.set(edge.target, nextProb);
        minDepth.set(edge.target, currDepth + 1);
        queue.push(edge.target);
      }
    }
  }

  const reachableNodes: BlastRadiusNode[] = [];
  const crownJewelsExposed: string[] = [];
  let estimatedExposureUsd = 0;

  for (const [nid, prob] of bestProb.entries()) {
    if (nid === originNodeId) continue;
    const node = nodeMap.get(nid);
    if (!node) continue;
    reachableNodes.push({
      nodeId: nid,
      depth: minDepth.get(nid) ?? 1,
      reachProbability: prob,
    });
    if (node.isCrownJewel) {
      crownJewelsExposed.push(nid);
    }
    const baseVal = assetValues[node.criticality] ?? node.criticality * 1_000_000;
    estimatedExposureUsd += Math.round(baseVal * prob);
  }

  // Include origin asset exposure if not Internet
  if (originNode.id !== 'internet') {
    const originVal = assetValues[originNode.criticality] ?? 500_000;
    estimatedExposureUsd += originVal;
  }

  reachableNodes.sort((a, b) => a.depth - b.depth || b.reachProbability - a.reachProbability);

  return {
    originNodeId,
    threshold,
    reachableNodes,
    crownJewelsExposed,
    estimatedExposureUsd,
  };
}

/**
 * Module 4: Greedy top-3 edge segmentation recommendations ranked by risk reduction.
 */
export function recommendBestSegmentation(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>,
  currentBlockedEdgeIds: Set<string>,
  opts?: EngineOptions
): SegmentationRecommendation[] {
  const baseOpts: EngineOptions = { ...opts, blockedEdgeIds: currentBlockedEdgeIds };
  const base = computeOverallRiskScore(nodes, edges, vulns, patchedCveIds, baseOpts);

  const candidates: SegmentationRecommendation[] = [];
  for (const edge of edges) {
    if (currentBlockedEdgeIds.has(edge.id)) continue;
    const testBlocked = new Set(currentBlockedEdgeIds);
    testBlocked.add(edge.id);
    const next = computeOverallRiskScore(nodes, edges, vulns, patchedCveIds, {
      ...opts,
      blockedEdgeIds: testBlocked,
    });

    const riskReduction = Math.max(0, Math.round((base.overallRisk - next.overallRisk) * 10) / 10);
    const pathsEliminated = Math.max(0, base.totalExposedPaths - next.totalExposedPaths);

    if (riskReduction > 0 || pathsEliminated > 0) {
      candidates.push({
        edgeId: edge.id,
        sourceId: edge.source,
        targetId: edge.target,
        protocol: edge.protocol,
        port: edge.port,
        riskBefore: base.overallRisk,
        riskAfter: next.overallRisk,
        riskReduction,
        pathsEliminated,
      });
    }
  }

  return candidates
    .sort((a, b) => b.riskReduction - a.riskReduction || b.pathsEliminated - a.pathsEliminated)
    .slice(0, 3);
}

/**
 * Module 5: Combined Remediation Planner (greedy knapsack across patches & segmentation within hour budget).
 */
export function computeCombinedRemediationRoadmap(
  budgetHours: number,
  downtimeTolerance: RemediationEffort,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>,
  blockedEdgeIds: Set<string>,
  opts?: EngineOptions
): RemediationRoadmap {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const maxDowntimeRank = DOWNTIME_RANK[downtimeTolerance];
  const baseRisk = computeOverallRiskScore(nodes, edges, vulns, patchedCveIds, {
    ...opts,
    blockedEdgeIds,
  }).overallRisk;

  const patchImpacts = rankCvesByRiskReduction(nodes, edges, vulns, patchedCveIds, {
    ...opts,
    blockedEdgeIds,
  });

  const segRecs = recommendBestSegmentation(
    nodes,
    edges,
    vulns,
    patchedCveIds,
    blockedEdgeIds,
    opts
  );

  type RawItem = Omit<RemediationRoadmapItem, 'phase'>;
  const pool: RawItem[] = [];

  for (const p of patchImpacts) {
    const v = vulns[p.cveId];
    if (!v || p.riskReduction <= 0) continue;
    if (DOWNTIME_RANK[v.remediationEffort] > maxDowntimeRank) continue;
    const hours = EFFORT_HOURS_MAP[v.remediationEffort];
    pool.push({
      id: `patch-${p.cveId}`,
      kind: 'patch',
      title: `Patch ${p.cveId}`,
      subtitle: `${v.software} (${p.affectedNodeIds
        .map((id) => nodeMap.get(id)?.shortLabel ?? id)
        .join(', ')})`,
      effortHours: hours,
      downtime: v.remediationEffort,
      riskReduction: p.riskReduction,
      cveId: p.cveId,
    });
  }

  for (const seg of segRecs) {
    const src = nodeMap.get(seg.sourceId)?.shortLabel ?? seg.sourceId;
    const tgt = nodeMap.get(seg.targetId)?.shortLabel ?? seg.targetId;
    pool.push({
      id: `seg-${seg.edgeId}`,
      kind: 'segmentation',
      title: `Block ${src} → ${tgt}`,
      subtitle: `Firewall rule on ${seg.protocol}/${seg.port} (-${seg.pathsEliminated} paths)`,
      effortHours: 3,
      downtime: 'Low',
      riskReduction: seg.riskReduction,
      edgeIds: [seg.edgeId],
    });
  }

  // Greedy knapsack by riskReduction / effortHours
  pool.sort(
    (a, b) => b.riskReduction / Math.max(1, b.effortHours) - a.riskReduction / Math.max(1, a.effortHours)
  );

  const selected: RemediationRoadmapItem[] = [];
  let usedHours = 0;

  for (const item of pool) {
    if (usedHours + item.effortHours > budgetHours) continue;
    usedHours += item.effortHours;
    const phase: RemediationRoadmapItem['phase'] =
      item.effortHours <= 4
        ? 'Immediate 24h'
        : item.effortHours <= 12
          ? 'This Week'
          : 'This Month';
    selected.push({ ...item, phase });
    if (selected.length >= 9) break;
  }

  return recalculateRoadmapCurve(
    selected,
    nodes,
    edges,
    vulns,
    patchedCveIds,
    blockedEdgeIds,
    opts
  );
}

export function recalculateRoadmapCurve(
  items: RemediationRoadmapItem[],
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vulns: Record<string, Vulnerability>,
  initialPatched: Set<string>,
  initialBlocked: Set<string>,
  opts?: EngineOptions
): RemediationRoadmap {
  const workingPatched = new Set(initialPatched);
  const workingBlocked = new Set(initialBlocked);

  const riskBefore = computeOverallRiskScore(nodes, edges, vulns, workingPatched, {
    ...opts,
    blockedEdgeIds: workingBlocked,
  }).overallRisk;

  const curve: { label: string; risk: number }[] = [{ label: 'Baseline', risk: riskBefore }];
  let totalHours = 0;

  items.forEach((item, idx) => {
    totalHours += item.effortHours;
    if (item.kind === 'patch' && item.cveId) {
      workingPatched.add(item.cveId);
    } else if (item.kind === 'segmentation' && item.edgeIds) {
      for (const eId of item.edgeIds) workingBlocked.add(eId);
    }

    const r = computeOverallRiskScore(nodes, edges, vulns, workingPatched, {
      ...opts,
      blockedEdgeIds: workingBlocked,
    }).overallRisk;

    curve.push({
      label: `Step ${idx + 1}`,
      risk: r,
    });
  });

  const riskAfter = curve[curve.length - 1]?.risk ?? riskBefore;
  const totalReductionPercent =
    riskBefore > 0
      ? Math.round(((riskBefore - riskAfter) / riskBefore) * 1000) / 10
      : 0;

  return {
    items,
    totalHours,
    riskBefore,
    riskAfter,
    totalReductionPercent,
    curve,
  };
}

/**
 * Module 6: Live compliance evaluation against twin topology, unpatched CVEs, and segmentation.
 */
export function evaluateComplianceFramework(
  frameworkId: ComplianceFrameworkId,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>,
  blockedEdgeIds: Set<string>,
  isolatedNodeIds: Set<string>
): ComplianceFrameworkResult {
  const controls = COMPLIANCE_CONTROLS[frameworkId];
  const meta = COMPLIANCE_FRAMEWORK_META[frameworkId];

  const isNodePatchedOrClean = (n: NetworkNode) =>
    isolatedNodeIds.has(n.id) ||
    n.cves.filter((c) => !patchedCveIds.has(c)).length === 0;

  const unpatchedCriticalOn = (filterFn: (n: NetworkNode) => boolean) =>
    nodes
      .filter(filterFn)
      .filter(
        (n) =>
          !isolatedNodeIds.has(n.id) &&
          n.cves.some(
            (c) => !patchedCveIds.has(c) && (vulns[c]?.cvss ?? 0) >= 9.0
          )
      )
      .map((n) => n.id);

  const unpatchedAnyOn = (filterFn: (n: NetworkNode) => boolean) =>
    nodes
      .filter(filterFn)
      .filter(
        (n) =>
          !isolatedNodeIds.has(n.id) &&
          n.cves.some((c) => !patchedCveIds.has(c))
      )
      .map((n) => n.id);

  const evaluated: EvaluatedControl[] = controls.map((control) => {
    let status: ComplianceStatus = 'Compliant';
    let affectedNodeIds: string[] = [];

    if (control.category === 'vulnerability') {
      const critAssets = unpatchedCriticalOn(
        (n) => n.zone === 'Payments' || n.zone === 'Data' || n.zone === 'Application'
      );
      const anyAssets = unpatchedAnyOn(
        (n) => n.zone === 'Corporate' || n.zone === 'Application' || n.zone === 'Payments'
      );
      if (critAssets.length > 0) {
        status = 'Gap';
        affectedNodeIds = critAssets;
      } else if (anyAssets.length > 0) {
        status = 'Partial';
        affectedNodeIds = anyAssets;
      }
    } else if (control.category === 'segmentation') {
      // Check key cross-zone bridges
      const sensitiveEdges = ['e17', 'e18', 'e23', 'e24', 'e29', 'e31', 'e47'];
      const openSensitive = sensitiveEdges.filter((eid) => {
        const edge = edges.find((e) => e.id === eid);
        if (!edge) return false;
        return (
          !blockedEdgeIds.has(eid) &&
          !isolatedNodeIds.has(edge.source) &&
          !isolatedNodeIds.has(edge.target)
        );
      });

      if (openSensitive.length >= 4) {
        status = 'Gap';
      } else if (openSensitive.length >= 1) {
        status = 'Partial';
      }
      affectedNodeIds = Array.from(
        new Set(
          openSensitive
            .map((eid) => edges.find((e) => e.id === eid)?.target)
            .filter((x): x is string => Boolean(x))
        )
      );
    } else if (control.category === 'identity') {
      const idAssets = unpatchedAnyOn((n) => n.id === 'ad-dc' || n.id === 'jump-server');
      if (idAssets.includes('ad-dc')) {
        status = 'Gap';
        affectedNodeIds = idAssets;
      } else if (idAssets.length > 0) {
        status = 'Partial';
        affectedNodeIds = idAssets;
      }
    } else if (control.category === 'monitoring') {
      const siem = nodes.find((n) => n.id === 'siem-soc');
      if (siem && !isNodePatchedOrClean(siem)) {
        const hasCrit = siem.cves.some(
          (c) => !patchedCveIds.has(c) && (vulns[c]?.cvss ?? 0) >= 9.0
        );
        status = hasCrit ? 'Gap' : 'Partial';
        affectedNodeIds = ['siem-soc'];
      }
    } else if (control.category === 'backup') {
      const backup = nodes.find((n) => n.id === 'backup-srv');
      if (backup && !isNodePatchedOrClean(backup)) {
        status = 'Gap';
        affectedNodeIds = ['backup-srv'];
      }
    } else if (control.category === 'edge') {
      const edgeNodes = unpatchedCriticalOn(
        (n) => n.zone === 'DMZ' || n.type === 'vpn' || n.type === 'firewall' || n.type === 'waf'
      );
      if (edgeNodes.length >= 2) {
        status = 'Gap';
        affectedNodeIds = edgeNodes;
      } else if (edgeNodes.length === 1) {
        status = 'Partial';
        affectedNodeIds = edgeNodes;
      }
    }

    return {
      control,
      status,
      affectedNodeIds,
    };
  });

  const compliantCount = evaluated.filter((c) => c.status === 'Compliant').length;
  const partialCount = evaluated.filter((c) => c.status === 'Partial').length;
  const gapCount = evaluated.filter((c) => c.status === 'Gap').length;

  const score =
    evaluated.length > 0
      ? Math.round(((compliantCount + partialCount * 0.5) / evaluated.length) * 100)
      : 100;

  return {
    id: frameworkId,
    name: meta.name,
    shortName: meta.shortName,
    score,
    compliantCount,
    partialCount,
    gapCount,
    controls: evaluated,
  };
}

/**
 * Module 14: FAIR-inspired Cyber Risk Quantification in USD.
 */
export function computeCyberRiskQuantification(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>,
  assetValues: Record<number, number>,
  opts?: EngineOptions
): CyberRiskQuantification {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const baselineOpts: EngineOptions = { skillMultiplier: opts?.skillMultiplier };

  let expectedBefore = 0;
  let expectedAfter = 0;
  const topDrivers: { nodeId: string; label: string; exposureUsd: number; breachProb: number }[] =
    [];

  for (const target of TARGET_CROWN_JEWELS) {
    const node = nodeMap.get(target.id);
    if (!node) continue;
    const val = assetValues[node.criticality] ?? node.criticality * 3_000_000;

    let maxBefore = 0;
    let maxAfter = 0;
    for (const entry of ENTRY_POINTS) {
      const pBefore = findTopKAttackPaths(
        entry.id,
        target.id,
        1,
        nodes,
        edges,
        vulns,
        new Set(),
        baselineOpts
      )[0];
      const pAfter = findTopKAttackPaths(
        entry.id,
        target.id,
        1,
        nodes,
        edges,
        vulns,
        patchedCveIds,
        opts
      )[0];

      if (pBefore && pBefore.likelihood > maxBefore) maxBefore = pBefore.likelihood;
      if (pAfter && pAfter.likelihood > maxAfter) maxAfter = pAfter.likelihood;
    }

    expectedBefore += val * maxBefore;
    const afterExposure = val * maxAfter;
    expectedAfter += afterExposure;

    topDrivers.push({
      nodeId: node.id,
      label: node.shortLabel,
      exposureUsd: Math.round(afterExposure),
      breachProb: maxAfter,
    });
  }

  topDrivers.sort((a, b) => b.exposureUsd - a.exposureUsd);

  return {
    lowUsd: Math.round(expectedAfter * 0.45),
    expectedUsd: Math.round(expectedAfter),
    highUsd: Math.round(expectedAfter * 1.85),
    annualizedLossBeforeUsd: Math.round(expectedBefore),
    annualizedLossAfterUsd: Math.round(expectedAfter),
    topDrivers,
  };
}

/**
 * Module 12: Automatically derives actionable security alerts from twin state.
 */
export function deriveAlertsFromState(
  overallRisk: number,
  riskThreshold: number,
  topPath: AttackPath | null,
  chokePoints: ChokePoint[],
  pciResult: ComplianceFrameworkResult,
  nodeMap: Map<string, NetworkNode>,
  injectedZeroDays: string[]
): AlertItem[] {
  const alerts: AlertItem[] = [];

  for (const cveId of injectedZeroDays) {
    alerts.push({
      id: `zd-${cveId}`,
      severity: 'Critical',
      title: `Simulated Zero-Day Active: ${cveId}`,
      description: 'Newly injected CVSS 9.8 exploit detected on internet-facing perimeter.',
      timeAgo: 'Just now',
      targetView: 'command-center',
    });
  }

  if (overallRisk > riskThreshold) {
    alerts.push({
      id: 'threshold-exceeded',
      severity: 'Critical',
      title: `Risk Threshold Exceeded (${overallRisk.toFixed(1)} > ${riskThreshold})`,
      description: 'Weighted crown-jewel risk exceeds configured organizational tolerance.',
      timeAgo: 'Live',
      targetView: 'command-center',
    });
  }

  if (topPath && topPath.riskScore >= 40) {
    const targetLabel =
      nodeMap.get(topPath.nodes[topPath.nodes.length - 1])?.shortLabel ?? 'Target';
    alerts.push({
      id: `path-${topPath.id}`,
      severity: topPath.riskScore >= 70 ? 'Critical' : 'High',
      title: `High-Risk Path to ${targetLabel} (${topPath.riskScore.toFixed(1)}/100)`,
      description: `Weakest link ${topPath.weakestLinkCve} across ${topPath.hops} hops.`,
      timeAgo: '2m ago',
      targetView: 'command-center',
      targetNodeId: topPath.weakestLinkNode,
    });
  }

  if (chokePoints[0]) {
    const cpNode = nodeMap.get(chokePoints[0].nodeId);
    alerts.push({
      id: `choke-${chokePoints[0].nodeId}`,
      severity: 'High',
      title: `Primary Choke Point: ${cpNode?.shortLabel ?? chokePoints[0].nodeId}`,
      description: `${chokePoints[0].pathCount} crown-jewel attack paths traverse this asset.`,
      timeAgo: '5m ago',
      targetView: 'command-center',
      targetNodeId: chokePoints[0].nodeId,
    });
  }

  if (pciResult.gapCount > 0) {
    alerts.push({
      id: 'compliance-gap',
      severity: 'Medium',
      title: `${pciResult.gapCount} PCI DSS 4.0 Control Gaps`,
      description: `Compliance readiness currently ${pciResult.score}%. Review failing controls.`,
      timeAgo: '12m ago',
      targetView: 'compliance',
    });
  }

  return alerts;
}
