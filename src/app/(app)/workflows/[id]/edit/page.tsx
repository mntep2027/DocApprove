import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/session";
import WorkflowBuilder from "../../workflow-builder";

export default async function EditWorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, org, role } = await requireOrg();

  const { data: template } = await supabase
    .from("workflow_templates")
    .select("id, org_id, name, description")
    .eq("id", id)
    .single();

  if (!template || template.org_id !== org.id) {
    notFound();
  }

  if (role !== "owner" && role !== "admin") {
    return (
      <div className="mx-auto max-w-lg">
        <p className="text-sm text-neutral-500">Only org owners/admins can edit workflow templates.</p>
      </div>
    );
  }

  const [{ data: steps }, { data: edges }, { data: memberRows }] = await Promise.all([
    supabase
      .from("workflow_template_steps")
      .select(
        "id, label, step_type, assignee_mode, assignee_org_id, assignee_user_id, assignee_role, join_mode, allow_hold, position_x, position_y"
      )
      .eq("template_id", id),
    supabase.from("workflow_template_edges").select("from_step_id, to_step_id").eq("template_id", id),
    supabase.from("org_members").select("user_id").eq("org_id", org.id),
  ]);

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
      <h1 className="mb-4 text-2xl font-semibold">Edit workflow template</h1>
      <WorkflowBuilder
        orgId={org.id}
        templateId={template.id}
        initialName={template.name}
        initialDescription={template.description ?? ""}
        initialSteps={steps ?? []}
        initialEdges={edges ?? []}
        orgMembers={orgMembers}
      />
    </div>
  );
}
