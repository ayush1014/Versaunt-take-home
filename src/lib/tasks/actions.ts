"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TaskStatus } from "@/lib/types";

// Operator updates a task's status (resolve / dismiss / reopen). The update
// runs as the signed-in user so RLS enforces ownership; the audit event is
// written with the service role (operators can't insert events directly).
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId)
    .select("id, connection_id, ad_id, rule_type")
    .maybeSingle();

  // RLS returns no row if the task isn't the user's — treat as not found.
  if (error) return { error: error.message };
  if (!task) return { error: "Task not found." };

  const admin = createAdminClient();
  await admin.from("events").insert({
    user_id: user.id,
    connection_id: task.connection_id,
    task_id: task.id,
    type: "task_status_changed",
    message: `Task ${task.rule_type} for ${task.ad_id} marked ${status}.`,
    data: { task_id: task.id, status },
  });

  revalidatePath("/");
  return {};
}
