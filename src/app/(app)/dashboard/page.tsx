import Link from "next/link";
import { requireOrg } from "@/lib/session";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { BellIcon, CheckIcon, ClockIcon, DocumentIcon, PauseIcon, ShareIcon, XIcon } from "@/components/icons";

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
  const onHoldCount = new Set(
    (holdSteps ?? []).map((s) => (s.workflow_instances as unknown as { document_id: string }).document_id)
  ).size;

  const awaitingYourApprovalCount = sharedDocs.filter((d) => d.status === "pending_approval").length;
  const sentAwaitingDecisionCount = (ownDocs ?? []).filter((d) => d.status === "pending_approval").length;
  const approvedCount =
    (ownDocs ?? []).filter((d) => d.status === "approved").length +
    sharedDocs.filter((d) => d.status === "approved").length;
  const rejectedCount =
    (ownDocs ?? []).filter((d) => d.status === "rejected").length +
    sharedDocs.filter((d) => d.status === "rejected").length;
  const sharedByMeCount = (ownDocs ?? []).filter((d) => d.status !== "draft").length;

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          href="#shared-with-you"
          icon={<BellIcon className="h-4 w-4" />}
          value={awaitingYourApprovalCount}
          label="Awaiting your approval"
          variant="brand"
          delayMs={0}
        />
        <StatCard
          href="#your-documents"
          icon={<PauseIcon className="h-4 w-4" />}
          value={onHoldCount}
          label="On hold"
          variant="orange"
          delayMs={40}
        />
        <StatCard
          href="#your-documents"
          icon={<ClockIcon className="h-4 w-4" />}
          value={sentAwaitingDecisionCount}
          label="Sent, awaiting decision"
          variant="amber"
          delayMs={80}
        />
        <StatCard
          href="#your-documents"
          icon={<CheckIcon className="h-4 w-4" />}
          value={approvedCount}
          label="Approved"
          variant="green"
          delayMs={120}
        />
        <StatCard
          href="#your-documents"
          icon={<XIcon className="h-4 w-4" />}
          value={rejectedCount}
          label="Rejected"
          variant="red"
          delayMs={160}
        />
        <StatCard
          href="#your-documents"
          icon={<ShareIcon className="h-4 w-4" />}
          value={sharedByMeCount}
          label="Shared by me"
          variant="neutral"
          delayMs={200}
        />
      </div>

      <section id="your-documents">
        <h2 className="mb-3 text-lg font-semibold">{org.name}&apos;s documents</h2>
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
