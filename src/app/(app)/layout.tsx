import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/dashboard/app-shell";
import { ConnectScreen } from "@/components/dashboard/connect-screen";

// Decides the chrome for authenticated pages:
//  - no connection  -> full-screen connect screen (no sidebar / top bar)
//  - connected      -> floating glass shell wrapping the page
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: connection } = await supabase
    .from("connections")
    .select("id")
    .maybeSingle();

  if (!connection) {
    return <ConnectScreen />;
  }

  return <AppShell userEmail={user?.email ?? ""}>{children}</AppShell>;
}
