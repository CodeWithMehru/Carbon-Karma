/**
 * POST /api/ai/insights
 *
 * Returns three personalized carbon-reduction insights for the signed-in user.
 * Uses Google Gemini when configured, and always falls back to the deterministic
 * {@link buildInsights} engine so the endpoint never fails the dashboard.
 *
 * Rate limited via the global proxy (all `/api/ai/*` routes) and scoped to the
 * authenticated user only.
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { calculateBaseline } from '@/lib/carbon/calculator';
import {
  buildInsights,
  parseBaselineAnswers,
  NEUTRAL_ANSWERS,
  type Insight,
} from '@/lib/insights/insights';
import { insightsResultSchema } from '@/lib/validators/schemas';
import type { BaselineAnswers } from '@/lib/carbon/types';
import { logger } from '@/lib/logger';

/**
 * Ask Gemini for three personalized insights targeting the user's biggest
 * emission sources.
 *
 * @param answers - The user's baseline lifestyle answers.
 * @param breakdown - Estimated monthly kg CO₂ per category.
 * @returns Exactly three validated insights, or `null` when the key is missing
 *   or the model's output fails schema validation — signalling the caller to use
 *   the deterministic {@link buildInsights} fallback instead.
 */
async function generateWithGemini(
  answers: BaselineAnswers,
  breakdown: Record<string, number>
): Promise<Insight[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key') return null;

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: 'gemini-1.5-flash',
  });

  const prompt = `You are a sustainability coach for an Indian user.
Their estimated monthly carbon footprint by category (kg CO2): ${JSON.stringify(breakdown)}.
Lifestyle: diet=${answers.dietType}, primary transport=${answers.primaryTransport}, daily commute=${answers.dailyCommuteKm}km, cooking fuel=${answers.cookingFuel}, monthly electricity bill=₹${answers.electricityBillMonthly}, flights/year=${answers.flightsPerYear}.

Suggest exactly 3 specific, realistic, India-relevant actions that target their BIGGEST emission sources.
Return ONLY a JSON array (no markdown) of exactly 3 objects with this shape:
[{"icon":"<single emoji>","title":"<max 4 words>","desc":"<one encouraging sentence>","impact":"Save ~<number> kg CO₂/mo","category":"<emission category>"}]`;

  const result = await model.generateContent(prompt);
  const raw = result.response
    .text()
    .replace(/^```json\n?/g, '')
    .replace(/\n?```$/g, '')
    .trim();

  const parsed = insightsResultSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return null;

  return parsed.data.slice(0, 3).map((i) => ({
    icon: i.icon,
    title: i.title,
    desc: i.desc,
    impact: i.impact,
    category: i.category ?? 'other',
  }));
}

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('baseline_data')
    .eq('id', user.id)
    .maybeSingle();

  const answers = parseBaselineAnswers(profile?.baseline_data) ?? NEUTRAL_ANSWERS;
  const breakdown = calculateBaseline(answers).breakdown ?? {};
  const fallback = buildInsights(answers, breakdown);

  try {
    const aiInsights = await generateWithGemini(answers, breakdown);
    if (aiInsights && aiInsights.length === 3) {
      return NextResponse.json({ insights: aiInsights, source: 'ai' });
    }
  } catch (error) {
    logger.error('Gemini insights generation failed; using deterministic fallback', error);
  }

  return NextResponse.json({ insights: fallback, source: 'fallback' });
}
