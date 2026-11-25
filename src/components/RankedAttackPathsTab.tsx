import React from 'react';
import { ChevronRight, Pause, Play, ShieldCheck } from 'lucide-react';
import { AttackPath, NetworkNode, Vulnerability } from '../types/network';

interface RankedAttackPathsTabProps {
  paths: AttackPath[];
  nodeMap: Map<string, NetworkNode>;
  vulns: Record<string, Vulnerability>;
  selectedPathId: string | null;
  playingPathId: string | null;
  onSelectAndPlayPath: (pathId: string) => void;
  onTogglePlayPath: (pathId: string) => void;
}

export const RankedAttackPathsTab: React.FC<RankedAttackPathsTabProps> = ({
  paths,
  nodeMap,
  vulns,
  selectedPathId,
  playingPathId,
  onSelectAndPlayPath,
  onTogglePlayPath,
}) => {
  if (paths.length === 0) {
    return (
      <div className="bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-8 text-center">
        <ShieldCheck className="w-8 h-8 text-[#5E8C61] mx-auto mb-2" aria-hidden="true" />
        <h3 className="font-display text-base font-bold text-[#0B1F3A]">
          No Viable Attack Paths Found
        </h3>
        <p className="text-xs text-[#0B1F3A]/70 mt-1 max-w-md mx-auto">
          The current zone filter configuration prevents traversal between the selected entry
          point and crown-jewel target. Enable additional zones to inspect paths.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-[#FAF7F0] border border-[#E6D49A] rounded-xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#F1ECDD] border-b border-[#E6D49A] text-[11px] font-semibold uppercase tracking-wider text-[#0B1F3A]/80">
            <th className="py-3 px-4 w-14">Rank</th>
            <th className="py-3 px-4">Attack Path</th>
            <th className="py-3 px-3 text-right w-16">Hops</th>
            <th className="py-3 px-3 text-right w-24">Likelihood</th>
            <th className="py-3 px-3 text-right w-24">Risk Score</th>
            <th className="py-3 px-4 w-44">Weakest Link</th>
            <th className="py-3 px-4">MITRE ATT&amp;CK Tactic Chain</th>
            <th className="py-3 px-4 text-right w-24">Playback</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E6D49A]/55 text-xs">
          {paths.map((path, idx) => {
            const isSelected = path.id === selectedPathId;
            const isPlaying = path.id === playingPathId;
            const weakestVuln = vulns[path.weakestLinkCve];
            const riskColor =
              path.riskScore >= 70
                ? 'text-[#B3261E]'
                : path.riskScore >= 40
                  ? 'text-[#D9822B]'
                  : path.riskScore >= 15
                    ? 'text-[#9A7A14]'
                    : 'text-[#5E8C61]';

            return (
              <tr
                key={path.id}
                onClick={() => onSelectAndPlayPath(path.id)}
                className={`cursor-pointer transition-colors duration-150 ${
                  isSelected
                    ? 'bg-[#C9A227]/15'
                    : 'hover:bg-[#F1ECDD]/70'
                }`}
              >
                <td className="py-3 px-4 font-mono tabular-nums font-bold text-[#0B1F3A]">
                  #{idx + 1}
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap items-center gap-1">
                    {path.nodes.map((nid, nIdx) => {
                      const label = nodeMap.get(nid)?.shortLabel ?? nid;
                      const isWeakest = nid === path.weakestLinkNode;
                      return (
                        <React.Fragment key={`${path.id}-${nid}-${nIdx}`}>
                          <span
                            className={`text-xs ${
                              isWeakest
                                ? 'font-semibold text-[#B3261E] underline decoration-[#B3261E]/40 underline-offset-2'
                                : nIdx === 0 || nIdx === path.nodes.length - 1
                                  ? 'font-semibold text-[#0B1F3A]'
                                  : 'text-[#0B1F3A]/85'
                            }`}
                          >
                            {label}
                          </span>
                          {nIdx < path.nodes.length - 1 && (
                            <ChevronRight
                              className="w-3.5 h-3.5 text-[#C9A227] shrink-0"
                              aria-hidden="true"
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-[#0B1F3A]">
                  {path.hops}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-[#0B1F3A]">
                  {(path.likelihood * 100).toFixed(2)}%
                </td>
                <td className={`py-3 px-3 text-right font-mono tabular-nums font-bold ${riskColor}`}>
                  {path.riskScore.toFixed(1)}
                </td>
                <td className="py-3 px-4">
                  <div className="font-mono tabular-nums font-semibold text-[#0B1F3A]">
                    {path.weakestLinkCve}
                  </div>
                  {weakestVuln && (
                    <div className="text-[11px] text-[#0B1F3A]/65 font-mono tabular-nums">
                      CVSS {weakestVuln.cvss.toFixed(1)} ·{' '}
                      {nodeMap.get(path.weakestLinkNode)?.shortLabel}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-[11px] text-[#0B1F3A]/80">
                  {path.mitreTactics.join(' › ')}
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePlayPath(path.id);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] ${
                      isPlaying
                        ? 'bg-[#C9A227] text-[#0B1F3A]'
                        : 'bg-[#0B1F3A] text-[#FAF7F0] hover:bg-[#1B3358]'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3 h-3" aria-hidden="true" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" aria-hidden="true" />
                        <span>Play</span>
                      </>
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
