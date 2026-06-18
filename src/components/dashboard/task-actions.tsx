"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, RotateCcw } from "lucide-react";
import { updateTaskStatus } from "@/lib/tasks/actions";
import type { TaskStatus } from "@/lib/types";

export function TaskActions({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function set(next: TaskStatus) {
    startTransition(async () => {
      await updateTaskStatus(taskId, next);
      router.refresh();
    });
  }

  const btn =
    "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50";

  if (status !== "open") {
    return (
      <button
        onClick={() => set("open")}
        disabled={pending}
        className={`${btn} text-muted-foreground hover:bg-foreground/5 hover:text-foreground`}
      >
        <RotateCcw className="h-3.5 w-3.5" /> Reopen
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => set("resolved")}
        disabled={pending}
        className={`${btn} text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10`}
      >
        <Check className="h-3.5 w-3.5" /> Resolve
      </button>
      <button
        onClick={() => set("dismissed")}
        disabled={pending}
        className={`${btn} text-muted-foreground hover:bg-foreground/5 hover:text-foreground`}
      >
        <X className="h-3.5 w-3.5" /> Dismiss
      </button>
    </div>
  );
}
