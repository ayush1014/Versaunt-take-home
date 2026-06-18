import { Activity, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { TopBar } from "@/components/dashboard/top-bar";

// Floating glass shell. The page never scrolls. The sidebar floats via its own
// margin; the right content panel fills the full viewport height and is the
// only scrollable region. The dashboard uses a clean, static background (no
// animated gradient — that lives only on the auth / connect screens).
export function AppShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <div className="relative h-dvh overflow-hidden bg-zinc-50 dark:bg-zinc-950">
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

        {/* Right panel — full height; content scrolls behind the floating top bar */}
        <div className="relative min-w-0 flex-1">
          <main className="h-full overflow-y-auto px-4 pb-4 pt-[4.25rem] md:pl-3 md:pr-4">
            {children}
          </main>

          <TopBar />
        </div>
      </div>
    </div>
  );
}
