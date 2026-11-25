import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  DollarSign,
  Filter,
  GitFork,
  Grid3X3,
  Wrench,
  X,
} from 'lucide-react';
import { TwinProvider, useTwin } from './context/TwinContext';
import { ENTRY_POINTS, TARGET_CROWN_JEWELS, ZONE_ORDER } from './data/bankNetwork';
import { MITRE_MATRIX_DATA } from './data/securityFrameworks';
import {
  computeOptimalPatchPlan,
  computeOverallRiskScore,
  findTopKAttackPaths,
} from './engine/attackPathEngine';
import { fetchAiPathInsight } from './services/aiInsightService';
import { UserSession } from './types/auth';
import { WorkspaceView } from './types/network';
import { AuthTransition } from './components/AuthTransition';
import { CommandPalette } from './components/CommandPalette';
import { ControlsSidebar } from './components/ControlsSidebar';
import { DemoStepInfo, DemoWalkthrough } from './components/DemoWalkthrough';
import { ExportReportModal } from './components/ExportReportModal';
import { Header } from './components/Header';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { KpiStrip } from './components/KpiStrip';
import { LeftSidebar } from './components/LeftSidebar';
import { doesPathMatchTechnique, MitreMatrixPanel } from './components/MitreMatrixPanel';
import { NetworkGraph } from './components/NetworkGraph';
import { NodeDetailsPanel } from './components/NodeDetailsPanel';
import { OnboardingTour } from './components/OnboardingTour';
import { RankedAttackPathsTab } from './components/RankedAttackPathsTab';
import { RiskAnalyticsTab } from './components/RiskAnalyticsTab';
import { SignIn } from './components/SignIn';
import { Splash } from './components/Splash';
import { StatusBar } from './components/StatusBar';
import { TwinEditorModal } from './components/TwinEditorModal';
import { WhatIfPatchingTab } from './components/WhatIfPatchingTab';
import { AiAnalystView } from './components/views/AiAnalystView';
import { AssetInventoryView } from './components/views/AssetInventoryView';
import { ComplianceView } from './components/views/ComplianceView';
import { IncidentReplayView } from './components/views/IncidentReplayView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';
import { ThreatSimulatorView } from './components/views/ThreatSimulatorView';

type BottomTab = 'paths' | 'patching' | 'analytics' | 'mitre';
type AppStage = 'splash' | 'signin' | 'authenticating' | 'dashboard';

const REMEMBER_STORAGE_KEY = 'atlastwin_remembered_session';
const TOUR_STORAGE_KEY = 'atlastwin_tour_completed';

const VIEW_BY_NUMBER: Record<string, WorkspaceView> = {
  '1': 'command-center',
  '2': 'threat-simulator',
  '3': 'compliance',
  '4': 'asset-inventory',
  '5': 'incident-replay',
  '6': 'ai-analyst',
  '7': 'reports',
  '8': 'settings',
};

