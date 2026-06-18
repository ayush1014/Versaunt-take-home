"use client";

import { usePathname } from "next/navigation";
import { Activity, Search, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/auth/actions";

// Floating top controls. The search only appears on the Overview page; every
// other page has its own in-page search. Theme toggle is always present.
export function TopBar() {
  const pathname = usePathname();
  const showSearch = pathname === "/";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center px-3 pt-3">
      {/* Mobile brand (sidebar hidden on mobile) */}
      <div className="pointer-events-auto flex items-center gap-2 md:hidden">
        <div className="rounded-md bg-primary p-1.5 text-primary-foreground">
          <Activity className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Ad Monitor
        </span>
      </div>

      {/* Overview-only glass search, centered (desktop) */}
      {showSearch ? (
        <div className="glass-control pointer-events-auto mx-auto hidden h-9 w-full max-w-2xl items-center gap-2 rounded-full px-3 md:flex">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search ads, tasks…"
            className="h-full w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      ) : null}

      {/* Theme toggle (+ mobile sign out) — always pinned to the top-right
          corner so it never depends on the (optional) search in the flow. */}
      <div className="pointer-events-auto absolute right-3 top-3 flex items-center gap-2">
        <ThemeToggle />
        <form action={signOut} className="md:hidden">
          <button
            aria-label="Sign out"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/60 text-foreground backdrop-blur transition hover:bg-accent"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
