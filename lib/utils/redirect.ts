/**
 * True when an error thrown by a Server Action is actually Next's internal
 * redirect signal (from calling `redirect()`), not a real failure.
 *
 * Server Actions that finish by calling `redirect()` throw a special error
 * whose `digest` starts with "NEXT_REDIRECT". When we call such an action
 * inside a client-side try/catch we must NOT treat that as an error — we
 * re-throw it so Next performs the navigation. This helper lets the catch
 * block tell the two apart.
 */
export function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
