"use client";

import { type CSSProperties } from "react";
import { useTheme } from "next-themes";
import { createPortal } from "react-dom";
import { Toaster as Sonner, toast, useSonner, type ToasterProps } from "sonner";

const TOAST_DURATION_MS = 6000;

const BACKDROP_Z_INDEX = 999999998;

function ToastBackdrop() {
  const { toasts } = useSonner();
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
            fontSize: "18px",
            fontWeight: 600,
            textTransform: "uppercase",
            justifyContent: "center",
            textAlign: "center",
          },
        }}
        style={
          {
            "--width": "min(550px, calc(100vw - 2rem))",
          } as CSSProperties
        }
        {...props}
      />
    </>
  );
}
