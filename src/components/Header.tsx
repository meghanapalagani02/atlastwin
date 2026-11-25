import React from 'react';
import { FileDown, HelpCircle, Play, RefreshCw, Search, X } from 'lucide-react';
import { useTwin } from '../context/TwinContext';
import { NvdSyncProgress } from '../services/nvdService';
import { UserSession } from '../types/auth';
import { AtlasLogo } from './AtlasLogo';
import { NotificationsBell } from './NotificationsBell';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  onRunDemo: () => void;
  demoActive: boolean;
  onRefreshNvd: () => void;
  onCancelNvd: () => void;
  nvdSyncing: boolean;
  nvdProgress: NvdSyncProgress | null;
  lastSynced: string | null;
  onExportReport: () => void;
  user: UserSession | null;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRunDemo,
  demoActive,
  onRefreshNvd,
  onCancelNvd,
  nvdSyncing,
  nvdProgress,
  lastSynced,
  onExportReport,
  user,
  onSignOut,
}) => {
  const { setCommandPaletteOpen, setShortcutsOpen } = useTwin();

  const progressPct =
    nvdProgress && nvdProgress.total > 0
      ? Math.round((nvdProgress.completed / nvdProgress.total) * 100)
      : 0;

  return (
    <header className="no-print bg-[#0B1F3A] text-[#FAF7F0] border-b border-[#C9A227]/30">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Compact AtlasLogo + Wordmark */}
        <div className="flex items-center gap-4">
          <AtlasLogo size="sm" variant="ivory" />

          {/* Global Search Command Palette Trigger */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden md:inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#1B3358]/85 border border-[#C9A227]/35 hover:border-[#C9A227] text-xs text-[#FAF7F0]/75 hover:text-[#FAF7F0] transition-colors cursor-pointer min-w-[230px] justify-between"
          >
            <span className="inline-flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
              <span>Search assets, CVEs, paths...</span>
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#0B1F3A] border border-[#C9A227]/30 font-mono text-[10px] text-[#E6D49A]">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Action Toolbar + Notifications + User Menu */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {lastSynced && !nvdSyncing && (
            <span className="hidden xl:inline text-xs font-mono tabular-nums text-[#E6D49A]/80 mr-1 whitespace-nowrap">
              Last synced {lastSynced}
            </span>
          )}

          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Open global search"
            className="md:hidden p-2 rounded-lg bg-[#1B3358] text-[#C9A227] border border-[#C9A227]/40 cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onRunDemo}
            disabled={demoActive}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] ${
              demoActive
                ? 'bg-[#C9A227]/40 text-[#FAF7F0]/70 cursor-not-allowed'
                : 'bg-[#C9A227] text-[#0B1F3A] hover:bg-[#d8b43b] cursor-pointer shadow-sm'
            }`}
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{demoActive ? 'Demo Running' : 'Run Demo Scenario'}</span>
          </button>

          {!nvdSyncing ? (
            <button
              type="button"
              onClick={onRefreshNvd}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-[#1B3358] text-[#FAF7F0] border border-[#C9A227]/40 hover:border-[#C9A227] hover:bg-[#23406d] transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
              <span>Refresh from NVD</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-[#1B3358] border border-[#C9A227]/60">
              <RefreshCw
                className="w-3.5 h-3.5 text-[#C9A227] animate-spin shrink-0"
                aria-hidden="true"
              />
              <div className="flex flex-col min-w-[140px]">
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#FAF7F0]">
                  <span>{nvdProgress?.currentCveId ?? 'Connecting...'}</span>
                  <span className="text-[#E6D49A] ml-2">{progressPct}%</span>
                </div>
                <div className="w-full h-1 bg-[#0B1F3A] rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-[#C9A227] transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={onCancelNvd}
                aria-label="Cancel NVD sync"
                className="p-1 rounded hover:bg-[#0B1F3A] text-[#E6D49A] hover:text-[#FAF7F0] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onExportReport}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-transparent text-[#FAF7F0] border border-[#E6D49A]/40 hover:border-[#C9A227] hover:bg-[#1B3358]/70 transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]"
          >
            <FileDown className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
            <span className="hidden sm:inline">Export Report</span>
          </button>

          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
            className="p-2 rounded-lg bg-[#1B3358] text-[#E6D49A] border border-[#C9A227]/35 hover:border-[#C9A227] hover:text-[#FAF7F0] transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <NotificationsBell />

          {user && <UserMenu user={user} onSignOut={onSignOut} />}
        </div>
      </div>
    </header>
  );
};

