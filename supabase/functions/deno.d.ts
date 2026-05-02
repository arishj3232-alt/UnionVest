/**
 * Minimal Deno globals for Supabase Edge Functions.
 * The real runtime is Deno; the Vite app tsconfig does not load Deno types.
 *
 * Pull in via: /// <reference path="../deno.d.ts" /> (from */index.ts or _shared/*.ts).
 */
declare const Deno: {
  serve(handler: (request: Request) => Response | Promise<Response>): void;
  env: {
    get(key: string): string | undefined;
  };
};

declare module "https://esm.sh/@supabase/supabase-js@2" {
  // URL import shim for editors (runtime loads from esm.sh in Deno).
  export type SupabaseClient = import("@supabase/supabase-js").SupabaseClient;
  export function createClient(...args: unknown[]): SupabaseClient;
}
