'use client';

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

/**
 * Footprint-vs-baseline area chart. Rendered client-only (see TrendChartLoader)
 * so recharts is code-split and never SSR'd into a zero-width container.
 */
export function TrendChart({ baseline = 150 }: { baseline?: number }) {
  const data = [
    {
      name: 'Wk 1',
      footprint: Math.round(baseline * 0.25 * 0.95),
      baseline: Math.round(baseline * 0.25),
    },
    {
      name: 'Wk 2',
      footprint: Math.round(baseline * 0.25 * 0.9),
      baseline: Math.round(baseline * 0.25),
    },
    {
      name: 'Wk 3',
      footprint: Math.round(baseline * 0.25 * 0.85),
      baseline: Math.round(baseline * 0.25),
    },
    {
      name: 'Wk 4',
      footprint: Math.round(baseline * 0.25 * 0.8),
      baseline: Math.round(baseline * 0.25),
    },
  ];

  return (
    <div style={{ width: '100%', height: 300, minWidth: 0, minHeight: 0 }} className="mt-4">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorFootprint" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            dy={10}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
            itemStyle={{ color: '#047857' }}
          />
          <Area
            type="monotone"
            dataKey="baseline"
            stroke="#94a3b8"
            strokeDasharray="5 5"
            fillOpacity={1}
            fill="url(#colorBaseline)"
            name="Baseline Estimate"
          />
          <Area
            type="monotone"
            dataKey="footprint"
            stroke="#10b981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorFootprint)"
            name="Actual CO2 (kg)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
