import { useEffect, useRef, useState } from "react";

/**
 * Module-level in-flight request cache shared across mounts (StrictMode safe).
 * Keyed by the caller-provided cache key so the SAME key in two simultaneous
 * mounts shares ONE network call.
 */
const inflight = new Map<string, Promise<unknown>>();

export interface AsyncResourceState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

export interface UseAsyncResourceOptions {
  /** Stable cache key. If null/undefined, the fetcher is NOT executed. */
  key: string | null | undefined;
  /** Set true to bypass the module-level dedupe cache (e.g. mutations). */
  skipCache?: boolean;
}

/**
 * Reusable async wrapper that:
 *  - runs the fetcher exactly once per `key` per mount, even under React.StrictMode
 *  - dedupes concurrent fetches across components via a module-level cache
 *  - guards against state updates after unmount (no double-render flicker)
 *  - exposes a uniform { data, error, isLoading } shape
 */
export function useAsyncResource<T>(
  fetcher: () => Promise<T>,
  { key, skipCache = false }: UseAsyncResourceOptions
): AsyncResourceState<T> {
  const [state, setState] = useState<AsyncResourceState<T>>({
    data: null,
    error: null,
    isLoading: !!key,
  });

  // Latch fetcher so changing identities don't re-trigger the effect.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!key) return;

    let cancelled = false;

    // Reuse an in-flight promise (same key, concurrent mounts OR StrictMode
    // double-invoke). Only create a new one if none exists.
    let promise = !skipCache ? (inflight.get(key) as Promise<T> | undefined) : undefined;
    if (!promise) {
      promise = Promise.resolve().then(() => fetcherRef.current());
      if (!skipCache) {
        inflight.set(key, promise);
        promise
          .catch(() => {})
          .finally(() => {
            if (inflight.get(key) === promise) inflight.delete(key);
          });
      }
    }

    promise.then(
      (data) => {
        if (cancelled) return;
        setState({ data, error: null, isLoading: false });
      },
      (error: unknown) => {
        if (cancelled) return;
        setState({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          isLoading: false,
        });
      }
    );

    return () => {
      cancelled = true;
    };
  }, [key, skipCache]);

  return state;
}

/** Test-only helper to reset the dedupe cache between tests. */
export function __resetAsyncResourceCache() {
  inflight.clear();
}