function readRememberedSession(): UserSession | null {
  try {
    const raw = window.localStorage.getItem(REMEMBER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserSession;
    if (parsed && typeof parsed.email === 'string' && typeof parsed.name === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeRememberedSession(session: UserSession | null): void {
  try {
    if (session) {
      window.localStorage.setItem(REMEMBER_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(REMEMBER_STORAGE_KEY);
    }
  } catch {
    // Storage blocked or unavailable; continue gracefully in React state
  }
}

const DashboardShell: React.FC<{
  userSession: UserSession | null;
  signingOutFade: boolean;
  onSignOut: () => void;
}> = ({ userSession, signingOutFade, onSignOut }) => {
  const {
    activeView,
    setActiveView,
    sidebarCollapsed,
    setSidebarCollapsed,
    setCommandPaletteOpen,
    setShortcutsOpen,
    setTourOpen,
    nodes,
    edges,
    nodeMap,
    vulns,
    patchedCveIds,
    blockedEdgeIds,
    isolatedNodeIds,
    selectedEntry,
    setSelectedEntry,
    selectedTarget,
    setSelectedTarget,
    maxPaths,
    setMaxPaths,
    enabledZones,
    toggleZone,
    resetZones,
    selectedNodeId,
    setSelectedNodeId,
    selectedPathId,
    setSelectedPathId,
    mitreFilterTechniqueId,
    setMitreFilterTechniqueId,
    zoomTargetRequest,
    flyToNode,
    baselineOverall,
    currentOverall,
    baselinePaths,
    attackPaths,
    activePath,
    chokePoints,
    cveImpacts,
    optimalPlan,
    simulationSummary,
    complianceResults,
    cyberRiskUsd,
    togglePatchCve,
    simulatePatchBatch,
    applyOptimalPatchPlan,
    resetAllSimulations,
    globalToast,
    setGlobalToast,
    celebratePulse,
    triggerCelebratePulse,
    nvdSyncing,
    nvdProgress,
    lastSynced,
    refreshNvd,
    cancelNvd,
    settings,
  } = useTwin();

  const [activeTab, setActiveTab] = useState<BottomTab>('paths');
  const [playingPathId, setPlayingPathId] = useState<string | null>(null);
  const [playbackHopIndex, setPlaybackHopIndex] = useState<number | null>(null);
  const [twinEditorOpen, setTwinEditorOpen] = useState(false);

  // AI Insight state
  const [aiInsight, setAiInsight] = useState<string>('');
  const [aiSource, setAiSource] = useState<'gemini' | 'analytical' | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiNonce, setAiNonce] = useState<number>(0);

  // Demo walkthrough & Export modal
  const [demoInfo, setDemoInfo] = useState<DemoStepInfo | null>(null);
  const demoTimersRef = useRef<number[]>([]);
  const [exportOpen, setExportOpen] = useState(false);

  // Global keyboard shortcuts (Ctrl+K, ?, 1-8)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey && VIEW_BY_NUMBER[e.key]) {
        e.preventDefault();
        setActiveView(VIEW_BY_NUMBER[e.key]);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setCommandPaletteOpen, setShortcutsOpen, setActiveView]);

  // First-visit tour auto-open
  useEffect(() => {
    try {
      const done = window.localStorage.getItem(TOUR_STORAGE_KEY);
      if (!done) {
        const t = window.setTimeout(() => setTourOpen(true), 600);
        return () => window.clearTimeout(t);
      }
    } catch {
      // Ignore storage block
    }
  }, [setTourOpen]);

  // Apply MITRE filter if selected in MitreMatrixPanel
  const displayedAttackPaths = useMemo(() => {
    if (!mitreFilterTechniqueId) return attackPaths;
    const allTechs = MITRE_MATRIX_DATA.flatMap((c) => c.techniques);
    const tech = allTechs.find((t) => t.id === mitreFilterTechniqueId);
    if (!tech) return attackPaths;
    return attackPaths.filter((p) => doesPathMatchTechnique(p, tech, nodeMap));
  }, [attackPaths, mitreFilterTechniqueId, nodeMap]);

  const entryLabel =
    ENTRY_POINTS.find((e) => e.id === selectedEntry)?.label ??
    nodeMap.get(selectedEntry)?.label ??
    selectedEntry;
  const targetLabel =
    TARGET_CROWN_JEWELS.find((t) => t.id === selectedTarget)?.label ??
    nodeMap.get(selectedTarget)?.label ??
    selectedTarget;

  // Step-by-step playback loop (600ms per hop)
  useEffect(() => {
    if (!playingPathId) {
      setPlaybackHopIndex(null);
      return;
    }
    const path = attackPaths.find((p) => p.id === playingPathId);
    if (!path || path.nodes.length === 0) {
      setPlayingPathId(null);
      setPlaybackHopIndex(null);
      return;
    }

    setPlaybackHopIndex(0);
    let currentHop = 0;
    const interval = window.setInterval(() => {
      currentHop++;
      if (currentHop >= path.nodes.length) {
        window.clearInterval(interval);
        setPlayingPathId(null);
        setPlaybackHopIndex(null);
      } else {
        setPlaybackHopIndex(currentHop);
      }
    }, 600);

    return () => window.clearInterval(interval);
  }, [playingPathId, attackPaths]);

  // Fetch CISO AI Insight whenever active path changes
  useEffect(() => {
    if (!activePath) {
      setAiInsight('');
      setAiSource(null);
      setAiLoading(false);
      return;
    }

    let cancelled = false;
    setAiLoading(true);

    fetchAiPathInsight(activePath, nodeMap, vulns, entryLabel, targetLabel).then(
      (result) => {
        if (cancelled) return;
        setAiInsight(result.text);
        setAiSource(result.source);
        setAiLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [
    activePath?.id,
    activePath?.weakestLinkCve,
    activePath?.riskScore,
    entryLabel,
    targetLabel,
    nodeMap,
    vulns,
    aiNonce,
  ]);

  const clearDemoTimers = useCallback(() => {
    for (const tid of demoTimersRef.current) {
      window.clearTimeout(tid);
    }
    demoTimersRef.current = [];
  }, []);

  const handleSkipDemo = useCallback(() => {
    clearDemoTimers();
    setPlayingPathId(null);
    setDemoInfo(null);
  }, [clearDemoTimers]);

  const handleRunDemo = useCallback(() => {
    clearDemoTimers();
    setActiveView('command-center');
    setPlayingPathId(null);
    resetAllSimulations();
    resetZones();
    setActiveTab('paths');

    setDemoInfo({
      step: 1,
      totalSteps: 7,
      title: 'Digital Twin Initialized',
      caption: `Loaded ${nodes.length} segmented enterprise banking assets and ${edges.length} directed reachability links across 7 zones.`,
      progressPct: 14,
      isComplete: false,
    });

    demoTimersRef.current.push(
      window.setTimeout(() => {
        setSelectedEntry('internet');
        setSelectedTarget('core-banking-db');
        setMaxPaths(5);
        setDemoInfo({
          step: 2,
          totalSteps: 7,
          title: 'Targeting Crown-Jewel Database',
          caption:
            'Origin set to Internet (External Threat) targeting the Core Banking Database (Oracle).',
          progressPct: 28,
          isComplete: false,
        });
      }, 6000)
    );

    demoTimersRef.current.push(
      window.setTimeout(() => {
        const freshPaths = findTopKAttackPaths(
          'internet',
          'core-banking-db',
          5,
          nodes,
          edges,
          vulns,
          new Set()
        );
        if (freshPaths[0]) {
          setSelectedPathId(freshPaths[0].id);
          setPlayingPathId(freshPaths[0].id);
        }
        setDemoInfo({
          step: 3,
          totalSteps: 7,
          title: 'Highlighting Primary Attack Path',
          caption:
            'Yen’s k-shortest-paths engine identifies the highest-likelihood ingress path and animates traversal.',
          progressPct: 43,
          isComplete: false,
        });
      }, 12000)
    );

    demoTimersRef.current.push(
      window.setTimeout(() => {
        const freshPaths = findTopKAttackPaths(
          'internet',
          'core-banking-db',
          5,
          nodes,
          edges,
          vulns,
          new Set()
        );
        const weakestNodeId = freshPaths[0]?.weakestLinkNode ?? 'online-banking';
        flyToNode(weakestNodeId);
        setDemoInfo({
          step: 4,
          totalSteps: 7,
          title: 'Inspecting Weakest Link Choke Point',
          caption: `Zooming into ${nodeMap.get(weakestNodeId)?.label ?? weakestNodeId} to inspect its critical unpatched CVE.`,
          progressPct: 58,
          isComplete: false,
        });
      }, 20000)
    );

    demoTimersRef.current.push(
      window.setTimeout(() => {
        setActiveTab('patching');
        const plan = computeOptimalPatchPlan(nodes, edges, vulns, new Set(), 3);
        simulatePatchBatch(plan.map((s) => s.cveId));
        setDemoInfo({
          step: 5,
          totalSteps: 7,
          title: 'Applying Optimal Remediation Plan',
          caption: `Applying top 3 greedy patches (${plan.map((p) => p.cveId).join(', ')}) to sever critical attack chains.`,
          progressPct: 75,
          isComplete: false,
        });
      }, 27000)
    );

    demoTimersRef.current.push(
      window.setTimeout(() => {
        triggerCelebratePulse();
        setDemoInfo({
          step: 6,
          totalSteps: 7,
          title: 'Network Risk Score Drops Immediately',
          caption:
            'Patched assets transition to green shield status while broken attack paths fade from the topology.',
          progressPct: 90,
          isComplete: false,
        });
      }, 34000)
    );

    demoTimersRef.current.push(
      window.setTimeout(() => {
        const plan = computeOptimalPatchPlan(nodes, edges, vulns, new Set(), 3);
        const afterPatched = new Set(plan.map((s) => s.cveId));
        const base = computeOverallRiskScore(nodes, edges, vulns, new Set());
        const after = computeOverallRiskScore(nodes, edges, vulns, afterPatched);
        const pct =
          base.overallRisk > 0
            ? ((base.overallRisk - after.overallRisk) / base.overallRisk) * 100
            : 0;

        setDemoInfo({
          step: 7,
          totalSteps: 7,
          title: 'Scenario Complete',
          caption: `Simulated remediation lowered overall bank network risk from ${base.overallRisk.toFixed(1)} to ${after.overallRisk.toFixed(1)} across all crown jewels.`,
          progressPct: 100,
          isComplete: true,
          riskReductionPercent: pct,
        });
      }, 40000)
    );
  }, [
    clearDemoTimers,
    setActiveView,
    resetAllSimulations,
    resetZones,
    nodes,
    edges,
    vulns,
    nodeMap,
    setSelectedEntry,
    setSelectedTarget,
    setMaxPaths,
    setSelectedPathId,
    flyToNode,
    simulatePatchBatch,
    triggerCelebratePulse,
  ]);

  useEffect(() => {
    return () => clearDemoTimers();
  }, [clearDemoTimers]);

  const totalKnownVulns = Object.keys(vulns).length;
  const unpatchedVulnsCount = Math.max(0, totalKnownVulns - patchedCveIds.size);
  const simulationActive =
    patchedCveIds.size > 0 || blockedEdgeIds.size > 0 || isolatedNodeIds.size > 0;

  const themeCls = settings.theme === 'navy' ? 'theme-navy' : '';
  const animCls = settings.animationIntensity === 'off' ? 'anim-off' : '';

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#FAF7F0] text-[#0B1F3A] transition-opacity duration-250 ${themeCls} ${animCls} ${
        signingOutFade ? 'opacity-0' : 'opacity-100 animate-fade-in-smooth'
      }`}
    >
      <Header
        onRunDemo={handleRunDemo}
        demoActive={demoInfo !== null && !demoInfo.isComplete}
        onRefreshNvd={refreshNvd}
        onCancelNvd={cancelNvd}
        nvdSyncing={nvdSyncing}
        nvdProgress={nvdProgress}
        lastSynced={lastSynced}
        onExportReport={() => setExportOpen(true)}
        user={userSession}
        onSignOut={() => {
          clearDemoTimers();
          setDemoInfo(null);
          setPlayingPathId(null);
          onSignOut();
        }}
      />

      {globalToast && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed top-20 right-5 z-40 flex items-center gap-3 bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227] rounded-xl px-4 py-3 shadow-xl animate-fade-in-smooth max-w-md"
        >
          <CheckCircle2 className="w-4 h-4 text-[#C9A227] shrink-0" aria-hidden="true" />
          <span className="text-xs font-medium">{globalToast}</span>
          <button
            type="button"
            onClick={() => setGlobalToast(null)}
            aria-label="Dismiss notification"
            className="p-1 rounded text-[#E6D49A] hover:text-[#FAF7F0] hover:bg-[#1B3358] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <LeftSidebar
          activeView={activeView}
          onSelectView={setActiveView}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          complianceGapCount={complianceResults['pci-dss'].gapCount}
        />

        <main
          key={activeView}
          className={`flex-1 min-w-0 overflow-x-hidden ${
            settings.animationIntensity === 'full' ? 'animate-fade-in-smooth' : ''
          }`}
        >
          {activeView === 'command-center' && (
            <>
              {/* Role-Aware Executive Spotlight for CISO */}
              {userSession?.role === 'CISO' && (
                <div className="no-print max-w-[1600px] mx-auto px-4 sm:px-6 pt-3">
                  <div className="bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227]/45 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <DollarSign className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
                      <span>
                        <strong>Executive Risk Posture:</strong> Expected Annualized Loss{' '}
                        <strong className="font-mono text-[#C9A227]">
                          ${(cyberRiskUsd.expectedUsd / 1_000_000).toFixed(2)}M
                        </strong>{' '}
                        · PCI DSS 4.0 Score{' '}
                        <strong className="font-mono text-[#E6D49A]">
                          {complianceResults['pci-dss'].score}%
                        </strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveView('reports')}
                      className="px-3 py-1 rounded-lg bg-[#C9A227] text-[#0B1F3A] font-semibold hover:bg-[#d8b43b] cursor-pointer"
                    >
                      Open Board Reports
                    </button>
                  </div>
                </div>
              )}

              {/* 4-Card KPI Strip */}
              <KpiStrip
                totalAssets={nodes.length}
                knownVulnerabilities={totalKnownVulns}
                unpatchedVulnerabilities={unpatchedVulnsCount}
                exposedPaths={currentOverall.totalExposedPaths}
                exposedPathsBefore={baselineOverall.totalExposedPaths}
                overallRisk={currentOverall.overallRisk}
                overallRiskBefore={baselineOverall.overallRisk}
                simulationActive={simulationActive}
                celebratePulse={celebratePulse}
              />

              {/* 3-Column Digital Twin Workspace */}
              <section
                aria-label="Digital Twin Workspace"
                className="no-print max-w-[1600px] mx-auto px-4 sm:px-6 pt-4 flex flex-col lg:flex-row items-stretch gap-4"
              >
                <ControlsSidebar
                  selectedEntry={selectedEntry}
                  onChangeEntry={setSelectedEntry}
                  selectedTarget={selectedTarget}
                  onChangeTarget={setSelectedTarget}
                  maxPaths={maxPaths}
                  onChangeMaxPaths={setMaxPaths}
                  enabledZones={enabledZones}
                  onToggleZone={toggleZone}
                  onResetZones={resetZones}
                />

                <NetworkGraph
                  nodes={nodes}
                  edges={edges}
                  vulns={vulns}
                  patchedCveIds={patchedCveIds}
                  enabledZones={enabledZones}
                  attackPaths={displayedAttackPaths}
                  baselinePaths={baselinePaths}
                  selectedPathId={selectedPathId}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={setSelectedNodeId}
                  chokePoints={chokePoints}
                  playbackHopIndex={playbackHopIndex}
                  zoomTargetRequest={zoomTargetRequest}
                  selectedEntryId={selectedEntry}
                  selectedTargetId={selectedTarget}
                  simulationActive={simulationActive}
                  onOpenTwinEditor={() => setTwinEditorOpen(true)}
                />

                <NodeDetailsPanel
                  selectedNode={selectedNodeId ? nodeMap.get(selectedNodeId) ?? null : null}
                  vulns={vulns}
                  patchedCveIds={patchedCveIds}
                  onTogglePatchCve={togglePatchCve}
                  chokePoints={chokePoints}
                  activePath={activePath}
                  aiInsight={aiInsight}
                  aiSource={aiSource}
                  aiLoading={aiLoading}
                  onRefreshAiInsight={() => setAiNonce((n) => n + 1)}
                />
              </section>

              {/* Bottom Analytical Tabs */}
              <section
                aria-label="Attack Path Analysis and Simulation"
                className="no-print max-w-[1600px] mx-auto px-4 sm:px-6 py-5"
              >
                <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl p-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6D49A] pb-3 mb-4">
                    <div
                      role="tablist"
                      aria-label="Analysis Views"
                      className="flex flex-wrap items-center gap-2"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'paths'}
                        onClick={() => setActiveTab('paths')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                          activeTab === 'paths'
                            ? 'bg-[#0B1F3A] text-[#FAF7F0] shadow-xs'
                            : 'bg-[#FAF7F0] text-[#0B1F3A] border border-[#E6D49A] hover:border-[#0B1F3A]'
                        }`}
                      >
                        <GitFork className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
                        <span>Ranked Attack Paths ({displayedAttackPaths.length})</span>
                      </button>

                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'patching'}
                        onClick={() => setActiveTab('patching')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                          activeTab === 'patching'
                            ? 'bg-[#0B1F3A] text-[#FAF7F0] shadow-xs'
                            : 'bg-[#FAF7F0] text-[#0B1F3A] border border-[#E6D49A] hover:border-[#0B1F3A]'
                        }`}
                      >
                        <Wrench className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
                        <span>
                          What-If Patching{simulationActive ? ` (${patchedCveIds.size + blockedEdgeIds.size} Active)` : ''}
                        </span>
                      </button>

                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'analytics'}
                        onClick={() => setActiveTab('analytics')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                          activeTab === 'analytics'
                            ? 'bg-[#0B1F3A] text-[#FAF7F0] shadow-xs'
                            : 'bg-[#FAF7F0] text-[#0B1F3A] border border-[#E6D49A] hover:border-[#0B1F3A]'
                        }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
                        <span>Risk Analytics</span>
                      </button>

                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'mitre'}
                        onClick={() => setActiveTab('mitre')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                          activeTab === 'mitre'
                            ? 'bg-[#0B1F3A] text-[#FAF7F0] shadow-xs'
                            : 'bg-[#FAF7F0] text-[#0B1F3A] border border-[#E6D49A] hover:border-[#0B1F3A]'
                        }`}
                      >
                        <Grid3X3 className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
                        <span>MITRE Matrix</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {mitreFilterTechniqueId && (
                        <button
                          type="button"
                          onClick={() => setMitreFilterTechniqueId(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0B1F3A] text-[#E6D49A] font-mono text-[11px] cursor-pointer"
                        >
                          <Filter className="w-3 h-3" />
                          <span>MITRE {mitreFilterTechniqueId}</span>
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <span className="text-xs text-[#0B1F3A]/75 font-mono tabular-nums">
                        {entryLabel} → {targetLabel}
                      </span>
                    </div>
                  </div>

                  {activeTab === 'paths' && (
                    <RankedAttackPathsTab
                      paths={displayedAttackPaths}
                      nodeMap={nodeMap}
                      vulns={vulns}
                      selectedPathId={selectedPathId}
                      playingPathId={playingPathId}
                      onSelectAndPlayPath={(id) => {
                        setSelectedPathId(id);
                        setPlayingPathId(id);
                      }}
                      onTogglePlayPath={(id) => {
                        setSelectedPathId(id);
                        setPlayingPathId((prev) => (prev === id ? null : id));
                      }}
                    />
                  )}

                  {activeTab === 'patching' && (
                    <WhatIfPatchingTab
                      cveImpacts={cveImpacts}
                      vulns={vulns}
                      nodeMap={nodeMap}
                      patchedCveIds={patchedCveIds}
                      onTogglePatchCve={togglePatchCve}
                      onSimulateSelected={simulatePatchBatch}
                      onResetSimulation={resetAllSimulations}
                      optimalPlan={optimalPlan}
                      onApplyOptimalPlan={applyOptimalPatchPlan}
                      simulationSummary={simulationSummary}
                    />
                  )}

                  {activeTab === 'analytics' && (
                    <RiskAnalyticsTab
                      nodes={nodes}
                      vulns={vulns}
                      patchedCveIds={patchedCveIds}
                      overallRisk={currentOverall.overallRisk}
                      overallRiskBefore={baselineOverall.overallRisk}
                    />
                  )}

                  {activeTab === 'mitre' && <MitreMatrixPanel />}
                </div>
              </section>
            </>
          )}

          {activeView === 'threat-simulator' && <ThreatSimulatorView />}
          {activeView === 'compliance' && <ComplianceView />}
          {activeView === 'asset-inventory' && <AssetInventoryView />}
          {activeView === 'incident-replay' && <IncidentReplayView />}
          {activeView === 'ai-analyst' && <AiAnalystView />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>

      <StatusBar />

      <CommandPalette onRunDemo={handleRunDemo} />
      <KeyboardShortcutsModal />
      <OnboardingTour />
      <TwinEditorModal isOpen={twinEditorOpen} onClose={() => setTwinEditorOpen(false)} />

      <DemoWalkthrough
        demoInfo={demoInfo}
        onSkip={handleSkipDemo}
        onCloseComplete={() => setDemoInfo(null)}
      />

      <ExportReportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        entryLabel={entryLabel}
        targetLabel={targetLabel}
        topPaths={displayedAttackPaths}
        nodeMap={nodeMap}
        vulns={vulns}
        optimalPlan={optimalPlan}
        simulationSummary={simulationSummary}
        patchedCveIds={patchedCveIds}
        aiInsight={aiInsight}
        lastSynced={lastSynced}
      />
    </div>
  );
};

const RoleAwareWrapper: React.FC<{
  userSession: UserSession | null;
  signingOutFade: boolean;
  onSignOut: () => void;
}> = ({ userSession, signingOutFade, onSignOut }) => {
  const { setActiveView } = useTwin();

  // Apply role-based default view once upon login
  const appliedRoleRef = useRef<string | null>(null);
  useEffect(() => {
    if (!userSession) {
      appliedRoleRef.current = null;
      return;
    }
    const key = `${userSession.email}:${userSession.role}`;
    if (appliedRoleRef.current === key) return;
    appliedRoleRef.current = key;

    if (userSession.role === 'Auditor') {
      setActiveView('compliance');
    } else if (userSession.role === 'Security Analyst') {
      setActiveView('command-center');
    } else {
      setActiveView('command-center');
    }
  }, [userSession, setActiveView]);

  return (
    <DashboardShell
      userSession={userSession}
      signingOutFade={signingOutFade}
      onSignOut={onSignOut}
    />
  );
};

export default function App() {
  const [rememberedOnLoad] = useState<UserSession | null>(() => readRememberedSession());
  const [stage, setStage] = useState<AppStage>('splash');
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [pendingSession, setPendingSession] = useState<UserSession | null>(null);
  const [signingOutFade, setSigningOutFade] = useState(false);

  const handleSplashComplete = useCallback(() => {
    if (rememberedOnLoad) {
      setPendingSession(rememberedOnLoad);
      setStage('authenticating');
    } else {
      setStage('signin');
    }
  }, [rememberedOnLoad]);

  const handleAuthenticated = useCallback((session: UserSession, rememberMe: boolean) => {
    writeRememberedSession(rememberMe ? session : null);
    setPendingSession(session);
    setStage('authenticating');
  }, []);

  const handleAuthTransitionComplete = useCallback(() => {
    if (pendingSession) {
      setUserSession(pendingSession);
      setPendingSession(null);
    }
    setStage('dashboard');
  }, [pendingSession]);

  const handleSignOut = useCallback(() => {
    writeRememberedSession(null);
    setSigningOutFade(true);
    window.setTimeout(() => {
      setUserSession(null);
      setSigningOutFade(false);
      setStage('signin');
    }, 250);
  }, []);

  if (stage === 'splash') {
    return <Splash onComplete={handleSplashComplete} />;
  }

  if (stage === 'signin') {
    return <SignIn onAuthenticated={handleAuthenticated} />;
  }

  if (stage === 'authenticating') {
    return (
      <AuthTransition
        userName={pendingSession?.name ?? userSession?.name ?? 'Operator'}
        onComplete={handleAuthTransitionComplete}
      />
    );
  }

  return (
    <TwinProvider>
      <RoleAwareWrapper
        userSession={userSession}
        signingOutFade={signingOutFade}
        onSignOut={handleSignOut}
      />
    </TwinProvider>
  );
}
