import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Camera,
  Eye,
  Flame,
  GitBranchPlus,
  Layers,
  Maximize2,
  Pencil,
  Radar,
  RotateCcw,
  Search,
  ShieldOff,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useTwin } from '../context/TwinContext';
import { ZONE_ORDER } from '../data/bankNetwork';
import { getNodeMaxSeverity } from '../engine/attackPathEngine';
import {
  AttackPath,
  ChokePoint,
  GraphLayoutMode,
  NetworkEdge,
  NetworkNode,
  NetworkZone,
  NodeType,
  Vulnerability,
} from '../types/network';

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  data: NetworkNode;
  radius: number;
  targetX: number;
  targetY: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  data: NetworkEdge;
}

interface NetworkGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  vulns: Record<string, Vulnerability>;
  patchedCveIds: Set<string>;
  enabledZones: Set<NetworkZone>;
  attackPaths: AttackPath[];
  baselinePaths: AttackPath[];
  selectedPathId: string | null;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  chokePoints: ChokePoint[];
  playbackHopIndex: number | null;
  zoomTargetRequest: { nodeId: string; nonce: number } | null;
  selectedEntryId: string;
  selectedTargetId: string;
  simulationActive: boolean;
  onOpenTwinEditor?: () => void;
  forcedHighlightNodeId?: string | null;
  compactControls?: boolean;
}

const ZONE_X_FRACTION: Record<NetworkZone, number> = {
  Internet: 0.08,
  DMZ: 0.24,
  Corporate: 0.41,
  Application: 0.58,
  Management: 0.74,
  Data: 0.9,
  Payments: 0.9,
};

const ZONE_Y_FRACTION: Record<NetworkZone, number> = {
  Internet: 0.48,
  DMZ: 0.5,
  Corporate: 0.5,
  Application: 0.5,
  Management: 0.5,
  Data: 0.28,
  Payments: 0.74,
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#B3261E',
  High: '#D9822B',
  Medium: '#C9A227',
  Low: '#5E8C61',
  Patched: '#5E8C61',
  None: 'rgba(250, 247, 240, 0.45)',
};

function getNodeGlyphPath(type: NodeType): string {
  switch (type) {
    case 'external':
      return 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0c2.7 2.8 4 6.1 4 10s-1.3 7.2-4 10m0-20C9.3 4.8 8 8.1 8 12s1.3 7.2 4 10M2.5 9h19M2.5 15h19';
    case 'firewall':
      return 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v5M15 10v5M10 15v4';
    case 'waf':
      return 'M12 2L4 5.5v6c0 5 3.4 9.5 8 10.8 4.6-1.3 8-5.8 8-10.8v-6L12 2zm0 5v9m-3.5-4.5h7';
    case 'vpn':
      return 'M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-7 9v-1a7 7 0 0 1 14 0v1M5 8h2M17 8h2';
    case 'workstation':
      return 'M4 5h16v10H4zM2 18h20M9 15v3M15 15v3';
    case 'identity':
      return 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm3.5-2.5L21 8.5v3h-2.5v2H16v2h-3.5';
    case 'database':
      return 'M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zm8 5c0 1.7-3.6 3-8 3s-8-1.3-8-3m16 5c0 1.7-3.6 3-8 3s-8-1.3-8-3m0-5v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7';
    case 'payment':
      return 'M3 10h18M3 14h18M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm2 10h3';
    case 'security':
      return 'M12 2l7 3v6c0 4.8-3 9.2-7 10.7C8 20.2 5 15.8 5 11V5l7-3zm-2 10l1.5 1.5L15 10';
    case 'server':
    default:
      return 'M4 5h16v5H4zM4 14h16v5H4zM7 7.5h.01M7 16.5h.01M10 7.5h6M10 16.5h6';
  }
}

