import React, { useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, GitBranch, Server, TrendingDown } from 'lucide-react';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, decimals = 0 }) => {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    if (Math.abs(start - end) < 0.01) {
      setDisplay(end);
      prevRef.current = end;
      return;
    }

    const duration = 450;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Cubic ease out
      const eased = 1 - Math.pow(1 - t, 3);
      const current = start + (end - start) * eased;
      setDisplay(current);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplay(end);
        prevRef.current = end;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return (
    <span className="font-mono tabular-nums">
      {decimals > 0 ? display.toFixed(decimals) : Math.round(display)}
    </span>
  );
};

interface KpiStripProps {
  totalAssets: number;
  knownVulnerabilities: number;
  unpatchedVulnerabilities: number;
  exposedPaths: number;
  exposedPathsBefore: number;
  overallRisk: number;
  overallRiskBefore: number;
  simulationActive: boolean;
  celebratePulse: boolean;
}

export const KpiStrip: React.FC<KpiStripProps> = ({
  totalAssets,
  knownVulnerabilities,
  unpatchedVulnerabilities,
  exposedPaths,
  exposedPathsBefore,
  overallRisk,
  overallRiskBefore,
  simulationActive,
  celebratePulse,
}) => {
  const riskDelta = Math.round((overallRisk - overallRiskBefore) * 10) / 10;
  const pathsDelta = exposedPaths - exposedPathsBefore;
  const vulnsDelta = unpatchedVulnerabilities - knownVulnerabilities;

  const riskSeverityColor =
    overallRisk >= 70
      ? 'text-[#B3261E]'
      : overallRisk >= 45
        ? 'text-[#D9822B]'
        : overallRisk >= 25
          ? 'text-[#C9A227]'
          : 'text-[#5E8C61]';

  return (
    <section
      aria-label="Key Network Risk Metrics"
      className="no-print max-w-[1600px] mx-auto px-4 sm:px-6 pt-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Assets */}
        <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl px-5 py-4 shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#0B1F3A]/75 tracking-wide">
              Total Assets
            </span>
            <Server className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className="text-3xl font-bold text-[#0B1F3A]">
              <AnimatedNumber value={totalAssets} />
            </div>
            <span className="text-xs text-[#0B1F3A]/65 font-mono tabular-nums">
              7 network zones
            </span>
          </div>
        </div>

        {/* Card 2: Known Vulnerabilities */}
        <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl px-5 py-4 shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#0B1F3A]/75 tracking-wide">
              Known Vulnerabilities
            </span>
            <AlertTriangle className="w-4 h-4 text-[#D9822B]" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className="text-3xl font-bold text-[#0B1F3A]">
              <AnimatedNumber value={unpatchedVulnerabilities} />
            </div>
            {simulationActive && vulnsDelta < 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums font-semibold text-[#5E8C61] bg-[#5E8C61]/12 border border-[#5E8C61]/30 px-2 py-0.5 rounded-md">
                {knownVulnerabilities} → {unpatchedVulnerabilities} ({vulnsDelta})
              </span>
            ) : (
              <span className="text-xs text-[#0B1F3A]/65 font-mono tabular-nums">
                Active unpatched CVEs
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Exposed Attack Paths */}
        <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl px-5 py-4 shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#0B1F3A]/75 tracking-wide">
              Exposed Attack Paths
            </span>
            <GitBranch className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className="text-3xl font-bold text-[#0B1F3A]">
              <AnimatedNumber value={exposedPaths} />
            </div>
            {simulationActive && pathsDelta !== 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums font-semibold text-[#5E8C61] bg-[#5E8C61]/12 border border-[#5E8C61]/30 px-2 py-0.5 rounded-md">
                {exposedPathsBefore} → {exposedPaths} ({pathsDelta})
              </span>
            ) : (
              <span className="text-xs text-[#0B1F3A]/65 font-mono tabular-nums">
                Viable entry-to-jewel routes
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Overall Risk Score */}
        <div
          className={`bg-[#F1ECDD] border border-[#E6D49A] rounded-xl px-5 py-4 shadow-xs transition-all duration-200 ${
            celebratePulse ? 'animate-celebrate-glow ring-2 ring-[#C9A227]' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#0B1F3A]/75 tracking-wide">
              Overall Risk Score
            </span>
            <Activity className="w-4 h-4 text-[#B3261E]" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className={`text-3xl font-bold ${riskSeverityColor}`}>
              <AnimatedNumber value={overallRisk} decimals={1} />
              <span className="text-sm font-normal text-[#0B1F3A]/55 ml-1">/100</span>
            </div>
            {simulationActive && riskDelta < 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums font-semibold text-[#5E8C61] bg-[#5E8C61]/12 border border-[#5E8C61]/30 px-2 py-0.5 rounded-md">
                <TrendingDown className="w-3 h-3" aria-hidden="true" />
                {overallRiskBefore.toFixed(1)} → {overallRisk.toFixed(1)} ({riskDelta.toFixed(1)})
              </span>
            ) : (
              <span className="text-xs text-[#0B1F3A]/65 font-mono tabular-nums">
                Weighted crown-jewel risk
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
