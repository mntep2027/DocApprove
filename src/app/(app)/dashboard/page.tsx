import Link from "next/link";
import { requireOrg } from "@/lib/session";
import { StatusBadge } from "@/components/status-badge";

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

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="mb-3 text-lg font-semibold">{org.name}&apos;s documents</h2>
        {ownDocs && ownDocs.length > 0 ? (
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
            {ownDocs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between px-4 py-3">
                <Link href={`/documents/${doc.id}`} className="hover:underline">
                  {doc.title}
                </Link>
                <StatusBadge status={doc.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">
            No documents yet.{" "}
            <Link href="/documents/new" className="underline">
              Upload one
            </Link>
            .
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Shared with you for approval</h2>
        {sharedDocs.length > 0 ? (
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
            {sharedDocs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link href={`/documents/${doc.id}`} className="hover:underline">
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
          <p className="text-sm text-neutral-500">Nothing shared with you yet.</p>
        )}
      </section>
    </div>
  );
}
