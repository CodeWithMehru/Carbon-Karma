/**
 * Theme & Accessibility provider for applying CSS classes.
 * Reads preferences from the user store and applies them to the document root
 * in a hydration-safe manner.
 */

'use client';

import { useEffect, type ReactNode } from 'react';
import { useUserStore } from '@/stores/user-store';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const highContrastMode = useUserStore((state) => state.highContrastMode);
  const dyslexiaFont = useUserStore((state) => state.dyslexiaFont);

  useEffect(() => {
    const root = window.document.documentElement;

    // Apply high contrast mode
    if (highContrastMode) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply dyslexia friendly font
    if (dyslexiaFont) {
      root.classList.add('dyslexia-font');
    } else {
      root.classList.remove('dyslexia-font');
    }
  }, [highContrastMode, dyslexiaFont]);

  return <>{children}</>;
}
