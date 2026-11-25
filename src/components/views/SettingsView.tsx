import React from 'react';
import { HelpCircle, RotateCcw, Zap } from 'lucide-react';
import { useTwin } from '../../context/TwinContext';
import { DEFAULT_ASSET_VALUES } from '../../data/securityFrameworks';
import { AnimationIntensity, AppTheme } from '../../types/network';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    attackerProfile,
    injectZeroDay,
    setShortcutsOpen,
  } = useTwin();

  const updateAssetValue = (crit: number, usd: number) => {
    updateSettings({
      assetValues: {
        ...settings.assetValues,
        [crit]: Math.max(10_000, usd),
      },
    });
  };

  return (
    <div className="max-w-[1260px] mx-auto px-4 sm:px-6 py-5 space-y-5">
      <div className="bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227]/45 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#E6D49A]">
            Workspace &amp; Engine Calibration
          </div>
          <h1 className="font-display text-2xl font-bold mt-0.5">
            Settings &amp; Personalization
          </h1>
          <p className="text-xs text-[#FAF7F0]/75 mt-1">
            Configure FAIR financial valuation tiers, alert thresholds, simulation overrides, and workspace appearance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={injectZeroDay}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#C9A227] text-[#0B1F3A] hover:bg-[#d8b43b] text-xs font-semibold cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Simulate New Zero-Day</span>
          </button>

          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1B3358] border border-[#C9A227]/40 hover:border-[#C9A227] text-xs font-semibold cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
            <span>Keyboard Shortcuts (?)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* General Engine & UI Preferences */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-5 space-y-4">
            <h2 className="font-display text-base font-bold text-[#0B1F3A]">
              Engine &amp; Alerting Thresholds
            </h2>

            {/* Risk Threshold */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">Risk Alert Threshold</span>
                <span className="font-mono font-bold">{settings.riskThreshold}/100</span>
              </div>
              <input
                type="range"
                min={20}
                max={95}
                step={5}
                value={settings.riskThreshold}
                onChange={(e) => updateSettings({ riskThreshold: Number(e.target.value) })}
                className="w-full accent-[#C9A227] cursor-pointer"
              />
              <p className="text-[11px] text-[#0B1F3A]/65 mt-0.5">
                Triggers notification badge and toast alert whenever overall network risk exceeds this threshold.
              </p>
            </div>

            {/* Skill Multiplier Override */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">
                  Attacker Skill Multiplier Override (Persona default: {attackerProfile.skillMultiplier}x)
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">
                    {(settings.skillMultiplierOverride ?? attackerProfile.skillMultiplier).toFixed(2)}x
                  </span>
                  {settings.skillMultiplierOverride !== null && (
                    <button
                      type="button"
                      onClick={() => updateSettings({ skillMultiplierOverride: null })}
                      className="text-[10px] font-mono underline text-[#8C6D14] cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.3}
                step={0.05}
                value={settings.skillMultiplierOverride ?? attackerProfile.skillMultiplier}
                onChange={(e) =>
                  updateSettings({ skillMultiplierOverride: Number(e.target.value) })
                }
                className="w-full accent-[#C9A227] cursor-pointer"
              />
            </div>

            {/* NVD Sync Interval */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#E6D49A]/60 text-xs">
              <span className="font-medium">NVD Auto-Sync Interval</span>
              <select
                value={settings.nvdSyncIntervalMinutes}
                onChange={(e) =>
                  updateSettings({ nvdSyncIntervalMinutes: Number(e.target.value) })
                }
                className="px-3 py-1.5 rounded-lg bg-[#F1ECDD] border border-[#E6D49A] font-mono text-xs"
              >
                <option value={15}>Every 15 min</option>
                <option value={60}>Every 60 min</option>
                <option value={360}>Every 6 hours</option>
                <option value={0}>Manual only</option>
              </select>
            </div>
          </div>

          <div className="bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-5 space-y-4">
            <h2 className="font-display text-base font-bold text-[#0B1F3A]">
              Appearance &amp; Motion
            </h2>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between gap-4 text-xs">
              <div>
                <div className="font-medium">Workspace Theme</div>
                <div className="text-[11px] text-[#0B1F3A]/65">
                  Switch between classic Private-Banking Ivory and Navy Dark mode.
                </div>
              </div>
              <div className="inline-flex rounded-lg border border-[#E6D49A] overflow-hidden">
                {(
                  [
                    ['ivory', 'Ivory Light'],
                    ['navy', 'Navy Dark'],
                  ] as [AppTheme, string][]
                ).map(([t, lbl]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateSettings({ theme: t })}
                    className={`px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                      settings.theme === t
                        ? 'bg-[#0B1F3A] text-[#FAF7F0]'
                        : 'bg-[#F1ECDD] text-[#0B1F3A]'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Animation Intensity */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#E6D49A]/60 text-xs">
              <div>
                <div className="font-medium">Animation Intensity</div>
                <div className="text-[11px] text-[#0B1F3A]/65">
                  Control view transitions and graph pulse effects.
                </div>
              </div>
              <div className="inline-flex rounded-lg border border-[#E6D49A] overflow-hidden">
                {(['full', 'reduced', 'off'] as AnimationIntensity[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => updateSettings({ animationIntensity: lvl })}
                    className={`px-3 py-1.5 text-xs font-semibold capitalize cursor-pointer ${
                      settings.animationIntensity === lvl
                        ? 'bg-[#0B1F3A] text-[#FAF7F0]'
                        : 'bg-[#F1ECDD] text-[#0B1F3A]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Editable Asset Values by Criticality (FAIR Quantification Inputs) */}
        <div className="lg:col-span-6 bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                Asset Financial Valuation Table (USD)
              </h2>
              <p className="text-[11px] text-[#0B1F3A]/70">
                Used by Blast Radius and Cyber Risk Quantification (FAIR) models.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ assetValues: { ...DEFAULT_ASSET_VALUES } })}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#F1ECDD] border border-[#E6D49A] text-[11px] font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
          </div>

          <div className="border border-[#E6D49A] rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F1ECDD] border-b border-[#E6D49A] text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-3">Criticality Tier</th>
                  <th className="py-2 px-3 text-right">Estimated Asset Value (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D49A]/50">
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((crit) => (
                  <tr key={crit} className="hover:bg-[#F1ECDD]/50">
                    <td className="py-1.5 px-3 font-mono font-semibold">
                      Criticality {crit}/10
                      {crit >= 9 && (
                        <span className="ml-2 text-[10px] text-[#B3261E] font-sans">
                          Crown Jewel
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <input
                        type="number"
                        step={50000}
                        min={10000}
                        value={settings.assetValues[crit] ?? DEFAULT_ASSET_VALUES[crit]}
                        onChange={(e) =>
                          updateAssetValue(crit, Number(e.target.value) || 100000)
                        }
                        className="w-36 px-2 py-1 rounded bg-[#F1ECDD] border border-[#E6D49A] text-right font-mono text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
