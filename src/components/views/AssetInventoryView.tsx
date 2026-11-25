import React, { useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Download,
  Search,
  Server,
  ShieldAlert,
} from 'lucide-react';
import { useTwin } from '../../context/TwinContext';
import { ZONE_ORDER } from '../../data/bankNetwork';
import { getNodeMaxSeverity } from '../../engine/attackPathEngine';
import { NetworkZone, Severity } from '../../types/network';

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join(
    '\n'
  );
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PAGE_SIZE = 10;

export const AssetInventoryView: React.FC = () => {
  const {
    nodes,
    vulns,
    patchedCveIds,
    isolatedNodeIds,
    nodeExposureMap,
    setActiveView,
    flyToNode,
    togglePatchCve,
  } = useTwin();

  const [tab, setTab] = useState<'assets' | 'cves'>('assets');
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState<NetworkZone | 'ALL'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'Patched' | 'ALL'>('ALL');

  const [assetSortKey, setAssetSortKey] = useState<'label' | 'zone' | 'criticality' | 'exposure'>('criticality');
  const [assetSortDir, setAssetSortDir] = useState<'asc' | 'desc'>('desc');
  const [assetPage, setAssetPage] = useState(1);

  const [cveSortKey, setCveSortKey] = useState<'id' | 'cvss' | 'severity'>('cvss');
  const [cveSortDir, setCveSortDir] = useState<'asc' | 'desc'>('desc');
  const [cvePage, setCvePage] = useState(1);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = nodes
      .map((n) => ({
        node: n,
        maxSev: getNodeMaxSeverity(n, vulns, patchedCveIds),
        exposure: nodeExposureMap.get(n.id) ?? 0,
        activeCveCount: n.cves.filter((c) => !patchedCveIds.has(c)).length,
      }))
      .filter(({ node, maxSev }) => {
        if (zoneFilter !== 'ALL' && node.zone !== zoneFilter) return false;
        if (severityFilter !== 'ALL' && maxSev !== severityFilter) return false;
        if (q) {
          const hay = `${node.label} ${node.os} ${node.software.join(' ')} ${node.cves.join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

    list.sort((a, b) => {
      let cmp = 0;
      if (assetSortKey === 'label') cmp = a.node.label.localeCompare(b.node.label);
      else if (assetSortKey === 'zone') cmp = a.node.zone.localeCompare(b.node.zone);
      else if (assetSortKey === 'criticality') cmp = a.node.criticality - b.node.criticality;
      else cmp = a.exposure - b.exposure;
      return assetSortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [nodes, vulns, patchedCveIds, nodeExposureMap, search, zoneFilter, severityFilter, assetSortKey, assetSortDir]);

  const assetPageCount = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE));
  const pagedAssets = filteredAssets.slice(
    (assetPage - 1) * PAGE_SIZE,
    assetPage * PAGE_SIZE
  );

  const filteredCves = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sevRank: Record<Severity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    const list = Object.values(vulns)
      .map((v) => {
        const affectedNodes = nodes.filter((n) => n.cves.includes(v.id));
        const isPatched = patchedCveIds.has(v.id);
        return { vuln: v, affectedNodes, isPatched };
      })
      .filter(({ vuln, affectedNodes, isPatched }) => {
        if (zoneFilter !== 'ALL' && !affectedNodes.some((n) => n.zone === zoneFilter)) {
          return false;
        }
        if (severityFilter === 'Patched' && !isPatched) return false;
        if (
          severityFilter !== 'ALL' &&
          severityFilter !== 'Patched' &&
          vuln.severity !== severityFilter
        ) {
          return false;
        }
        if (q) {
          const hay = `${vuln.id} ${vuln.software} ${vuln.description} ${affectedNodes
            .map((n) => n.label)
            .join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

    list.sort((a, b) => {
      let cmp = 0;
      if (cveSortKey === 'id') cmp = a.vuln.id.localeCompare(b.vuln.id);
      else if (cveSortKey === 'cvss') cmp = a.vuln.cvss - b.vuln.cvss;
      else cmp = sevRank[a.vuln.severity] - sevRank[b.vuln.severity];
      return cveSortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [vulns, nodes, patchedCveIds, search, zoneFilter, severityFilter, cveSortKey, cveSortDir]);

  const cvePageCount = Math.max(1, Math.ceil(filteredCves.length / PAGE_SIZE));
  const pagedCves = filteredCves.slice((cvePage - 1) * PAGE_SIZE, cvePage * PAGE_SIZE);

  const toggleAssetSort = (key: typeof assetSortKey) => {
    if (assetSortKey === key) setAssetSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setAssetSortKey(key);
      setAssetSortDir('desc');
    }
  };

  const toggleCveSort = (key: typeof cveSortKey) => {
    if (cveSortKey === key) setCveSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setCveSortKey(key);
      setCveSortDir('desc');
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-4">
      <div className="bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227]/45 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#E6D49A]">
            Digital Twin CMDB &amp; Vulnerability Register
          </div>
          <h1 className="font-display text-2xl font-bold mt-0.5">
            Asset Inventory &amp; CVE Catalog
          </h1>
          <p className="text-xs text-[#FAF7F0]/75 mt-1">
            Inspect every monitored bank host and vulnerability. Click any asset row to jump directly to its node on the digital twin graph.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                'atlastwin-assets.csv',
                ['ID', 'Name', 'Zone', 'Type', 'Criticality', 'Exposure', 'OS', 'Active CVEs', 'Max Severity'],
                filteredAssets.map(({ node, exposure, activeCveCount, maxSev }) => [
                  node.id,
                  node.label,
                  node.zone,
                  node.type,
                  node.criticality,
                  exposure,
                  node.os,
                  activeCveCount,
                  maxSev,
                ])
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1B3358] border border-[#C9A227]/40 hover:border-[#C9A227] text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
            <span>Export Assets CSV</span>
          </button>

          <button
            type="button"
            onClick={() =>
              downloadCsv(
                'atlastwin-cves.csv',
                ['CVE ID', 'CVSS', 'Severity', 'Software', 'Exploit Available', 'Status', 'Affected Assets'],
                filteredCves.map(({ vuln, affectedNodes, isPatched }) => [
                  vuln.id,
                  vuln.cvss,
                  vuln.severity,
                  vuln.software,
                  vuln.exploitAvailable ? 'Yes' : 'No',
                  isPatched ? 'Patched' : 'Unpatched',
                  affectedNodes.map((n) => n.shortLabel).join('; '),
                ])
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#C9A227] text-[#0B1F3A] hover:bg-[#d8b43b] text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export CVEs CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Tab Controls */}
      <div className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('assets')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                tab === 'assets'
                  ? 'bg-[#0B1F3A] text-[#FAF7F0]'
                  : 'bg-[#FAF7F0] text-[#0B1F3A] border border-[#E6D49A]'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
              <span>Assets ({filteredAssets.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('cves')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                tab === 'cves'
                  ? 'bg-[#0B1F3A] text-[#FAF7F0]'
                  : 'bg-[#FAF7F0] text-[#0B1F3A] border border-[#E6D49A]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
              <span>Vulnerabilities ({filteredCves.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#0B1F3A]/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setAssetPage(1);
                setCvePage(1);
              }}
              placeholder="Filter by asset, OS, software, CVE..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#FAF7F0] border border-[#E6D49A] text-xs text-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
            />
          </div>
        </div>

        {/* Multi-filter Chips */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-semibold text-[#0B1F3A]/70">Zone:</span>
          <button
            type="button"
            onClick={() => {
              setZoneFilter('ALL');
              setAssetPage(1);
              setCvePage(1);
            }}
            className={`px-2 py-0.5 rounded border cursor-pointer ${
              zoneFilter === 'ALL'
                ? 'bg-[#0B1F3A] text-[#FAF7F0] border-[#0B1F3A]'
                : 'bg-[#FAF7F0] border-[#E6D49A]'
            }`}
          >
            All
          </button>
          {ZONE_ORDER.map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => {
                setZoneFilter(z);
                setAssetPage(1);
                setCvePage(1);
              }}
              className={`px-2 py-0.5 rounded border cursor-pointer ${
                zoneFilter === z
                  ? 'bg-[#0B1F3A] text-[#FAF7F0] border-[#0B1F3A]'
                  : 'bg-[#FAF7F0] border-[#E6D49A]'
              }`}
            >
              {z}
            </button>
          ))}

          <span className="font-semibold text-[#0B1F3A]/70 ml-2">Status:</span>
          {(['ALL', 'Critical', 'High', 'Medium', 'Patched'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSeverityFilter(s);
                setAssetPage(1);
                setCvePage(1);
              }}
              className={`px-2 py-0.5 rounded border cursor-pointer ${
                severityFilter === s
                  ? 'bg-[#C9A227] text-[#0B1F3A] border-[#C9A227] font-semibold'
                  : 'bg-[#FAF7F0] border-[#E6D49A]'
              }`}
            >
              {s === 'ALL' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Tables */}
      {tab === 'assets' ? (
        <div className="bg-[#FAF7F0] border border-[#E6D49A] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F1ECDD] border-b border-[#E6D49A] text-[11px] uppercase tracking-wider text-[#0B1F3A]/80">
                <tr>
                  <th className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => toggleAssetSort('label')}
                      className="inline-flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <span>Asset</span>
                      <ArrowDownUp className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => toggleAssetSort('zone')}
                      className="inline-flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <span>Zone</span>
                      <ArrowDownUp className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4">OS / Software</th>
                  <th className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => toggleAssetSort('criticality')}
                      className="inline-flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <span>Criticality</span>
                      <ArrowDownUp className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => toggleAssetSort('exposure')}
                      className="inline-flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <span>Exposure</span>
                      <ArrowDownUp className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4 text-right">Active CVEs</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D49A]/55">
                {pagedAssets.map(({ node, maxSev, exposure, activeCveCount }) => (
                  <tr
                    key={node.id}
                    onClick={() => {
                      setActiveView('command-center');
                      flyToNode(node.id);
                    }}
                    className="hover:bg-[#F1ECDD]/70 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4 font-semibold text-[#0B1F3A]">
                      {node.label}
                      {isolatedNodeIds.has(node.id) && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-[#B3261E]/15 text-[#B3261E] text-[10px] font-mono">
                          Isolated
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono">{node.zone}</td>
                    <td className="py-2.5 px-4 text-[#0B1F3A]/75 max-w-[260px] truncate">
                      {node.os} · {node.software[0]}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">{node.criticality}/10</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold">
                      {exposure.toFixed(0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">{activeCveCount}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      <span
                        className={
                          maxSev === 'Critical'
                            ? 'text-[#B3261E]'
                            : maxSev === 'High'
                              ? 'text-[#D9822B]'
                              : maxSev === 'Patched'
                                ? 'text-[#5E8C61]'
                                : 'text-[#0B1F3A]/75'
                        }
                      >
                        {maxSev}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-2.5 bg-[#F1ECDD] border-t border-[#E6D49A] flex items-center justify-between text-xs font-mono">
            <span>
              Page {assetPage} of {assetPageCount} ({filteredAssets.length} assets)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={assetPage <= 1}
                onClick={() => setAssetPage((p) => p - 1)}
                className="px-2.5 py-1 rounded bg-[#FAF7F0] border border-[#E6D49A] disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={assetPage >= assetPageCount}
                onClick={() => setAssetPage((p) => p + 1)}
                className="px-2.5 py-1 rounded bg-[#FAF7F0] border border-[#E6D49A] disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#FAF7F0] border border-[#E6D49A] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F1ECDD] border-b border-[#E6D49A] text-[11px] uppercase tracking-wider text-[#0B1F3A]/80">
                <tr>
                  <th className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => toggleCveSort('id')}
                      className="inline-flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <span>CVE ID</span>
                      <ArrowDownUp className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4">Software &amp; Affected Assets</th>
                  <th className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => toggleCveSort('cvss')}
                      className="inline-flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <span>CVSS</span>
                      <ArrowDownUp className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => toggleCveSort('severity')}
                      className="inline-flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <span>Severity</span>
                      <ArrowDownUp className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D49A]/55">
                {pagedCves.map(({ vuln, affectedNodes, isPatched }) => (
                  <tr key={vuln.id} className="hover:bg-[#F1ECDD]/60">
                    <td className="py-2.5 px-4 font-mono font-bold text-[#0B1F3A]">
                      {vuln.id}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-[#0B1F3A]">{vuln.software}</div>
                      <div className="text-[11px] text-[#0B1F3A]/70">
                        {affectedNodes.map((n) => n.shortLabel).join(', ')}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {vuln.cvss.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold">{vuln.severity}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => togglePatchCve(vuln.id)}
                        className={`px-3 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          isPatched
                            ? 'bg-[#5E8C61] text-[#FAF7F0]'
                            : 'bg-[#0B1F3A] text-[#FAF7F0] hover:bg-[#1B3358]'
                        }`}
                      >
                        {isPatched ? 'Patched' : 'Simulate Patch'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2.5 bg-[#F1ECDD] border-t border-[#E6D49A] flex items-center justify-between text-xs font-mono">
            <span>
              Page {cvePage} of {cvePageCount} ({filteredCves.length} vulnerabilities)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={cvePage <= 1}
                onClick={() => setCvePage((p) => p - 1)}
                className="px-2.5 py-1 rounded bg-[#FAF7F0] border border-[#E6D49A] disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={cvePage >= cvePageCount}
                onClick={() => setCvePage((p) => p + 1)}
                className="px-2.5 py-1 rounded bg-[#FAF7F0] border border-[#E6D49A] disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