function getHeatmapColor(score: number): string {
  if (score >= 70) return '#B3261E';
  if (score >= 48) return '#D9822B';
  if (score >= 25) return '#C9A227';
  return '#5E8C61';
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes,
  edges,
  vulns,
  patchedCveIds,
  enabledZones,
  attackPaths,
  baselinePaths,
  selectedPathId,
  selectedNodeId,
  onSelectNode,
  chokePoints,
  playbackHopIndex,
  zoomTargetRequest,
  selectedEntryId,
  selectedTargetId,
  simulationActive,
  onOpenTwinEditor,
  forcedHighlightNodeId,
  compactControls = false,
}) => {
  const {
    blockedEdgeIds,
    toggleBlockEdge,
    isolatedNodeIds,
    toggleIsolateNode,
    blastRadiusOriginId,
    setBlastRadiusOriginId,
    blastRadiusThreshold,
    setBlastRadiusThreshold,
    blastRadiusResult,
    graphLayoutMode,
    setGraphLayoutMode,
    graphColorMode,
    setGraphColorMode,
    pathOnlyMode,
    setPathOnlyMode,
    editTwinMode,
    setEditTwinMode,
    nodeExposureMap,
    flyToNode,
    addEdge,
    deleteEdge,
    deleteNode,
    nodeMap,
  } = useTwin();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);

  const [dimensions, setDimensions] = useState({ width: 880, height: 580 });
  const [hoveredNode, setHoveredNode] = useState<{
    node: NetworkNode;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<{
    edge: NetworkEdge;
    x: number;
    y: number;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    node: NetworkNode;
    x: number;
    y: number;
  } | null>(null);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [nodeSearchQuery, setNodeSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [mountedReveal, setMountedReveal] = useState(false);
  const [zoomTransformState, setZoomTransformState] = useState({ k: 1, x: 0, y: 0 });

  useEffect(() => {
    const t = setTimeout(() => setMountedReveal(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(440, Math.round(entry.contentRect.width));
        const h = Math.max(480, Math.round(entry.contentRect.height));
        setDimensions({ width: w, height: h });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Close context menu on click elsewhere
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  // Compute target coordinates based on active layout mode (Zoned / Force / Radial)
  const { simNodes, simLinks } = useMemo(() => {
    const w = dimensions.width;
    const h = dimensions.height;
    const existingPositions = new Map(
      simNodesRef.current.map((sn) => [sn.id, { x: sn.x, y: sn.y }])
    );

    const byZone = new Map<NetworkZone, NetworkNode[]>();
    for (const n of nodes) {
      if (!byZone.has(n.zone)) byZone.set(n.zone, []);
      byZone.get(n.zone)!.push(n);
    }

    const cx = w / 2;
    const cy = h / 2;

    const builtNodes: SimNode[] = nodes.map((n, globalIdx) => {
      const zList = byZone.get(n.zone) ?? [n];
      const idx = zList.findIndex((item) => item.id === n.id);
      const count = zList.length;

      let targetX = ZONE_X_FRACTION[n.zone] * w;
      let targetY = ZONE_Y_FRACTION[n.zone] * h;

      if (graphLayoutMode === 'zoned') {
        if (n.zone === 'Data') {
          targetY = (0.2 + (idx / Math.max(1, count)) * 0.22) * h;
        } else if (n.zone === 'Payments') {
          targetY = (0.64 + (idx / Math.max(1, count)) * 0.26) * h;
        } else if (count > 1) {
          const span = Math.min(0.76, 0.22 * count);
          const start = 0.5 - span / 2;
          targetY = (start + (idx / (count - 1)) * span) * h;
        }
      } else if (graphLayoutMode === 'radial') {
        if (n.id === 'core-banking-db' || n.id === selectedTargetId) {
          targetX = cx;
          targetY = cy;
        } else {
          const zoneIdx = ZONE_ORDER.indexOf(n.zone);
          const ringRadius = Math.max(85, Math.min(w, h) * 0.44 * ((6 - zoneIdx) / 6 + 0.18));
          const angle = ((globalIdx * 137.5) % 360) * (Math.PI / 180);
          targetX = cx + Math.cos(angle) * ringRadius;
          targetY = cy + Math.sin(angle) * ringRadius;
        }
      } else {
        // Force-directed gentle seed
        targetX = cx + ((globalIdx % 5) - 2) * 85;
        targetY = cy + (Math.floor(globalIdx / 5) - 2) * 75;
      }

      const prev = existingPositions.get(n.id);
      const radius = 14 + Math.round((n.criticality / 10) * 10);

      return {
        id: n.id,
        data: n,
        radius,
        targetX,
        targetY,
        x: prev?.x ?? targetX,
        y: prev?.y ?? targetY,
      };
    });

    const nodeLookup = new Map(builtNodes.map((n) => [n.id, n]));
    const builtLinks: SimLink[] = edges
      .filter((e) => nodeLookup.has(e.source) && nodeLookup.has(e.target))
      .map((e) => ({
        id: e.id,
        data: e,
        source: nodeLookup.get(e.source)!,
        target: nodeLookup.get(e.target)!,
      }));

    simNodesRef.current = builtNodes;
    return { simNodes: builtNodes, simLinks: builtLinks };
  }, [nodes, edges, dimensions.width, dimensions.height, graphLayoutMode, selectedTargetId]);

  const activePath = useMemo(() => {
    if (attackPaths.length === 0) return null;
    return attackPaths.find((p) => p.id === selectedPathId) ?? attackPaths[0];
  }, [attackPaths, selectedPathId]);

  const activeEdgeSet = useMemo(() => new Set(activePath?.edges ?? []), [activePath]);

  const allAttackEdgeSet = useMemo(() => {
    const s = new Set<string>();
    for (const p of attackPaths) {
      for (const eId of p.edges) s.add(eId);
    }
    return s;
  }, [attackPaths]);

  const allAttackNodeSet = useMemo(() => {
    const s = new Set<string>();
    for (const p of attackPaths) {
      for (const nid of p.nodes) s.add(nid);
    }
    return s;
  }, [attackPaths]);

  const brokenEdgeSet = useMemo(() => {
    if (!simulationActive) return new Set<string>();
    const activeIds = new Set(
      attackPaths.filter((p) => p.riskScore >= 2.5).flatMap((p) => p.edges)
    );
    const broken = new Set<string>();
    for (const bp of baselinePaths) {
      for (const eId of bp.edges) {
        if (!activeIds.has(eId)) broken.add(eId);
      }
    }
    return broken;
  }, [simulationActive, attackPaths, baselinePaths]);

  const chokePointRankMap = useMemo(() => {
    const map = new Map<string, number>();
    chokePoints.forEach((cp, idx) => map.set(cp.nodeId, idx + 1));
    return map;
  }, [chokePoints]);

  const blastDepthMap = useMemo(() => {
    const map = new Map<string, { depth: number; prob: number }>();
    if (!blastRadiusResult) return map;
    map.set(blastRadiusResult.originNodeId, { depth: 0, prob: 1 });
    for (const rn of blastRadiusResult.reachableNodes) {
      map.set(rn.nodeId, { depth: rn.depth, prob: rn.reachProbability });
    }
    return map;
  }, [blastRadiusResult]);

  // Initialize & run D3 force simulation + zoom + drag
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    const viewport = svg.select<SVGGElement>('g.graph-viewport');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.45, 2.6])
      .on('zoom', (event) => {
        viewport.attr('transform', event.transform.toString());
        setZoomTransformState({
          k: event.transform.k,
          x: event.transform.x,
          y: event.transform.y,
        });
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom).on('dblclick.zoom', null);

    const xStrength = graphLayoutMode === 'force' ? 0.08 : 0.68;
    const yStrength = graphLayoutMode === 'force' ? 0.08 : 0.58;
    const chargeStrength = graphLayoutMode === 'force' ? -280 : -160;

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(graphLayoutMode === 'force' ? 125 : 105)
          .strength(graphLayoutMode === 'force' ? 0.28 : 0.08)
      )
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('x', d3.forceX<SimNode>((d) => d.targetX).strength(xStrength))
      .force('y', d3.forceY<SimNode>((d) => d.targetY).strength(yStrength))
      .force('collide', d3.forceCollide<SimNode>((d) => d.radius + 16).strength(0.9))
      .alpha(0.6)
      .alphaDecay(0.04);

    simulationRef.current = simulation;

    const linkSel = viewport
      .selectAll<SVGPathElement, SimLink>('path.graph-edge')
      .data(simLinks, function (d) {
        return d ? d.id : (this as Element).getAttribute('data-id') ?? '';
      });

    const nodeSel = viewport
      .selectAll<SVGGElement, SimNode>('g.graph-node')
      .data(simNodes, function (d) {
        return d ? d.id : (this as Element).getAttribute('data-id') ?? '';
      });

    const updatePositions = () => {
      linkSel.attr('d', (d) => {
        if (!d || !d.source || !d.target) return '';
        const s = d.source as SimNode;
        const t = d.target as SimNode;
        const sx = s.x ?? 0;
        const sy = s.y ?? 0;
        const tx = t.x ?? 0;
        const ty = t.y ?? 0;
        const dx = tx - sx;
        const dy = ty - sy;
        const dist = Math.hypot(dx, dy) || 1;
        const dr = dist * 1.65;
        const ux = dx / dist;
        const uy = dy / dist;
        const ex = tx - ux * (t.radius + 6);
        const ey = ty - uy * (t.radius + 6);
        const startX = sx + ux * (s.radius + 2);
        const startY = sy + uy * (s.radius + 2);
        return `M${startX},${startY}A${dr},${dr} 0 0,1 ${ex},${ey}`;
      });

      nodeSel.attr('transform', (d) =>
        d ? `translate(${d.x ?? 0},${d.y ?? 0})` : ''
      );
    };

    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        if (!d) return;
        if (!event.active) simulation.alphaTarget(0.22).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        if (!d) return;
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!d) return;
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeSel.call(drag);
    updatePositions();
    simulation.on('tick', updatePositions);

    return () => {
      simulation.stop();
    };
  }, [simNodes, simLinks, graphLayoutMode]);

  // Smooth zoom to requested node
  useEffect(() => {
    if (!zoomTargetRequest || !svgRef.current || !zoomBehaviorRef.current) return;
    const node = simNodesRef.current.find((n) => n.id === zoomTargetRequest.nodeId);
    if (!node || node.x === undefined || node.y === undefined) return;

    const svg = d3.select(svgRef.current);
    const scale = 1.45;
    const tx = dimensions.width / 2 - node.x * scale;
    const ty = dimensions.height / 2 - node.y * scale;

    svg
      .transition()
      .duration(650)
      .ease(d3.easeCubicInOut)
      .call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      );
  }, [zoomTargetRequest, dimensions.width, dimensions.height]);

  const handleZoomBy = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(220)
      .call(zoomBehaviorRef.current.scaleBy, factor);
  };

  const handleResetView = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(350)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  const handleZoomToFit = () => {
    if (!svgRef.current || !zoomBehaviorRef.current || simNodesRef.current.length === 0) return;
    const xs = simNodesRef.current.map((n) => n.x ?? n.targetX);
    const ys = simNodesRef.current.map((n) => n.y ?? n.targetY);
    const minX = Math.min(...xs) - 48;
    const maxX = Math.max(...xs) + 48;
    const minY = Math.min(...ys) - 48;
    const maxY = Math.max(...ys) + 48;
    const bw = Math.max(100, maxX - minX);
    const bh = Math.max(100, maxY - minY);
    const scale = Math.min(1.8, Math.max(0.55, 0.9 * Math.min(dimensions.width / bw, dimensions.height / bh)));
    const tx = dimensions.width / 2 - ((minX + maxX) / 2) * scale;
    const ty = dimensions.height / 2 - ((minY + maxY) / 2) * scale;
    d3.select(svgRef.current)
      .transition()
      .duration(400)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  };

  // Module 13: Export PNG via SVG -> Canvas
  const handleExportPng = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', String(dimensions.width));
    bgRect.setAttribute('height', String(dimensions.height));
    bgRect.setAttribute('fill', '#0B1F3A');
    clone.insertBefore(bgRect, clone.firstChild);

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = dimensions.width * 2;
      canvas.height = dimensions.height * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `atlastwin-topology-${new Date().toISOString().slice(0, 10)}.png`;
        link.click();
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const playbackNodeId =
    forcedHighlightNodeId ??
    (playbackHopIndex !== null && activePath
      ? activePath.nodes[Math.min(playbackHopIndex, activePath.nodes.length - 1)]
      : null);
  const playbackEdgeId =
    playbackHopIndex !== null && activePath && playbackHopIndex > 0
      ? activePath.edges[playbackHopIndex - 1]
      : null;

  const zoneColumns = useMemo(() => {
    const w = dimensions.width;
    return [
      { label: 'Internet', x: 0.08 * w, y: 24 },
      { label: 'DMZ', x: 0.24 * w, y: 24 },
      { label: 'Corporate', x: 0.41 * w, y: 24 },
      { label: 'Application', x: 0.58 * w, y: 24 },
      { label: 'Management', x: 0.74 * w, y: 24 },
      { label: 'Data & Payments', x: 0.9 * w, y: 24 },
    ];
  }, [dimensions.width]);

  const matchingSearchNodes = useMemo(() => {
    const q = nodeSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return nodes
      .filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.shortLabel.toLowerCase().includes(q) ||
          n.zone.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [nodeSearchQuery, nodes]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-h-[540px] lg:min-h-[600px] bg-[#0B1F3A] rounded-xl border border-[#C9A227]/40 overflow-hidden shadow-sm select-none"
    >
      {/* Top-Left Title + Quick Graph Search */}
      <div className="no-print absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2">
        <div className="bg-[#1B3358]/90 border border-[#C9A227]/35 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-[#E6D49A]">
            Live Digital Twin
          </span>
          {activePath && (
            <span className="hidden sm:inline text-[11px] font-mono tabular-nums text-[#FAF7F0]/80">
              · {activePath.hops} hops · Risk {activePath.riskScore.toFixed(1)}
            </span>
          )}
        </div>

        {!compactControls && (
          <div className="relative">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1B3358]/90 border border-[#C9A227]/35 text-xs text-[#FAF7F0]">
              <Search className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
              <input
                type="text"
                value={nodeSearchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
                onChange={(e) => setNodeSearchQuery(e.target.value)}
                placeholder="Find node..."
                className="w-24 sm:w-32 bg-transparent text-[11px] text-[#FAF7F0] placeholder-[#E6D49A]/50 focus:outline-none"
              />
              {nodeSearchQuery && (
                <button
                  type="button"
                  onClick={() => setNodeSearchQuery('')}
                  className="text-[#E6D49A] hover:text-[#FAF7F0] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {searchFocused && matchingSearchNodes.length > 0 && (
              <div className="absolute left-0 mt-1 w-56 bg-[#FAF7F0] text-[#0B1F3A] border border-[#C9A227] rounded-lg shadow-xl overflow-hidden z-30">
                {matchingSearchNodes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onMouseDown={() => {
                      flyToNode(n.id);
                      setNodeSearchQuery('');
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-[#F1ECDD] flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="font-medium truncate">{n.shortLabel}</span>
                    <span className="font-mono text-[10px] text-[#0B1F3A]/65">{n.zone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top-Right Graph Toolbar */}
      <div className="no-print absolute top-3 right-3 z-20 flex flex-wrap items-center justify-end gap-1.5 max-w-[65%]">
        {!compactControls && (
          <>
            {/* Layout Switcher */}
            <div className="inline-flex items-center bg-[#1B3358]/90 border border-[#C9A227]/35 rounded-lg p-0.5 text-[10px] font-semibold">
              {(['zoned', 'force', 'radial'] as GraphLayoutMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setGraphLayoutMode(mode)}
                  className={`px-2 py-1 rounded capitalize cursor-pointer transition-colors ${
                    graphLayoutMode === mode
                      ? 'bg-[#C9A227] text-[#0B1F3A]'
                      : 'text-[#FAF7F0]/80 hover:text-[#FAF7F0]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Heatmap / Path-Only / Edit Twin toggles */}
            <button
              type="button"
              onClick={() =>
                setGraphColorMode(graphColorMode === 'severity' ? 'heatmap' : 'severity')
              }
              title="Toggle vulnerability severity vs exposure heatmap"
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer ${
                graphColorMode === 'heatmap'
                  ? 'bg-[#C9A227] text-[#0B1F3A] border-[#C9A227]'
                  : 'bg-[#1B3358]/90 text-[#FAF7F0] border-[#C9A227]/35 hover:border-[#C9A227]'
              }`}
            >
              <Flame className="w-3 h-3" aria-hidden="true" />
              <span className="hidden xl:inline">Heatmap</span>
            </button>

            <button
              type="button"
              onClick={() => setPathOnlyMode((p) => !p)}
              title="Show only attack path nodes and edges"
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer ${
                pathOnlyMode
                  ? 'bg-[#C9A227] text-[#0B1F3A] border-[#C9A227]'
                  : 'bg-[#1B3358]/90 text-[#FAF7F0] border-[#C9A227]/35 hover:border-[#C9A227]'
              }`}
            >
              <Eye className="w-3 h-3" aria-hidden="true" />
              <span className="hidden xl:inline">Path Only</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditTwinMode((p) => !p);
                setConnectSourceId(null);
              }}
              title="Toggle Edit Twin mode (connect edges or open editor)"
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer ${
                editTwinMode
                  ? 'bg-[#C9A227] text-[#0B1F3A] border-[#C9A227]'
                  : 'bg-[#1B3358]/90 text-[#FAF7F0] border-[#C9A227]/35 hover:border-[#C9A227]'
              }`}
            >
              <Pencil className="w-3 h-3" aria-hidden="true" />
              <span className="hidden xl:inline">Edit Twin</span>
            </button>

            {onOpenTwinEditor && (
              <button
                type="button"
                onClick={onOpenTwinEditor}
                title="Open Topology Editor (Add Node / Import JSON)"
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#1B3358]/90 text-[#E6D49A] border border-[#C9A227]/35 hover:border-[#C9A227] text-[10px] font-semibold cursor-pointer"
              >
                <Layers className="w-3 h-3" aria-hidden="true" />
                <span className="hidden xl:inline">Editor</span>
              </button>
            )}
          </>
        )}

        {/* Zoom + Export PNG */}
        <div className="flex items-center gap-0.5 bg-[#1B3358]/90 border border-[#C9A227]/35 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => handleZoomBy(1.25)}
            aria-label="Zoom in"
            title="Zoom in"
            className="p-1.5 rounded text-[#FAF7F0] hover:bg-[#0B1F3A] hover:text-[#C9A227] cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleZoomBy(0.8)}
            aria-label="Zoom out"
            title="Zoom out"
            className="p-1.5 rounded text-[#FAF7F0] hover:bg-[#0B1F3A] hover:text-[#C9A227] cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomToFit}
            aria-label="Zoom to fit"
            title="Zoom to fit"
            className="p-1.5 rounded text-[#FAF7F0] hover:bg-[#0B1F3A] hover:text-[#C9A227] cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            aria-label="Reset zoom"
            title="Reset zoom"
            className="p-1.5 rounded text-[#FAF7F0] hover:bg-[#0B1F3A] hover:text-[#C9A227] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {!compactControls && (
            <button
              type="button"
              onClick={handleExportPng}
              aria-label="Export graph as PNG"
              title="Export PNG"
              className="p-1.5 rounded text-[#E6D49A] hover:bg-[#0B1F3A] hover:text-[#C9A227] cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Edit Twin Helper Banner */}
      {editTwinMode && (
        <div className="no-print absolute top-14 left-3 z-20 bg-[#C9A227] text-[#0B1F3A] rounded-lg px-3 py-1.5 text-[11px] font-semibold flex items-center gap-2 shadow-md">
          <GitBranchPlus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            {connectSourceId
              ? `Click target node to connect from "${nodeMap.get(connectSourceId)?.shortLabel}" (or click edge to delete)`
              : 'Edit Twin Mode: Right-click node to connect/delete, or click an edge to remove it.'}
          </span>
          {connectSourceId && (
            <button
              type="button"
              onClick={() => setConnectSourceId(null)}
              className="underline font-bold cursor-pointer ml-1"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        role="img"
        aria-label="Interactive bank network attack-path topology graph"
      >
        <defs>
          <marker
            id="arrow-baseline"
            viewBox="0 -5 10 10"
            refX="8"
            refY="0"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M0,-4L8,0L0,4" fill="rgba(250, 247, 240, 0.32)" />
          </marker>

          <marker
            id="arrow-gold"
            viewBox="0 -5 10 10"
            refX="8"
            refY="0"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,-4.5L9,0L0,4.5" fill="#C9A227" />
          </marker>

          <marker
            id="arrow-blocked"
            viewBox="0 -5 10 10"
            refX="8"
            refY="0"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M0,-4L8,0L0,4" fill="#B3261E" />
          </marker>

          <filter id="gold-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="graph-viewport">
          {/* Subtle Zone Band Dividers & Labels (Zoned mode only) */}
          {graphLayoutMode === 'zoned' && (
            <g className="zone-guides pointer-events-none">
              {[0.16, 0.325, 0.495, 0.66, 0.82].map((frac, i) => (
                <line
                  key={i}
                  x1={frac * dimensions.width}
                  y1={46}
                  x2={frac * dimensions.width}
                  y2={dimensions.height - 18}
                  stroke="rgba(230, 212, 154, 0.12)"
                  strokeDasharray="3 5"
                />
              ))}
              <line
                x1={0.82 * dimensions.width}
                y1={0.51 * dimensions.height}
                x2={dimensions.width - 16}
                y2={0.51 * dimensions.height}
                stroke="rgba(230, 212, 154, 0.12)"
                strokeDasharray="3 5"
              />
              {zoneColumns.map((zc) => (
                <text
                  key={zc.label}
                  x={zc.x}
                  y={zc.y + 22}
                  textAnchor="middle"
                  fill="rgba(230, 212, 154, 0.52)"
                  fontSize="10"
                  fontWeight="600"
                  letterSpacing="0.08em"
                >
                  {zc.label.toUpperCase()}
                </text>
              ))}
              <text
                x={0.9 * dimensions.width}
                y={0.51 * dimensions.height + 16}
                textAnchor="middle"
                fill="rgba(230, 212, 154, 0.45)"
                fontSize="9"
                fontWeight="600"
                letterSpacing="0.08em"
              >
                PAYMENTS
              </text>
            </g>
          )}

          {/* Directed Edges */}
          <g className="graph-edges">
            {simLinks.map((link) => {
              const sNode = link.source as SimNode;
              const tNode = link.target as SimNode;
              const isZoneVisible =
                enabledZones.has(sNode.data.zone) && enabledZones.has(tNode.data.zone);

              const isPrimaryPath = activeEdgeSet.has(link.id);
              const isAnyAttackPath = allAttackEdgeSet.has(link.id);
              const isBroken = brokenEdgeSet.has(link.id);
              const isBlocked = blockedEdgeIds.has(link.id);
              const isPlaybackEdge = playbackEdgeId === link.id;
              const hiddenByPathOnly = pathOnlyMode && !isAnyAttackPath && !isBlocked;

              let stroke = 'rgba(250, 247, 240, 0.18)';
              let strokeWidth = 1.3;
              let strokeDasharray: string | undefined = undefined;
              let opacity = !isZoneVisible || hiddenByPathOnly ? 0.06 : 1;
              let markerEnd = 'url(#arrow-baseline)';
              let className = 'graph-edge cursor-pointer transition-opacity duration-300';

              if (isBlocked) {
                stroke = '#B3261E';
                strokeWidth = 2;
                strokeDasharray = '4 4';
                markerEnd = 'url(#arrow-blocked)';
                opacity = 0.85;
              } else if (isPrimaryPath) {
                stroke = '#C9A227';
                strokeWidth = isPlaybackEdge ? 3.5 : 2.6;
                strokeDasharray = '8 6';
                markerEnd = 'url(#arrow-gold)';
                className = 'graph-edge cursor-pointer animate-gold-flow';
              } else if (isAnyAttackPath) {
                stroke = 'rgba(201, 162, 39, 0.44)';
                strokeWidth = 1.7;
                strokeDasharray = '5 5';
                markerEnd = 'url(#arrow-gold)';
              } else if (isBroken) {
                stroke = 'rgba(94, 140, 97, 0.25)';
                strokeDasharray = '3 6';
                opacity = 0.25;
              }

              return (
                <path
                  key={link.id}
                  data-id={link.id}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  markerEnd={markerEnd}
                  opacity={opacity}
                  filter={isPrimaryPath ? 'url(#gold-glow)' : undefined}
                  className={className}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editTwinMode) {
                      deleteEdge(link.id);
                    } else {
                      toggleBlockEdge(link.id);
                    }
                  }}
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setHoveredEdge({
                      edge: link.data,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }}
                  onMouseMove={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setHoveredEdge({
                      edge: link.data,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }}
                  onMouseLeave={() => setHoveredEdge(null)}
                />
              );
            })}
          </g>

          {/* Network Asset Nodes */}
          <g className="graph-nodes">
            {simNodes.map((simNode) => {
              const node = simNode.data;
              const isZoneVisible = enabledZones.has(node.zone);
              const maxSeverity = getNodeMaxSeverity(node, vulns, patchedCveIds);
              const exposureScore = nodeExposureMap.get(node.id) ?? 0;
              const ringColor =
                graphColorMode === 'heatmap'
                  ? getHeatmapColor(exposureScore)
                  : SEVERITY_COLORS[maxSeverity] ?? SEVERITY_COLORS.None;

              const isPatched = maxSeverity === 'Patched';
              const isIsolated = isolatedNodeIds.has(node.id);
              const isSelected = selectedNodeId === node.id;
              const isInActivePath = activePath?.nodes.includes(node.id) ?? false;
              const isInAnyPath = allAttackNodeSet.has(node.id);
              const isPlaybackActive = playbackNodeId === node.id;
              const isEntry = node.id === selectedEntryId;
              const isTarget = node.id === selectedTargetId;
              const chokeRank = chokePointRankMap.get(node.id);
              const blastInfo = blastDepthMap.get(node.id);
              const zoneDelay = ZONE_ORDER.indexOf(node.zone) * 60;

              const dimByPathOnly = pathOnlyMode && !isInAnyPath && !isSelected;
              const dimByBlast = blastRadiusResult !== null && !blastInfo;

              let nodeOpacity = 1;
              if (!mountedReveal) nodeOpacity = 0;
              else if (!isZoneVisible || dimByPathOnly) nodeOpacity = 0.1;
              else if (dimByBlast) nodeOpacity = 0.2;
              else if (isIsolated) nodeOpacity = 0.4;

              const blastColor = blastInfo
                ? blastInfo.depth === 0
                  ? '#C9A227'
                  : blastInfo.depth === 1
                    ? 'rgba(201, 162, 39, 0.85)'
                    : blastInfo.depth === 2
                      ? 'rgba(217, 130, 43, 0.72)'
                      : 'rgba(230, 212, 154, 0.5)'
                : undefined;

              return (
                <g
                  key={node.id}
                  data-id={node.id}
                  className="graph-node cursor-pointer"
                  style={{
                    opacity: nodeOpacity,
                    transition: `opacity 400ms ease ${zoneDelay}ms`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editTwinMode && connectSourceId) {
                      if (connectSourceId !== node.id) {
                        addEdge(connectSourceId, node.id, 'HTTPS', 443);
                      }
                      setConnectSourceId(null);
                      return;
                    }
                    onSelectNode(node.id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setContextMenu({
                      node,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }}
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setHoveredNode({
                      node,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }}
                  onMouseMove={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setHoveredNode({
                      node,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {isPlaybackActive && (
                    <circle
                      r={simNode.radius + 9}
                      fill="none"
                      stroke="#C9A227"
                      strokeWidth={2.5}
                      className="animate-gold-pulse-ring"
                    />
                  )}

                  {blastInfo && (
                    <circle
                      r={simNode.radius + 7}
                      fill={blastColor}
                      fillOpacity={0.18}
                      stroke={blastColor}
                      strokeWidth={2}
                    />
                  )}

                  {(isSelected || isEntry || isTarget || isInActivePath || connectSourceId === node.id) && (
                    <circle
                      r={simNode.radius + 5}
                      fill="none"
                      stroke={
                        connectSourceId === node.id
                          ? '#9ED1A2'
                          : isSelected
                            ? '#FAF7F0'
                            : '#C9A227'
                      }
                      strokeWidth={isSelected ? 2 : 1.5}
                      strokeDasharray={isTarget ? '4 2' : undefined}
                      opacity={isSelected ? 0.95 : 0.72}
                    />
                  )}

                  <circle
                    r={simNode.radius}
                    fill={
                      isIsolated
                        ? '#2A1820'
                        : graphColorMode === 'heatmap'
                          ? getHeatmapColor(exposureScore)
                          : isInActivePath
                            ? '#1B3358'
                            : '#13294B'
                    }
                    fillOpacity={graphColorMode === 'heatmap' && !isIsolated ? 0.28 : 1}
                    stroke={isIsolated ? '#B3261E' : ringColor}
                    strokeWidth={isPatched ? 3.2 : 2.8}
                    strokeDasharray={isIsolated ? '3 2' : undefined}
                    style={{ transition: 'stroke 350ms ease, fill 200ms ease' }}
                  />

                  <g transform="translate(-9, -9) scale(0.75)" className="pointer-events-none">
                    <path
                      d={getNodeGlyphPath(node.type)}
                      fill="none"
                      stroke={isIsolated ? '#B3261E' : isPatched ? '#9ED1A2' : '#FAF7F0'}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>

                  {isPatched && !isIsolated && (
                    <g
                      transform={`translate(${simNode.radius * 0.65}, ${simNode.radius * 0.58})`}
                      className="pointer-events-none"
                    >
                      <circle r="7.5" fill="#5E8C61" stroke="#0B1F3A" strokeWidth="1.5" />
                      <path
                        d="M-2.5 0.2L-0.8 2L2.8 -1.8"
                        fill="none"
                        stroke="#FAF7F0"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}

                  {chokeRank && !isIsolated && (
                    <g
                      transform={`translate(${simNode.radius * 0.68}, ${-simNode.radius * 0.72})`}
                      className="pointer-events-none"
                    >
                      <circle r="8.5" fill="#C9A227" stroke="#0B1F3A" strokeWidth="1.5" />
                      <path
                        d="M-4 2.5L-4.5 -2L-1.8 0.2L0 -3L1.8 0.2L4.5 -2L4 2.5Z"
                        fill="#0B1F3A"
                      />
                    </g>
                  )}

                  <text
                    y={simNode.radius + 14}
                    textAnchor="middle"
                    fill="#FAF7F0"
                    fontSize="10.5"
                    fontWeight={isInActivePath || isSelected ? '600' : '500'}
                    className="pointer-events-none"
                    style={{
                      textShadow: '0 1px 3px rgba(11, 31, 58, 0.95)',
                    }}
                  >
                    {node.shortLabel}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Dynamic Bottom-Left Legend */}
      {!compactControls && (
        <div className="no-print absolute bottom-3 left-3 z-10 bg-[#1B3358]/88 border border-[#C9A227]/35 rounded-lg px-2.5 py-1.5 flex flex-wrap items-center gap-2.5 text-[10px] text-[#FAF7F0]">
          {blastRadiusResult ? (
            <>
              <span className="font-semibold text-[#C9A227]">Blast Depth:</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#C9A227]" /> Origin
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#D9822B]" /> 2+ Hops
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#E6D49A]" /> Distant
              </span>
            </>
          ) : graphColorMode === 'heatmap' ? (
            <>
              <span className="font-semibold text-[#C9A227]">Exposure:</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#B3261E]" /> 70+
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#D9822B]" /> 48+
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#C9A227]" /> 25+
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#5E8C61]" /> Low
              </span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#B3261E]" /> Critical
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#D9822B]" /> High
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#C9A227]" /> Attack Path
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#5E8C61]" /> Patched
              </span>
            </>
          )}
        </div>
      )}

      {/* Minimap in Bottom-Right Corner */}
      {!compactControls && (
        <div className="no-print hidden sm:block absolute bottom-3 right-3 z-10 w-[132px] h-[84px] bg-[#081528]/90 border border-[#C9A227]/40 rounded-lg overflow-hidden shadow-md pointer-events-none">
          <svg
            width="132"
            height="84"
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          >
            {simNodes.map((sn) => (
              <circle
                key={sn.id}
                cx={sn.targetX}
                cy={sn.targetY}
                r={11}
                fill={
                  activePath?.nodes.includes(sn.id)
                    ? '#C9A227'
                    : sn.id === selectedNodeId
                      ? '#FAF7F0'
                      : 'rgba(230, 212, 154, 0.4)'
                }
              />
            ))}
            <rect
              x={-zoomTransformState.x / zoomTransformState.k}
              y={-zoomTransformState.y / zoomTransformState.k}
              width={dimensions.width / zoomTransformState.k}
              height={dimensions.height / zoomTransformState.k}
              fill="none"
              stroke="#C9A227"
              strokeWidth={8}
              strokeOpacity={0.75}
            />
          </svg>
        </div>
      )}

      {/* Floating Blast Radius Summary Card (Module 3) */}
      {blastRadiusResult && !compactControls && (
        <div className="no-print absolute bottom-12 left-3 z-20 w-72 bg-[#FAF7F0] text-[#0B1F3A] border border-[#C9A227] rounded-xl p-3.5 shadow-xl animate-fade-in-smooth">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Radar className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
              <h4 className="font-display text-xs font-bold">
                Blast Radius: {nodeMap.get(blastRadiusResult.originNodeId)?.shortLabel}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setBlastRadiusOriginId(null)}
              className="p-0.5 rounded hover:bg-[#F1ECDD] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-2">
            <div className="flex justify-between text-[10px] font-mono text-[#0B1F3A]/75">
              <span>Reachability Threshold</span>
              <span>{(blastRadiusThreshold * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={80}
              step={5}
              value={Math.round(blastRadiusThreshold * 100)}
              onChange={(e) => setBlastRadiusThreshold(Number(e.target.value) / 100)}
              className="w-full accent-[#C9A227] cursor-pointer"
            />
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5 text-center bg-[#F1ECDD] rounded-lg p-2 text-[10px]">
            <div>
              <div className="font-mono font-bold text-xs">
                {blastRadiusResult.reachableNodes.length}
              </div>
              <div className="text-[#0B1F3A]/65">Assets</div>
            </div>
            <div>
              <div className="font-mono font-bold text-xs text-[#B3261E]">
                {blastRadiusResult.crownJewelsExposed.length}
              </div>
              <div className="text-[#0B1F3A]/65">Jewels</div>
            </div>
            <div>
              <div className="font-mono font-bold text-xs">
                ${(blastRadiusResult.estimatedExposureUsd / 1_000_000).toFixed(1)}M
              </div>
              <div className="text-[#0B1F3A]/65">Exposure</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              toggleIsolateNode(blastRadiusResult.originNodeId);
              setBlastRadiusOriginId(null);
            }}
            className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#0B1F3A] text-[#FAF7F0] text-[11px] font-semibold hover:bg-[#1B3358] cursor-pointer"
          >
            <ShieldOff className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
            <span>Isolate this node</span>
          </button>
        </div>
      )}

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            left: Math.min(dimensions.width - 190, Math.max(8, contextMenu.x)),
            top: Math.min(dimensions.height - 150, Math.max(8, contextMenu.y)),
          }}
          className="no-print absolute z-30 w-44 bg-[#FAF7F0] text-[#0B1F3A] border border-[#C9A227] rounded-xl shadow-2xl py-1.5 text-xs"
        >
          <div className="px-3 py-1 border-b border-[#E6D49A]/70 font-semibold truncate">
            {contextMenu.node.shortLabel}
          </div>
          <button
            type="button"
            onClick={() => {
              setBlastRadiusOriginId(contextMenu.node.id);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-[#F1ECDD] flex items-center gap-2 cursor-pointer"
          >
            <Radar className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Blast Radius</span>
          </button>
          <button
            type="button"
            onClick={() => {
              toggleIsolateNode(contextMenu.node.id);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-[#F1ECDD] flex items-center gap-2 cursor-pointer"
          >
            <ShieldOff className="w-3.5 h-3.5 text-[#B3261E]" />
            <span>
              {isolatedNodeIds.has(contextMenu.node.id) ? 'Restore Node' : 'Isolate Node'}
            </span>
          </button>
          {editTwinMode && (
            <>
              <button
                type="button"
                onClick={() => {
                  setConnectSourceId(contextMenu.node.id);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#F1ECDD] flex items-center gap-2 cursor-pointer"
              >
                <GitBranchPlus className="w-3.5 h-3.5 text-[#0B1F3A]" />
                <span>Connect Edge From Here</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteNode(contextMenu.node.id);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left text-[#B3261E] hover:bg-[#B3261E]/10 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Node</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Node Hover Tooltip */}
      {hoveredNode && !contextMenu && (
        <div
          className="pointer-events-none absolute z-20 bg-[#FAF7F0] text-[#0B1F3A] border border-[#C9A227] rounded-lg px-3 py-2 shadow-lg max-w-[235px]"
          style={{
            left: Math.min(dimensions.width - 245, Math.max(12, hoveredNode.x + 14)),
            top: Math.min(dimensions.height - 110, Math.max(12, hoveredNode.y - 12)),
          }}
        >
          <div className="text-xs font-semibold leading-snug">{hoveredNode.node.label}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-[#0B1F3A]/80">
            <span>{hoveredNode.node.zone}</span>
            <span aria-hidden="true">·</span>
            <span>Crit {hoveredNode.node.criticality}/10</span>
            <span aria-hidden="true">·</span>
            <span>Exp {(nodeExposureMap.get(hoveredNode.node.id) ?? 0).toFixed(0)}</span>
          </div>
          <div className="mt-1 text-[11px] text-[#0B1F3A]/75">
            {hoveredNode.node.cves.filter((c) => !patchedCveIds.has(c)).length} active CVEs ·{' '}
            {isolatedNodeIds.has(hoveredNode.node.id)
              ? 'Isolated'
              : getNodeMaxSeverity(hoveredNode.node, vulns, patchedCveIds)}
          </div>
        </div>
      )}

      {/* Edge Hover Tooltip */}
      {!hoveredNode && hoveredEdge && !contextMenu && (
        <div
          className="pointer-events-none absolute z-20 bg-[#1B3358] text-[#FAF7F0] border border-[#C9A227]/60 rounded-lg px-3 py-2 shadow-lg max-w-[235px]"
          style={{
            left: Math.min(dimensions.width - 245, Math.max(12, hoveredEdge.x + 14)),
            top: Math.min(dimensions.height - 95, Math.max(12, hoveredEdge.y - 12)),
          }}
        >
          <div className="text-[11px] font-mono tabular-nums text-[#E6D49A] font-semibold">
            {hoveredEdge.edge.protocol} / Port {hoveredEdge.edge.port}{' '}
            {blockedEdgeIds.has(hoveredEdge.edge.id) ? '(BLOCKED)' : ''}
          </div>
          <div className="text-[11px] text-[#FAF7F0]/90 mt-0.5">
            {hoveredEdge.edge.description}
          </div>
          <div className="text-[10px] font-mono tabular-nums text-[#E6D49A]/80 mt-0.5">
            {editTwinMode
              ? 'Click edge to delete'
              : blockedEdgeIds.has(hoveredEdge.edge.id)
                ? 'Click edge to unblock'
                : `Reachability ${(hoveredEdge.edge.reachability * 100).toFixed(0)}% · Click to block`}
          </div>
        </div>
      )}
    </div>
  );
};
