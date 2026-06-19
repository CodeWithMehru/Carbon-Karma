'use client';

/**
 * Floating accessibility menu.
 *
 * Lets any visitor toggle the high-contrast theme and dyslexia-friendly font
 * (both defined in globals.css). Preferences live in localStorage and are read
 * through `useSyncExternalStore`, so the features are genuinely reachable and
 * stay in sync across tabs. The control is keyboard-operable and screen-reader
 * friendly (role="switch", aria-expanded/controls).
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Accessibility, X } from 'lucide-react';

const STORAGE_KEY = 'ck-a11y-prefs';

interface A11yPrefs {
  highContrast: boolean;
  dyslexiaFont: boolean;
}

const DEFAULT_PREFS: A11yPrefs = { highContrast: false, dyslexiaFont: false };

// Cache the parsed snapshot so getSnapshot returns a stable reference.
let snapshotCache: { raw: string | null; value: A11yPrefs } = {
  raw: null,
  value: DEFAULT_PREFS,
};

function readPrefs(): A11yPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === snapshotCache.raw) return snapshotCache.value;
  let value = DEFAULT_PREFS;
  try {
    if (raw) value = { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<A11yPrefs>) };
  } catch {
    value = DEFAULT_PREFS;
  }
  snapshotCache = { raw, value };
  return value;
}

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener('storage', callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

function writePrefs(next: A11yPrefs) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function applyPrefs(prefs: A11yPrefs) {
  const root = document.documentElement;
  root.classList.toggle('high-contrast', prefs.highContrast);
  root.classList.toggle('dyslexia-font', prefs.dyslexiaFont);
}

export function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const prefs = useSyncExternalStore(subscribe, readPrefs, () => DEFAULT_PREFS);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Reflect the current preferences onto the document root.
  useEffect(() => {
    applyPrefs(prefs);
  }, [prefs]);

  // Close and return focus to the toggle button (keeps keyboard users oriented).
  const closeMenu = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  // While the panel is open: move focus into it and allow Escape to dismiss it.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeMenu();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, closeMenu]);

  const update = (patch: Partial<A11yPrefs>) => writePrefs({ ...prefs, ...patch });

  return (
    <div className="fixed bottom-4 left-4 z-50 print:hidden">
      {open && (
        <div
          id="a11y-panel"
          role="group"
          aria-label="Accessibility preferences"
          className="mb-2 w-64 rounded-xl border border-emerald-100 bg-white p-4 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-emerald-950">Accessibility</h2>
            <button
              ref={closeRef}
              type="button"
              onClick={closeMenu}
              aria-label="Close accessibility menu"
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <ToggleRow
            label="High contrast"
            description="Boost color contrast"
            checked={prefs.highContrast}
            onToggle={() => update({ highContrast: !prefs.highContrast })}
          />
          <ToggleRow
            label="Dyslexia-friendly font"
            description="Easier-to-read typeface"
            checked={prefs.dyslexiaFont}
            onToggle={() => update({ dyslexiaFont: !prefs.dyslexiaFont })}
          />
        </div>
      )}

      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label="Accessibility options"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        <Accessibility className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <span>
        <span className="block text-sm font-medium text-emerald-950">{label}</span>
        <span className="block text-xs text-[#3d5a3d]">{description}</span>
      </span>
      <span
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-600' : 'bg-gray-300'}`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </span>
    </button>
  );
}
