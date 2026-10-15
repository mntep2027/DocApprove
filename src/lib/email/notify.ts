import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { newApprovalEmail, statusChangeEmail } from "@/lib/email/templates";

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

// Enumerating another org's members needs the service-role client — org_members
// RLS only allows a user to see their own org's roster (0001_init.sql), but
// recipients here are often in a different org than the acting user. Degrades
// to an empty list (logged) if the key isn't configured yet, same spirit as
// send.ts's dev fallback when RESEND_API_KEY is missing.
async function resolveOrgMemberEmails(orgId: string): Promise<string[]> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(`[email:dev] SUPABASE_SERVICE_ROLE_KEY not set, skipping org member lookup for ${orgId}`);
    return [];
  }

  const admin = createAdminClient();
  const { data: members } = await admin.from("org_members").select("user_id").eq("org_id", orgId);
  const userIds = (members ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles } = await admin.from("profiles").select("email").in("id", userIds);
  return (profiles ?? []).map((p) => p.email).filter(Boolean);
}

// A single known profile is readable by any authenticated user (profiles
// select RLS is open), so this doesn't need the admin client.
async function resolveStepRecipients(step: {
  assigned_org_id: string;
  assigned_user_id: string | null;
}): Promise<string[]> {
  if (step.assigned_user_id) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", step.assigned_user_id)
      .single();
    return profile?.email ? [profile.email] : [];
  }
  return resolveOrgMemberEmails(step.assigned_org_id);
}

// The acting user always has legitimate access to the document in question
// (that's how they got here), so the regular session-bound client is enough.
async function getDocumentInfo(documentId: string) {
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, created_by")
    .eq("id", documentId)
    .single();
  if (!doc) return null;

  const { data: creator } = await supabase.from("profiles").select("email").eq("id", doc.created_by).single();
  return { title: doc.title, creatorEmail: creator?.email ?? null };
}

export async function notifyNewApprovalNeeded({
  documentId,
  recipients,
  fromOrgName,
}: {
  documentId: string;
  recipients: string[];
  fromOrgName: string;
}): Promise<void> {
  if (recipients.length === 0) return;
  const doc = await getDocumentInfo(documentId);
  if (!doc) return;

  const { subject, html } = newApprovalEmail({
    documentTitle: doc.title,
    fromOrgName,
    url: appUrl(`/documents/${documentId}`),
  });
  await sendEmail({ to: recipients, subject, html });
}

export async function notifyDocumentStatusChanged({
  documentId,
  status,
  actorName,
  comment,
}: {
  documentId: string;
  status: "approved" | "rejected" | "on_hold";
  actorName: string;
  comment?: string | null;
}): Promise<void> {
  const doc = await getDocumentInfo(documentId);
  if (!doc?.creatorEmail) return;

  const { subject, html } = statusChangeEmail({
    documentTitle: doc.title,
    status,
    actorName,
    comment,
    url: appUrl(`/documents/${documentId}`),
  });
  await sendEmail({ to: doc.creatorEmail, subject, html });
}

export async function notifyNewApprovalNeededForOrg({
  documentId,
  orgId,
  fromOrgName,
}: {
  documentId: string;
  orgId: string;
  fromOrgName: string;
}): Promise<void> {
  const recipients = await resolveOrgMemberEmails(orgId);
  await notifyNewApprovalNeeded({ documentId, recipients, fromOrgName });
}

export async function notifyNewApprovalNeededForStep({
  documentId,
  step,
  fromOrgName,
}: {
  documentId: string;
  step: { assigned_org_id: string; assigned_user_id: string | null };
  fromOrgName: string;
}): Promise<void> {
  const recipients = await resolveStepRecipients(step);
  await notifyNewApprovalNeeded({ documentId, recipients, fromOrgName });
}
