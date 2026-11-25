import { TARGET_CROWN_JEWELS } from '../data/bankNetwork';
import {
  MonteCarloResult,
  NetworkEdge,
  NetworkNode,
  SampledAttackLog,
  Vulnerability,
} from '../types/network';
import { getNodeExploitProbability } from './attackPathEngine';

function buildAdjacency(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  blockedEdgeIds: Set<string>,
  isolatedNodeIds: Set<string>
): { nodeMap: Map<string, NetworkNode>; adj: Map<string, NetworkEdge[]> } {
  const nodeMap = new Map<string, NetworkNode>();
  const adj = new Map<string, NetworkEdge[]>();

  for (const n of nodes) {
    if (isolatedNodeIds.has(n.id)) continue;
    nodeMap.set(n.id, n);
    adj.set(n.id, []);
  }

  for (const e of edges) {
    if (blockedEdgeIds.has(e.id)) continue;
    if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
      adj.get(e.source)!.push(e);
    }
  }

  return { nodeMap, adj };
}

/**
 * Runs 1,000 chunked async Monte Carlo attack simulations from selectedEntry
 * toward all crown-jewel assets so the UI remains 60fps responsive.
 */
export async function runMonteCarloSimulation(
  selectedEntry: string,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>,
  blockedEdgeIds: Set<string>,
  isolatedNodeIds: Set<string>,
  skillMultiplier: number,
  iterations = 1000,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal
): Promise<MonteCarloResult> {
  const startTime = performance.now();
  const { nodeMap, adj } = buildAdjacency(
    nodes,
    edges,
    blockedEdgeIds,
    isolatedNodeIds
  );

  const nodeProbs = new Map<string, number>();
  for (const [id, n] of nodeMap.entries()) {
    nodeProbs.set(id, getNodeExploitProbability(n, vulns, patchedCveIds, skillMultiplier));
  }

  const jewelIds = new Set(TARGET_CROWN_JEWELS.map((t) => t.id));
  const jewelBreaches = new Map<string, number>();
  for (const t of TARGET_CROWN_JEWELS) jewelBreaches.set(t.id, 0);

  const pathCounts = new Map<string, { nodes: string[]; count: number }>();
  const hopCounts = new Map<number, number>();
  let totalHours = 0;
  let totalSuccessfulRuns = 0;

  const batchSize = 100;
  for (let start = 0; start < iterations; start += batchSize) {
    if (signal?.aborted) break;
    const end = Math.min(iterations, start + batchSize);

    for (let iter = start; iter < end; iter++) {
      // Simulate an adaptive BFS/random-walk adversary attempt from selectedEntry
      const visited = new Set<string>([selectedEntry]);
      const parent = new Map<string, string>();
      const queue: { id: string; depth: number; hours: number }[] = [
        { id: selectedEntry, depth: 0, hours: 0 },
      ];
      const breachedThisRun = new Set<string>();
      let firstJewelPath: string[] | null = null;
      let firstJewelHours = 0;

      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (curr.depth >= 7) continue;

        const outEdges = adj.get(curr.id) ?? [];
        // Shuffle outgoing edges lightly for stochastic traversal
        for (const edge of outEdges) {
          if (visited.has(edge.target)) continue;
          const destProb = nodeProbs.get(edge.target) ?? 0.05;
          const stepProb = Math.min(0.98, edge.reachability * destProb);

          if (Math.random() <= stepProb) {
            visited.add(edge.target);
            parent.set(edge.target, curr.id);
            const hopHours = Math.max(0.4, (1 - stepProb) * 14 + 0.8);
            const nextHours = curr.hours + hopHours;

            if (jewelIds.has(edge.target)) {
              breachedThisRun.add(edge.target);
              if (!firstJewelPath) {
                const chain: string[] = [];
                let p: string | undefined = edge.target;
                while (p) {
                  chain.unshift(p);
                  p = parent.get(p);
                }
                firstJewelPath = chain;
                firstJewelHours = nextHours;
              }
            }
            queue.push({ id: edge.target, depth: curr.depth + 1, hours: nextHours });
          }
        }
      }

      for (const jId of breachedThisRun) {
        jewelBreaches.set(jId, (jewelBreaches.get(jId) ?? 0) + 1);
      }

      if (firstJewelPath) {
        totalSuccessfulRuns++;
        totalHours += firstJewelHours;
        const hops = Math.max(1, firstJewelPath.length - 1);
        hopCounts.set(hops, (hopCounts.get(hops) ?? 0) + 1);

        const key = firstJewelPath.join('>');
        const existing = pathCounts.get(key);
        if (existing) existing.count++;
        else pathCounts.set(key, { nodes: firstJewelPath, count: 1 });
      }
    }

    onProgress?.(Math.round((end / iterations) * 100));
    // Yield to browser event loop
    await new Promise((r) => setTimeout(r, 0));
  }

  let mostFrequentPath: MonteCarloResult['mostFrequentPath'] = null;
  for (const entry of pathCounts.values()) {
    if (!mostFrequentPath || entry.count > mostFrequentPath.count) {
      mostFrequentPath = {
        nodes: entry.nodes,
        count: entry.count,
        sharePct:
          totalSuccessfulRuns > 0
            ? Math.round((entry.count / totalSuccessfulRuns) * 1000) / 10
            : 0,
      };
    }
  }

  const crownJewelBreachProb = TARGET_CROWN_JEWELS.map((t) => {
    const breaches = jewelBreaches.get(t.id) ?? 0;
    return {
      nodeId: t.id,
      label: nodeMap.get(t.id)?.shortLabel ?? t.label,
      breaches,
      probabilityPct: Math.round((breaches / iterations) * 1000) / 10,
    };
  }).sort((a, b) => b.probabilityPct - a.probabilityPct);

  const hopHistogram = [2, 3, 4, 5, 6, 7].map((h) => ({
    hops: `${h} hops`,
    count: hopCounts.get(h) ?? 0,
  }));

  return {
    iterations,
    durationMs: Math.round(performance.now() - startTime),
    crownJewelBreachProb,
    avgTimeToCompromiseHours:
      totalSuccessfulRuns > 0
        ? Math.round((totalHours / totalSuccessfulRuns) * 10) / 10
        : 0,
    mostFrequentPath,
    hopHistogram,
  };
}

