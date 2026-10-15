"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActorName } from "@/lib/session";
import { notifyNewApprovalNeededForStep, notifyDocumentStatusChanged } from "@/lib/email/notify";
import type {
  Json,
  WorkflowAssigneeMode,
  WorkflowJoinMode,
  WorkflowStepType,
} from "@/lib/supabase/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type StepRow = {
  id: string;
  assigned_org_id: string;
  assigned_user_id: string | null;
  status: string;
};

async function getDocumentOwnerOrgName(supabase: SupabaseClient, documentId: string): Promise<string> {
  const { data: doc } = await supabase.from("documents").select("org_id").eq("id", documentId).single();
  if (!doc) return "A company";
  const { data: org } = await supabase.from("organizations").select("name").eq("id", doc.org_id).single();
  return org?.name ?? "A company";
}

async function getWorkflowStateByInstance(
  supabase: SupabaseClient,
  instanceId: string
): Promise<{ status: string; steps: StepRow[] } | null> {
  const { data: instance } = await supabase
    .from("workflow_instances")
    .select("status")
    .eq("id", instanceId)
    .single();
  if (!instance) return null;

  const { data: steps } = await supabase
    .from("workflow_step_instances")
    .select("id, assigned_org_id, assigned_user_id, status")
    .eq("workflow_instance_id", instanceId);
  return { status: instance.status, steps: steps ?? [] };
}

export type WorkflowStepInput = {
  id: string;
  label: string;
  step_type: WorkflowStepType;
  assignee_mode: WorkflowAssigneeMode;
  assignee_org_id: string | null;
  assignee_user_id: string | null;
  assignee_role: string | null;
  join_mode: WorkflowJoinMode;
  allow_hold: boolean;
  position_x: number;
  position_y: number;
};

export type WorkflowEdgeInput = { from_step_id: string; to_step_id: string };

export async function saveWorkflowTemplate(
  orgId: string,
  templateId: string | null,
  name: string,
  description: string,
  steps: WorkflowStepInput[],
  edges: WorkflowEdgeInput[]
) {
  if (!name.trim()) {
    return { error: "Template name is required." };
  }
  if (steps.length === 0) {
    return { error: "Add at least one step." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_workflow_template", {
    p_org_id: orgId,
    p_template_id: templateId,
    p_name: name.trim(),
    p_description: description.trim() || null,
    p_steps: steps as unknown as Json,
    p_edges: edges as unknown as Json,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/workflows");
  return { id: data as string };
}

export async function startWorkflow(documentId: string, formData: FormData) {
  const templateId = String(formData.get("templateId") ?? "").trim();
  if (!templateId) {
    return { error: "Choose a template." };
  }

  const orgBindings: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("binding_") && typeof value === "string" && value.trim()) {
      orgBindings[key.slice("binding_".length)] = value.trim();
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("start_workflow", {
    p_document_id: documentId,
    p_template_id: templateId,
    p_org_bindings: orgBindings as unknown as Json,
  });

  if (error) {
    return { error: error.message };
  }

  try {
    const { data: instance } = await supabase
      .from("workflow_instances")
      .select("id")
      .eq("document_id", documentId)
      .eq("status", "in_progress")
      .maybeSingle();
    if (instance) {
      const state = await getWorkflowStateByInstance(supabase, instance.id);
      const fromOrgName = await getDocumentOwnerOrgName(supabase, documentId);
      const activeSteps = (state?.steps ?? []).filter((s) => s.status === "in_progress");
      for (const step of activeSteps) {
        await notifyNewApprovalNeededForStep({ documentId, step, fromOrgName });
      }
    }
  } catch (err) {
    console.error("[email] notifyNewApprovalNeededForStep (start) failed:", err);
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/dashboard");
  return { error: undefined };
}

export async function decideWorkflowStep(
  stepInstanceId: string,
  documentId: string,
  decision: "approved" | "rejected",
  formData: FormData
) {
  const comment = String(formData.get("comment") ?? "").trim();

  const supabase = await createClient();

  const { data: stepRow } = await supabase
    .from("workflow_step_instances")
    .select("workflow_instance_id")
    .eq("id", stepInstanceId)
    .single();
  const before = stepRow ? await getWorkflowStateByInstance(supabase, stepRow.workflow_instance_id) : null;

  const { error } = await supabase.rpc("decide_workflow_step", {
    p_step_instance_id: stepInstanceId,
    p_decision: decision,
    p_comment: comment || null,
  });

  if (error) {
    return { error: error.message };
  }

  try {
    if (stepRow) {
      const after = await getWorkflowStateByInstance(supabase, stepRow.workflow_instance_id);
      if (after) {
        const fromOrgName = await getDocumentOwnerOrgName(supabase, documentId);

        // Steps that just became in_progress (the next hop in the DAG) need a new-approval email.
        const wasInProgress = new Set((before?.steps ?? []).filter((s) => s.status === "in_progress").map((s) => s.id));
        const newlyActive = after.steps.filter((s) => s.status === "in_progress" && !wasInProgress.has(s.id));
        for (const step of newlyActive) {
          await notifyNewApprovalNeededForStep({ documentId, step, fromOrgName });
        }

        // The whole workflow just reached a final verdict -> notify the document owner once.
        if (before?.status === "in_progress" && after.status !== "in_progress") {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const actorName = user ? await getActorName(supabase, user.id) : "Someone";
          await notifyDocumentStatusChanged({
            documentId,
            status: after.status === "completed" ? "approved" : "rejected",
            actorName,
            comment,
          });
        }
      }
    }
  } catch (err) {
    console.error("[email] decideWorkflowStep notifications failed:", err);
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/dashboard");
  return { error: undefined };
}

export async function holdWorkflowStep(
  stepInstanceId: string,
  documentId: string,
  formData: FormData
) {
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    return { error: "A reason is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("hold_workflow_step", {
    p_step_instance_id: stepInstanceId,
    p_reason: reason,
  });

  if (error) {
    return { error: error.message };
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const actorName = await getActorName(supabase, user.id);
      await notifyDocumentStatusChanged({ documentId, status: "on_hold", actorName, comment: reason });
    }
  } catch (err) {
    console.error("[email] notifyDocumentStatusChanged (hold) failed:", err);
  }

  revalidatePath(`/documents/${documentId}`);
  return { error: undefined };
}

export async function resumeWorkflowStep(stepInstanceId: string, documentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("resume_workflow_step", {
    p_step_instance_id: stepInstanceId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/documents/${documentId}`);
  return { error: undefined };
}
