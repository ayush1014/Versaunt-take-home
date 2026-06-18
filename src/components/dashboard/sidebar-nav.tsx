"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  AlertTriangle,
  History,
} from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/metrics", label: "Metrics", icon: BarChart3 },
  { href: "/issues", label: "Issues", icon: AlertTriangle },
  { href: "/activity", label: "Activity", icon: History },
];

// Sidebar nav. Routes to dedicated pages; the ACTIVE tab (by URL) is a glass
// button, the rest are plain links.
export function SidebarNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;

        if (active) {
          return (
            <GlassButton
              key={item.href}
              size="sm"
              onClick={() => router.push(item.href)}
              className="w-full [&>button]:w-full"
              contentClassName="flex w-full items-center gap-3 !justify-start !px-4 text-foreground"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </GlassButton>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
