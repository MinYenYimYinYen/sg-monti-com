import { useSyncExternalStore } from "react";

// A clock a component can read during render without breaking the Rules of React: the value only
// changes on a timer, and the same value is returned for every read between ticks. Shared, so any
// number of components cost one interval.

const TICK_MS = 15_000;
const listeners = new Set<() => void>();
let currentMs = 0;
let timerId: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (timerId === null) {
    currentMs = Date.now();
    timerId = setInterval(() => {
      currentMs = Date.now();
      listeners.forEach((notify) => notify());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  };
}

function getSnapshot(): number {
  // Before anyone has subscribed there is no tick yet, so the first read sets the time once.
  if (currentMs === 0) currentMs = Date.now();
  return currentMs;
}

/** The current time in ms, refreshed every 15 seconds. Server render gets 0, so callers must wait for the client. */
export function useNowMs(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
