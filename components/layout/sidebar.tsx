"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/customers", label: "Customers", icon: Users },
  { href: "/app/jobs", label: "Jobs", icon: ClipboardList },
  { href: "/app/schedule", label: "Schedule", icon: Calendar },
  { href: "/app/invoices", label: "Invoices", icon: FileText },
  { href: "/app/services", label: "Services", icon: Wrench },
];

export function Sidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4">
      <Link
        href="/app/dashboard"
        className="mb-4 flex shrink-0 items-center justify-center rounded-lg dark:bg-gray-200 p-4 transition-opacity hover:opacity-90"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sunshine-hot-cars-logo.avif"
          alt={`${businessName} logo`}
          className="h-24 w-auto object-contain"
        />
      </Link>
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
