"use client";

import { useActionState, useState } from "react";

const initialState: { error?: string } = {};

type TemplateOption = {
  id: string;
  name: string;
  placeholders: { id: string; label: string }[];
};

export default function StartWorkflowForm({
  templates,
  action,
}: {
  templates: TemplateOption[];
  action: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) =>
      (await action(formData)) ?? initialState,
    initialState
  );

  const selected = templates.find((t) => t.id === templateId);

  if (templates.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No workflow templates yet — create one under{" "}
        <a href="/workflows" className="text-brand hover:underline">
          Workflows
        </a>{" "}
        first.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Template
        <select
          name="templateId"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="rounded-lg border border-surface-border px-3 py-2"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      {selected?.placeholders.map((p) => (
        <label key={p.id} className="flex flex-col gap-1 text-sm">
          Company slug for &quot;{p.label}&quot;
          <input
            name={`binding_${p.id}`}
            type="text"
            required
            placeholder="acme-inc"
            className="rounded-lg border border-surface-border px-3 py-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
      ))}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Starting..." : "Start workflow"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
