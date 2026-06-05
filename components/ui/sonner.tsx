"use client";

import { type CSSProperties } from "react";
import { useTheme } from "next-themes";
import { createPortal } from "react-dom";
import { Toaster as Sonner, toast, useSonner, type ToasterProps } from "sonner";

const TOAST_DURATION_MS = 6000;

const BACKDROP_Z_INDEX = 999999998;

function ToastBackdrop() {
  const { toasts } = useSonner();
  // Only error toasts dim + blur the screen (they need attention). Success/info
  // toasts are non-blocking, so they don't darken the page.
  const hasErrorToast = toasts.some((t) => t.type === "error");

  if (!hasErrorToast || typeof document === "undefined") return null;

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
        toastOptions={{
          duration: TOAST_DURATION_MS,
          style: {
            fontSize: "16px",
            fontWeight: 600,
            textTransform: "uppercase",
          },
        }}
        style={
          {
            top: "50%",
            transform:
              "translateX(-50%) translateY(calc(var(--front-toast-height) * -0.5))",
            // Wider than sonner's 356px default.
            "--width": "420px",
          } as CSSProperties
        }
        {...props}
      />
    </>
  );
}
