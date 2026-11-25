import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  GitBranchPlus,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useTwin } from '../context/TwinContext';
import { ZONE_ORDER } from '../data/bankNetwork';
import { NetworkZone, NodeType } from '../types/network';

interface TwinEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NODE_TYPES: NodeType[] = [
  'server',
  'workstation',
  'database',
  'payment',
  'waf',
  'firewall',
  'vpn',
  'identity',
  'security',
];

export const TwinEditorModal: React.FC<TwinEditorModalProps> = ({ isOpen, onClose }) => {
  const {
    nodes,
    edges,
    nodeMap,
    addNode,
    deleteNode,
    addEdge,
    deleteEdge,
    resetDefaultTwin,
    exportTopologyJson,
    importTopologyJson,
  } = useTwin();

  const [tab, setTab] = useState<'nodes' | 'edges' | 'json'>('nodes');

  // Add Node form state
  const [label, setLabel] = useState('');
  const [zone, setZone] = useState<NetworkZone>('Application');
  const [type, setType] = useState<NodeType>('server');
  const [criticality, setCriticality] = useState(7);
  const [os, setOs] = useState('RHEL 9 Hardened');
  const [softwareStr, setSoftwareStr] = useState('Apache Tomcat 9.0');
  const [portsStr, setPortsStr] = useState('443, 8443');
  const [cvesStr, setCvesStr] = useState('CVE-2021-44228');

  // Add Edge form state
  const [edgeSource, setEdgeSource] = useState(nodes[0]?.id ?? 'internet');
  const [edgeTarget, setEdgeTarget] = useState(nodes[1]?.id ?? 'perimeter-fw');
  const [edgeProtocol, setEdgeProtocol] = useState('HTTPS');
  const [edgePort, setEdgePort] = useState(443);

  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleAddNodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    addNode({
      label,
      zone,
      type,
      criticality,
      os,
      software: softwareStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      openPorts: portsStr
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0),
      cves: cvesStr
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    });
    setLabel('');
  };

  const handleDownloadJson = (sampleOnly = false) => {
    const content = sampleOnly
      ? JSON.stringify(
          {
            version: '1.0',
            nodes: nodes.slice(0, 4),
            edges: edges.filter(
              (e) =>
                nodes.slice(0, 4).some((n) => n.id === e.source) &&
                nodes.slice(0, 4).some((n) => n.id === e.target)
            ),
          },
          null,
          2
        )
      : exportTopologyJson();
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sampleOnly
      ? 'atlastwin-sample-topology.json'
      : 'atlastwin-topology.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const res = importTopologyJson(text);
      if (!res.ok) {
        setImportError(res.error ?? 'Failed to import JSON topology.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Digital Twin Topology Editor"
      onClick={onClose}
      className="no-print fixed inset-0 z-50 bg-[#0B1F3A]/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-[#FAF7F0] text-[#0B1F3A] border border-[#C9A227] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-smooth"
      >
        <div className="px-5 py-4 bg-[#0B1F3A] text-[#FAF7F0] flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold">
              Digital Twin Topology Editor
            </h3>
            <p className="text-xs text-[#E6D49A]/85">
              Add or remove network nodes, manage directed reachability edges, or import/export topology JSON.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close topology editor"
            className="p-1.5 rounded-lg text-[#E6D49A] hover:bg-[#1B3358] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="px-5 py-2.5 bg-[#F1ECDD] border-b border-[#E6D49A] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {(
              [
                ['nodes', `Nodes (${nodes.length})`],
                ['edges', `Edges (${edges.length})`],
                ['json', 'Import / Export JSON'],
              ] as const
            ).map(([id, text]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  tab === id
                    ? 'bg-[#0B1F3A] text-[#FAF7F0]'
                    : 'bg-[#FAF7F0] text-[#0B1F3A] border border-[#E6D49A]'
                }`}
              >
                {text}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={resetDefaultTwin}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#B3261E] bg-[#FAF7F0] border border-[#B3261E]/35 hover:bg-[#B3261E]/10 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset to Default Twin</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {tab === 'nodes' && (
            <>
              <form
                onSubmit={handleAddNodeSubmit}
                className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl p-4 space-y-3"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-[#0B1F3A]">
                  Add Custom Network Asset
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Asset Name</label>
                    <input
                      type="text"
                      required
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="e.g. Treasury Settlement API"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F0] border border-[#E6D49A] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Zone</label>
                    <select
                      value={zone}
                      onChange={(e) => setZone(e.target.value as NetworkZone)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F0] border border-[#E6D49A]"
                    >
                      {ZONE_ORDER.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Asset Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as NodeType)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F0] border border-[#E6D49A]"
                    >
                      {NODE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium mb-1">
                      Criticality ({criticality}/10)
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={criticality}
                      onChange={(e) => setCriticality(Number(e.target.value))}
                      className="w-full accent-[#C9A227]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">OS</label>
                    <input
                      type="text"
                      value={os}
                      onChange={(e) => setOs(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F0] border border-[#E6D49A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Software</label>
                    <input
                      type="text"
                      value={softwareStr}
                      onChange={(e) => setSoftwareStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F0] border border-[#E6D49A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">
                      CVEs (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={cvesStr}
                      onChange={(e) => setCvesStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F0] border border-[#E6D49A] font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[11px] font-medium">Open Ports:</span>
                    <input
                      type="text"
                      value={portsStr}
                      onChange={(e) => setPortsStr(e.target.value)}
                      className="w-32 px-2 py-1 rounded bg-[#FAF7F0] border border-[#E6D49A] font-mono text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B1F3A] text-[#FAF7F0] text-xs font-semibold hover:bg-[#1B3358] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
                    <span>Add Asset Node</span>
                  </button>
                </div>
              </form>

              <div className="border border-[#E6D49A] rounded-xl overflow-hidden max-h-[260px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F1ECDD] sticky top-0 border-b border-[#E6D49A] text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3">Asset</th>
                      <th className="py-2 px-3">Zone</th>
                      <th className="py-2 px-3">Crit</th>
                      <th className="py-2 px-3">CVEs</th>
                      <th className="py-2 px-3 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6D49A]/50">
                    {nodes.map((n) => (
                      <tr key={n.id} className="hover:bg-[#F1ECDD]/60">
                        <td className="py-2 px-3 font-medium">{n.label}</td>
                        <td className="py-2 px-3">{n.zone}</td>
                        <td className="py-2 px-3 font-mono">{n.criticality}/10</td>
                        <td className="py-2 px-3 font-mono">{n.cves.length}</td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => deleteNode(n.id)}
                            aria-label={`Delete ${n.label}`}
                            className="p-1 rounded text-[#B3261E] hover:bg-[#B3261E]/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'edges' && (
            <>
              <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#0B1F3A]">
                  Create Directed Network Edge
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Source Asset</label>
                    <select
                      value={edgeSource}
                      onChange={(e) => setEdgeSource(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F0] border border-[#E6D49A]"
                    >
                      {nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.shortLabel}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Target Asset</label>
                    <select
                      value={edgeTarget}
                      onChange={(e) => setEdgeTarget(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F0] border border-[#E6D49A]"
                    >
                      {nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.shortLabel}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium mb-1">Protocol</label>
                      <input
                        type="text"
                        value={edgeProtocol}
                        onChange={(e) => setEdgeProtocol(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-[#FAF7F0] border border-[#E6D49A] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium mb-1">Port</label>
                      <input
                        type="number"
                        value={edgePort}
                        onChange={(e) => setEdgePort(Number(e.target.value) || 443)}
                        className="w-full px-2 py-1.5 rounded-lg bg-[#FAF7F0] border border-[#E6D49A] font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addEdge(edgeSource, edgeTarget, edgeProtocol, edgePort)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B1F3A] text-[#FAF7F0] font-semibold hover:bg-[#1B3358] cursor-pointer"
                  >
                    <GitBranchPlus className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
                    <span>Add Edge</span>
                  </button>
                </div>
              </div>

              <div className="border border-[#E6D49A] rounded-xl overflow-hidden max-h-[280px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F1ECDD] sticky top-0 border-b border-[#E6D49A] text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3">Source</th>
                      <th className="py-2 px-3">Target</th>
                      <th className="py-2 px-3">Protocol / Port</th>
                      <th className="py-2 px-3 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6D49A]/50">
                    {edges.map((e) => (
                      <tr key={e.id} className="hover:bg-[#F1ECDD]/60">
                        <td className="py-2 px-3">{nodeMap.get(e.source)?.shortLabel ?? e.source}</td>
                        <td className="py-2 px-3">{nodeMap.get(e.target)?.shortLabel ?? e.target}</td>
                        <td className="py-2 px-3 font-mono">
                          {e.protocol}/{e.port}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => deleteEdge(e.id)}
                            aria-label={`Delete edge ${e.id}`}
                            className="p-1 rounded text-[#B3261E] hover:bg-[#B3261E]/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'json' && (
            <div className="space-y-4">
              <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl p-4 space-y-3">
                <h4 className="font-display text-sm font-bold">
                  Export or Import Topology JSON
                </h4>
                <p className="text-xs text-[#0B1F3A]/80">
                  Import a custom network graph containing <code className="font-mono">nodes</code> and <code className="font-mono">edges</code> arrays. Changes persist locally and immediately update all attack-path calculations.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDownloadJson(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B1F3A] text-[#FAF7F0] text-xs font-semibold hover:bg-[#1B3358] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
                    <span>Export Topology (JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A227] text-[#0B1F3A] text-xs font-semibold hover:bg-[#d8b43b] cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Import Topology (JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadJson(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FAF7F0] border border-[#E6D49A] text-xs font-medium hover:border-[#0B1F3A] cursor-pointer"
                  >
                    <span>Download Sample Template</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {importError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-[#B3261E]/10 border border-[#B3261E]/40 text-xs text-[#B3261E]">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{importError}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
