"use client";

import { useActionState } from "react";

const initialState: { error?: string } = {};

export default function ShareForm({
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
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Company slug
        <input
          name="orgSlug"
          type="text"
          required
          placeholder="acme-inc"
          className="rounded-md border border-neutral-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Permission
        <select
          name="permission"
          defaultValue="approve"
          className="rounded-md border border-neutral-300 px-3 py-2"
        >
          <option value="approve">Approve</option>
          <option value="view">View only</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {pending ? "Sharing..." : "Share"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
