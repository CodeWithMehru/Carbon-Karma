'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Leaf,
  ArrowRight,
  ArrowLeft,
  Zap,
  Car,
  Utensils,
  Plane,
  Building,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/stores/toast-store';
import { completeOnboarding } from './actions';
import { type TransportMode } from '@/lib/carbon/types';

const STEPS = [
  { id: 'profile', title: 'Location', description: 'Where do you make an impact?' },
  { id: 'household', title: 'Home & Energy', description: 'Household size and electricity usage' },
  { id: 'transport', title: 'Transport', description: 'Your daily commute and travel patterns' },
  { id: 'food', title: 'Food & Diet', description: 'Diet type and eating habits' },
  { id: 'travel_shopping', title: 'Flights & Shopping', description: 'Air travel and consumption frequency' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Location fields
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Quiz fields
  const [householdSize, setHouseholdSize] = useState(4);
  const [electricityBillMonthly, setElectricityBillMonthly] = useState(2000);
  const [cookingFuel, setCookingFuel] = useState<'lpg' | 'png' | 'induction' | 'firewood' | 'mixed'>('lpg');
  const [primaryTransport, setPrimaryTransport] = useState<TransportMode>('two_wheeler');
  const [dailyCommuteKm, setDailyCommuteKm] = useState(10);
  const [dietType, setDietType] = useState<'veg' | 'non_veg' | 'vegan' | 'mixed'>('veg');
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [flightsPerYear, setFlightsPerYear] = useState(0);
  const [avgFlightHours, setAvgFlightHours] = useState(0);
  const [shoppingFrequency, setShoppingFrequency] = useState<'minimal' | 'moderate' | 'frequent'>('moderate');

  const handleNext = () => {
    // Basic validation before moving forward
    if (currentStep === 0) {
      if (!city.trim() || !state.trim()) {
        toast({
          title: 'Location Required',
          description: 'Please enter your city and state to localize emissions and community metrics.',
          type: 'info',
        });
        return;
      }
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      submitQuiz();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const submitQuiz = () => {
    const payload = {
      householdSize,
      electricityBillMonthly,
      cookingFuel,
      primaryTransport,
      dailyCommuteKm,
      dietType,
      mealsPerDay,
      flightsPerYear,
      avgFlightHours,
      shoppingFrequency,
    };

    startTransition(async () => {
      const result = await completeOnboarding(payload, city, state);
      if (result?.error) {
        toast({
          title: 'Quiz Submission Failed',
          description: result.error,
          type: 'error',
        });
      } else {
        toast({
          title: 'Baseline Calculated!',
          description: 'You earned 100 starting Karma points (Level 2: Sapling!).',
          type: 'success',
        });
        router.push('/dashboard');
        router.refresh();
      }
    });
  };

  return (
    <main id="main-content" className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#f0fdf4] to-[#fafdf7] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic background items */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-100 rounded-full blur-3xl opacity-30 animate-pulse-glow" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-100 rounded-full blur-3xl opacity-30 animate-pulse-glow" style={{ animationDuration: '4s' }} />

      <div className="w-full max-w-xl z-10 flex flex-col space-y-6">
        {/* Stepper progress indicator */}
        <nav aria-label="Onboarding Progress" className="w-full">
          <ol className="flex items-center justify-between w-full">
            {STEPS.map((step, idx) => {
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;
              return (
                <li key={step.id} className="flex flex-col items-center flex-1 relative">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs border-2 transition-all ${
                      isActive
                        ? 'border-emerald-600 bg-emerald-600 text-white ring-4 ring-emerald-100'
                        : isCompleted
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                        : 'border-border bg-white text-[#4a6a4a]'
                    }`}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span className="hidden md:block text-[10px] mt-1 text-[#4a6a4a] text-center font-medium max-w-[90px] absolute top-8">
                    {step.title}
                  </span>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`hidden md:block absolute top-4 left-[55%] right-[-45%] h-0.5 -z-10 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-border'
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Live announcer for screen readers */}
        <div className="sr-only" aria-live="polite">
          Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]?.title}. {STEPS[currentStep]?.description}
        </div>

        <Card className="border border-border/50 shadow-xl glass backdrop-blur-md mt-6">
          <CardHeader>
            <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
              <Leaf className="h-5 w-5 animate-float" />
              <span>CARBON BASELINE QUIZ</span>
            </div>
            <CardTitle className="text-2xl text-emerald-950 mt-1">
              {STEPS[currentStep]?.title}
            </CardTitle>
            <CardDescription>{STEPS[currentStep]?.description}</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[280px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* STEP 0: Location & Profile Info */}
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <p className="text-sm text-[#4a6a4a] leading-relaxed">
                      We localize carbon calculations and track community accomplishments by location. Please enter your Indian location.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-[#4a6a4a]" />
                          <Input
                            id="city"
                            placeholder="e.g. Mumbai"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="pl-9"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          placeholder="e.g. Maharashtra"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 1: Household & Energy */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="householdSize">
                        How many people live in your home?
                      </Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-3 h-4 w-4 text-[#4a6a4a]" />
                        <Input
                          id="householdSize"
                          type="number"
                          min="1"
                          max="20"
                          value={householdSize}
                          onChange={(e) => setHouseholdSize(Math.max(1, parseInt(e.target.value) || 1))}
                          className="pl-9"
                        />
                      </div>
                      <p className="text-xs text-[#4a6a4a]">Energy share drops with larger families.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="electricityBill">
                        Average monthly electricity bill (INR)?
                      </Label>
                      <div className="relative">
                        <Zap className="absolute left-3 top-3 h-4 w-4 text-[#4a6a4a]" />
                        <Input
                          id="electricityBill"
                          type="number"
                          min="0"
                          value={electricityBillMonthly}
                          onChange={(e) => setElectricityBillMonthly(Math.max(0, parseInt(e.target.value) || 0))}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cookingFuel">Primary Cooking Fuel</Label>
                      <select
                        id="cookingFuel"
                        value={cookingFuel}
                        onChange={(e) => setCookingFuel(e.target.value as any)}
                        className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        <option value="lpg">LPG Cylinder</option>
                        <option value="png">PNG (Piped Gas)</option>
                        <option value="induction">Induction Cooking (Electric)</option>
                        <option value="firewood">Biomass / Firewood</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* STEP 2: Transport */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryTransport">Primary Commute Mode</Label>
                      <div className="relative">
                        <Car className="absolute left-3 top-3 h-4 w-4 text-[#4a6a4a] z-10" />
                        <select
                          id="primaryTransport"
                          value={primaryTransport}
                          onChange={(e) => setPrimaryTransport(e.target.value as TransportMode)}
                          className="flex h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          <option value="two_wheeler">Two-Wheeler (Motorcycle/Scooter)</option>
                          <option value="petrol_car">Petrol Car</option>
                          <option value="diesel_car">Diesel Car</option>
                          <option value="electric_car">Electric Car</option>
                          <option value="cng_auto">CNG Auto-Rickshaw</option>
                          <option value="bus">Public Bus</option>
                          <option value="metro">Metro / Suburban Train</option>
                          <option value="train">Long Distance Train</option>
                          <option value="bicycle">Bicycle</option>
                          <option value="walking">Walking</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="commuteKm">Daily round-trip commute (km)</Label>
                      <Input
                        id="commuteKm"
                        type="number"
                        min="0"
                        max="500"
                        value={dailyCommuteKm}
                        onChange={(e) => setDailyCommuteKm(Math.max(0, parseInt(e.target.value) || 0))}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 3: Food & Diet */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dietType">Diet Type</Label>
                      <div className="relative">
                        <Utensils className="absolute left-3 top-3 h-4 w-4 text-[#4a6a4a] z-10" />
                        <select
                          id="dietType"
                          value={dietType}
                          onChange={(e) => setDietType(e.target.value as any)}
                          className="flex h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          <option value="veg">Vegetarian (Includes Dairy)</option>
                          <option value="mixed">Mixed (Occasionally Non-Veg)</option>
                          <option value="non_veg">Regular Non-Vegetarian</option>
                          <option value="vegan">Vegan (100% Plant-Based)</option>
                        </select>
                      </div>
                      <p className="text-xs text-[#4a6a4a]">
                        Meat consumption carries significantly higher CO2 factors.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mealsPerDay">Meals per day</Label>
                      <Input
                        id="mealsPerDay"
                        type="number"
                        min="1"
                        max="10"
                        value={mealsPerDay}
                        onChange={(e) => setMealsPerDay(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 4: Flights & Shopping */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="flights">Round-trip flights / year</Label>
                        <div className="relative">
                          <Plane className="absolute left-3 top-3 h-4 w-4 text-[#4a6a4a]" />
                          <Input
                            id="flights"
                            type="number"
                            min="0"
                            value={flightsPerYear}
                            onChange={(e) => setFlightsPerYear(Math.max(0, parseInt(e.target.value) || 0))}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="flightHours">Avg flight duration (hours)</Label>
                        <Input
                          id="flightHours"
                          type="number"
                          min="0"
                          value={avgFlightHours}
                          onChange={(e) => setAvgFlightHours(Math.max(0, parseFloat(e.target.value) || 0))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shopping">How often do you purchase new clothing or gadgets?</Label>
                      <select
                        id="shopping"
                        value={shoppingFrequency}
                        onChange={(e) => setShoppingFrequency(e.target.value as any)}
                        className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        <option value="minimal">Minimal (Rarely buy new items, repair first)</option>
                        <option value="moderate">Moderate (Regular purchases as needed)</option>
                        <option value="frequent">Frequent (Shop regularly for latest models/fashions)</option>
                      </select>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border/50 pt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0 || isPending}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={isPending}
              className="flex items-center gap-2 font-semibold"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Calculating Baseline...
                </span>
              ) : currentStep === STEPS.length - 1 ? (
                <>
                  Calculate Karma <Sparkles className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
