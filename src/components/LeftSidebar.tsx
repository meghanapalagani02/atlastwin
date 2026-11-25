import React from 'react';
import {
  Activity,
  Bot,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  FileBarChart2,
  LayoutDashboard,
  Server,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { WorkspaceView } from '../types/network';

interface LeftSidebarProps {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  complianceGapCount: number;
}

const NAV_ITEMS: {
  id: WorkspaceView;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'command-center', label: 'Command Center', shortcut: '1', icon: LayoutDashboard },
  { id: 'threat-simulator', label: 'Threat Simulator', shortcut: '2', icon: Crosshair },
  { id: 'compliance', label: 'Compliance', shortcut: '3', icon: ShieldCheck },
  { id: 'asset-inventory', label: 'Asset Inventory', shortcut: '4', icon: Server },
  { id: 'incident-replay', label: 'Incident Replay', shortcut: '5', icon: Activity },
  { id: 'ai-analyst', label: 'AI Analyst', shortcut: '6', icon: Bot },
  { id: 'reports', label: 'Reports', shortcut: '7', icon: FileBarChart2 },
  { id: 'settings', label: 'Settings', shortcut: '8', icon: Settings },
];

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeView,
  onSelectView,
  collapsed,
  onToggleCollapse,
  complianceGapCount,
}) => {
  return (
    <aside
      aria-label="Workspace Navigation"
      className={`no-print bg-[#0B1F3A] text-[#FAF7F0] border-r border-[#C9A227]/25 shrink-0 flex flex-col justify-between transition-all duration-200 ${
        collapsed ? 'w-[64px]' : 'w-[216px]'
      }`}
    >
      <nav className="p-2.5 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              title={collapsed ? `${item.label} (${item.shortcut})` : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] ${
                isActive
                  ? 'bg-[#1B3358] text-[#FAF7F0] shadow-xs'
                  : 'text-[#FAF7F0]/75 hover:bg-[#1B3358]/60 hover:text-[#FAF7F0]'
              }`}
            >
              {/* Gold Active Indicator */}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#C9A227]"
                />
              )}

              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-[#C9A227]' : 'text-[#E6D49A]/75 group-hover:text-[#C9A227]'
                }`}
              />

              {!collapsed && (
                <>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.id === 'compliance' && complianceGapCount > 0 && (
                    <span className="font-mono tabular-nums text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#B3261E]/85 text-[#FAF7F0]">
                      {complianceGapCount}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-2.5 border-t border-[#C9A227]/20">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg text-xs text-[#E6D49A]/80 hover:bg-[#1B3358] hover:text-[#FAF7F0] transition-colors cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
