"use client";

import { useActionState } from "react";

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
          className="rounded-md border border-neutral-300 px-3 py-2"
        />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create company"}
      </button>
    </form>
  );
}
