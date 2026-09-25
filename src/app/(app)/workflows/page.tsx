import Link from "next/link";
import { requireOrg } from "@/lib/session";
import { EmptyState, WorkflowIcon } from "@/components/empty-state";

export default async function WorkflowsPage() {
  const { supabase, org, role } = await requireOrg();

  const { data: templates } = await supabase
    .from("workflow_templates")
    .select("id, name, description, updated_at")
    .eq("org_id", org.id)
    .order("updated_at", { ascending: false });

  const canManage = role === "owner" || role === "admin";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Approval workflows</h1>
        {canManage && (
          <Link
            href="/workflows/new"
            className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-medium text-white hover:brightness-90"
          >
            New template
          </Link>
        )}
      </div>

      {templates && templates.length > 0 ? (
        <ul className="divide-y divide-surface-border rounded-lg border border-surface-border">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <Link href={`/workflows/${t.id}/edit`} className="text-sm font-medium hover:text-brand-dark">
                  {t.name}
                </Link>
                {t.description && <p className="text-sm text-neutral-500">{t.description}</p>}
              </div>
              <span className="text-xs text-neutral-400">
                Updated {new Date(t.updated_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<WorkflowIcon className="h-10 w-10" />}
          title="No templates yet"
          description={
            canManage ? (
              <>
                <Link href="/workflows/new" className="text-brand-dark hover:underline">
                  Create one
                </Link>{" "}
                to design a multi-step approval flow you can reuse.
              </>
            ) : (
              "Ask an org admin to create one."
            )
          }
        />
      )}
    </div>
  );
}
