"use client";

import { useActionState } from "react";

const initialState: { error?: string } = {};

function DecisionButton({
  action,
  label,
  className,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  label: string;
  className: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) =>
      (await action(formData)) ?? initialState,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-2">
      <textarea
        name="comment"
        rows={2}
        placeholder="Optional comment"
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${className}`}
      >
        {pending ? "Submitting..." : label}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

export default function DecisionForm({
  approveAction,
  rejectAction,
}: {
  approveAction: (formData: FormData) => Promise<{ error?: string } | void>;
  rejectAction: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <DecisionButton action={approveAction} label="Approve" className="bg-green-600 hover:bg-green-700" />
      <DecisionButton action={rejectAction} label="Reject" className="bg-red-600 hover:bg-red-700" />
    </div>
  );
}
