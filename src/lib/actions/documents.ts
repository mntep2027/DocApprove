"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function uploadDocument(orgId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const existingDocumentId = String(formData.get("documentId") ?? "").trim();
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (!existingDocumentId && !title) {
    return { error: "Title is required." };
  }

  let documentId = existingDocumentId;

  if (!documentId) {
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        org_id: orgId,
        title,
        description: description || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (docError || !doc) {
      return { error: docError?.message ?? "Could not create document." };
    }
    documentId = doc.id;
  }

  const { count } = await supabase
    .from("document_versions")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId);
  const versionNumber = (count ?? 0) + 1;

  const versionId = randomUUID();
  const storagePath = `${orgId}/${documentId}/${versionId}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error: versionError } = await supabase.from("document_versions").insert({
    id: versionId,
    document_id: documentId,
    version_number: versionNumber,
    storage_path: storagePath,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type || "application/octet-stream",
    uploaded_by: user.id,
  });
  if (versionError) {
    return { error: versionError.message };
  }

  await supabase.from("audit_log").insert({
    document_id: documentId,
    actor_id: user.id,
    org_id: orgId,
    action: "uploaded",
    metadata: { file_name: file.name, version_number: versionNumber },
  });

  revalidatePath("/dashboard");
  redirect(`/documents/${documentId}`);
}

export async function getDownloadUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 60);

  if (error || !data) {
    return { error: error?.message ?? "Could not create download link." };
  }
  return { url: data.signedUrl };
}
