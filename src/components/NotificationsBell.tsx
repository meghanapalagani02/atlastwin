import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Bell, ShieldAlert, Zap } from 'lucide-react';
import { useTwin } from '../context/TwinContext';

export const NotificationsBell: React.FC = () => {
  const { alerts, setActiveView, flyToNode, injectZeroDay } = useTwin();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const criticalCount = alerts.filter((a) => a.severity === 'Critical').length;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label={`Security alerts (${alerts.length})`}
        aria-expanded={open}
        className="relative p-2 rounded-lg bg-[#1B3358] text-[#FAF7F0] border border-[#C9A227]/40 hover:border-[#C9A227] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]"
      >
        <Bell className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
        {alerts.length > 0 && (
          <span
            className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
              criticalCount > 0
                ? 'bg-[#B3261E] text-[#FAF7F0]'
                : 'bg-[#C9A227] text-[#0B1F3A]'
            }`}
          >
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Derived Security Alerts"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FAF7F0] text-[#0B1F3A] border border-[#C9A227] rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in-smooth"
        >
          <div className="px-4 py-3 bg-[#0B1F3A] text-[#FAF7F0] flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-bold">Twin Security Alerts</h3>
              <p className="text-[11px] text-[#E6D49A]/80">
                Live telemetry derived from attack-path engine
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                injectZeroDay();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#C9A227] text-[#0B1F3A] text-[11px] font-semibold hover:bg-[#d8b43b] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Zap className="w-3 h-3" aria-hidden="true" />
              <span>Zero-Day</span>
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#E6D49A]/60">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#0B1F3A]/65">
                No active critical threshold or compliance alerts.
              </div>
            ) : (
              alerts.map((alert) => {
                const sevColor =
                  alert.severity === 'Critical'
                    ? 'text-[#B3261E]'
                    : alert.severity === 'High'
                      ? 'text-[#D9822B]'
                      : 'text-[#C9A227]';

                return (
                  <div key={alert.id} className="p-3.5 hover:bg-[#F1ECDD]/70 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {alert.severity === 'Critical' ? (
                          <ShieldAlert className={`w-4 h-4 mt-0.5 shrink-0 ${sevColor}`} />
                        ) : (
                          <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${sevColor}`} />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#0B1F3A]">
                            {alert.title}
                          </div>
                          <p className="text-[11px] text-[#0B1F3A]/75 mt-0.5 leading-snug">
                            {alert.description}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#0B1F3A]/55 whitespace-nowrap">
                        {alert.timeAgo}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveView(alert.targetView);
                          if (alert.targetNodeId) {
                            flyToNode(alert.targetNodeId);
                          }
                          setOpen(false);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B1F3A] hover:text-[#9A7A14] cursor-pointer"
                      >
                        <span>Go to</span>
                        <ArrowRight className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
