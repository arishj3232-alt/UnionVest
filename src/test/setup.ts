import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// Stub env for supabase client
const testEnv = import.meta.env as Record<string, string | undefined>;
testEnv.VITE_SUPABASE_URL = "https://test.supabase.co";
testEnv.VITE_SUPABASE_PUBLISHABLE_KEY = "test-anon-key";