/**
 * Samples a single stochastic adversary attempt with step-by-step roll log for replay.
 */
export function sampleSingleAttack(
  selectedEntry: string,
  preferredTargetId: string,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vulns: Record<string, Vulnerability>,
  patchedCveIds: Set<string>,
  blockedEdgeIds: Set<string>,
  isolatedNodeIds: Set<string>,
  skillMultiplier: number
): SampledAttackLog {
  const { nodeMap, adj } = buildAdjacency(
    nodes,
    edges,
    blockedEdgeIds,
    isolatedNodeIds
  );

  const visited = new Set<string>([selectedEntry]);
  const pathNodes = [selectedEntry];
  const pathEdges: string[] = [];
  const steps: SampledAttackLog['steps'] = [];

  let curr = selectedEntry;
  let succeeded = false;

  for (let i = 0; i < 6; i++) {
    const out = (adj.get(curr) ?? []).filter((e) => !visited.has(e.target));
    if (out.length === 0) break;

    // Bias slightly toward edges closer to crown jewels or target
    const chosen =
      out.find((e) => e.target === preferredTargetId) ??
      out[Math.floor(Math.random() * out.length)];

    const destNode = nodeMap.get(chosen.target);
    if (!destNode) break;

    const pDest = getNodeExploitProbability(
      destNode,
      vulns,
      patchedCveIds,
      skillMultiplier
    );
    const pSuccess = Math.min(0.98, chosen.reachability * pDest);
    const roll = Math.random();
    const ok = roll <= pSuccess;

    steps.push({
      step: i + 1,
      fromLabel: nodeMap.get(curr)?.shortLabel ?? curr,
      toLabel: destNode.shortLabel,
      protocol: chosen.protocol,
      port: chosen.port,
      pSuccess,
      roll,
      outcome: ok ? 'Compromised' : 'Blocked',
    });

    if (!ok) {
      break;
    }

    visited.add(chosen.target);
    pathNodes.push(chosen.target);
    pathEdges.push(chosen.id);
    curr = chosen.target;

    if (destNode.isCrownJewel || chosen.target === preferredTargetId) {
      succeeded = true;
      break;
    }
  }

  return {
    nodes: pathNodes,
    edges: pathEdges,
    succeeded,
    targetId: curr,
    steps,
  };
}
