/**
 * Optional error reporting hook for Lovable hosting.
 * Safe no-op locally when the platform SDK is not present.
 */
export function reportLovableError(error: unknown, context?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.error("[CampSolver error]", context, error);
  }
}
