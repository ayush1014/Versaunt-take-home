"use client";

import { useState, useTransition } from "react";
import { Plug } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { connectAccount } from "@/lib/connections/actions";

export function ConnectButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await connectAccount();
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <GlassButton
        size="default"
        onClick={onClick}
        disabled={pending}
        contentClassName="flex items-center justify-center gap-2.5 whitespace-nowrap text-foreground"
      >
        {/* Bigger icon on mobile, standard on larger screens. */}
        <Plug className="h-5 w-5 md:h-4 md:w-4" />
        {pending ? "Connecting…" : "Connect mock account"}
      </GlassButton>
      <span className="font-mono text-xs text-muted-foreground">
        act_mock_1001
      </span>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
