'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bike,
  Train,
  Users,
  Footprints,
  Home,
  Utensils,
  Leaf,
  Apple,
  CookingPot,
  Lightbulb,
  Thermometer,
  Plug,
  Wind,
  Sun,
  Recycle,
  Sprout,
  Droplets,
  ShoppingBag,
  Wrench,
  Search,
  Sparkles,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { logEcoAction } from './actions';
import { toast } from '@/stores/toast-store';

interface EcoAction {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  kg_co2_saved: number;
  karma_reward: number;
  icon_name: string;
  color: string;
  times_logged: number;
}

// Icon mapper helper
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
    case 'apple':
      return Apple;
    case 'cooking-pot':
      return CookingPot;
    case 'lightbulb':
      return Lightbulb;
    case 'thermometer':
      return Thermometer;
    case 'plug':
      return Plug;
    case 'wind':
      return Wind;
    case 'sun':
      return Sun;
    case 'recycle':
      return Recycle;
    case 'sprout':
      return Sprout;
    case 'droplets':
      return Droplets;
    case 'shopping-bag':
      return ShoppingBag;
    case 'wrench':
      return Wrench;
    default:
      return Leaf;
  }
};

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'transport', label: 'Transport' },
  { value: 'food', label: 'Food & Diet' },
  { value: 'electricity', label: 'Energy' },
  { value: 'waste', label: 'Waste' },
  { value: 'water', label: 'Water' },
  { value: 'shopping', label: 'Shopping' },
];

export function ActionsList({ initialActions }: { initialActions: EcoAction[] }) {
  const router = useRouter();
  const [actions, setActions] = useState(initialActions);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isPending, startTransition] = useTransition();
  const [loggingId, setLoggingId] = useState<string | null>(null);

  // Filter actions
  const filteredActions = actions.filter((action) => {
    const matchesSearch =
      action.title.toLowerCase().includes(search.toLowerCase()) ||
      action.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || action.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleLogAction = (actionId: string) => {
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
          title: 'Karma Earned!',
          description: `Logged "${result.title}" and earned +${result.points} Karma!`,
          type: 'success',
        });

        // Optimistically update times_logged locally
        setActions((prev) =>
          prev.map((act) =>
            act.id === actionId ? { ...act, times_logged: act.times_logged + 1 } : act
          )
        );
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters & Search Row */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-[#4a6a4a]" />
          <Input
            placeholder="Search eco-actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 border-emerald-100 focus-visible:ring-emerald-500 bg-white"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat.value)}
              className={`rounded-full text-xs font-semibold px-4 h-9 ${
                selectedCategory === cat.value
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'border-emerald-100 hover:bg-emerald-50 text-emerald-800'
              }`}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid of Actions */}
      {filteredActions.length === 0 ? (
        <Card className="text-center py-12 border-emerald-100 bg-white">
          <CardContent className="space-y-3">
            <HelpCircle className="h-12 w-12 text-emerald-600/30 mx-auto" />
            <h3 className="font-heading text-lg font-semibold text-emerald-950">
              No actions found
            </h3>
            <p className="text-[#4a6a4a] text-sm max-w-sm mx-auto">
              Try adjusting your search query or switching categories.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredActions.map((action) => {
            const Icon = getIcon(action.icon_name);
            const isLogging = loggingId === action.id;
            return (
              <Card
                key={action.id}
                className="glass border-emerald-100/50 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow bg-white/70"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: action.color || '#10b981' }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          action.difficulty === 'easy'
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : action.difficulty === 'medium'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}
                      >
                        {action.difficulty}
                      </span>
                      {action.times_logged > 0 && (
                        <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Logged {action.times_logged}x
                        </span>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg font-heading text-emerald-950 font-semibold">
                    {action.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-[#4a6a4a] min-h-[36px] line-clamp-2">
                    {action.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-4 pt-0">
                  <div className="grid grid-cols-2 gap-4 border-y border-emerald-100/50 py-3 text-center bg-emerald-50/20 rounded-lg">
                    <div>
                      <p className="text-xs font-semibold text-[#4a6a4a] uppercase">CO₂ Saved</p>
                      <p className="text-sm font-bold text-emerald-800">
                        {action.kg_co2_saved.toFixed(2)} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#4a6a4a] uppercase">Karma Points</p>
                      <p className="text-sm font-bold text-amber-600 flex items-center justify-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />+
                        {action.karma_reward}
                      </p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-0">
                  <Button
                    onClick={() => handleLogAction(action.id)}
                    disabled={isLogging || isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                  >
                    {isLogging ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Logging...
                      </span>
                    ) : (
                      'Log Action'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
