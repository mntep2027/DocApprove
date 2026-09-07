import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return { supabase, user };
}

export async function requireOrg() {
  const { supabase, user } = await requireUser();

  const { data: memberRows } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (!memberRows || memberRows.length === 0) {
    redirect("/onboarding");
  }

  const orgIds = memberRows.map((m) => m.org_id);
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .in("id", orgIds);

  const primary = memberRows[0];
  const org = orgs?.find((o) => o.id === primary.org_id);
  if (!org) {
    redirect("/onboarding");
  }

  return { supabase, user, org, role: primary.role, allOrgs: orgs ?? [] };
}
