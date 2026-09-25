import Link from "next/link";
import { requireOrg } from "@/lib/session";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { BellIcon, CheckIcon, ClockIcon, DocumentIcon, PauseIcon, PlusIcon, ShareIcon, XIcon } from "@/components/icons";

export default async function DashboardPage() {
  const { supabase, org } = await requireOrg();

  const { data: ownDocs } = await supabase
    .from("documents")
    .select("id, title, status, updated_at")
    .eq("org_id", org.id)
    .order("updated_at", { ascending: false });

  const { data: shares } = await supabase
    .from("document_shares")
    .select("document_id")
    .eq("shared_with_org_id", org.id);
  const sharedDocIds = (shares ?? []).map((s) => s.document_id);

  let sharedDocs: {
    id: string;
    title: string;
    status: string;
    updated_at: string;
    org_id: string;
  }[] = [];
  const ownerNames = new Map<string, string>();

  if (sharedDocIds.length > 0) {
    const { data } = await supabase
      .from("documents")
      .select("id, title, status, updated_at, org_id")
      .in("id", sharedDocIds)
      .order("updated_at", { ascending: false });
    sharedDocs = data ?? [];

    const ownerOrgIds = [...new Set(sharedDocs.map((d) => d.org_id))];
    if (ownerOrgIds.length > 0) {
      const { data: owners } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", ownerOrgIds);
      owners?.forEach((o) => ownerNames.set(o.id, o.name));
    }
  }

  const { data: holdSteps } = await supabase
    .from("workflow_step_instances")
    .select("workflow_instances!inner(document_id)")
    .eq("status", "on_hold");
  const onHoldDocIds = new Set(
    (holdSteps ?? []).map((s) => (s.workflow_instances as unknown as { document_id: string }).document_id)
  );

  const sharedByMeCount = (ownDocs ?? []).filter((d) => d.status !== "draft").length;
  const sentAwaitingDecisionCount = (ownDocs ?? []).filter((d) => d.status === "pending_approval").length;
  const ownOnHoldCount = (ownDocs ?? []).filter((d) => onHoldDocIds.has(d.id)).length;
  const ownApprovedCount = (ownDocs ?? []).filter((d) => d.status === "approved").length;
  const ownRejectedCount = (ownDocs ?? []).filter((d) => d.status === "rejected").length;

  const awaitingYourApprovalCount = sharedDocs.filter((d) => d.status === "pending_approval").length;
  const sharedOnHoldCount = sharedDocs.filter((d) => onHoldDocIds.has(d.id)).length;
  const sharedApprovedCount = sharedDocs.filter((d) => d.status === "approved").length;
  const sharedRejectedCount = sharedDocs.filter((d) => d.status === "rejected").length;

  return (
    <div className="flex flex-col gap-10">
      <section id="your-documents">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{org.name}&apos;s documents</h2>
          <Link
            href="/documents/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-dark px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Upload document
          </Link>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            icon={<ShareIcon className="h-4 w-4" />}
            value={sharedByMeCount}
            label="Shared by me"
            variant="neutral"
            delayMs={0}
          />
          <StatCard
            icon={<ClockIcon className="h-4 w-4" />}
            value={sentAwaitingDecisionCount}
            label="Sent, awaiting decision"
            variant="amber"
            delayMs={40}
          />
          <StatCard
            icon={<PauseIcon className="h-4 w-4" />}
            value={ownOnHoldCount}
            label="On hold"
            variant="orange"
            delayMs={80}
          />
          <StatCard
            icon={<CheckIcon className="h-4 w-4" />}
            value={ownApprovedCount}
            label="Approved"
            variant="green"
            delayMs={120}
          />
          <StatCard
            icon={<XIcon className="h-4 w-4" />}
            value={ownRejectedCount}
            label="Rejected"
            variant="red"
            delayMs={160}
          />
        </div>
        {ownDocs && ownDocs.length > 0 ? (
          <ul className="divide-y divide-surface-border rounded-lg border border-surface-border">
            {ownDocs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between px-4 py-3">
                <Link href={`/documents/${doc.id}`} className="hover:text-brand-dark hover:underline">
                  {doc.title}
                </Link>
                <StatusBadge status={doc.status} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<DocumentIcon className="h-10 w-10" />}
            title="No documents yet"
            description={
              <>
                <Link href="/documents/new" className="text-brand-dark hover:underline">
                  Upload one
                </Link>{" "}
                to get started.
              </>
            }
          />
        )}
      </section>

      <section id="shared-with-you">
        <h2 className="mb-3 text-lg font-semibold">Shared with you for approval</h2>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            icon={<DocumentIcon className="h-4 w-4" />}
            value={sharedDocs.length}
            label="Total received"
            variant="neutral"
            delayMs={0}
          />
          <StatCard
            icon={<BellIcon className="h-4 w-4" />}
            value={awaitingYourApprovalCount}
            label="Awaiting your approval"
            variant="brand"
            delayMs={40}
          />
          <StatCard
            icon={<PauseIcon className="h-4 w-4" />}
            value={sharedOnHoldCount}
            label="On hold"
            variant="orange"
            delayMs={80}
          />
          <StatCard
            icon={<CheckIcon className="h-4 w-4" />}
            value={sharedApprovedCount}
            label="Approved"
            variant="green"
            delayMs={120}
          />
          <StatCard
            icon={<XIcon className="h-4 w-4" />}
            value={sharedRejectedCount}
            label="Rejected"
            variant="red"
            delayMs={160}
          />
        </div>
        {sharedDocs.length > 0 ? (
          <ul className="divide-y divide-surface-border rounded-lg border border-surface-border">
            {sharedDocs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link href={`/documents/${doc.id}`} className="hover:text-brand-dark hover:underline">
                    {doc.title}
                  </Link>
                  <span className="ml-2 text-sm text-neutral-500">
                    from {ownerNames.get(doc.org_id) ?? "another company"}
                  </span>
                </div>
                <StatusBadge status={doc.status} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<DocumentIcon className="h-10 w-10" />}
            title="Nothing shared with you yet"
            description="Documents another company shares with you for approval will show up here."
          />
        )}
      </section>
    </div>
  );
}
