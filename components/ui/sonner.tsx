"use client";

import { useTheme } from "next-themes";
import { createPortal } from "react-dom";
import {
  Toaster as Sonner,
  toast,
  useSonner,
  type ToasterProps,
} from "sonner";

/**
 * How long a toast stays on screen before auto-dismissing, in milliseconds.
 * Change this single value to tune the timeout for every toast. Individual
 * toasts can still override it per call, e.g. `toast.error(msg, { duration:
 * 10000 })`, or `{ duration: Infinity }` to make it stay until dismissed.
 */
const TOAST_DURATION_MS = 6000;

/** Just below sonner's toast layer (z-index 999999999) so the toast stays crisp. */
const BACKDROP_Z_INDEX = 999999998;

/**
 * Dims + blurs the whole screen while any toast is visible — the same backdrop
 * treatment the Dashboard search uses (see components/search/search-bar.tsx).
 * Clicking it dismisses the toasts, like tapping outside a modal.
 */
function ToastBackdrop() {
  const { toasts } = useSonner();
  const hasToasts = toasts.length > 0;

  if (!hasToasts || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-hidden
      onClick={() => toast.dismiss()}
      style={{ zIndex: BACKDROP_Z_INDEX }}
      className="fixed inset-0 bg-background/60 backdrop-blur-sm duration-150 animate-in fade-in-0"
    />,
    document.body,
  );
}

/**
 * App-wide toast host. Mounted once in the root layout. Positioned dead-center
 * of the screen, over a dimmed/blurred backdrop.
 *
 * `position="top-center"` only centers horizontally. Vertical centering is
 * tricky: the toaster `<ol>` has no height (its toasts are absolutely
 * positioned), so a plain `translateY(-50%)` shifts by ~0 and the toast's TOP
 * edge ends up at screen center — visually low. Instead we anchor the list at
 * `top: 50%` and shift it up by half the front toast's height, which sonner
 * exposes as the `--front-toast-height` CSS variable. That puts the toast's
 * own vertical center on the screen center, symmetrically.
 *
 * The `style` object is spread inline onto the positioned `<ol>`, so it beats
 * sonner's injected stylesheet without depending on CSS cascade/cache order
 * (the globals.css `!important` rule mirrors this as a backstop).
 *
 * `richColors` gives error toasts the red treatment so they read as errors at
 * a glance.
 */
export function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <>
      <ToastBackdrop />
      <Sonner
        theme={theme as ToasterProps["theme"]}
        position="top-center"
        richColors
        closeButton
        toastOptions={{ duration: TOAST_DURATION_MS }}
        style={{
          top: "50%",
          transform:
            "translateX(-50%) translateY(calc(var(--front-toast-height) * -0.5))",
        }}
        {...props}
      />
    </>
  );
}
