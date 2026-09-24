"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  Json,
  WorkflowAssigneeMode,
  WorkflowJoinMode,
  WorkflowStepType,
} from "@/lib/supabase/types";

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
  const { error } = await supabase.rpc("decide_workflow_step", {
    p_step_instance_id: stepInstanceId,
    p_decision: decision,
    p_comment: comment || null,
  });

  if (error) {
    return { error: error.message };
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
