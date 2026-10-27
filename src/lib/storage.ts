"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useState that persists to localStorage. Starts with `initial` on both server and first client
 * render (no hydration mismatch), then hydrates from storage in an effect.
 */
export function usePersistentState<T>(key: string, initial: T, enabled = true): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue({ ...(typeof initial === "object" && initial !== null && !Array.isArray(initial) ? initial : {}), ...JSON.parse(raw) } as T);
    } catch {
      /* ignore corrupt or blocked storage */
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!ready) return;
    try {
      if (enabled) window.localStorage.setItem(key, JSON.stringify(value));
      else window.localStorage.removeItem(key);
    } catch {
      /* quota or private mode – non-fatal */
    }
  }, [key, value, ready, enabled]);

  const set = useCallback((v: T | ((p: T) => T)) => setValue(v), []);
  return [value, set, ready];
}
