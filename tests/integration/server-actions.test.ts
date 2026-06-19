/**
 * Integration tests for the server-action orchestration layer.
 *
 * The Supabase client is replaced with a chainable in-memory mock so we can
 * assert that each action wires the domain logic (karma, streak, scoring) into
 * the right database writes — without touching a real database.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mockCreateClient = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => mockCreateClient(),
}));

import { logEcoAction } from '@/app/actions/actions';
import { confirmAndLogReceipt } from '@/app/upload/actions';
import type { ParseReceiptResult } from '@/lib/ai/ai';

interface QueryResult {
  data: unknown;
  error: unknown;
}
interface Capture {
  table: string;
  op: string;
  payload: unknown;
}

/**
 * Chainable Supabase query-builder mock. Responses are keyed by `${table}.${op}`
 * (op ∈ select|insert|update|upsert). Insert/update payloads are captured.
 */
function createMockSupabase(opts: {
  user: { id: string } | null;
  responses: Record<string, QueryResult>;
  calls: Capture[];
}) {
  function builder(table: string) {
    let op = 'select';
    let written = false;
    const resolve = (): QueryResult =>
      opts.responses[`${table}.${op}`] ?? { data: null, error: null };

    const b = {
      select() {
        if (!written) op = 'select';
        return b;
      },
      insert(payload: unknown) {
        op = 'insert';
        written = true;
        opts.calls.push({ table, op, payload });
        return b;
      },
      update(payload: unknown) {
        op = 'update';
        written = true;
        opts.calls.push({ table, op, payload });
        return b;
      },
      upsert(payload: unknown) {
        op = 'upsert';
        written = true;
        opts.calls.push({ table, op, payload });
        return b;
      },
      eq: () => b,
      gte: () => b,
      order: () => b,
      limit: () => b,
      returns: () => b,
      single: () => Promise.resolve(resolve()),
      maybeSingle: () => Promise.resolve(resolve()),
      then: (onF: (v: QueryResult) => unknown, onR?: (e: unknown) => unknown) =>
        Promise.resolve(resolve()).then(onF, onR),
    };
    return b;
  }

  return {
    auth: { getUser: () => Promise.resolve({ data: { user: opts.user }, error: null }) },
    from: (table: string) => builder(table),
  };
}

function findUpdate(calls: Capture[], table: string): Record<string, unknown> {
  const call = calls.find((c) => c.table === table && c.op === 'update');
  return (call?.payload ?? {}) as Record<string, unknown>;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-18T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('logEcoAction', () => {
  it('logs the action, awards karma, advances the streak, and returns success', async () => {
    const calls: Capture[] = [];
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'u1' },
        calls,
        responses: {
          'actions.select': {
            data: {
              id: 'a1',
              category: 'transport',
              title: 'Cycle to Work',
              kg_co2_saved: 4.2,
              karma_reward: 25,
            },
            error: null,
          },
          'carbon_logs.select': { data: { logged_at: '2026-06-17T08:00:00Z' }, error: null },
          'carbon_logs.insert': { data: { id: 'log1' }, error: null },
          'karma_transactions.insert': { data: null, error: null },
          'profiles.select': {
            data: {
              karma_points: 100,
              total_kg_co2_saved: 5,
              city: 'Pune',
              current_streak: 3,
              longest_streak: 5,
            },
            error: null,
          },
          'profiles.update': { data: null, error: null },
          'ripple_events.insert': { data: null, error: null },
        },
      })
    );

    const result = await logEcoAction('a1');
    expect(result).toEqual({ success: true, points: 25, title: 'Cycle to Work' });

    const update = findUpdate(calls, 'profiles');
    expect(update.karma_points).toBe(125);
    expect(update.karma_level).toBe(2); // getKarmaLevel(125)
    expect(update.total_kg_co2_saved).toBeCloseTo(9.2, 4);
    expect(update.current_streak).toBe(4); // consecutive day: 3 + 1
    expect(update.longest_streak).toBe(5);

    // A ripple event should be emitted for the community feed.
    expect(calls.some((c) => c.table === 'ripple_events' && c.op === 'insert')).toBe(true);
  });

  it('rejects unauthenticated callers', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({ user: null, calls: [], responses: {} })
    );
    const result = await logEcoAction('a1');
    expect(result).toEqual({ success: false, error: 'You must be signed in to log actions.' });
  });

  it('returns an error when the action does not exist', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'u1' },
        calls: [],
        responses: { 'actions.select': { data: null, error: { message: 'not found' } } },
      })
    );
    const result = await logEcoAction('missing');
    expect(result).toEqual({ success: false, error: 'Eco-action not found.' });
  });
});

describe('confirmAndLogReceipt', () => {
  const receipt: ParseReceiptResult = {
    store_name: 'DMart',
    total_inr: 340,
    items: [
      {
        name: 'Spinach',
        category: 'food',
        quantity: 1,
        unit: 'bundle',
        price_inr: 40,
        estimated_kg_co2: 0.2,
        sustainability_factor: 'sustainable',
      },
      {
        name: 'Chicken',
        category: 'food',
        quantity: 1,
        unit: 'kg',
        price_inr: 300,
        estimated_kg_co2: 6,
        sustainability_factor: 'high_carbon',
      },
    ],
    overall_sustainability_score: 50,
    feedback_message: 'Balanced basket.',
  };

  it('logs items, scores karma, and updates carbon saved + streak', async () => {
    const calls: Capture[] = [];
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'u1' },
        calls,
        responses: {
          'carbon_logs.select': { data: { logged_at: '2026-06-17T08:00:00Z' }, error: null },
          'carbon_logs.insert': { data: [{ id: 'log1' }], error: null },
          'profiles.select': {
            data: {
              karma_points: 100,
              total_kg_co2_saved: 5,
              city: 'Mumbai',
              current_streak: 2,
              longest_streak: 4,
            },
            error: null,
          },
          'profiles.update': { data: null, error: null },
          'karma_transactions.insert': { data: null, error: null },
          'ripple_events.insert': { data: null, error: null },
        },
      })
    );

    const result = await confirmAndLogReceipt(receipt);
    expect(result.success).toBe(true);
    expect(result.karmaEarned).toBe(60); // 50 base + 1 sustainable * 10

    const update = findUpdate(calls, 'profiles');
    expect(update.karma_points).toBe(160);
    expect(update.total_kg_co2_saved).toBeCloseTo(6.5, 4); // 5 + 1 sustainable * 1.5
    expect(update.current_streak).toBe(3); // consecutive day: 2 + 1
  });

  it('rejects unauthenticated callers', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({ user: null, calls: [], responses: {} })
    );
    const result = await confirmAndLogReceipt(receipt);
    expect(result).toEqual({ error: 'You must be logged in.' });
  });
});
