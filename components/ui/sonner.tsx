"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * App-wide toast host. Mounted once in the root layout. Positioned dead-center
 * of the screen.
 *
 * `position="top-center"` only centers horizontally; to lift toasts to the
 * vertical middle we pass `top`/`transform` via the `style` prop. Sonner
 * spreads that object inline onto the positioned `<ol>`, so it overrides
 * sonner's own injected stylesheet without depending on CSS cascade order or
 * build caching (the globals.css `!important` rule is a secondary backstop).
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
      style={{ top: "50%", transform: "translate(-50%, -50%)" }}
      {...props}
    />
  );
}
