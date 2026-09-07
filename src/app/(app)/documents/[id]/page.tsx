import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/session";
import { getDownloadUrl } from "@/lib/actions/documents";
import { shareDocument, decideApproval } from "@/lib/actions/approvals";
import { StatusBadge } from "@/components/status-badge";
import ShareForm from "./share-form";
import DecisionForm from "./decision-form";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, org } = await requireOrg();

  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, description, status, org_id, created_at")
    .eq("id", id)
    .single();

  if (!doc) {
    notFound();
  }

  const isOwnerOrg = doc.org_id === org.id;

  const [{ data: ownerOrg }, { data: versions }, { data: shares }, { data: requests }] =
    await Promise.all([
      supabase.from("organizations").select("id, name, slug").eq("id", doc.org_id).single(),
      supabase
        .from("document_versions")
        .select("id, version_number, storage_path, file_name, file_size, created_at")
        .eq("document_id", id)
        .order("version_number", { ascending: false }),
      supabase
        .from("document_shares")
        .select("id, shared_with_org_id, permission, created_at")
        .eq("document_id", id),
      supabase
        .from("approval_requests")
        .select("id, target_org_id, status, comment, decided_at, created_at")
        .eq("document_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const sharedOrgIds = (shares ?? []).map((s) => s.shared_with_org_id);
  const requestOrgIds = (requests ?? []).map((r) => r.target_org_id);
  const relatedOrgIds = [...new Set([...sharedOrgIds, ...requestOrgIds])];
  const { data: relatedOrgs } =
    relatedOrgIds.length > 0
      ? await supabase.from("organizations").select("id, name, slug").in("id", relatedOrgIds)
      : { data: [] };
  const orgName = (orgId: string) => relatedOrgs?.find((o) => o.id === orgId)?.name ?? orgId;

  const { data: auditLog } = await supabase
    .from("audit_log")
    .select("id, actor_id, action, metadata, created_at")
    .eq("document_id", id)
    .order("created_at", { ascending: false });

  const actorIds = [...new Set((auditLog ?? []).map((a) => a.actor_id))];
  const { data: actors } =
    actorIds.length > 0
      ? await supabase.from("profiles").select("id, email, full_name").in("id", actorIds)
      : { data: [] };
  const actorName = (userId: string) => {
    const actor = actors?.find((a) => a.id === userId);
    return actor?.full_name || actor?.email || userId;
  };

  const myPendingRequest = (requests ?? []).find(
    (r) => r.target_org_id === org.id && r.status === "pending"
  );

  const versionsWithUrls = await Promise.all(
    (versions ?? []).map(async (v) => {
      const result = await getDownloadUrl(v.storage_path);
      return { ...v, url: "url" in result ? result.url : null };
    })
  );

  const shareAction = shareDocument.bind(null, id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{doc.title}</h1>
          <StatusBadge status={doc.status} />
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Owned by {ownerOrg?.name ?? "unknown"}
        </p>
        {doc.description && <p className="mt-3 text-neutral-700">{doc.description}</p>}
      </div>

      {myPendingRequest && (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 font-semibold">Your decision is needed</h2>
          <DecisionForm
            approveAction={decideApproval.bind(null, myPendingRequest.id, id, "approved")}
            rejectAction={decideApproval.bind(null, myPendingRequest.id, id, "rejected")}
          />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Versions</h2>
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {versionsWithUrls.map((v) => (
            <li key={v.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                v{v.version_number} — {v.file_name}
              </span>
              {v.url ? (
                <a href={v.url} className="text-blue-600 hover:underline">
                  Download
                </a>
              ) : (
                <span className="text-neutral-400">Unavailable</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isOwnerOrg && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Share with another company</h2>
          <ShareForm action={shareAction} />
          {shares && shares.length > 0 && (
            <ul className="mt-3 text-sm text-neutral-600">
              {shares.map((s) => (
                <li key={s.id}>
                  Shared with {orgName(s.shared_with_org_id)} ({s.permission})
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Audit trail</h2>
        {auditLog && auditLog.length > 0 ? (
          <ul className="flex flex-col gap-2 text-sm text-neutral-600">
            {auditLog.map((entry) => (
              <li key={entry.id}>
                <span className="font-medium text-neutral-900">{actorName(entry.actor_id)}</span>{" "}
                {entry.action} — {new Date(entry.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">No activity yet.</p>
        )}
      </section>
    </div>
  );
}
