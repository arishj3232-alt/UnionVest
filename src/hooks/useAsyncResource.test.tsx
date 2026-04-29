import React, { StrictMode, useRef } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import {
  useAsyncResource,
  __resetAsyncResourceCache,
} from "./useAsyncResource";

function Probe({
  fetcher,
  cacheKey,
  onRender,
}: {
  fetcher: () => Promise<string>;
  cacheKey: string;
  onRender?: () => void;
}) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  onRender?.();
  const { data, isLoading, error } = useAsyncResource(fetcher, {
    key: cacheKey,
  });
  return (
    <div>
      <span data-testid="status">
        {isLoading ? "loading" : error ? `err:${error.message}` : data ?? "empty"}
      </span>
      <span data-testid="renders">{renderCount.current}</span>
    </div>
  );
}

describe("useAsyncResource (StrictMode)", () => {
  beforeEach(() => {
    __resetAsyncResourceCache();
  });

  it("invokes the fetcher exactly once under StrictMode", async () => {
    const fetcher = vi.fn().mockResolvedValue("hello");

    render(
      <StrictMode>
        <Probe fetcher={fetcher} cacheKey="k1" />
      </StrictMode>
    );

    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("hello")
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent mounts to a single network call", async () => {
    const fetcher = vi.fn().mockResolvedValue("shared");

    render(
      <StrictMode>
        <>
          <Probe fetcher={fetcher} cacheKey="shared-key" />
          <Probe fetcher={fetcher} cacheKey="shared-key" />
          <Probe fetcher={fetcher} cacheKey="shared-key" />
        </>
      </StrictMode>
    );

    await waitFor(() => {
      const all = screen.getAllByTestId("status");
      all.forEach((el) => expect(el.textContent).toBe("shared"));
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("settles to a stable render count (no double-render loops)", async () => {
    const fetcher = vi.fn().mockResolvedValue("done");
    const onRender = vi.fn();

    render(
      <StrictMode>
        <Probe fetcher={fetcher} cacheKey="stable" onRender={onRender} />
      </StrictMode>
    );

    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("done")
    );

    // Wait a tick to ensure no further updates fire.
    await act(() => new Promise((r) => setTimeout(r, 20)));
    const finalCount = onRender.mock.calls.length;
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(onRender.mock.calls.length).toBe(finalCount);

    // Expected lifecycle under StrictMode:
    //  1. initial mount render
    //  2. StrictMode second render
    //  3. resolve -> setState render
    // Allow up to 4 to absorb React batching variance, but never more.
    expect(finalCount).toBeLessThanOrEqual(4);
  });

  it("does not fetch when key is null", async () => {
    const fetcher = vi.fn().mockResolvedValue("nope");
    function Gated() {
      const { isLoading } = useAsyncResource(fetcher, { key: null });
      return <span data-testid="gated">{isLoading ? "L" : "I"}</span>;
    }

    render(
      <StrictMode>
        <Gated />
      </StrictMode>
    );

    await act(() => new Promise((r) => setTimeout(r, 10)));
    expect(fetcher).not.toHaveBeenCalled();
    expect(screen.getByTestId("gated").textContent).toBe("I");
  });

  it("propagates errors without re-invoking the fetcher", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("boom"));

    render(
      <StrictMode>
        <Probe fetcher={fetcher} cacheKey="err-key" />
      </StrictMode>
    );

    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("err:boom")
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});