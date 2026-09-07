import { requireOrg } from "@/lib/session";
import { inviteMember } from "@/lib/actions/orgs";
import InviteForm from "./invite-form";

export default async function OrgSettingsPage() {
  const { supabase, org, role } = await requireOrg();

  const { data: memberRows } = await supabase
    .from("org_members")
    .select("user_id, role, created_at")
    .eq("org_id", org.id)
    .order("created_at", { ascending: true });

  const userIds = (memberRows ?? []).map((m) => m.user_id);
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, email, full_name").in("id", userIds)
      : { data: [] };

  const canInvite = role === "owner" || role === "admin";
  const inviteAction = inviteMember.bind(null, org.id);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{org.name}</h1>
        <p className="text-sm text-neutral-500">Slug: {org.slug}</p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Members</h2>
        <ul className="divide-y divide-surface-border rounded-lg border border-surface-border">
          {(memberRows ?? []).map((m) => {
            const profile = profiles?.find((p) => p.id === m.user_id);
            return (
              <li key={m.user_id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{profile?.full_name || profile?.email || m.user_id}</span>
                <span className="text-neutral-500">{m.role}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {canInvite && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Invite a teammate</h2>
          <p className="mb-3 text-sm text-neutral-500">
            They need to have already signed up with this email.
          </p>
          <InviteForm action={inviteAction} />
        </section>
      )}
    </div>
  );
}
