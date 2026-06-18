import { Activity, Search, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { GradientBackground } from "@/components/ui/gradient-background";

// Floating glass shell. The page never scrolls. The sidebar floats via its own
// margin; the right content panel fills the full viewport height (edge to edge,
// no outer top/bottom gap) and is the only scrollable region.
export function AppShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <div className="relative h-dvh overflow-hidden bg-background">
      {/* Calm animated backdrop — the glass refracts this. */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-60">
        <GradientBackground />
      </div>

      <div className="relative z-10 flex h-dvh">
        {/* Floating glass sidebar — floats via margin, full height minus gaps */}
        <aside className="my-3 ml-3 hidden w-60 shrink-0 flex-col rounded-3xl glass-panel p-4 md:flex">
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="rounded-md bg-primary p-1.5 text-primary-foreground">
              <Activity className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Ad Monitor
            </span>
          </div>

          <SidebarNav className="mt-6" />

          <div className="mt-auto flex flex-col gap-3 pt-4">
            <div className="flex items-center gap-2 rounded-xl px-2 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold text-foreground">
                {initials}
              </div>
              <span className="truncate text-xs text-muted-foreground">
                {userEmail}
              </span>
            </div>
            <form action={signOut}>
              <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </aside>

        {/* Right panel — full height, edge to edge; content scrolls behind the
            floating glass search. */}
        <div className="relative min-w-0 flex-1">
          {/* The only scrollable region. Top padding clears the floating search. */}
          <main className="h-full overflow-y-auto px-4 pb-4 pt-[4.25rem] md:pl-3 md:pr-4">
            {children}
          </main>

          {/* Floating controls overlay — empty areas are click-through so the
              content keeps scrolling behind them. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center px-3 pt-3 md:justify-center">
            {/* Mobile brand (sidebar hidden on mobile) */}
            <div className="pointer-events-auto flex items-center gap-2 md:hidden">
              <div className="rounded-md bg-primary p-1.5 text-primary-foreground">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Ad Monitor
              </span>
            </div>

            {/* Floating, centered, wide search (desktop) */}
            <div className="glass-input-wrap pointer-events-auto mx-auto hidden w-full max-w-2xl md:mx-0 md:block">
              <div className="glass-input">
                <span className="glass-input-text-area" />
                <div className="relative z-10 flex w-9 items-center justify-center pl-2">
                  <Search className="h-4 w-4 text-foreground/70" />
                </div>
                <input
                  type="text"
                  placeholder="Search ads, tasks…"
                  className="relative z-10 h-9 w-0 grow bg-transparent pr-3 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Theme toggle (+ mobile sign out) — pinned right. */}
            <div className="pointer-events-auto ml-auto flex items-center gap-2 md:absolute md:right-4">
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
        </div>
      </div>
    </div>
  );
}
