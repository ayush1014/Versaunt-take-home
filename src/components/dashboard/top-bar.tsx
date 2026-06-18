"use client";

import { usePathname } from "next/navigation";
import { Activity, Search, LogOut, PanelLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/auth/actions";

// Floating top controls. Left: sidebar toggle (opens the drawer on mobile,
// collapses the sidebar on desktop) + mobile brand. Center: Overview-only
// search. Right: theme toggle (+ mobile sign out).
export function TopBar({
  onToggleMobile,
  onToggleDesktop,
}: {
  onToggleMobile: () => void;
  onToggleDesktop: () => void;
}) {
  const pathname = usePathname();
  // Search is temporarily hidden everywhere. Flip back to `pathname === "/"`
  // to show it on the Overview page again.
  const showSearch = false && pathname === "/";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center gap-3 px-3 pt-3">
      {/* Left: toggle + mobile brand */}
      <div className="pointer-events-auto flex shrink-0 items-center gap-2">
        <button
          onClick={onToggleMobile}
          aria-label="Open menu"
          className="glass-control inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground lg:hidden"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleDesktop}
          aria-label="Toggle sidebar"
          className="glass-control hidden h-9 w-9 items-center justify-center rounded-full text-foreground lg:inline-flex"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 lg:hidden">
          <div className="rounded-md bg-primary p-1.5 text-primary-foreground">
            <Activity className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Ad Monitor
          </span>
        </div>
      </div>

      {/* Center: Overview-only glass search */}
      <div className="flex flex-1 justify-center">
        {showSearch ? (
          <div className="glass-control pointer-events-auto hidden h-9 w-full max-w-2xl items-center gap-2 rounded-full px-3 lg:flex">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search ads, tasks…"
              className="h-full w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        ) : null}
      </div>

      {/* Right: theme + mobile sign out */}
      <div className="pointer-events-auto flex shrink-0 items-center gap-2">
        <ThemeToggle />
        <form action={signOut} className="lg:hidden">
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
