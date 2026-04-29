import React, { StrictMode, useEffect, useRef } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { render, screen, waitFor, act } from "@testing-library/react";
import {
  useAsyncResource,
  __resetAsyncResourceCache,
} from "@/hooks/useAsyncResource";

/**
 * Simulates a real page that:
 *  - is mounted via a route
 *  - kicks off ONE async load on mount
 *  - is wrapped in StrictMode (double-invoke effects in dev)
 */
function makePage(label: string, fetcher: () => Promise<string>) {
  return function Page() {
    const renders = useRef(0);
    renders.current += 1;
    const { data, isLoading } = useAsyncResource(fetcher, {
      key: `page:${label}`,
    });
    return (
      <div>
        <span data-testid={`${label}-status`}>
          {isLoading ? "loading" : data}
        </span>
        <span data-testid={`${label}-renders`}>{renders.current}</span>
      </div>
    );
  };
}

function Navigator({ to }: { to: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to);
  }, [navigate, to]);
  return null;
}

describe("navigation single-fetch contract", () => {
  beforeEach(() => {
    __resetAsyncResourceCache();
  });

  it("issues exactly one network call when navigating to a page (StrictMode)", async () => {
    const fetcher = vi.fn().mockResolvedValue("orders-payload");
    const OrdersPage = makePage("orders", fetcher);

    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<Navigator to="/orders" />} />
            <Route path="/orders" element={<OrdersPage />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>
    );

    await waitFor(() =>
      expect(screen.getByTestId("orders-status").textContent).toBe(
        "orders-payload"
      )
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("issues exactly one network call per page across multi-page navigation", async () => {
    const ordersFetcher = vi.fn().mockResolvedValue("orders-payload");
    const dashFetcher = vi.fn().mockResolvedValue("dash-payload");
    const OrdersPage = makePage("orders", ordersFetcher);
    const DashPage = makePage("dash", dashFetcher);

    function Controls() {
      const navigate = useNavigate();
      return (
        <div>
          <button data-testid="go-orders" onClick={() => navigate("/orders")}>
            o
          </button>
          <button data-testid="go-dash" onClick={() => navigate("/dash")}>
            d
          </button>
        </div>
      );
    }

    const { getByTestId } = render(
      <StrictMode>
        <MemoryRouter initialEntries={["/"]}>
          <Controls />
          <Routes>
            <Route path="/" element={<div data-testid="home">home</div>} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/dash" element={<DashPage />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>
    );

    await act(async () => {
      getByTestId("go-orders").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("orders-status").textContent).toBe(
        "orders-payload"
      )
    );

    await act(async () => {
      getByTestId("go-dash").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("dash-status").textContent).toBe("dash-payload")
    );

    expect(ordersFetcher).toHaveBeenCalledTimes(1);
    expect(dashFetcher).toHaveBeenCalledTimes(1);
  });

  it("renders the page component a bounded number of times under StrictMode", async () => {
    const fetcher = vi.fn().mockResolvedValue("ok");
    const Page = makePage("bounded", fetcher);

    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/x"]}>
          <Routes>
            <Route path="/x" element={<Page />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>
    );

    await waitFor(() =>
      expect(screen.getByTestId("bounded-status").textContent).toBe("ok")
    );
    await act(() => new Promise((r) => setTimeout(r, 20)));

    const renders = Number(
      screen.getByTestId("bounded-renders").textContent
    );
    // StrictMode double-invokes render + 1 settle render. Hard cap at 4.
    expect(renders).toBeLessThanOrEqual(4);
  });
});