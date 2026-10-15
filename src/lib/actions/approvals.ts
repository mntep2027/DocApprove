"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActorName } from "@/lib/session";
import { notifyNewApprovalNeededForOrg, notifyDocumentStatusChanged } from "@/lib/email/notify";

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

  if (permission === "approve") {
    try {
      const [{ data: doc }, { data: targetOrg }] = await Promise.all([
        supabase.from("documents").select("org_id").eq("id", documentId).single(),
        supabase.from("organizations").select("id").eq("slug", orgSlug).single(),
      ]);
      if (doc && targetOrg) {
        const { data: fromOrg } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", doc.org_id)
          .single();
        await notifyNewApprovalNeededForOrg({
          documentId,
          orgId: targetOrg.id,
          fromOrgName: fromOrg?.name ?? "A company",
        });
      }
    } catch (err) {
      console.error("[email] notifyNewApprovalNeededForOrg failed:", err);
    }
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

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const actorName = await getActorName(supabase, user.id);
      await notifyDocumentStatusChanged({ documentId, status: decision, actorName, comment });
    }
  } catch (err) {
    console.error("[email] notifyDocumentStatusChanged failed:", err);
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/dashboard");
  return { error: undefined };
}
