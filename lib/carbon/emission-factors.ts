/**
 * India-specific carbon emission factors.
 * Sources: CEA CO2 Baseline Database v18, IPCC 2006 Guidelines, MoEFCC
 * All values in kgCO2 per unit specified.
 */

/** India grid emission factor (kgCO2/kWh) — CEA 2023-24 */
export const ELECTRICITY_FACTOR = 0.82 as const;

/** kgCO2 per km travelled. EV/derived modes scale off the grid factor above. */
export const TRANSPORT_FACTORS = {
  petrol_car: 0.1925,
  diesel_car: 0.1787,
  electric_car: ELECTRICITY_FACTOR * 0.15,
  cng_auto: 0.12,
  two_wheeler: 0.06,
  bus: 0.06,
  metro: 0.04,
  train: 0.04,
  domestic_flight: 0.255,
  international_flight: 0.195,
  bicycle: 0,
  walking: 0,
} as const;

/** kgCO2 per unit of fuel combusted (per litre or per kg, as named). */
export const FUEL_FACTORS = {
  petrol_per_liter: 2.31,
  diesel_per_liter: 2.68,
  cng_per_kg: 2.75,
  lpg_per_kg: 2.98,
} as const;

/** kgCO2 per meal/serving, by diet/food type. */
export const FOOD_FACTORS = {
  veg_meal: 0.7,
  non_veg_meal: 3.3,
  vegan_meal: 0.5,
  dairy_product: 0.6,
  packaged_food: 1.2,
} as const;

/** kgCO2 per unit consumed (per cylinder / m³ / kg / kWh, as named). */
export const COOKING_FUEL_FACTORS = {
  lpg_cylinder: 44.0,
  png_per_m3: 2.0,
  firewood_per_kg: 1.7,
  induction_per_kwh: ELECTRICITY_FACTOR,
} as const;

/** kgCO2 per kg of waste; `*_saved_*` keys are emissions AVOIDED, not emitted. */
export const WASTE_FACTORS = {
  landfill_per_kg: 0.58,
  compost_saved_per_kg: 0.25,
  recycling_saved_per_kg: 0.4,
  plastic_bag: 0.04,
} as const;

/** kgCO2 per kilolitre of municipal water, or per single use as named. */
export const WATER_FACTORS = {
  municipal_per_kl: 0.344,
  hot_shower_10min: 1.5,
} as const;

/** kgCO2 per ₹1000 spent or per device; `secondhand_saving` is avoided emissions. */
export const SHOPPING_FACTORS = {
  clothing_per_1000_inr: 5.0,
  electronics_per_device: 50.0,
  secondhand_saving: 5.0,
} as const;

/** Reference values for contextualizing a footprint (units stated per key). */
export const BENCHMARKS = {
  india_avg_annual_tonnes: 1.9,
  india_avg_monthly_kg: 158.3,
  global_avg_annual_tonnes: 4.7,
  paris_target_annual_tonnes: 2.1,
  tree_absorption_annual_kg: 22.0,
} as const;

/** UI presentation metadata (label/icon/color) per category — not emission data. */
export const CATEGORY_META = {
  electricity: {
    label: 'Electricity',
    icon: 'zap',
    color: '#facc15',
    gradient: 'from-yellow-400 to-amber-500',
  },
  transport: {
    label: 'Transport',
    icon: 'car',
    color: '#3b82f6',
    gradient: 'from-blue-400 to-blue-600',
  },
  food: {
    label: 'Food',
    icon: 'utensils',
    color: '#22c55e',
    gradient: 'from-green-400 to-emerald-600',
  },
  cooking_fuel: {
    label: 'Cooking Fuel',
    icon: 'flame',
    color: '#f97316',
    gradient: 'from-orange-400 to-red-500',
  },
  waste: {
    label: 'Waste',
    icon: 'recycle',
    color: '#84cc16',
    gradient: 'from-lime-400 to-green-500',
  },
  shopping: {
    label: 'Shopping',
    icon: 'shopping-bag',
    color: '#d946ef',
    gradient: 'from-fuchsia-400 to-purple-600',
  },
  water: {
    label: 'Water',
    icon: 'droplets',
    color: '#06b6d4',
    gradient: 'from-cyan-400 to-blue-500',
  },
  other: {
    label: 'Other',
    icon: 'circle-dot',
    color: '#94a3b8',
    gradient: 'from-slate-400 to-slate-600',
  },
} as const;
