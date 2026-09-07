"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createOrganization(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Company name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", {
    org_name: name,
    org_slug: slugify(name),
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function inviteMember(orgId: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "member");
  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_org_member", {
    p_org_id: orgId,
    p_email: email,
    p_role: role,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/org/settings");
  return { error: undefined };
}
