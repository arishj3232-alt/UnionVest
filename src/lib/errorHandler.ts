/**
 * Centralized error handling.
 *
 * Goals:
 *  - Normalize errors thrown by Supabase / fetch / unknown sources into a
 *    single `AppError` shape with a user-safe message.
 *  - Single place to log / report errors (swap console.error for Sentry etc).
 *  - Tiny `safeAsync` wrapper that services can use to guarantee a normalized
 *    error surface without changing call signatures.
 */

export type ErrorContext = {
  /** Logical operation name, e.g. "fetchUserOrders" */
  scope: string;
  /** Optional extra metadata for debugging — never PII / secrets. */
  meta?: Record<string, unknown>;
};

export class AppError extends Error {
  readonly scope: string;
  readonly cause?: unknown;
  readonly meta?: Record<string, unknown>;

  constructor(message: string, ctx: ErrorContext, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.scope = ctx.scope;
    this.meta = ctx.meta;
    this.cause = cause;
  }
}

/** Best-effort extraction of a human-readable message from any thrown value. */
export function toMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err !== null) {
    const anyErr = err as { message?: unknown; error?: unknown };
    if (typeof anyErr.message === 'string') return anyErr.message;
    if (typeof anyErr.error === 'string') return anyErr.error;
  }
  return fallback;
}

/**
 * Log an error in a single place. Replace the body with your reporter
 * (Sentry, Datadog, etc.) without touching call sites.
 */
export function reportError(err: unknown, ctx: ErrorContext): void {
  // eslint-disable-next-line no-console
  console.error(`[${ctx.scope}]`, toMessage(err), ctx.meta ?? '');
}

/**
 * Wrap an async operation. Reports the error and re-throws an `AppError`
 * with a normalized message. Services should use this for any operation
 * whose error surface should be consistent.
 */
export async function safeAsync<T>(
  ctx: ErrorContext,
  op: () => Promise<T>
): Promise<T> {
  try {
    return await op();
  } catch (err) {
    reportError(err, ctx);
    throw new AppError(toMessage(err), ctx, err);
  }
}