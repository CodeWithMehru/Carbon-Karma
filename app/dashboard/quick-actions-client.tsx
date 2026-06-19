'use client';

/**
 * Dashboard Quick Actions — one-click eco-action logging (the "Reduce" step).
 *
 * Renders a short list of eco-actions; tapping one calls the `logEcoAction`
 * server action inside a transition, shows a per-row pending state, toasts the
 * karma earned, and refreshes the dashboard so the new streak/footprint appear.
 */

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Bike, Train, Users, Footprints, Home, Utensils, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logEcoAction } from '@/app/actions/actions';
import { toast } from '@/stores/toast-store';

interface EcoAction {
  id: string;
  title: string;
  category: string;
  kg_co2_saved: number;
  karma_reward: number;
  icon_name: string;
}

/** Map a DB `icon_name` to its lucide icon; unknown names fall back to Leaf. */
const getIcon = (name: string) => {
  switch (name) {
    case 'bike':
      return Bike;
    case 'train-front':
    case 'train':
      return Train;
    case 'users':
      return Users;
    case 'footprints':
      return Footprints;
    case 'home':
      return Home;
    case 'salad':
    case 'utensils-crossed':
      return Utensils;
    default:
      return Leaf;
  }
};

export function QuickActionsClient({ actions }: { actions: EcoAction[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loggingId, setLoggingId] = useState<string | null>(null);

  const handleLog = (actionId: string) => {
    setLoggingId(actionId);
    startTransition(async () => {
      const result = await logEcoAction(actionId);
      setLoggingId(null);
      if (!result.success) {
        toast({
          title: 'Action Log Failed',
          description: result.error,
          type: 'error',
        });
      } else {
        toast({
          title: 'Eco-Action Logged!',
          description: `You saved ${(result.points / 10).toFixed(1)} kg CO₂ and earned +${result.points} Karma!`,
          type: 'success',
        });
        router.refresh();
      }
    });
  };

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      role="region"
      aria-label="Quick actions list"
    >
      {actions.map((act) => {
        const Icon = getIcon(act.icon_name);
        const isLogging = loggingId === act.id;
        return (
          <Button
            key={act.id}
            onClick={() => handleLog(act.id)}
            disabled={isPending || isLogging}
            variant="outline"
            className="h-auto py-3 px-4 border-emerald-100/60 hover:border-emerald-200 hover:bg-emerald-50/40 flex items-center justify-between text-left group"
            aria-label={`Log action: ${act.title}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 flex-shrink-0 transition-colors">
                {isLogging ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-950 truncate">{act.title}</p>
                <p className="text-xs text-gray-500 font-medium">-{act.kg_co2_saved} kg CO₂</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded ml-2">
              <Sparkles className="h-3 w-3 fill-amber-500 text-amber-500" />+{act.karma_reward}
            </div>
          </Button>
        );
      })}
    </div>
  );
}
