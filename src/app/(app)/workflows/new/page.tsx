import { requireOrg } from "@/lib/session";
import WorkflowBuilder from "../workflow-builder";

export default async function NewWorkflowPage() {
  const { supabase, org, role } = await requireOrg();

  if (role !== "owner" && role !== "admin") {
    return (
      <div className="mx-auto max-w-lg">
        <p className="text-sm text-neutral-500">Only org owners/admins can create workflow templates.</p>
      </div>
    );
  }

  const { data: memberRows } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", org.id);
  const userIds = (memberRows ?? []).map((m) => m.user_id);
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, email, full_name").in("id", userIds)
      : { data: [] };
  const orgMembers = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name || p.email,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-2xl font-semibold">New workflow template</h1>
      <WorkflowBuilder
        orgId={org.id}
        templateId={null}
        initialName=""
        initialDescription=""
        initialSteps={[]}
        initialEdges={[]}
        orgMembers={orgMembers}
      />
    </div>
  );
}
