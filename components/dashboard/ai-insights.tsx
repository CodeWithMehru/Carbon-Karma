'use client';

/**
 * Personalized AI Insights grid.
 *
 * Renders the deterministic insights immediately (instant, reliable first paint)
 * then asks the Gemini-backed `/api/ai/insights` route to refine them. If the AI
 * call is unavailable the initial insights remain — the component never breaks.
 */

import { useEffect, useState } from 'react';
import type { Insight } from '@/lib/insights/insights';

interface AiInsightsProps {
  initialInsights: Insight[];
}

export function AiInsights({ initialInsights }: AiInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>(initialInsights);
  const [source, setSource] = useState<'fallback' | 'ai'>('fallback');

  useEffect(() => {
    let cancelled = false;

    async function refine() {
      try {
        const res = await fetch('/api/ai/insights', { method: 'POST' });
        if (!res.ok) return;
        const data: { insights?: Insight[]; source?: 'ai' | 'fallback' } = await res.json();
        if (!cancelled && Array.isArray(data.insights) && data.insights.length === 3) {
          setInsights(data.insights);
          setSource(data.source === 'ai' ? 'ai' : 'fallback');
        }
      } catch {
        // Keep the deterministic insights already on screen.
      }
    }

    refine();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {source === 'ai'
          ? 'Insights personalized by AI based on your footprint.'
          : 'Showing personalized reduction insights.'}
      </p>
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 list-none p-0 m-0">
        {insights.map((insight) => (
          <li
            key={insight.title}
            className="p-4 rounded-xl bg-white border border-emerald-100 flex flex-col justify-between hover:shadow-sm transition-shadow"
          >
            <div>
              <div className="text-2xl mb-2" aria-hidden="true">
                {insight.icon}
              </div>
              <h3 className="font-semibold text-sm text-emerald-950 mb-1">{insight.title}</h3>
              <p className="text-xs text-[#3d5a3d] leading-relaxed mb-4">{insight.desc}</p>
            </div>
            <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded w-fit">
              {insight.impact}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
