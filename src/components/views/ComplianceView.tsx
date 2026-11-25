import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useTwin } from '../../context/TwinContext';
import { COMPLIANCE_FRAMEWORK_META } from '../../data/securityFrameworks';
import { ComplianceFrameworkId } from '../../types/network';

const FRAMEWORKS: ComplianceFrameworkId[] = ['pci-dss', 'rbi', 'iso-27001', 'nist-csf'];

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#5E8C61' : score >= 55 ? '#C9A227' : '#B3261E';

  return (
    <div className="relative w-[112px] h-[112px] flex items-center justify-center shrink-0">
      <svg width="112" height="112" viewBox="0 0 112 112">
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke="#E6D49A"
          strokeOpacity="0.35"
          strokeWidth="10"
        />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 56 56)"
          style={{ transition: 'stroke-dashoffset 450ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono tabular-nums text-2xl font-bold text-[#0B1F3A]">
          {score}%
        </span>
        <span className="text-[10px] uppercase tracking-wider text-[#0B1F3A]/65">
          Score
        </span>
      </div>
    </div>
  );
};

export const ComplianceView: React.FC = () => {
  const { complianceResults, nodeMap, setActiveView, flyToNode } = useTwin();
  const [selectedFramework, setSelectedFramework] =
    useState<ComplianceFrameworkId>('pci-dss');

  const current = complianceResults[selectedFramework];

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-5">
      <div className="bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227]/45 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#E6D49A]">
            Continuous Regulatory Assurance
          </div>
          <h1 className="font-display text-2xl font-bold mt-0.5">
            Banking Compliance Mapping
          </h1>
          <p className="text-xs text-[#FAF7F0]/75 mt-1 max-w-2xl">
            Controls are automatically evaluated against your live digital-twin vulnerabilities, perimeter hardening, and firewall segmentation rules.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {FRAMEWORKS.map((fid) => {
            const res = complianceResults[fid];
            const active = fid === selectedFramework;
            return (
              <button
                key={fid}
                type="button"
                onClick={() => setSelectedFramework(fid)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                  active
                    ? 'bg-[#C9A227] text-[#0B1F3A] border-[#C9A227]'
                    : 'bg-[#1B3358] text-[#FAF7F0] border-[#C9A227]/35 hover:border-[#C9A227]'
                }`}
              >
                <span>{COMPLIANCE_FRAMEWORK_META[fid].shortName}</span>
                <span
                  className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                    active ? 'bg-[#0B1F3A] text-[#FAF7F0]' : 'bg-[#0B1F3A]/60 text-[#E6D49A]'
                  }`}
                >
                  {res.score}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl p-5 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <ScoreRing score={current.score} />
          <div>
            <h2 className="font-display text-xl font-bold text-[#0B1F3A]">
              {current.name}
            </h2>
            <p className="text-xs text-[#0B1F3A]/75 mt-1">
              Evaluating 8 banking security controls across live twin telemetry.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#5E8C61]/15 text-[#3e6441] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                {current.compliantCount} Compliant
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#D9822B]/15 text-[#9c5a18] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                {current.partialCount} Partial
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#B3261E]/15 text-[#B3261E] font-semibold">
                <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                {current.gapCount} Gaps
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveView('command-center')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B1F3A] text-[#FAF7F0] text-xs font-semibold hover:bg-[#1B3358] cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
          <span>Remediate in Command Center</span>
        </button>
      </div>

      {/* Control Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {current.controls.map(({ control, status, affectedNodeIds }) => {
          const badgeCls =
            status === 'Compliant'
              ? 'bg-[#5E8C61]/15 text-[#3e6441] border-[#5E8C61]/40'
              : status === 'Partial'
                ? 'bg-[#D9822B]/15 text-[#9c5a18] border-[#D9822B]/40'
                : 'bg-[#B3261E]/12 text-[#B3261E] border-[#B3261E]/40';

          return (
            <div
              key={control.id}
              className="bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-[#8C6D14]">
                      {control.code}
                    </span>
                    <h3 className="font-display text-base font-bold text-[#0B1F3A] mt-0.5">
                      {control.title}
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded border text-[11px] font-mono font-bold shrink-0 ${badgeCls}`}
                  >
                    {status}
                  </span>
                </div>
                <p className="text-xs text-[#0B1F3A]/80 mt-2 leading-relaxed">
                  {control.description}
                </p>
              </div>

              {status !== 'Compliant' && (
                <div className="space-y-2 pt-2 border-t border-[#E6D49A]/60">
                  <div className="text-[11px] text-[#0B1F3A]/80 bg-[#F1ECDD] rounded-lg px-3 py-2">
                    <strong className="text-[#0B1F3A]">Fix to improve score:</strong>{' '}
                    {control.fixHint}
                  </div>

                  {affectedNodeIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0B1F3A]/65 mr-1">
                        Affected Assets:
                      </span>
                      {affectedNodeIds.map((nid) => (
                        <button
                          key={nid}
                          type="button"
                          onClick={() => {
                            setActiveView('command-center');
                            flyToNode(nid);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0B1F3A] text-[#FAF7F0] text-[10px] font-mono hover:bg-[#1B3358] cursor-pointer"
                        >
                          <span>{nodeMap.get(nid)?.shortLabel ?? nid}</span>
                          <ArrowUpRight className="w-2.5 h-2.5 text-[#C9A227]" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
