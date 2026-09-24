"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function postMessage(documentId: string, orgId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated." };
  }

  const body = String(formData.get("body") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "").trim();
  const replyToId = String(formData.get("replyToId") ?? "").trim();

  if (!body) {
    return { error: "Message can't be empty." };
  }
  if (!clientId) {
    return { error: "Missing message id." };
  }

  const { error } = await supabase.from("document_messages").insert({
    id: clientId,
    document_id: documentId,
    org_id: orgId,
    author_id: user.id,
    body,
    reply_to_id: replyToId || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/documents/${documentId}`);
  return { error: undefined };
}
