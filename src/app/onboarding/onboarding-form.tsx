"use client";

import { useActionState } from "react";
import { Spinner } from "@/components/spinner";

const initialState: { error?: string } = {};

export default function OnboardingForm({
  action,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) =>
      (await action(formData)) ?? initialState,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Company name
        <input
          name="name"
          type="text"
          required
          placeholder="Acme Inc."
          className="rounded-lg border border-surface-border px-3 py-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-dark px-4 py-2 text-sm font-medium text-white hover:brightness-90 disabled:opacity-50"
      >
        {pending && <Spinner />}
        {pending ? "Creating..." : "Create company"}
      </button>
    </form>
  );
}
