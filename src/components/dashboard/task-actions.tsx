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
    "glass-control inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-50";

  if (status !== "open") {
    return (
      <button
        onClick={() => set("open")}
        disabled={pending}
        className={`${btn} text-foreground`}
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
        className={`${btn} text-emerald-600 dark:text-emerald-400`}
      >
        <Check className="h-3.5 w-3.5" /> Resolve
      </button>
      <button
        onClick={() => set("dismissed")}
        disabled={pending}
        className={`${btn} text-muted-foreground`}
      >
        <X className="h-3.5 w-3.5" /> Dismiss
      </button>
    </div>
  );
}
