import React from 'react';
import {
  Crosshair,
  Crown,
  Database,
  Filter,
  Globe,
  KeyRound,
  Landmark,
  Laptop,
  Network,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { ENTRY_POINTS, TARGET_CROWN_JEWELS, ZONE_ORDER } from '../data/bankNetwork';
import { NetworkZone } from '../types/network';

interface ControlsSidebarProps {
  selectedEntry: string;
  onChangeEntry: (id: string) => void;
  selectedTarget: string;
  onChangeTarget: (id: string) => void;
  maxPaths: number;
  onChangeMaxPaths: (k: number) => void;
  enabledZones: Set<NetworkZone>;
  onToggleZone: (zone: NetworkZone) => void;
  onResetZones: () => void;
}

export const ControlsSidebar: React.FC<ControlsSidebarProps> = ({
  selectedEntry,
  onChangeEntry,
  selectedTarget,
  onChangeTarget,
  maxPaths,
  onChangeMaxPaths,
  enabledZones,
  onToggleZone,
  onResetZones,
}) => {
  return (
    <aside
      aria-label="Simulation Controls and Legend"
      className="no-print w-full lg:w-[280px] shrink-0 bg-[#F1ECDD] border border-[#E6D49A] rounded-xl p-4 flex flex-col gap-5 shadow-xs"
    >
      {/* Entry Point Selector */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Crosshair className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
          <label
            htmlFor="entry-point-select"
            className="text-xs font-semibold uppercase tracking-wider text-[#0B1F3A]"
          >
            Entry Point
          </label>
        </div>
        <select
          id="entry-point-select"
          value={selectedEntry}
          onChange={(e) => onChangeEntry(e.target.value)}
          className="w-full bg-[#FAF7F0] text-[#0B1F3A] text-xs font-medium border border-[#E6D49A] rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#C9A227] transition-all cursor-pointer"
        >
          {ENTRY_POINTS.map((ep) => (
            <option key={ep.id} value={ep.id}>
              {ep.label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[#0B1F3A]/70">
          {ENTRY_POINTS.find((e) => e.id === selectedEntry)?.description}
        </p>
      </div>

      {/* Target Crown Jewel Selector */}
      <div className="pt-3 border-t border-[#E6D49A]/60">
        <div className="flex items-center gap-2 mb-2">
          <Landmark className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
          <label
            htmlFor="target-select"
            className="text-xs font-semibold uppercase tracking-wider text-[#0B1F3A]"
          >
            Crown-Jewel Target
          </label>
        </div>
        <select
          id="target-select"
          value={selectedTarget}
          onChange={(e) => onChangeTarget(e.target.value)}
          className="w-full bg-[#FAF7F0] text-[#0B1F3A] text-xs font-medium border border-[#E6D49A] rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#C9A227] transition-all cursor-pointer"
        >
          {TARGET_CROWN_JEWELS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Max Paths Slider */}
      <div className="pt-3 border-t border-[#E6D49A]/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
            <label
              htmlFor="max-paths-slider"
              className="text-xs font-semibold uppercase tracking-wider text-[#0B1F3A]"
            >
              Max Paths
            </label>
          </div>
          <span className="font-mono tabular-nums text-xs font-bold text-[#0B1F3A] bg-[#FAF7F0] border border-[#E6D49A] px-2 py-0.5 rounded">
            {maxPaths}
          </span>
        </div>
        <input
          id="max-paths-slider"
          type="range"
          min={3}
          max={10}
          step={1}
          value={maxPaths}
          onChange={(e) => onChangeMaxPaths(Number(e.target.value))}
          className="w-full accent-[#C9A227] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-mono tabular-nums text-[#0B1F3A]/60 mt-1">
          <span>3 paths</span>
          <span>10 paths</span>
        </div>
      </div>

      {/* Zone Filters */}
      <div className="pt-3 border-t border-[#E6D49A]/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0B1F3A]">
              Zone Filters
            </span>
          </div>
          {enabledZones.size < ZONE_ORDER.length && (
            <button
              type="button"
              onClick={onResetZones}
              className="text-[11px] font-medium text-[#0B1F3A] underline hover:text-[#C9A227] cursor-pointer"
            >
              All
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ZONE_ORDER.map((zone) => {
            const checked = enabledZones.has(zone);
            return (
              <label
                key={zone}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                  checked
                    ? 'bg-[#FAF7F0] border-[#E6D49A] text-[#0B1F3A] font-medium'
                    : 'bg-[#F1ECDD]/50 border-transparent text-[#0B1F3A]/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleZone(zone)}
                  className="accent-[#0B1F3A] rounded cursor-pointer"
                />
                <span className="truncate">{zone}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="pt-3 border-t border-[#E6D49A]/60">
        <span className="block text-xs font-semibold uppercase tracking-wider text-[#0B1F3A] mb-2.5">
          Topology Legend
        </span>

        <div className="space-y-2 text-[11px] text-[#0B1F3A]/85">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B3261E] shrink-0" />
              <span>Critical Ring</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D9822B] shrink-0" />
              <span>High Ring</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C9A227] shrink-0" />
              <span>Medium Ring</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5E8C61] shrink-0" />
              <span>Patched / Low</span>
            </div>
          </div>

          <div className="pt-1.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-6 border-t-2 border-dashed border-[#C9A227] shrink-0" />
              <span>Active Attack Path</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 border-t border-[#0B1F3A]/30 shrink-0" />
              <span>Reachability Edge</span>
            </div>
            <div className="flex items-center gap-2">
              <Crown className="w-3.5 h-3.5 text-[#C9A227] shrink-0" aria-hidden="true" />
              <span>Top 3 Choke Point</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#5E8C61] shrink-0" aria-hidden="true" />
              <span>Patched Asset Shield</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E6D49A]/50 grid grid-cols-2 gap-1.5 text-[10px] text-[#0B1F3A]/75">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-[#0B1F3A]" aria-hidden="true" />
              <span>Internet</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3 text-[#0B1F3A]" aria-hidden="true" />
              <span>Firewall / WAF</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Network className="w-3 h-3 text-[#0B1F3A]" aria-hidden="true" />
              <span>VPN Gateway</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Laptop className="w-3 h-3 text-[#0B1F3A]" aria-hidden="true" />
              <span>Workstation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Server className="w-3 h-3 text-[#0B1F3A]" aria-hidden="true" />
              <span>App Server</span>
            </div>
            <div className="flex items-center gap-1.5">
              <KeyRound className="w-3 h-3 text-[#0B1F3A]" aria-hidden="true" />
              <span>Domain Ctrl</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Database className="w-3 h-3 text-[#0B1F3A]" aria-hidden="true" />
              <span>Database</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-[#0B1F3A]" aria-hidden="true" />
              <span>Payments / SOC</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
