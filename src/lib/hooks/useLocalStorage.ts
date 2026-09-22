"use client";

import { useState, useCallback } from "react";
import { useIsClient } from "@/lib/hooks/useIsClient";
import {
  readLocalStorageWithExpiry,
  writeLocalStorageWithExpiry,
  removeLocalStorage,
} from "@/lib/misc/localStorageUtils";

type UseLocalStorageOptions<T> = {
  /** Fallback value when nothing is stored or the stored value has expired. */
  defaultValue?: T | null;
  /**
   * If provided, the stored value is wrapped in a `{ value, expiresAt }` envelope
   * and automatically cleared after this many months.
   */
  expiryMonths?: number;
};

type UseLocalStorageResult<T> = {
  /** The current stored value, or `defaultValue` / `null` if absent/expired. */
  value: T | null;
  /** Persist a new value. Applies the expiry envelope when `expiryMonths` is set. */
  setValue: (next: T) => void;
  /** Remove the key from localStorage and reset to `defaultValue` / `null`. */
  clear: () => void;
};

/**
 * Hook for reading and writing a single localStorage key with optional TTL expiry.
 *
 * - SSR-safe: returns `defaultValue` / `null` until the client is ready.
 * - Handles try/catch internally — storage failures are silent.
 * - When `expiryMonths` is provided, uses a `{ value, expiresAt }` envelope
 *   compatible with `readLocalStorageWithExpiry` / `writeLocalStorageWithExpiry`.
 *
 * @example
 * const { value, setValue, clear } = useLocalStorage<number>("priceIncrease.targetSeason", {
 *   expiryMonths: 6,
 * });
 */
export function useLocalStorage<T>(
  key: string,
  { defaultValue = null, expiryMonths }: UseLocalStorageOptions<T> = {},
): UseLocalStorageResult<T> {
  const isClient = useIsClient();

  // Read the initial value synchronously on the client only.
  // On the server (or before hydration), fall back to defaultValue.
  const [value, setValueState] = useState<T | null>(() => {
    if (typeof window === "undefined") return defaultValue ?? null;
    if (expiryMonths !== undefined) {
      return readLocalStorageWithExpiry<T>(key) ?? defaultValue ?? null;
    }
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue ?? null;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue ?? null;
    }
  });

  const setValue = useCallback(
    (next: T) => {
      setValueState(next);
      if (!isClient) return;
      if (expiryMonths !== undefined) {
        writeLocalStorageWithExpiry(key, next, expiryMonths);
      } else {
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // localStorage unavailable — silently ignore
        }
      }
    },
    [isClient, key, expiryMonths],
  );

  const clear = useCallback(() => {
    setValueState(defaultValue ?? null);
    if (!isClient) return;
    removeLocalStorage(key);
  }, [isClient, key, defaultValue]);

  return { value, setValue, clear };
}
