/**
 * AI receipt-parsing layer (Google Gemini 1.5 Flash Vision).
 *
 * Wraps the Gemini Vision call that turns a receipt/bill image into structured,
 * Zod-validated line items with CO₂ estimates. The model output is never
 * trusted blindly: it is parsed, validated against {@link geminiReceiptSchema},
 * and only user-safe errors ({@link ReceiptValidationError}) are surfaced.
 *
 * When no API key is configured the module falls back to a deterministic mock
 * parser so the product is fully demoable without credentials.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiReceiptSchema } from '@/lib/validators/schemas';
import { logger } from '@/lib/logger';

/**
 * Error whose message is safe to surface to the end user (e.g. "not a receipt").
 * Internal/SDK failures are never surfaced directly — they become a generic message.
 */
export class ReceiptValidationError extends Error {}

export interface ParsedReceiptItem {
  name: string;
  category: 'food' | 'transport' | 'energy' | 'shopping' | 'other';
  quantity: number;
  unit: string;
  price_inr: number;
  estimated_kg_co2: number;
  sustainability_factor: 'high_carbon' | 'neutral' | 'sustainable';
}

export interface ParseReceiptResult {
  store_name: string;
  total_inr: number;
  items: ParsedReceiptItem[];
  overall_sustainability_score: number; // 0-100
  feedback_message: string;
}

/**
 * Build the Google Generative AI client, or `null` when no usable key is set.
 *
 * Returning `null` (rather than throwing) is deliberate: it lets the caller fall
 * back to the deterministic mock parser so the product is fully demoable without
 * credentials. The placeholder value from `.env.local.example` counts as "unset".
 */
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key') {
    logger.warn('GEMINI_API_KEY is not configured. Using randomised fallback parser.');
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

// ─── Randomised fallback data ────────────────────────────────────────────────

const MOCK_STORES = [
  'Reliance Fresh',
  'DMart Express',
  'Big Bazaar',
  "Nature's Basket",
  'Star Bazaar',
  "Spencer's Daily",
  'Organic World',
  'FreshMenu Mart',
  'Spar Hypermarket',
  'More Supermarket',
  'Nilgiris Fine Foods',
];

const MOCK_ITEMS: ParsedReceiptItem[] = [
  {
    name: 'Organic Spinach',
    category: 'food',
    quantity: 1,
    unit: 'bundle',
    price_inr: 40,
    estimated_kg_co2: 0.2,
    sustainability_factor: 'sustainable',
  },
  {
    name: 'Amul Paneer',
    category: 'food',
    quantity: 0.5,
    unit: 'kg',
    price_inr: 180,
    estimated_kg_co2: 2.4,
    sustainability_factor: 'neutral',
  },
  {
    name: 'Brown Rice (5 kg)',
    category: 'food',
    quantity: 5,
    unit: 'kg',
    price_inr: 380,
    estimated_kg_co2: 1.2,
    sustainability_factor: 'sustainable',
  },
  {
    name: 'Fresh Curd',
    category: 'food',
    quantity: 1,
    unit: 'kg',
    price_inr: 65,
    estimated_kg_co2: 1.8,
    sustainability_factor: 'neutral',
  },
  {
    name: 'Coconut Oil (Cold Pressed)',
    category: 'food',
    quantity: 1,
    unit: 'L',
    price_inr: 260,
    estimated_kg_co2: 1.0,
    sustainability_factor: 'sustainable',
  },
  {
    name: 'Frozen Chicken Wings',
    category: 'food',
    quantity: 1,
    unit: 'kg',
    price_inr: 320,
    estimated_kg_co2: 6.2,
    sustainability_factor: 'high_carbon',
  },
  {
    name: 'Local Farm Tomatoes',
    category: 'food',
    quantity: 2,
    unit: 'kg',
    price_inr: 80,
    estimated_kg_co2: 0.3,
    sustainability_factor: 'sustainable',
  },
  {
    name: 'Refined Palm Oil',
    category: 'food',
    quantity: 1,
    unit: 'L',
    price_inr: 150,
    estimated_kg_co2: 4.2,
    sustainability_factor: 'high_carbon',
  },
  {
    name: 'Jaggery (Organic)',
    category: 'food',
    quantity: 1,
    unit: 'kg',
    price_inr: 120,
    estimated_kg_co2: 0.5,
    sustainability_factor: 'sustainable',
  },
  {
    name: 'Basmati Rice',
    category: 'food',
    quantity: 2,
    unit: 'kg',
    price_inr: 240,
    estimated_kg_co2: 1.6,
    sustainability_factor: 'neutral',
  },
  {
    name: 'Imported Cheese Slices',
    category: 'food',
    quantity: 1,
    unit: 'pack',
    price_inr: 220,
    estimated_kg_co2: 5.5,
    sustainability_factor: 'high_carbon',
  },
  {
    name: 'Toor Dal',
    category: 'food',
    quantity: 1,
    unit: 'kg',
    price_inr: 160,
    estimated_kg_co2: 0.4,
    sustainability_factor: 'sustainable',
  },
  {
    name: 'Biodegradable Bags',
    category: 'shopping',
    quantity: 1,
    unit: 'pack',
    price_inr: 80,
    estimated_kg_co2: 0.3,
    sustainability_factor: 'sustainable',
  },
  {
    name: 'Plastic Wrap Roll',
    category: 'shopping',
    quantity: 1,
    unit: 'roll',
    price_inr: 60,
    estimated_kg_co2: 2.1,
    sustainability_factor: 'high_carbon',
  },
  {
    name: 'Cow Milk (Full Cream)',
    category: 'food',
    quantity: 2,
    unit: 'L',
    price_inr: 120,
    estimated_kg_co2: 2.8,
    sustainability_factor: 'neutral',
  },
];

