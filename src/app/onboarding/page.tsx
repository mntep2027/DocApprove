import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { createOrganization } from "@/lib/actions/orgs";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();

  const { data: memberRows } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1);

  if (memberRows && memberRows.length > 0) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold">Set up your company</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Create a workspace for your company. You&apos;ll be the owner and can
          invite teammates afterwards.
        </p>
        <OnboardingForm action={createOrganization} />
      </div>
    </main>
  );
}
