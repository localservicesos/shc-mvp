"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";

/**
 * Top bar + slide-in nav drawer for viewports below `md`, where the
 * desktop sidebar is hidden.
 */
export function MobileHeader({
  businessName,
  email,
}: {
  businessName: string;
  email: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="flex h-20 shrink-0 items-center justify-between gap-2 border-b bg-background px-3 md:hidden print:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Link href="/app/dashboard" aria-label="Go to dashboard">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sunshine-hot-cars-logo.avif"
          alt={`${businessName} logo`}
          className="h-16 w-auto object-contain"
        />
      </Link>
      <ThemeToggle />

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            aria-hidden
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm duration-150 animate-in fade-in-0"
          />
          <div
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r bg-background shadow-lg duration-200 animate-in slide-in-from-left"
            // Close as soon as any nav link inside the drawer is tapped.
            onClickCapture={(e) => {
              if ((e.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            <div className="flex justify-end p-2 pb-0">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Sidebar businessName={businessName} />
            <UserMenu email={email} />
          </div>
        </div>
      ) : null}
    </header>
  );
}
