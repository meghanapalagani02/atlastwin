import React, { useMemo, useState } from 'react';
import { Filter, ShieldAlert, X } from 'lucide-react';
import { useTwin } from '../context/TwinContext';
import { MITRE_MATRIX_DATA } from '../data/securityFrameworks';
import { AttackPath, MitreTechnique, NetworkNode } from '../types/network';

export function doesPathMatchTechnique(
  path: AttackPath,
  technique: MitreTechnique,
  nodeMap: Map<string, NetworkNode>
): boolean {
  const tacticMatch = path.mitreTactics.some((t) =>
    technique.matchTactics.includes(t)
  );
  if (!tacticMatch) return false;

  const pathNodes = path.nodes
    .map((id) => nodeMap.get(id))
    .filter((n): n is NetworkNode => Boolean(n));

  if (technique.matchNodeTypes && technique.matchNodeTypes.length > 0) {
    if (!pathNodes.some((n) => technique.matchNodeTypes!.includes(n.type))) {
      return false;
    }
  }

  if (technique.matchZones && technique.matchZones.length > 0) {
    if (!pathNodes.some((n) => technique.matchZones!.includes(n.zone))) {
      return false;
    }
  }

  return true;
}

export const MitreMatrixPanel: React.FC = () => {
  const {
    attackPaths,
    nodeMap,
    mitreFilterTechniqueId,
    setMitreFilterTechniqueId,
  } = useTwin();

  const [hoveredTech, setHoveredTech] = useState<{
    tech: MitreTechnique;
    tactic: string;
    matchingPaths: AttackPath[];
    matchingNodes: string[];
  } | null>(null);

  const techniqueHits = useMemo(() => {
    const map = new Map<
      string,
      { count: number; matchingPaths: AttackPath[]; matchingNodes: string[] }
    >();

    for (const col of MITRE_MATRIX_DATA) {
      for (const tech of col.techniques) {
        const matchingPaths = attackPaths.filter((p) =>
          doesPathMatchTechnique(p, tech, nodeMap)
        );
        const nodeSet = new Set<string>();
        for (const p of matchingPaths) {
          for (const nid of p.nodes) {
            const node = nodeMap.get(nid);
            if (!node) continue;
            const typeOk =
              !tech.matchNodeTypes || tech.matchNodeTypes.includes(node.type);
            const zoneOk =
              !tech.matchZones || tech.matchZones.includes(node.zone);
            if (typeOk && zoneOk) {
              nodeSet.add(node.shortLabel);
            }
          }
        }
        map.set(tech.id, {
          count: matchingPaths.length,
          matchingPaths,
          matchingNodes: Array.from(nodeSet),
        });
      }
    }
    return map;
  }, [attackPaths, nodeMap]);

  const maxHits = useMemo(() => {
    let m = 1;
    for (const v of techniqueHits.values()) {
      if (v.count > m) m = v.count;
    }
    return m;
  }, [techniqueHits]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-[#0B1F3A]">
            MITRE ATT&amp;CK Enterprise Matrix Coverage
          </h3>
          <p className="text-xs text-[#0B1F3A]/75">
            Heatmap intensity reflects active attack paths traversing each technique. Click any cell to filter graph paths.
          </p>
        </div>

        {mitreFilterTechniqueId && (
          <button
            type="button"
            onClick={() => setMitreFilterTechniqueId(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227] text-xs font-mono cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
            <span>Filtering: {mitreFilterTechniqueId}</span>
            <X className="w-3.5 h-3.5 text-[#E6D49A]" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* 12-Column Tactic Matrix */}
      <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-12 gap-1.5 min-w-[1100px]">
          {MITRE_MATRIX_DATA.map((col) => (
            <div
              key={col.tactic}
              className="bg-[#FAF7F0] border border-[#E6D49A] rounded-lg overflow-hidden flex flex-col"
            >
              <div className="bg-[#0B1F3A] text-[#E6D49A] px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-center border-b border-[#C9A227]/40 truncate">
                {col.tactic}
              </div>
              <div className="p-1.5 space-y-1.5 flex-1">
                {col.techniques.map((tech) => {
                  const hit = techniqueHits.get(tech.id) ?? {
                    count: 0,
                    matchingPaths: [],
                    matchingNodes: [],
                  };
                  const ratio = hit.count / maxHits;
                  const isActiveFilter = mitreFilterTechniqueId === tech.id;

                  let bgStyle = '#F1ECDD';
                  let textColor = '#0B1F3A';
                  if (hit.count > 0) {
                    if (ratio >= 0.75) {
                      bgStyle = '#C9A227';
                      textColor = '#0B1F3A';
                    } else if (ratio >= 0.4) {
                      bgStyle = 'rgba(201, 162, 39, 0.55)';
                      textColor = '#0B1F3A';
                    } else {
                      bgStyle = 'rgba(201, 162, 39, 0.25)';
                      textColor = '#0B1F3A';
                    }
                  }

                  return (
                    <button
                      key={tech.id}
                      type="button"
                      onClick={() =>
                        setMitreFilterTechniqueId(isActiveFilter ? null : tech.id)
                      }
                      onMouseEnter={() =>
                        setHoveredTech({
                          tech,
                          tactic: col.tactic,
                          matchingPaths: hit.matchingPaths,
                          matchingNodes: hit.matchingNodes,
                        })
                      }
                      style={{ backgroundColor: bgStyle, color: textColor }}
                      className={`w-full text-left p-2 rounded border transition-all cursor-pointer ${
                        isActiveFilter
                          ? 'border-[#0B1F3A] ring-2 ring-[#C9A227]'
                          : 'border-[#E6D49A]/80 hover:border-[#0B1F3A]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 font-mono text-[9px] font-bold">
                        <span>{tech.id}</span>
                        <span>{hit.count}</span>
                      </div>
                      <div className="mt-0.5 text-[10px] font-medium leading-tight line-clamp-2">
                        {tech.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Technique Inspector Strip */}
      <div className="bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227]/45 rounded-xl p-4">
        {hoveredTech ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start text-xs">
            <div>
              <div className="font-mono text-[11px] text-[#C9A227]">
                {hoveredTech.tactic} · {hoveredTech.tech.id}
              </div>
              <div className="font-display text-sm font-bold mt-0.5">
                {hoveredTech.tech.name}
              </div>
              <div className="text-[11px] text-[#FAF7F0]/75 mt-1">
                Active Paths Matched:{' '}
                <strong className="font-mono text-[#E6D49A]">
                  {hoveredTech.matchingPaths.length}
                </strong>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#E6D49A] font-semibold">
                Exposed Twin Assets
              </div>
              <div className="mt-1 text-xs text-[#FAF7F0]/90">
                {hoveredTech.matchingNodes.length > 0
                  ? hoveredTech.matchingNodes.join(', ')
                  : 'No active attack paths currently traverse this technique.'}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#E6D49A] font-semibold">
                <ShieldAlert className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
                <span>Recommended Mitigation</span>
              </div>
              <p className="mt-1 text-xs text-[#FAF7F0]/85 leading-relaxed">
                {hoveredTech.tech.mitigation}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#E6D49A]/85">
            Hover over any MITRE ATT&amp;CK technique cell to inspect matching digital-twin nodes and mitigations, or click a cell to highlight matching attack paths on the topology.
          </div>
        )}
      </div>
    </div>
  );
};
