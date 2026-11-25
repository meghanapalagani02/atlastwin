import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BANK_EDGES,
  BANK_NODES,
  ENTRY_POINTS,
  INITIAL_VULNERABILITIES,
  TARGET_CROWN_JEWELS,
  ZONE_ORDER,
} from '../data/bankNetwork';
import {
  ATTACKER_PROFILES,
  DEFAULT_ASSET_VALUES,
} from '../data/securityFrameworks';
import {
  computeBlastRadius,
  computeChokePoints,
  computeCyberRiskQuantification,
  computeNodeExposureMap,
  computeOptimalPatchPlan,
  computeOverallRiskScore,
  computeSimulationSummary,
  deriveAlertsFromState,
  EngineOptions,
  evaluateComplianceFramework,
  findTopKAttackPaths,
  rankCvesByRiskReduction,
  recommendBestSegmentation,
} from '../engine/attackPathEngine';
import { NvdSyncProgress, syncVulnerabilitiesFromNvd } from '../services/nvdService';
import {
  AlertItem,
  AppSettings,
  AttackPath,
  AttackerProfile,
  AttackerProfileId,
  BlastRadiusResult,
  ChokePoint,
  ComplianceFrameworkId,
  ComplianceFrameworkResult,
  CveRiskImpact,
  CyberRiskQuantification,
  GraphColorMode,
  GraphLayoutMode,
  NetworkEdge,
  NetworkNode,
  NetworkZone,
  NodeType,
  PatchPlanStep,
  SegmentationRecommendation,
  SimulationSummary,
  Vulnerability,
  WorkspaceView,
} from '../types/network';

const TOPOLOGY_STORAGE_KEY = 'atlastwin_custom_topology_v1';
const SETTINGS_STORAGE_KEY = 'atlastwin_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  assetValues: { ...DEFAULT_ASSET_VALUES },
  skillMultiplierOverride: null,
  riskThreshold: 60,
  nvdSyncIntervalMinutes: 60,
  animationIntensity: 'full',
  theme: 'ivory',
};

function safeReadJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeWriteJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage block errors
  }
}

function safeRemoveKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

export interface AddNodeInput {
  label: string;
  zone: NetworkZone;
  type: NodeType;
  criticality: number;
  os: string;
  software: string[];
  openPorts: number[];
  cves: string[];
}

interface TwinContextValue {
  // Navigation & UI
  activeView: WorkspaceView;
  setActiveView: (view: WorkspaceView) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  shortcutsOpen: boolean;
  setShortcutsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  tourOpen: boolean;
  setTourOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Core Twin Topology & Vulns
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  nodeMap: Map<string, NetworkNode>;
  vulns: Record<string, Vulnerability>;
  patchedCveIds: Set<string>;
  blockedEdgeIds: Set<string>;
  isolatedNodeIds: Set<string>;
  injectedZeroDays: string[];

  // Query / Filter State
  selectedEntry: string;
  setSelectedEntry: (id: string) => void;
  selectedTarget: string;
  setSelectedTarget: (id: string) => void;
  maxPaths: number;
  setMaxPaths: (k: number) => void;
  enabledZones: Set<NetworkZone>;
  toggleZone: (zone: NetworkZone) => void;
  resetZones: () => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedPathId: string | null;
  setSelectedPathId: (id: string | null) => void;
  mitreFilterTechniqueId: string | null;
  setMitreFilterTechniqueId: (id: string | null) => void;

  // Graph Visual Controls
  graphLayoutMode: GraphLayoutMode;
  setGraphLayoutMode: (mode: GraphLayoutMode) => void;
  graphColorMode: GraphColorMode;
  setGraphColorMode: (mode: GraphColorMode) => void;
  pathOnlyMode: boolean;
  setPathOnlyMode: React.Dispatch<React.SetStateAction<boolean>>;
  editTwinMode: boolean;
  setEditTwinMode: React.Dispatch<React.SetStateAction<boolean>>;
  zoomTargetRequest: { nodeId: string; nonce: number } | null;
  flyToNode: (nodeId: string) => void;

