"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * App-wide toast host. Mounted once in the root layout. Positioned dead-center
 * of the screen.
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
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      richColors
      closeButton
      toastOptions={{ duration: 6000 }}
      style={{
        top: "50%",
        transform:
          "translateX(-50%) translateY(calc(var(--front-toast-height) * -0.5))",
      }}
      {...props}
    />
  );
}
