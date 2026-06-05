"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * App-wide toast host. Mounted once in the root layout. Positioned dead-center
 * of the screen (the `position="top-center"` gives us horizontal centering;
 * the vertical centering is done with a CSS override in globals.css that
 * targets `[data-sonner-toaster]`). `richColors` gives error toasts the red
 * treatment so they read as errors at a glance.
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
      {...props}
    />
  );
}
