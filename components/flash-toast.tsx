"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * One-shot success toast driven by a `?flash=<message>` URL param.
 *
 * Server Actions that redirect after a successful create/update append this
 * param, so the green toast fires on the DESTINATION page — not racing the
 * navigation. (Firing it before a redirect makes the toast survive into the
 * next page, where sonner falls back to the global duration and ignores the
 * short per-call one.)
 *
 * Reacting to `useSearchParams` (not just `usePathname`) matters because some
 * redirects land on the SAME path with only the query changed — e.g. Settings
 * saving to `/app/settings?flash=…`. We dedupe by the searchParams object
 * identity: Strict Mode re-runs the effect with the same object (so we skip the
 * duplicate), while a genuine new navigation hands us a fresh object (so a
 * repeated save still toasts). The param is then stripped via
 * history.replaceState — NOT a router navigation, which would disturb the
 * toast's timer.
 */
export function FlashToast() {
  const searchParams = useSearchParams();
  const handled = useRef<ReadonlyURLSearchParams | null>(null);

  useEffect(() => {
    if (handled.current === searchParams) return;
    const message = searchParams.get("flash");
    if (!message) return;
    handled.current = searchParams;

    toast.success(message, { duration: 1500 });

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("flash");
      window.history.replaceState(window.history.state, "", url.toString());
    }
  }, [searchParams]);

  return null;
}
