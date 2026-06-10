/**
 * Global user state store using Zustand.
 * Manages auth state, profile, and UI preferences.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserState {
  /** Current user profile from Supabase */
  profile: Profile | null;

  /** Whether the profile has been loaded */
  isLoaded: boolean;

  /** UI preferences */
  highContrastMode: boolean;
  dyslexiaFont: boolean;
  sidebarOpen: boolean;

  /** Actions */
  setProfile: (profile: Profile | null) => void;
  setLoaded: (loaded: boolean) => void;
  toggleHighContrast: () => void;
  toggleDyslexiaFont: () => void;
  toggleSidebar: () => void;
  reset: () => void;
}

const initialState = {
  profile: null,
  isLoaded: false,
  highContrastMode: false,
  dyslexiaFont: false,
  sidebarOpen: true,
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      ...initialState,

      setProfile: (profile) =>
        set({
          profile,
          highContrastMode: profile?.high_contrast_mode ?? false,
          dyslexiaFont: profile?.dyslexia_font ?? false,
        }),

      setLoaded: (isLoaded) => set({ isLoaded }),

      toggleHighContrast: () =>
        set((state) => ({ highContrastMode: !state.highContrastMode })),

      toggleDyslexiaFont: () =>
        set((state) => ({ dyslexiaFont: !state.dyslexiaFont })),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      reset: () => set(initialState),
    }),
    {
      name: 'carbon-karma-user',
      partialize: (state) => ({
        highContrastMode: state.highContrastMode,
        dyslexiaFont: state.dyslexiaFont,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
