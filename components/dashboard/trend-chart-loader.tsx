'use client';

/**
 * Client-only loader for the recharts-powered TrendChart.
 *
 * Code-splits the (heavy) charting library and skips SSR entirely, keeping it
 * out of the initial server payload while showing a skeleton during hydration.
 */

import dynamic from 'next/dynamic';

const TrendChart = dynamic(() => import('./trend-chart').then((m) => m.TrendChart), {
  ssr: false,
  loading: () => (
    <div
      className="w-full mt-4 rounded-lg bg-emerald-50/30 animate-pulse"
      style={{ height: 300 }}
      aria-hidden="true"
    />
  ),
});

export function TrendChartLoader({ baseline }: { baseline?: number }) {
  return <TrendChart baseline={baseline} />;
}