  // Attacker Profile
  attackerProfileId: AttackerProfileId;
  setAttackerProfileId: (id: AttackerProfileId) => void;
  attackerProfile: AttackerProfile;
  effectiveSkillMultiplier: number;

  // Blast Radius
  blastRadiusOriginId: string | null;
  setBlastRadiusOriginId: (id: string | null) => void;
  blastRadiusThreshold: number;
  setBlastRadiusThreshold: (t: number) => void;
  blastRadiusResult: BlastRadiusResult | null;

  // Derived Engine Metrics
  engineOpts: EngineOptions;
  baselineOverall: { overallRisk: number; totalExposedPaths: number };
  currentOverall: { overallRisk: number; totalExposedPaths: number };
  baselinePaths: AttackPath[];
  attackPaths: AttackPath[];
  activePath: AttackPath | null;
  chokePoints: ChokePoint[];
  cveImpacts: CveRiskImpact[];
  optimalPlan: PatchPlanStep[];
  simulationSummary: SimulationSummary;
  segmentationRecommendations: SegmentationRecommendation[];
  nodeExposureMap: Map<string, number>;
  complianceResults: Record<ComplianceFrameworkId, ComplianceFrameworkResult>;
  cyberRiskUsd: CyberRiskQuantification;
  alerts: AlertItem[];

  // Actions
  togglePatchCve: (cveId: string) => void;
  simulatePatchBatch: (cveIds: string[]) => void;
  applyOptimalPatchPlan: () => void;
  toggleBlockEdge: (edgeId: string) => void;
  blockEdgeBatch: (edgeIds: string[]) => void;
  toggleIsolateNode: (nodeId: string) => void;
  applyCombinedPlan: (cveIds: string[], edgeIds: string[]) => void;
  resetAllSimulations: () => void;

  // Twin Editor Actions
  addNode: (input: AddNodeInput) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (source: string, target: string, protocol?: string, port?: number) => void;
  deleteEdge: (edgeId: string) => void;
  resetDefaultTwin: () => void;
  exportTopologyJson: () => string;
  importTopologyJson: (raw: string) => { ok: boolean; error?: string };

  // Zero-Day & Threshold Toast
  injectZeroDay: () => void;
  globalToast: string | null;
  setGlobalToast: (msg: string | null) => void;
  celebratePulse: boolean;
  triggerCelebratePulse: () => void;

  // NVD Sync
  nvdSyncing: boolean;
  nvdProgress: NvdSyncProgress | null;
  lastSynced: string | null;
  refreshNvd: () => Promise<void>;
  cancelNvd: () => void;

  // Settings
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
}

const TwinContext = createContext<TwinContextValue | null>(null);

