import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bot,
  Crosshair,
  GitBranch,
  HelpCircle,
  Play,
  RotateCcw,
  Search,
  Server,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { useTwin } from '../context/TwinContext';

interface CommandPaletteProps {
  onRunDemo: () => void;
}

interface PaletteItem {
  id: string;
  category: 'Asset' | 'CVE' | 'Attack Path' | 'View' | 'Action';
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onRunDemo }) => {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    nodes,
    vulns,
    nodeMap,
    attackPaths,
    setActiveView,
    flyToNode,
    setSelectedPathId,
    injectZeroDay,
    resetAllSimulations,
    setShortcutsOpen,
    setTourOpen,
  } = useTwin();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [commandPaletteOpen]);

  const allItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [
      {
        id: 'act-demo',
        category: 'Action',
        title: 'Run Demo Scenario',
        subtitle: 'Launch 45-second automated guided walkthrough',
        icon: Play,
        onSelect: () => {
          setActiveView('command-center');
          onRunDemo();
        },
      },
      {
        id: 'act-zd',
        category: 'Action',
        title: 'Simulate New Zero-Day',
        subtitle: 'Inject CVSS 9.8 exploit onto a random DMZ asset',
        icon: ShieldAlert,
        onSelect: () => {
          setActiveView('command-center');
          injectZeroDay();
        },
      },
      {
        id: 'act-reset',
        category: 'Action',
        title: 'Reset All Simulations',
        subtitle: 'Clear all simulated patches, segmentation blocks, and isolations',
        icon: RotateCcw,
        onSelect: () => resetAllSimulations(),
      },
      {
        id: 'act-tour',
        category: 'Action',
        title: 'Take Product Tour',
        subtitle: 'Launch 6-step spotlight onboarding walkthrough',
        icon: Sparkles,
        onSelect: () => setTourOpen(true),
      },
      {
        id: 'act-shortcuts',
        category: 'Action',
        title: 'Keyboard Shortcuts',
        subtitle: 'Show all navigation and simulation hotkeys (?)',
        icon: HelpCircle,
        onSelect: () => setShortcutsOpen(true),
      },
      {
        id: 'view-threat',
        category: 'View',
        title: 'Open Threat Simulator & Monte Carlo',
        subtitle: 'Switch attacker persona and run 1,000-attempt stochastic simulation',
        icon: Crosshair,
        onSelect: () => setActiveView('threat-simulator'),
      },
      {
        id: 'view-compliance',
        category: 'View',
        title: 'Open Compliance Mapping',
        subtitle: 'Inspect PCI DSS 4.0, RBI, ISO 27001, and NIST CSF readiness',
        icon: Activity,
        onSelect: () => setActiveView('compliance'),
      },
      {
        id: 'view-ai',
        category: 'View',
        title: 'Open AI Security Analyst Chat',
        subtitle: 'Ask context-aware questions about bank network exposure',
        icon: Bot,
        onSelect: () => setActiveView('ai-analyst'),
      },
    ];

    for (const p of attackPaths) {
      const chain = p.nodes.map((id) => nodeMap.get(id)?.shortLabel ?? id).join(' → ');
      items.push({
        id: `path-${p.id}`,
        category: 'Attack Path',
        title: chain,
        subtitle: `Risk ${p.riskScore.toFixed(1)}/100 · ${p.hops} hops · Weakest ${p.weakestLinkCve}`,
        icon: GitBranch,
        onSelect: () => {
          setActiveView('command-center');
          setSelectedPathId(p.id);
        },
      });
    }

    for (const n of nodes) {
      items.push({
        id: `node-${n.id}`,
        category: 'Asset',
        title: n.label,
        subtitle: `${n.zone} Zone · Criticality ${n.criticality}/10 · ${n.cves.length} CVEs`,
        icon: Server,
        onSelect: () => {
          setActiveView('command-center');
          flyToNode(n.id);
        },
      });
    }

    for (const v of Object.values(vulns)) {
      const affected = nodes.find((n) => n.cves.includes(v.id));
      items.push({
        id: `cve-${v.id}`,
        category: 'CVE',
        title: `${v.id} · ${v.software}`,
        subtitle: `CVSS ${v.cvss.toFixed(1)} (${v.severity}) · ${affected?.shortLabel ?? 'Asset'}`,
        icon: ShieldAlert,
        onSelect: () => {
          setActiveView('command-center');
          if (affected) flyToNode(affected.id);
        },
      });
    }

    return items;
  }, [
    nodes,
    vulns,
    nodeMap,
    attackPaths,
    onRunDemo,
    setActiveView,
    flyToNode,
    setSelectedPathId,
    injectZeroDay,
    resetAllSimulations,
    setShortcutsOpen,
    setTourOpen,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 12);
    return allItems
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      )
      .slice(0, 14);
  }, [allItems, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!commandPaletteOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (filtered.length > 0 ? (i + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) =>
        filtered.length > 0 ? (i - 1 + filtered.length) % filtered.length : 0
      );
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault();
      filtered[activeIndex].onSelect();
      setCommandPaletteOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setCommandPaletteOpen(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Palette"
      onClick={() => setCommandPaletteOpen(false)}
      className="no-print fixed inset-0 z-50 bg-[#0B1F3A]/65 backdrop-blur-xs flex items-start justify-center pt-[12vh] px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="w-full max-w-2xl bg-[#FAF7F0] border border-[#C9A227] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-smooth"
      >
        <div className="flex items-center gap-3 px-4 py-3.5 bg-[#0B1F3A] text-[#FAF7F0] border-b border-[#C9A227]/35">
          <Search className="w-4 h-4 text-[#C9A227] shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assets, CVE IDs, attack paths, or actions..."
            className="w-full bg-transparent text-sm text-[#FAF7F0] placeholder-[#E6D49A]/55 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(false)}
            aria-label="Close command palette"
            className="p-1 rounded text-[#E6D49A] hover:text-[#FAF7F0] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-[#E6D49A]/45">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#0B1F3A]/65">
              No matching assets, CVEs, or commands found for "{query}".
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    item.onSelect();
                    setCommandPaletteOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#C9A227]/20' : 'hover:bg-[#F1ECDD]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#0B1F3A] text-[#C9A227] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#0B1F3A] truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[#0B1F3A]/70 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#F1ECDD] border border-[#E6D49A] text-[#0B1F3A]/75 shrink-0">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-[#F1ECDD] border-t border-[#E6D49A] flex items-center justify-between text-[11px] font-mono text-[#0B1F3A]/70">
          <span>↑↓ navigate · Enter select · Esc close</span>
          <span>Ctrl+K</span>
        </div>
      </div>
    </div>
  );
};
