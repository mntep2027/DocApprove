"use client";

import { useActionState } from "react";

const initialState: { error?: string } = {};

function ActionForm({
  action,
  label,
  className,
  fieldName,
  placeholder,
  required,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  label: string;
  className: string;
  fieldName?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) =>
      (await action(formData)) ?? initialState,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {fieldName && (
        <textarea
          name={fieldName}
          rows={2}
          required={required}
          placeholder={placeholder}
          className="rounded-lg border border-surface-border px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      )}
      <button
        type="submit"
        disabled={pending}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${className}`}
      >
        {pending ? "Submitting..." : label}
      </button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

export default function WorkflowStepActions({
  status,
  allowHold,
  approveAction,
  rejectAction,
  holdAction,
  resumeAction,
}: {
  status: string;
  allowHold: boolean;
  approveAction: (formData: FormData) => Promise<{ error?: string } | void>;
  rejectAction: (formData: FormData) => Promise<{ error?: string } | void>;
  holdAction: (formData: FormData) => Promise<{ error?: string } | void>;
  resumeAction: () => Promise<{ error?: string } | void>;
}) {
  if (status === "on_hold") {
    return (
      <form
        action={async () => {
          await resumeAction();
        }}
      >
        <button
          type="submit"
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Resume
        </button>
      </form>
    );
  }

  if (status !== "in_progress") return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <ActionForm
        action={approveAction}
        label="Approve"
        className="bg-green-600 hover:bg-green-700"
        fieldName="comment"
        placeholder="Optional comment"
      />
      <ActionForm
        action={rejectAction}
        label="Reject"
        className="bg-red-600 hover:bg-red-700"
        fieldName="comment"
        placeholder="Optional comment"
      />
      {allowHold && (
        <ActionForm
          action={holdAction}
          label="Hold for clarification"
          className="bg-neutral-500 hover:bg-neutral-600"
          fieldName="reason"
          placeholder="What do you need clarified?"
          required
        />
      )}
    </div>
  );
}
