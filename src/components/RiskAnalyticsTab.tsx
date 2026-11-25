import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { computeZoneRiskMap } from '../engine/attackPathEngine';
import { NetworkNode, Severity, Vulnerability } from '../types/network';

interface RiskAnalyticsTabProps {
  nodes: NetworkNode[];
  vulns: Record<string, Vulnerability>;
  patchedCveIds: Set<string>;
  overallRisk: number;
  overallRiskBefore: number;
}

const SEVERITY_COLORS: Record<Severity, string> = {
  Critical: '#B3261E',
  High: '#D9822B',
  Medium: '#C9A227',
  Low: '#5E8C61',
};

export const RiskAnalyticsTab: React.FC<RiskAnalyticsTabProps> = ({
  nodes,
  vulns,
  patchedCveIds,
  overallRisk,
  overallRiskBefore,
}) => {
  const zoneData = useMemo(
    () => computeZoneRiskMap(nodes, vulns, patchedCveIds),
    [nodes, vulns, patchedCveIds]
  );

  const severityData = useMemo(() => {
    const counts: Record<Severity, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
    };
    for (const v of Object.values(vulns)) {
      if (!patchedCveIds.has(v.id)) {
        counts[v.severity]++;
      }
    }
    return (Object.keys(counts) as Severity[]).map((sev) => ({
      name: sev,
      value: counts[sev],
      color: SEVERITY_COLORS[sev],
    }));
  }, [vulns, patchedCveIds]);

  const timelineData = useMemo(() => {
    const base = Math.max(40, overallRiskBefore);
    const hasPatches = patchedCveIds.size > 0;
    const weeks = [
      { week: 'W1', risk: Math.min(100, Number((base + 4.2).toFixed(1))) },
      { week: 'W2', risk: Math.min(100, Number((base + 3.1).toFixed(1))) },
      { week: 'W3', risk: Math.min(100, Number((base + 5.0).toFixed(1))) },
      { week: 'W4', risk: Math.min(100, Number((base + 2.4).toFixed(1))) },
      { week: 'W5', risk: Math.min(100, Number((base + 1.8).toFixed(1))) },
      { week: 'W6', risk: Math.min(100, Number((base + 2.9).toFixed(1))) },
      { week: 'W7', risk: Math.min(100, Number((base + 0.9).toFixed(1))) },
      { week: 'W8', risk: Math.min(100, Number((base + 0.4).toFixed(1))) },
      { week: 'W9', risk: Number(base.toFixed(1)) },
      {
        week: 'W10',
        risk: hasPatches
          ? Number(((base + overallRisk) / 2).toFixed(1))
          : Number(base.toFixed(1)),
      },
      {
        week: 'W11',
        risk: hasPatches ? Number(overallRisk.toFixed(1)) : Number(base.toFixed(1)),
      },
      {
        week: 'W12',
        risk: hasPatches
          ? Number(Math.max(5, overallRisk - 2.4).toFixed(1))
          : Number(base.toFixed(1)),
      },
    ];
    return weeks;
  }, [overallRisk, overallRiskBefore, patchedCveIds.size]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Chart 1: Risk by Zone */}
      <div className="bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-4">
        <div className="mb-3">
          <h3 className="font-display text-sm font-bold text-[#0B1F3A]">
            Exposure Risk by Network Zone
          </h3>
          <p className="text-[11px] text-[#0B1F3A]/65">
            Criticality-weighted unpatched exploitability across security perimeters
          </p>
        </div>
        <div className="h-[230px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={zoneData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6D49A" strokeOpacity={0.5} />
              <XAxis
                dataKey="zone"
                tick={{ fill: '#0B1F3A', fontSize: 10 }}
                axisLine={{ stroke: '#E6D49A' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#0B1F3A', fontSize: 10 }}
                axisLine={{ stroke: '#E6D49A' }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B1F3A',
                  borderColor: '#C9A227',
                  borderRadius: '8px',
                  color: '#FAF7F0',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="risk" name="Zone Risk" fill="#0B1F3A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Severity Distribution Donut */}
      <div className="bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-4">
        <div className="mb-3">
          <h3 className="font-display text-sm font-bold text-[#0B1F3A]">
            Active Vulnerability Severity Mix
          </h3>
          <p className="text-[11px] text-[#0B1F3A]/65">
            Distribution of remaining unpatched CVEs by CVSS severity tier
          </p>
        </div>
        <div className="h-[230px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={severityData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="48%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={3}
              >
                {severityData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B1F3A',
                  borderColor: '#C9A227',
                  borderRadius: '8px',
                  color: '#FAF7F0',
                  fontSize: '11px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: 12-Week Simulated Risk Timeline */}
      <div className="bg-[#FAF7F0] border border-[#E6D49A] rounded-xl p-4">
        <div className="mb-3">
          <h3 className="font-display text-sm font-bold text-[#0B1F3A]">
            12-Week Risk Posture Trajectory
          </h3>
          <p className="text-[11px] text-[#0B1F3A]/65">
            {patchedCveIds.size > 0
              ? 'Projected risk decline following simulated patch deployment (W10–W12)'
              : 'Historical posture; apply simulated patches to project remediation curve'}
          </p>
        </div>
        <div className="h-[230px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6D49A" strokeOpacity={0.5} />
              <XAxis
                dataKey="week"
                tick={{ fill: '#0B1F3A', fontSize: 10 }}
                axisLine={{ stroke: '#E6D49A' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#0B1F3A', fontSize: 10 }}
                axisLine={{ stroke: '#E6D49A' }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B1F3A',
                  borderColor: '#C9A227',
                  borderRadius: '8px',
                  color: '#FAF7F0',
                  fontSize: '11px',
                }}
              />
              <Line
                type="monotone"
                dataKey="risk"
                name="Overall Risk"
                stroke="#C9A227"
                strokeWidth={2.8}
                dot={{ r: 3.5, fill: '#0B1F3A', stroke: '#C9A227', strokeWidth: 2 }}
                activeDot={{ r: 5.5, fill: '#C9A227' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
