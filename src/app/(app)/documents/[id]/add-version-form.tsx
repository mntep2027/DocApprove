"use client";

import { useActionState } from "react";

const initialState: { error?: string } = {};

export default function AddVersionForm({
  documentId,
  action,
}: {
  documentId: string;
  action: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) =>
      (await action(formData)) ?? initialState,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="documentId" value={documentId} />
      <input name="file" type="file" required className="text-sm" />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-medium text-white hover:brightness-90 disabled:opacity-50"
      >
        {pending ? "Uploading..." : "Upload new version"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
