"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function shareDocument(documentId: string, formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "").trim();
  const permission = String(formData.get("permission") ?? "approve");
  if (!orgSlug) {
    return { error: "Enter the company's slug." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("share_document", {
    p_document_id: documentId,
    p_target_org_slug: orgSlug,
    p_permission: permission,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/documents/${documentId}`);
  return { error: undefined };
}

export async function decideApproval(
  requestId: string,
  documentId: string,
  decision: "approved" | "rejected",
  formData: FormData
) {
  const comment = String(formData.get("comment") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_approval", {
    p_request_id: requestId,
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
