import React, { useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  CheckCircle2,
  Clock,
  Crosshair,
  Play,
  Radar,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useTwin } from '../../context/TwinContext';
import { ATTACKER_PROFILES } from '../../data/securityFrameworks';
import { findTopKAttackPaths } from '../../engine/attackPathEngine';
import {
  runMonteCarloSimulation,
  sampleSingleAttack,
} from '../../engine/monteCarloEngine';
import { MonteCarloResult, SampledAttackLog } from '../../types/network';

export const ThreatSimulatorView: React.FC = () => {
  const {
    nodes,
    edges,
    vulns,
    nodeMap,
    patchedCveIds,
    blockedEdgeIds,
    isolatedNodeIds,
    enabledZones,
    selectedEntry,
    setSelectedEntry,
    selectedTarget,
    attackerProfileId,
    setAttackerProfileId,
    attackerProfile,
    effectiveSkillMultiplier,
    setActiveView,
    setSelectedPathId,
    settings,
  } = useTwin();

  // Monte Carlo state
  const [mcRunning, setMcRunning] = useState(false);
  const [mcProgress, setMcProgress] = useState(0);
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);
  const [sampledReplay, setSampledReplay] = useState<SampledAttackLog | null>(null);
  const mcAbortRef = useRef<AbortController | null>(null);

  // Side-by-side comparison across all 4 actors
  const actorComparison = useMemo(() => {
    return ATTACKER_PROFILES.map((profile) => {
      const entry = profile.allowedEntries.includes(selectedEntry)
        ? selectedEntry
        : profile.allowedEntries[0];
      const target = profile.preferredTargets.includes(selectedTarget)
        ? selectedTarget
        : profile.preferredTargets[0];

      const mult = settings.skillMultiplierOverride ?? profile.skillMultiplier;
      const topPath =
        findTopKAttackPaths(entry, target, 1, nodes, edges, vulns, patchedCveIds, {
          allowedZones: enabledZones,
          blockedEdgeIds,
          isolatedNodeIds,
          skillMultiplier: mult,
          stealthFactor: profile.stealthFactor,
        })[0] ?? null;

      return {
        profile,
        entryLabel: nodeMap.get(entry)?.shortLabel ?? entry,
        targetLabel: nodeMap.get(target)?.shortLabel ?? target,
        topPath,
      };
    });
  }, [
    nodes,
    edges,
    vulns,
    nodeMap,
    patchedCveIds,
    blockedEdgeIds,
    isolatedNodeIds,
    enabledZones,
    selectedEntry,
    selectedTarget,
    settings.skillMultiplierOverride,
  ]);

  const handleRunMonteCarlo = async () => {
    if (mcRunning) return;
    mcAbortRef.current?.abort();
    const controller = new AbortController();
    mcAbortRef.current = controller;
    setMcRunning(true);
    setMcProgress(0);

    const effectiveEntry = attackerProfile.allowedEntries.includes(selectedEntry)
      ? selectedEntry
      : attackerProfile.allowedEntries[0];

    const res = await runMonteCarloSimulation(
      effectiveEntry,
      nodes,
      edges,
      vulns,
      patchedCveIds,
      blockedEdgeIds,
      isolatedNodeIds,
      effectiveSkillMultiplier,
      1000,
      (pct) => setMcProgress(pct),
      controller.signal
    );

    setMcResult(res);
    setMcRunning(false);
  };

  const handleReplayRandom = () => {
    const effectiveEntry = attackerProfile.allowedEntries.includes(selectedEntry)
      ? selectedEntry
      : attackerProfile.allowedEntries[0];
    const log = sampleSingleAttack(
      effectiveEntry,
      selectedTarget,
      nodes,
      edges,
      vulns,
      patchedCveIds,
      blockedEdgeIds,
      isolatedNodeIds,
      effectiveSkillMultiplier
    );
    setSampledReplay(log);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* Header Banner */}
      <div className="bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227]/45 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#E6D49A]">
            Adversary Modeling &amp; Stochastic Engine
          </div>
          <h1 className="font-display text-2xl font-bold mt-0.5">
            Threat Actor Simulator &amp; Monte Carlo Engine
          </h1>
          <p className="text-xs text-[#FAF7F0]/75 mt-1 max-w-2xl">
            Evaluate how adversary skill, stealth, and preferred entry vectors reshape crown-jewel breach likelihood and SIEM detection probability.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#1B3358] border border-[#C9A227]/40 rounded-lg px-3.5 py-2 text-xs font-mono">
          <Crosshair className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
          <span>Active Persona:</span>
          <strong className="text-[#E6D49A]">{attackerProfile.shortName}</strong>
          <span className="text-[#FAF7F0]/65">
            ({effectiveSkillMultiplier.toFixed(2)}x skill)
          </span>
        </div>
      </div>

      {/* Module 1: Selectable Attacker Profile Cards */}
      <section aria-label="Attacker Profiles" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {ATTACKER_PROFILES.map((profile) => {
          const isActive = profile.id === attackerProfileId;
          return (
            <div
              key={profile.id}
              className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                isActive
                  ? 'bg-[#0B1F3A] text-[#FAF7F0] border-[#C9A227] shadow-md'
                  : 'bg-[#F1ECDD] text-[#0B1F3A] border-[#E6D49A] hover:border-[#0B1F3A]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-base font-bold leading-snug">
                    {profile.name}
                  </h2>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                      isActive
                        ? 'bg-[#C9A227] text-[#0B1F3A]'
                        : 'bg-[#0B1F3A] text-[#E6D49A]'
                    }`}
                  >
                    {profile.skillMultiplier}x
                  </span>
                </div>
                <p
                  className={`text-xs mt-2 leading-relaxed ${
                    isActive ? 'text-[#FAF7F0]/80' : 'text-[#0B1F3A]/75'
                  }`}
                >
                  {profile.description}
                </p>

                <div className="mt-3 space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className={isActive ? 'text-[#E6D49A]/80' : 'text-[#0B1F3A]/65'}>
                      Stealth Rating
                    </span>
                    <span>{Math.round(profile.stealthFactor * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isActive ? 'text-[#E6D49A]/80' : 'text-[#0B1F3A]/65'}>
                      Entry Vectors
                    </span>
                    <span>
                      {profile.allowedEntries
                        .map((id) => nodeMap.get(id)?.shortLabel ?? id)
                        .join(', ')}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {profile.mitreTechniques.map((t) => (
                    <span
                      key={t}
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        isActive
                          ? 'bg-[#1B3358] border-[#C9A227]/35 text-[#E6D49A]'
                          : 'bg-[#FAF7F0] border-[#E6D49A] text-[#0B1F3A]/85'
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAttackerProfileId(profile.id);
                  if (!profile.allowedEntries.includes(selectedEntry)) {
                    setSelectedEntry(profile.allowedEntries[0]);
                  }
                }}
                className={`mt-4 w-full py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#C9A227] text-[#0B1F3A]'
                    : 'bg-[#0B1F3A] text-[#FAF7F0] hover:bg-[#1B3358]'
                }`}
              >
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isActive ? 'Active Simulation' : 'Run Simulation'}</span>
              </button>
            </div>
          );
        })}
      </section>

      {/* Side-by-Side Actor Path & SIEM Detection Comparison */}
      <section className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
              Side-by-Side Top Path &amp; SIEM Detection Comparison
            </h2>
            <p className="text-xs text-[#0B1F3A]/75">
              Compares each actor&apos;s highest-risk trajectory and SIEM detection probability across crossed telemetry zones.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {actorComparison.map(({ profile, entryLabel, targetLabel, topPath }) => {
            const detectPct = topPath?.detectionProbability
              ? Math.round(topPath.detectionProbability * 100)
              : 0;
            const isSelected = profile.id === attackerProfileId;

            return (
              <div
                key={profile.id}
                className={`bg-[#FAF7F0] rounded-xl border p-3.5 flex flex-col justify-between ${
                  isSelected ? 'border-[#C9A227] ring-1 ring-[#C9A227]' : 'border-[#E6D49A]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#0B1F3A]">
                      {profile.shortName}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#B3261E]">
                      {topPath ? `${topPath.riskScore.toFixed(1)}/100` : 'Blocked'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#0B1F3A]/70 mt-1">
                    {entryLabel} → {targetLabel}
                  </div>

                  {topPath ? (
                    <>
                      <div className="mt-2.5 text-[11px] text-[#0B1F3A]/85 leading-relaxed bg-[#F1ECDD] rounded-lg p-2 font-mono">
                        {topPath.nodes
                          .map((id) => nodeMap.get(id)?.shortLabel ?? id)
                          .join(' → ')}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-[#0B1F3A]/75">
                        <span>{topPath.hops} hops</span>
                        <span>{(topPath.likelihood * 100).toFixed(1)}% likely</span>
                      </div>

                      {/* SIEM Detection Meter */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                          <span className="text-[#0B1F3A]/70">SIEM Detection Chance</span>
                          <span className="font-bold text-[#0B1F3A]">{detectPct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#E6D49A]/45 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${detectPct}%`,
                              backgroundColor:
                                detectPct >= 75
                                  ? '#5E8C61'
                                  : detectPct >= 50
                                    ? '#C9A227'
                                    : '#B3261E',
                            }}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="mt-3 py-4 text-center text-xs text-[#5E8C61] font-semibold">
                      No viable attack path under current controls.
                    </div>
                  )}
                </div>

                {topPath && (
                  <button
                    type="button"
                    onClick={() => {
                      setAttackerProfileId(profile.id);
                      setSelectedPathId(topPath.id);
                      setActiveView('command-center');
                    }}
                    className="mt-3 w-full py-1.5 rounded-lg bg-[#F1ECDD] hover:bg-[#0B1F3A] hover:text-[#FAF7F0] text-[#0B1F3A] text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Inspect on Topology
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Module 2: Live Attack Simulation (Monte Carlo 1,000 Attempts) */}
      <section className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
              Live Attack Simulation (1,000 Monte Carlo Trials)
            </h2>
            <p className="text-xs text-[#0B1F3A]/75">
              Stochastic multi-hop breach trials from{' '}
              <strong className="font-mono">
                {nodeMap.get(
                  attackerProfile.allowedEntries.includes(selectedEntry)
                    ? selectedEntry
                    : attackerProfile.allowedEntries[0]
                )?.shortLabel ?? selectedEntry}
              </strong>{' '}
              across all crown jewels using {attackerProfile.shortName} exploit probabilities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleReplayRandom}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FAF7F0] border border-[#E6D49A] hover:border-[#0B1F3A] text-xs font-semibold text-[#0B1F3A] cursor-pointer"
            >
              <Radar className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
              <span>Replay one random attack</span>
            </button>

            <button
              type="button"
              onClick={handleRunMonteCarlo}
              disabled={mcRunning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B1F3A] text-[#FAF7F0] hover:bg-[#1B3358] disabled:opacity-60 text-xs font-semibold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
              <span>{mcRunning ? `Running (${mcProgress}%)...` : 'Run 1,000 Simulations'}</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {(mcRunning || mcResult) && (
          <div className="bg-[#FAF7F0] border border-[#E6D49A] rounded-lg p-3">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
              <span>
                {mcRunning
                  ? 'Executing chunked stochastic walks...'
                  : `Completed ${mcResult?.iterations.toLocaleString()} trials in ${mcResult?.durationMs} ms`}
              </span>
              <span className="font-bold text-[#0B1F3A]">
                {mcRunning ? `${mcProgress}%` : '100%'}
              </span>
            </div>
            <div className="h-2 bg-[#F1ECDD] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C9A227] transition-all duration-150"
                style={{ width: `${mcRunning ? mcProgress : 100}%` }}
              />
            </div>
          </div>
        )}

        {mcResult && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            {/* Breach Probability Horizontal Bars */}
            <div className="xl:col-span-5 bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-4 space-y-3">
              <h3 className="font-display text-sm font-bold text-[#0B1F3A]">
                Crown-Jewel Breach Probability
              </h3>
              <div className="space-y-3">
                {mcResult.crownJewelBreachProb.map((item) => (
                  <div key={item.nodeId}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-[#0B1F3A]">{item.label}</span>
                      <span className="font-mono tabular-nums font-bold text-[#0B1F3A]">
                        {item.probabilityPct.toFixed(1)}% ({item.breaches})
                      </span>
                    </div>
                    <div className="h-2.5 bg-[#F1ECDD] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, item.probabilityPct)}%`,
                          backgroundColor:
                            item.probabilityPct >= 60
                              ? '#B3261E'
                              : item.probabilityPct >= 30
                                ? '#D9822B'
                                : '#5E8C61',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Stats & Most Frequent Path */}
            <div className="xl:col-span-3 flex flex-col gap-3">
              <div className="bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#0B1F3A]/65 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
                  <span>Avg Time to Compromise</span>
                </div>
                <div className="font-mono tabular-nums text-2xl font-bold text-[#0B1F3A] mt-1">
                  {mcResult.avgTimeToCompromiseHours > 0
                    ? `${mcResult.avgTimeToCompromiseHours.toFixed(1)} hrs`
                    : 'Blocked'}
                </div>
                <div className="text-[11px] text-[#0B1F3A]/65 mt-0.5">
                  Estimated adversary dwell before first crown-jewel breach
                </div>
              </div>

              <div className="bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227] rounded-xl p-4 flex-1">
                <div className="text-[11px] uppercase tracking-wider text-[#E6D49A] font-semibold">
                  Most Frequent Compromise Route
                </div>
                {mcResult.mostFrequentPath ? (
                  <>
                    <div className="mt-2 font-mono text-xs leading-relaxed text-[#FAF7F0]">
                      {mcResult.mostFrequentPath.nodes
                        .map((id) => nodeMap.get(id)?.shortLabel ?? id)
                        .join(' → ')}
                    </div>
                    <div className="mt-2 font-mono text-[11px] text-[#C9A227]">
                      {mcResult.mostFrequentPath.count} breaches (
                      {mcResult.mostFrequentPath.sharePct}% share)
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-[#9ED1A2]">
                    Zero simulated breaches reached a crown jewel.
                  </p>
                )}
              </div>
            </div>

            {/* Hop Distribution Histogram */}
            <div className="xl:col-span-4 bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-4 flex flex-col">
              <h3 className="font-display text-sm font-bold text-[#0B1F3A] mb-2">
                Hops-to-Compromise Histogram
              </h3>
              <div className="flex-1 min-h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={mcResult.hopHistogram}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E6D49A" strokeOpacity={0.5} />
                    <XAxis dataKey="hops" tick={{ fill: '#0B1F3A', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#0B1F3A', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0B1F3A',
                        borderColor: '#C9A227',
                        borderRadius: '8px',
                        color: '#FAF7F0',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="count" name="Trials" fill="#C9A227" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Single Random Attack Replay Log */}
        {sampledReplay && (
          <div className="bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227] rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {sampledReplay.succeeded ? (
                  <ShieldAlert className="w-4 h-4 text-[#B3261E]" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#9ED1A2]" aria-hidden="true" />
                )}
                <span className="font-display text-sm font-bold">
                  Sampled Single Attack Walk:{' '}
                  {sampledReplay.succeeded
                    ? `Breached ${nodeMap.get(sampledReplay.targetId)?.shortLabel ?? sampledReplay.targetId}`
                    : 'Contained Before Crown Jewel'}
                </span>
              </div>
              <span className="font-mono text-xs text-[#E6D49A]">
                {sampledReplay.nodes
                  .map((id) => nodeMap.get(id)?.shortLabel ?? id)
                  .join(' → ')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {sampledReplay.steps.map((s) => (
                <div
                  key={s.step}
                  className={`p-2.5 rounded-lg border text-xs ${
                    s.outcome === 'Compromised'
                      ? 'bg-[#1B3358] border-[#C9A227]/45'
                      : 'bg-[#1B3358]/50 border-[#5E8C61]/60'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-[#E6D49A]">
                      Step {s.step} · {s.protocol}/{s.port}
                    </span>
                    <span
                      className={
                        s.outcome === 'Compromised'
                          ? 'text-[#D9822B] font-bold'
                          : 'text-[#9ED1A2] font-bold'
                      }
                    >
                      {s.outcome}
                    </span>
                  </div>
                  <div className="mt-1 font-medium">
                    {s.fromLabel} → {s.toLabel}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-[#FAF7F0]/70">
                    Success prob {(s.pSuccess * 100).toFixed(0)}% · Roll {(s.roll * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!mcResult && !mcRunning && !sampledReplay && (
          <div className="bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-6 text-center text-xs text-[#0B1F3A]/70 flex flex-col items-center gap-2">
            <Activity className="w-6 h-6 text-[#C9A227]" aria-hidden="true" />
            <span>
              Click <strong>Run 1,000 Simulations</strong> to compute crown-jewel breach probabilities, dwell hours, and hop distributions.
            </span>
          </div>
        )}
      </section>
    </div>
  );
};
