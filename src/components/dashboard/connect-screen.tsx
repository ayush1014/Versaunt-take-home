import { LogOut } from "lucide-react";
import { GradientBackground } from "@/components/ui/gradient-background";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConnectButton } from "@/components/connect-button";
import { signOut } from "@/lib/auth/actions";

// Full-screen onboarding for a user with no connected account.
// Intentionally no sidebar / top bar — just the connect call to action.
export function ConnectScreen() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-60">
        <GradientBackground />
      </div>

      {/* Minimal corner controls so the user isn't trapped. */}
      <div className="fixed right-4 top-4 z-20 flex items-center gap-2">
        <ThemeToggle />
        <form action={signOut}>
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 text-sm font-medium text-muted-foreground backdrop-blur transition hover:bg-accent hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <section className="glass-card w-full max-w-md rounded-2xl p-6 text-center sm:p-8">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Connect an ad account
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Link the mock ad account to ingest performance data, run sync, and
            surface issues.
          </p>
          <div className="mt-6 flex justify-center">
            <ConnectButton />
          </div>
        </section>
      </div>
    </div>
  );
}
