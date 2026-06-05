"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

/**
 * One-shot success toast driven by a `?flash=<message>` URL param.
 *
 * Server Actions that redirect after a successful create/update append this
 * param, so the green toast fires on the DESTINATION page — not racing the
 * navigation. Firing it before a redirect makes the toast survive into the next
 * page, where sonner falls back to the global duration and ignores the short
 * per-call one. Firing it here, after navigation, means the short duration is
 * actually respected.
 *
 * Reads the param from `window.location` (not `useSearchParams`) so it needs no
 * Suspense boundary; `usePathname` re-runs the effect on each navigation, which
 * is when our flash redirects land. The param is stripped afterwards.
 */
export function FlashToast() {
  const pathname = usePathname();
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const message = url.searchParams.get("flash");
    if (!message) return;

    // Guard against firing twice for the same message (e.g. Strict Mode).
    const token = `${pathname}:${message}`;
    if (firedFor.current === token) return;
    firedFor.current = token;

    toast.success(message, { duration: 1500 });

    // Drop the param so a refresh/back doesn't re-show the toast. Use
    // history.replaceState (not router.replace) so it doesn't trigger a Next
    // navigation — a navigation here would disturb the toast's timer.
    url.searchParams.delete("flash");
    window.history.replaceState(window.history.state, "", url.toString());
  }, [pathname]);

  return null;
}