const MOCK_FEEDBACKS = [
  'Nice mix! Your local produce choices really lower your carbon impact.',
  'Good shopping! Consider swapping a high-carbon item for a local alternative next time.',
  "Mostly sustainable picks — you're making a real difference for the planet!",
  'A balanced basket. Try more seasonal fruits and veggies to improve your score.',
  'Great job choosing organic and local items — your kitchen is going green!',
];

/** Return `count` randomly-chosen items from `arr` (shuffle-then-slice). */
function shuffleAndPick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Produce a randomized mock receipt (3–6 items) for demo/fallback use when no
 * Gemini API key is configured. The shape matches a real parse so every
 * downstream feature (scoring, logging, the review UI) works unchanged, and the
 * sustainability score is derived from the share of sustainable items picked.
 */
export function getMockReceiptResult(): ParseReceiptResult {
  const store = MOCK_STORES[Math.floor(Math.random() * MOCK_STORES.length)];
  const itemCount = 3 + Math.floor(Math.random() * 4); // 3-6 items
  const items = shuffleAndPick(MOCK_ITEMS, itemCount);
  const total = items.reduce((s, i) => s + i.price_inr, 0);

  const sustainableCount = items.filter((i) => i.sustainability_factor === 'sustainable').length;
  const score = Math.min(100, Math.round((sustainableCount / items.length) * 100));

  return {
    store_name: store,
    total_inr: total,
    items,
    overall_sustainability_score: score,
    feedback_message: MOCK_FEEDBACKS[Math.floor(Math.random() * MOCK_FEEDBACKS.length)],
  };
}

// ─── Gemini-powered parsing ────────────────────────────────────────────────────

/**
 * Parses a receipt or product image using Google Gemini 1.5 Flash Vision capabilities.
 * Falls back to randomised mock data ONLY if API key is missing.
 */
export async function parseReceiptImage(
  base64Image: string,
  mimeType: string
): Promise<ParseReceiptResult> {
  const genAI = getGeminiClient();

  if (!genAI) {
    return getMockReceiptResult();
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const promptText = `
      You are an expert sustainability API assistant. Analyze the following image.
      
      CRITICAL INSTRUCTION: First, strictly validate if the image is actually a shopping receipt, supermarket bill, or utility bill. 
      If the image is NOT a real receipt (e.g., a desktop screenshot, a random photo, a person, etc.), you MUST reject it by returning exactly this JSON and nothing else:
      {
        "error": "This doesn't look like a valid receipt. Please upload a clear photo of a grocery bill, electricity bill, or fuel receipt."
      }

      If it IS a valid receipt, transcribe the text and convert it into a strictly structured JSON object. Focus on the context of India (prices in INR).
      Estimate the Carbon Footprint (kg CO2) for each item:
      - High emissions: Beef, mutton, diesel/petrol, single-use heavy plastics (sustainability_factor: "high_carbon").
      - Medium emissions: Chicken, dairy, eggs, standard electronics, processed foods (sustainability_factor: "neutral").
      - Low emissions: Vegetables, fruits, grains, pulses, public transit, local organic produce (sustainability_factor: "sustainable").
      
      You MUST return ONLY a valid JSON object matching this schema, without any markdown formatting blocks like \`\`\`json:
      {
        "store_name": "Name of the merchant/store",
        "total_inr": total amount in INR as a number,
        "items": [
          {
            "name": "Cleaned readable item name",
            "category": "food" | "transport" | "energy" | "shopping" | "other",
            "quantity": quantity as a number,
            "unit": "kg" | "L" | "piece" | "pack" | etc,
            "price_inr": item price in INR as a number,
            "estimated_kg_co2": estimated carbon footprint as a number (e.g. 0.3),
            "sustainability_factor": "high_carbon" | "neutral" | "sustainable"
          }
        ],
        "overall_sustainability_score": sustainability score from 0-100 as a number based on items,
        "feedback_message": "A short 1-sentence encouraging feedback about their purchase impact."
      }
    `;

    const imageParts = [
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
    ];

    const result = await model.generateContent([promptText, ...imageParts]);
    const response = await result.response;
    let jsonText = response.text();

    // LLM output is untrusted free text, so it passes through three guards
    // before we use it: (1) strip stray markdown fences the model sometimes adds
    // despite instructions, (2) reject the explicit { error } the model returns
    // for non-receipts, (3) validate the shape with Zod.

    // (1) Clean up markdown if the model included it despite instructions.
    jsonText = jsonText
      .replace(/^```json\n?/g, '')
      .replace(/\n?```$/g, '')
      .trim();

    const parsed = JSON.parse(jsonText);

    // (2) The model returns an { error } object when the image is not a receipt.
    if (parsed && typeof parsed === 'object' && parsed.error) {
      throw new ReceiptValidationError(String(parsed.error));
    }

    // (3) Strictly validate the structure before trusting the model's output.
    const validated = geminiReceiptSchema.safeParse(parsed);
    if (!validated.success) {
      throw new ReceiptValidationError(
        "This doesn't look like a valid receipt. Please upload a clear photo of a grocery bill, electricity bill, or fuel receipt."
      );
    }

    return validated.data;
  } catch (error: unknown) {
    // Surface only user-safe validation messages; never leak internal/SDK errors.
    if (error instanceof ReceiptValidationError) {
      throw error;
    }
    logger.error('Gemini receipt parsing failed', error);
    throw new ReceiptValidationError(
      'We could not read that image. Please upload a clearer photo of your receipt or bill.'
    );
  }
}
