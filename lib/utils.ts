/**
 * Utility for merging Tailwind CSS classes with proper specificity.
 * Used by shadcn/ui components.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional class names into a single, conflict-free Tailwind string.
 *
 * `clsx` flattens the inputs (strings, arrays, and `{ class: condition }` maps)
 * and `twMerge` resolves competing Tailwind utilities so the last one wins
 * (e.g. `cn('p-2', 'p-4')` → `'p-4'`).
 *
 * @param inputs - Class values (strings, arrays, or conditional maps).
 * @returns The merged class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
