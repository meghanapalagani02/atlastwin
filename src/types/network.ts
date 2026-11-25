export type NetworkZone =
  | 'Internet'
  | 'DMZ'
  | 'Corporate'
  | 'Application'
  | 'Data'
  | 'Payments'
  | 'Management';

export type NodeType =
  | 'external'
  | 'firewall'
  | 'waf'
  | 'server'
  | 'workstation'
  | 'vpn'
  | 'identity'
  | 'database'
  | 'payment'
  | 'security';

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export type RemediationEffort = 'Low' | 'Medium' | 'High';

export interface Vulnerability {
  id: string;
  cvss: number;
  severity: Severity;
  description: string;
  exploitAvailable: boolean;
  publishedDate: string;
  software: string;
  remediationEffort: RemediationEffort;
  nvdStatus: 'cached' | 'live';
}

export interface NetworkNode {
  id: string;
  label: string;
  shortLabel: string;
  zone: NetworkZone;
  type: NodeType;
  criticality: number; // 1-10
  os: string;
  software: string[];
  openPorts: number[];
  cves: string[];
  isEntryPoint?: boolean;
  isCrownJewel?: boolean;
  entryLabel?: string;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  protocol: string;
  port: number;
  reachability: number; // 0-1
  description: string;
}

export interface AttackPath {
  id: string;
  nodes: string[];
  edges: string[];
  hops: number;
  likelihood: number; // 0-1
  riskScore: number; // 0-100
  weakestLinkCve: string;
  weakestLinkNode: string;
  mitreTactics: string[];
  cost: number;
  detectionProbability?: number; // 0-1
}

export interface ChokePoint {
  nodeId: string;
  pathCount: number;
  score: number;
}

export interface CveRiskImpact {
  cveId: string;
  affectedNodeIds: string[];
  riskBefore: number;
  riskAfter: number;
  riskReduction: number;
  reductionPercent: number;
  effort: RemediationEffort;
}

export interface PatchPlanStep {
  step: number;
  cveId: string;
  affectedNodeIds: string[];
  individualReduction: number;
  cumulativeRiskAfter: number;
  cumulativeReductionPercent: number;
  effort: RemediationEffort;
}

export interface SimulationSummary {
  riskBefore: number;
  riskAfter: number;
  riskDelta: number;
  riskReductionPercent: number;
  viablePathsBefore: number;
  viablePathsAfter: number;
  topPathRiskBefore: number;
  topPathRiskAfter: number;
  zoneRiskComparison: {
    zone: NetworkZone;
    before: number;
    after: number;
  }[];
}

// === Extended Module Types ===

export type WorkspaceView =
  | 'command-center'
  | 'threat-simulator'
  | 'compliance'
  | 'asset-inventory'
  | 'incident-replay'
  | 'ai-analyst'
  | 'reports'
  | 'settings';

export type AttackerProfileId =
  | 'script-kiddie'
  | 'ransomware'
  | 'insider'
  | 'nation-state';

export interface AttackerProfile {
  id: AttackerProfileId;
  name: string;
  shortName: string;
  description: string;
  skillMultiplier: number;
  stealthFactor: number; // lower = easier to detect, higher = stealthier
  allowedEntries: string[];
  preferredTargets: string[];
  mitreTechniques: string[];
}

export interface MonteCarloResult {
  iterations: number;
  durationMs: number;
  crownJewelBreachProb: {
    nodeId: string;
    label: string;
    breaches: number;
    probabilityPct: number;
  }[];
  avgTimeToCompromiseHours: number;
  mostFrequentPath: {
    nodes: string[];
    count: number;
    sharePct: number;
  } | null;
  hopHistogram: {
    hops: string;
    count: number;
  }[];
}

export interface SampledAttackLog {
  nodes: string[];
  edges: string[];
  succeeded: boolean;
  targetId: string;
  steps: {
    step: number;
    fromLabel: string;
    toLabel: string;
    protocol: string;
    port: number;
    pSuccess: number;
    roll: number;
    outcome: 'Compromised' | 'Blocked';
  }[];
}