export const TwinProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const savedTopo = useMemo(
    () =>
      safeReadJson<{
        nodes: NetworkNode[];
        edges: NetworkEdge[];
      }>(TOPOLOGY_STORAGE_KEY),
    []
  );
  const savedSettings = useMemo(
    () => safeReadJson<Partial<AppSettings>>(SETTINGS_STORAGE_KEY),
    []
  );

  const [activeView, setActiveView] = useState<WorkspaceView>('command-center');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const [nodes, setNodes] = useState<NetworkNode[]>(() =>
    savedTopo?.nodes && Array.isArray(savedTopo.nodes) && savedTopo.nodes.length > 0
      ? savedTopo.nodes
      : BANK_NODES
  );
  const [edges, setEdges] = useState<NetworkEdge[]>(() =>
    savedTopo?.edges && Array.isArray(savedTopo.edges) ? savedTopo.edges : BANK_EDGES
  );
  const [vulns, setVulns] = useState<Record<string, Vulnerability>>(() => ({
    ...INITIAL_VULNERABILITIES,
  }));

  const [patchedCveIds, setPatchedCveIds] = useState<Set<string>>(() => new Set());
  const [blockedEdgeIds, setBlockedEdgeIds] = useState<Set<string>>(() => new Set());
  const [isolatedNodeIds, setIsolatedNodeIds] = useState<Set<string>>(() => new Set());
  const [injectedZeroDays, setInjectedZeroDays] = useState<string[]>([]);

  const [selectedEntry, setSelectedEntry] = useState<string>('internet');
  const [selectedTarget, setSelectedTarget] = useState<string>('core-banking-db');
  const [maxPaths, setMaxPaths] = useState<number>(5);
  const [enabledZones, setEnabledZones] = useState<Set<NetworkZone>>(
    () => new Set(ZONE_ORDER)
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('online-banking');
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [mitreFilterTechniqueId, setMitreFilterTechniqueId] = useState<string | null>(null);

  const [graphLayoutMode, setGraphLayoutMode] = useState<GraphLayoutMode>('zoned');
  const [graphColorMode, setGraphColorMode] = useState<GraphColorMode>('severity');
  const [pathOnlyMode, setPathOnlyMode] = useState(false);
  const [editTwinMode, setEditTwinMode] = useState(false);
  const [zoomTargetRequest, setZoomTargetRequest] = useState<{
    nodeId: string;
    nonce: number;
  } | null>(null);

  const [attackerProfileId, setAttackerProfileId] =
    useState<AttackerProfileId>('ransomware');

  const [blastRadiusOriginId, setBlastRadiusOriginId] = useState<string | null>(null);
  const [blastRadiusThreshold, setBlastRadiusThreshold] = useState<number>(0.15);

  const [settings, setSettings] = useState<AppSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...(savedSettings ?? {}),
    assetValues: {
      ...DEFAULT_ASSET_VALUES,
      ...(savedSettings?.assetValues ?? {}),
    },
  }));

  const [globalToast, setGlobalToast] = useState<string | null>(null);
  const [celebratePulse, setCelebratePulse] = useState(false);

  const [nvdSyncing, setNvdSyncing] = useState(false);
  const [nvdProgress, setNvdProgress] = useState<NvdSyncProgress | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const nvdAbortRef = useRef<AbortController | null>(null);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const attackerProfile = useMemo(
    () =>
      ATTACKER_PROFILES.find((p) => p.id === attackerProfileId) ??
      ATTACKER_PROFILES[1],
    [attackerProfileId]
  );

  const effectiveSkillMultiplier =
    settings.skillMultiplierOverride ?? attackerProfile.skillMultiplier;

  const engineOpts: EngineOptions = useMemo(
    () => ({
      allowedZones: enabledZones,
      blockedEdgeIds,
      isolatedNodeIds,
      skillMultiplier: effectiveSkillMultiplier,
      stealthFactor: attackerProfile.stealthFactor,
    }),
    [
      enabledZones,
      blockedEdgeIds,
      isolatedNodeIds,
      effectiveSkillMultiplier,
      attackerProfile.stealthFactor,
    ]
  );

  const baselineOverall = useMemo(
    () =>
      computeOverallRiskScore(nodes, edges, vulns, new Set(), {
        skillMultiplier: effectiveSkillMultiplier,
        stealthFactor: attackerProfile.stealthFactor,
      }),
    [nodes, edges, vulns, effectiveSkillMultiplier, attackerProfile.stealthFactor]
  );

  const currentOverall = useMemo(
    () => computeOverallRiskScore(nodes, edges, vulns, patchedCveIds, engineOpts),
    [nodes, edges, vulns, patchedCveIds, engineOpts]
  );

  const baselinePaths = useMemo(
    () =>
      findTopKAttackPaths(
        selectedEntry,
        selectedTarget,
        maxPaths,
        nodes,
        edges,
        vulns,
        new Set(),
        {
          allowedZones: enabledZones,
          skillMultiplier: effectiveSkillMultiplier,
          stealthFactor: attackerProfile.stealthFactor,
        }
      ),
    [
      selectedEntry,
      selectedTarget,
      maxPaths,
      nodes,
      edges,
      vulns,
      enabledZones,
      effectiveSkillMultiplier,
      attackerProfile.stealthFactor,
    ]
  );

  const attackPaths = useMemo(
    () =>
      findTopKAttackPaths(
        selectedEntry,
        selectedTarget,
        maxPaths,
        nodes,
        edges,
        vulns,
        patchedCveIds,
        engineOpts
      ),
    [selectedEntry, selectedTarget, maxPaths, nodes, edges, vulns, patchedCveIds, engineOpts]
  );

  useEffect(() => {
    if (attackPaths.length === 0) {
      setSelectedPathId(null);
      return;
    }
    if (!selectedPathId || !attackPaths.some((p) => p.id === selectedPathId)) {
      setSelectedPathId(attackPaths[0].id);
    }
  }, [attackPaths, selectedPathId]);

  const activePath = useMemo(() => {
    if (attackPaths.length === 0) return null;
    return attackPaths.find((p) => p.id === selectedPathId) ?? attackPaths[0];
  }, [attackPaths, selectedPathId]);

  const chokePoints = useMemo(
    () => computeChokePoints(nodes, edges, vulns, patchedCveIds, engineOpts),
    [nodes, edges, vulns, patchedCveIds, engineOpts]
  );

  const cveImpacts = useMemo(
    () => rankCvesByRiskReduction(nodes, edges, vulns, patchedCveIds, engineOpts),
    [nodes, edges, vulns, patchedCveIds, engineOpts]
  );

  const optimalPlan = useMemo(
    () => computeOptimalPatchPlan(nodes, edges, vulns, patchedCveIds, 3, engineOpts),
    [nodes, edges, vulns, patchedCveIds, engineOpts]
  );

  const simulationSummary = useMemo(
    () =>
      computeSimulationSummary(
        nodes,
        edges,
        vulns,
        selectedEntry,
        selectedTarget,
        maxPaths,
        patchedCveIds,
        engineOpts
      ),
    [nodes, edges, vulns, selectedEntry, selectedTarget, maxPaths, patchedCveIds, engineOpts]
  );

  const segmentationRecommendations = useMemo(
    () =>
      recommendBestSegmentation(
        nodes,
        edges,
        vulns,
        patchedCveIds,
        blockedEdgeIds,
        engineOpts
      ),
    [nodes, edges, vulns, patchedCveIds, blockedEdgeIds, engineOpts]
  );

  const nodeExposureMap = useMemo(
    () => computeNodeExposureMap(nodes, edges, vulns, patchedCveIds, engineOpts),
    [nodes, edges, vulns, patchedCveIds, engineOpts]
  );

  const blastRadiusResult = useMemo(() => {
    if (!blastRadiusOriginId) return null;
    return computeBlastRadius(
      blastRadiusOriginId,
      blastRadiusThreshold,
      nodes,
      edges,
      vulns,
      patchedCveIds,
      settings.assetValues,
      engineOpts
    );
  }, [
    blastRadiusOriginId,
    blastRadiusThreshold,
    nodes,
    edges,
    vulns,
    patchedCveIds,
    settings.assetValues,
    engineOpts,
  ]);

  const complianceResults = useMemo(() => {
    const frameworks: ComplianceFrameworkId[] = ['pci-dss', 'rbi', 'iso-27001', 'nist-csf'];
    const res = {} as Record<ComplianceFrameworkId, ComplianceFrameworkResult>;
    for (const f of frameworks) {
      res[f] = evaluateComplianceFramework(
        f,
        nodes,
        edges,
        vulns,
        patchedCveIds,
        blockedEdgeIds,
        isolatedNodeIds
      );
    }
    return res;
  }, [nodes, edges, vulns, patchedCveIds, blockedEdgeIds, isolatedNodeIds]);

  const cyberRiskUsd = useMemo(
    () =>
      computeCyberRiskQuantification(
        nodes,
        edges,
        vulns,
        patchedCveIds,
        settings.assetValues,
        engineOpts
      ),
    [nodes, edges, vulns, patchedCveIds, settings.assetValues, engineOpts]
  );

  const alerts = useMemo(
    () =>
      deriveAlertsFromState(
        currentOverall.overallRisk,
        settings.riskThreshold,
        activePath,
        chokePoints,
        complianceResults['pci-dss'],
        nodeMap,
        injectedZeroDays
      ),
    [
      currentOverall.overallRisk,
      settings.riskThreshold,
      activePath,
      chokePoints,
      complianceResults,
      nodeMap,
      injectedZeroDays,
    ]
  );

  // Trigger toast when threshold is crossed upward
  const prevThresholdExceededRef = useRef(false);
  useEffect(() => {
    const exceeded = currentOverall.overallRisk > settings.riskThreshold;
    if (exceeded && !prevThresholdExceededRef.current) {
      setGlobalToast(
        `Risk threshold crossed: Network risk (${currentOverall.overallRisk.toFixed(1)}) exceeds ${settings.riskThreshold}.`
      );
    }
    prevThresholdExceededRef.current = exceeded;
  }, [currentOverall.overallRisk, settings.riskThreshold]);

  useEffect(() => {
    if (!globalToast) return;
    const t = window.setTimeout(() => setGlobalToast(null), 4800);
    return () => window.clearTimeout(t);
  }, [globalToast]);

  const triggerCelebratePulse = useCallback(() => {
    setCelebratePulse(true);
    window.setTimeout(() => setCelebratePulse(false), 2000);
  }, []);

  const flyToNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setZoomTargetRequest({ nodeId, nonce: Date.now() });
  }, []);

  const toggleZone = useCallback((zone: NetworkZone) => {
    setEnabledZones((prev) => {
      const next = new Set(prev);
      if (next.has(zone)) {
        if (next.size > 1) next.delete(zone);
      } else {
        next.add(zone);
      }
      return next;
    });
  }, []);

  const resetZones = useCallback(() => {
    setEnabledZones(new Set(ZONE_ORDER));
  }, []);

  const togglePatchCve = useCallback((cveId: string) => {
    setPatchedCveIds((prev) => {
      const next = new Set(prev);
      if (next.has(cveId)) next.delete(cveId);
      else next.add(cveId);
      return next;
    });
  }, []);

  const simulatePatchBatch = useCallback(
    (cveIds: string[]) => {
      setPatchedCveIds((prev) => {
        const next = new Set(prev);
        for (const id of cveIds) next.add(id);
        return next;
      });
      triggerCelebratePulse();
    },
    [triggerCelebratePulse]
  );

  const applyOptimalPatchPlan = useCallback(() => {
    const plan = computeOptimalPatchPlan(nodes, edges, vulns, patchedCveIds, 3, engineOpts);
    if (plan.length === 0) return;
    setPatchedCveIds((prev) => {
      const next = new Set(prev);
      for (const s of plan) next.add(s.cveId);
      return next;
    });
    triggerCelebratePulse();
  }, [nodes, edges, vulns, patchedCveIds, engineOpts, triggerCelebratePulse]);

  const toggleBlockEdge = useCallback((edgeId: string) => {
    setBlockedEdgeIds((prev) => {
      const next = new Set(prev);
      if (next.has(edgeId)) next.delete(edgeId);
      else next.add(edgeId);
      return next;
    });
  }, []);

  const blockEdgeBatch = useCallback(
    (edgeIds: string[]) => {
      setBlockedEdgeIds((prev) => {
        const next = new Set(prev);
        for (const id of edgeIds) next.add(id);
        return next;
      });
      triggerCelebratePulse();
    },
    [triggerCelebratePulse]
  );

  const toggleIsolateNode = useCallback((nodeId: string) => {
    if (ENTRY_POINTS.some((e) => e.id === nodeId) || TARGET_CROWN_JEWELS.some((t) => t.id === nodeId)) {
      // Allow isolating intermediate or non-selected endpoints; warn if entry/target
    }
    setIsolatedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const applyCombinedPlan = useCallback(
    (cveIds: string[], edgeIds: string[]) => {
      if (cveIds.length > 0) {
        setPatchedCveIds((prev) => {
          const next = new Set(prev);
          for (const id of cveIds) next.add(id);
          return next;
        });
      }
      if (edgeIds.length > 0) {
        setBlockedEdgeIds((prev) => {
          const next = new Set(prev);
          for (const id of edgeIds) next.add(id);
          return next;
        });
      }
      triggerCelebratePulse();
      setGlobalToast(
        `Applied combined roadmap (${cveIds.length} patches, ${edgeIds.length} firewall rules).`
      );
    },
    [triggerCelebratePulse]
  );

  const resetAllSimulations = useCallback(() => {
    setPatchedCveIds(new Set());
    setBlockedEdgeIds(new Set());
    setIsolatedNodeIds(new Set());
    setBlastRadiusOriginId(null);
    setMitreFilterTechniqueId(null);
  }, []);

  // Twin Editor Actions
  const persistTopology = useCallback((nextNodes: NetworkNode[], nextEdges: NetworkEdge[]) => {
    safeWriteJson(TOPOLOGY_STORAGE_KEY, { nodes: nextNodes, edges: nextEdges });
  }, []);

  const addNode = useCallback(
    (input: AddNodeInput) => {
      const slug = input.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const id = `${slug || 'asset'}-${Date.now().toString(36).slice(-4)}`;
      const newNode: NetworkNode = {
        id,
        label: input.label.trim(),
        shortLabel: input.label.trim().slice(0, 18),
        zone: input.zone,
        type: input.type,
        criticality: Math.min(10, Math.max(1, input.criticality)),
        os: input.os.trim() || 'Linux Hardened',
        software: input.software.length > 0 ? input.software : ['Custom Banking Service'],
        openPorts: input.openPorts.length > 0 ? input.openPorts : [443],
        cves: input.cves,
      };
      // Register any unknown CVEs with sensible embedded details so the engine scores them
      const missingVulns: Record<string, Vulnerability> = {};
      for (const cveId of input.cves) {
        if (!vulns[cveId]) {
          missingVulns[cveId] = {
            id: cveId,
            cvss: 8.5,
            severity: 'High',
            description: `Custom tracked vulnerability ${cveId} assigned to ${newNode.label}.`,
            exploitAvailable: true,
            publishedDate: new Date().toISOString().slice(0, 10),
            software: newNode.software[0] ?? 'Custom Service',
            remediationEffort: 'Medium',
            nvdStatus: 'cached',
          };
        }
      }
      if (Object.keys(missingVulns).length > 0) {
        setVulns((prev) => ({ ...prev, ...missingVulns }));
      }
      setNodes((prev) => {
        const next = [...prev, newNode];
        persistTopology(next, edges);
        return next;
      });
      setSelectedNodeId(id);
      setGlobalToast(`Added asset "${newNode.label}" to ${newNode.zone} zone.`);
    },
    [edges, persistTopology, vulns]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      if (nodeId === selectedEntry || nodeId === selectedTarget) {
        setGlobalToast('Cannot delete active Entry Point or Crown-Jewel Target.');
        return;
      }
      setNodes((prevNodes) => {
        const nextNodes = prevNodes.filter((n) => n.id !== nodeId);
        setEdges((prevEdges) => {
          const nextEdges = prevEdges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          );
          persistTopology(nextNodes, nextEdges);
          return nextEdges;
        });
        return nextNodes;
      });
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      if (blastRadiusOriginId === nodeId) setBlastRadiusOriginId(null);
    },
    [selectedEntry, selectedTarget, selectedNodeId, blastRadiusOriginId, persistTopology]
  );

  const addEdge = useCallback(
    (source: string, target: string, protocol = 'HTTPS', port = 443) => {
      if (source === target) return;
      if (edges.some((e) => e.source === source && e.target === target)) {
        setGlobalToast('Directed connection already exists between these assets.');
        return;
      }
      const newEdge: NetworkEdge = {
        id: `e-custom-${Date.now().toString(36)}`,
        source,
        target,
        protocol,
        port,
        reachability: 0.85,
        description: `Custom ${protocol}/${port} reachability link`,
      };
      setEdges((prev) => {
        const next = [...prev, newEdge];
        persistTopology(nodes, next);
        return next;
      });
      setGlobalToast(
        `Added edge ${nodeMap.get(source)?.shortLabel ?? source} → ${nodeMap.get(target)?.shortLabel ?? target}.`
      );
    },
    [edges, nodes, nodeMap, persistTopology]
  );

  const deleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((prev) => {
        const next = prev.filter((e) => e.id !== edgeId);
        persistTopology(nodes, next);
        return next;
      });
      setBlockedEdgeIds((prev) => {
        if (!prev.has(edgeId)) return prev;
        const next = new Set(prev);
        next.delete(edgeId);
        return next;
      });
    },
    [nodes, persistTopology]
  );

  const resetDefaultTwin = useCallback(() => {
    safeRemoveKey(TOPOLOGY_STORAGE_KEY);
    setNodes(BANK_NODES);
    setEdges(BANK_EDGES);
    setVulns({ ...INITIAL_VULNERABILITIES });
    setInjectedZeroDays([]);
    resetAllSimulations();
    setSelectedEntry('internet');
    setSelectedTarget('core-banking-db');
    setSelectedNodeId('online-banking');
    setGlobalToast('Restored default 24-node banking digital twin.');
  }, [resetAllSimulations]);

  const exportTopologyJson = useCallback(() => {
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        nodes,
        edges,
      },
      null,
      2
    );
  }, [nodes, edges]);

  const importTopologyJson = useCallback(
    (raw: string): { ok: boolean; error?: string } => {
      try {
        const parsed = JSON.parse(raw) as {
          nodes?: unknown;
          edges?: unknown;
        };
        if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
          return {
            ok: false,
            error: 'JSON must include both "nodes" and "edges" arrays.',
          };
        }
        const validNodes = parsed.nodes as NetworkNode[];
        const validEdges = parsed.edges as NetworkEdge[];
        if (validNodes.length < 2) {
          return { ok: false, error: 'Topology must contain at least 2 nodes.' };
        }
        const idSet = new Set<string>();
        for (const n of validNodes) {
          if (!n.id || !n.label || !n.zone) {
            return {
              ok: false,
              error: 'Every node must define id, label, and zone.',
            };
          }
          idSet.add(n.id);
        }
        for (const e of validEdges) {
          if (!e.id || !e.source || !e.target) {
            return {
              ok: false,
              error: 'Every edge must define id, source, and target.',
            };
          }
          if (!idSet.has(e.source) || !idSet.has(e.target)) {
            return {
              ok: false,
              error: `Edge ${e.id} references an unknown source or target node ID.`,
            };
          }
        }
        setNodes(validNodes);
        setEdges(validEdges);
        persistTopology(validNodes, validEdges);
        if (!idSet.has(selectedEntry)) setSelectedEntry(validNodes[0].id);
        if (!idSet.has(selectedTarget)) setSelectedTarget(validNodes[validNodes.length - 1].id);
        setGlobalToast(
          `Imported topology (${validNodes.length} nodes, ${validEdges.length} edges).`
        );
        return { ok: true };
      } catch (err: unknown) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Invalid JSON syntax.',
        };
      }
    },
    [persistTopology, selectedEntry, selectedTarget]
  );

  // Module 12: Simulate new zero-day on random internet-facing DMZ node
  const injectZeroDay = useCallback(() => {
    const dmzTargets = nodes.filter(
      (n) => n.zone === 'DMZ' && !isolatedNodeIds.has(n.id)
    );
    const target =
      dmzTargets[Math.floor(Math.random() * dmzTargets.length)] ?? nodes[1];
    if (!target) return;

    const cveId = `CVE-2026-${Math.floor(10000 + Math.random() * 89999)}`;
    const newVuln: Vulnerability = {
      id: cveId,
      cvss: 9.8,
      severity: 'Critical',
      description: `Simulated zero-day unauthenticated remote code execution affecting ${target.software[0] ?? target.label}.`,
      exploitAvailable: true,
      publishedDate: new Date().toISOString().slice(0, 10),
      software: target.software[0] ?? target.label,
      remediationEffort: 'Medium',
      nvdStatus: 'cached',
    };

    setVulns((prev) => ({ ...prev, [cveId]: newVuln }));
    setNodes((prev) =>
      prev.map((n) =>
        n.id === target.id ? { ...n, cves: [cveId, ...n.cves] } : n
      )
    );
    setInjectedZeroDays((prev) => [cveId, ...prev]);
    setSelectedNodeId(target.id);
    setGlobalToast(`Zero-Day Alert: ${cveId} (CVSS 9.8) detected on ${target.shortLabel}.`);
  }, [nodes, isolatedNodeIds]);

  const refreshNvd = useCallback(async () => {
    if (nvdSyncing) return;
    const controller = new AbortController();
    nvdAbortRef.current = controller;
    setNvdSyncing(true);
    setNvdProgress({
      completed: 0,
      total: Object.keys(vulns).length,
      currentCveId: 'Initializing',
      liveCount: 0,
      cachedCount: 0,
    });

    const result = await syncVulnerabilitiesFromNvd(
      vulns,
      (prog) => setNvdProgress(prog),
      (cveId, updated) => {
        setVulns((prev) => ({ ...prev, [cveId]: updated }));
      },
      controller.signal
    );

    setNvdSyncing(false);
    setNvdProgress(null);
    setLastSynced(result.timestamp);
  }, [nvdSyncing, vulns]);

  const cancelNvd = useCallback(() => {
    nvdAbortRef.current?.abort();
    setNvdSyncing(false);
    setNvdProgress(null);
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      safeWriteJson(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value: TwinContextValue = {
    activeView,
    setActiveView,
    sidebarCollapsed,
    setSidebarCollapsed,
    commandPaletteOpen,
    setCommandPaletteOpen,
    shortcutsOpen,
    setShortcutsOpen,
    tourOpen,
    setTourOpen,
    nodes,
    edges,
    nodeMap,
    vulns,
    patchedCveIds,
    blockedEdgeIds,
    isolatedNodeIds,
    injectedZeroDays,
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
    graphLayoutMode,
    setGraphLayoutMode,
    graphColorMode,
    setGraphColorMode,
    pathOnlyMode,
    setPathOnlyMode,
    editTwinMode,
    setEditTwinMode,
    zoomTargetRequest,
    flyToNode,
    attackerProfileId,
    setAttackerProfileId,
    attackerProfile,
    effectiveSkillMultiplier,
    blastRadiusOriginId,
    setBlastRadiusOriginId,
    blastRadiusThreshold,
    setBlastRadiusThreshold,
    blastRadiusResult,
    engineOpts,
    baselineOverall,
    currentOverall,
    baselinePaths,
    attackPaths,
    activePath,
    chokePoints,
    cveImpacts,
    optimalPlan,
    simulationSummary,
    segmentationRecommendations,
    nodeExposureMap,
    complianceResults,
    cyberRiskUsd,
    alerts,
    togglePatchCve,
    simulatePatchBatch,
    applyOptimalPatchPlan,
    toggleBlockEdge,
    blockEdgeBatch,
    toggleIsolateNode,
    applyCombinedPlan,
    resetAllSimulations,
    addNode,
    deleteNode,
    addEdge,
    deleteEdge,
    resetDefaultTwin,
    exportTopologyJson,
    importTopologyJson,
    injectZeroDay,
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
    updateSettings,
  };

  return <TwinContext.Provider value={value}>{children}</TwinContext.Provider>;
};

export function useTwin(): TwinContextValue {
  const ctx = useContext(TwinContext);
  if (!ctx) {
    throw new Error('useTwin must be used inside TwinProvider');
  }
  return ctx;
}