export interface BlastRadiusNode {
  nodeId: string;
  depth: number;
  reachProbability: number;
}

export interface BlastRadiusResult {
  originNodeId: string;
  threshold: number;
  reachableNodes: BlastRadiusNode[];
  crownJewelsExposed: string[];
  estimatedExposureUsd: number;
}

export interface SegmentationRecommendation {
  edgeId: string;
  sourceId: string;
  targetId: string;
  protocol: string;
  port: number;
  riskBefore: number;
  riskAfter: number;
  riskReduction: number;
  pathsEliminated: number;
}

export interface PresetSegmentationRule {
  id: string;
  name: string;
  description: string;
  edgeIds: string[];
}

export interface RemediationRoadmapItem {
  id: string;
  kind: 'patch' | 'segmentation';
  title: string;
  subtitle: string;
  effortHours: number;
  downtime: RemediationEffort;
  riskReduction: number;
  cveId?: string;
  edgeIds?: string[];
  phase: 'Immediate 24h' | 'This Week' | 'This Month';
}

export interface RemediationRoadmap {
  items: RemediationRoadmapItem[];
  totalHours: number;
  riskBefore: number;
  riskAfter: number;
  totalReductionPercent: number;
  curve: { label: string; risk: number }[];
}

export type ComplianceFrameworkId = 'pci-dss' | 'rbi' | 'iso-27001' | 'nist-csf';

export type ComplianceStatus = 'Compliant' | 'Partial' | 'Gap';

export interface ComplianceControl {
  id: string;
  code: string;
  title: string;
  description: string;
  category: 'vulnerability' | 'segmentation' | 'identity' | 'monitoring' | 'backup' | 'edge';
  fixHint: string;
}

export interface EvaluatedControl {
  control: ComplianceControl;
  status: ComplianceStatus;
  affectedNodeIds: string[];
}

export interface ComplianceFrameworkResult {
  id: ComplianceFrameworkId;
  name: string;
  shortName: string;
  score: number;
  compliantCount: number;
  partialCount: number;
  gapCount: number;
  controls: EvaluatedControl[];
}

export interface IncidentTimelineStep {
  step: number;
  timestamp: string;
  mitreId: string;
  mitreName: string;
  nodeId: string;
  title: string;
  description: string;
  siemStatus: 'Missed' | 'Delayed' | 'Caught';
  siemNote: string;
  mitigationHint: string;
  breakingCveId?: string;
  breakingEdgeId?: string;
}

export interface MitreTechnique {
  id: string;
  name: string;
  mitigation: string;
  matchTactics: string[];
  matchNodeTypes?: NodeType[];
  matchZones?: NetworkZone[];
}

export interface MitreTacticColumn {
  tactic: string;
  techniques: MitreTechnique[];
}

export interface AlertItem {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  timeAgo: string;
  targetView: WorkspaceView;
  targetNodeId?: string;
}

export type GraphLayoutMode = 'zoned' | 'force' | 'radial';
export type GraphColorMode = 'severity' | 'heatmap';
export type AnimationIntensity = 'full' | 'reduced' | 'off';
export type AppTheme = 'ivory' | 'navy';

export interface AppSettings {
  assetValues: Record<number, number>; // criticality (1-10) -> USD value
  skillMultiplierOverride: number | null;
  riskThreshold: number;
  nvdSyncIntervalMinutes: number;
  animationIntensity: AnimationIntensity;
  theme: AppTheme;
}

export interface CyberRiskQuantification {
  lowUsd: number;
  expectedUsd: number;
  highUsd: number;
  annualizedLossBeforeUsd: number;
  annualizedLossAfterUsd: number;
  topDrivers: { nodeId: string; label: string; exposureUsd: number; breachProb: number }[];
}
