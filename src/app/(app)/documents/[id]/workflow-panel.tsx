import { StatusBadge } from "@/components/status-badge";
import { decideWorkflowStep, holdWorkflowStep, resumeWorkflowStep } from "@/lib/actions/workflows";
import WorkflowStepActions from "./workflow-step-actions";

type StepRow = {
  id: string;
  label: string;
  assigned_org_id: string;
  assigned_user_id: string | null;
  assigned_role: string | null;
  allow_hold: boolean;
  status: string;
  comment: string | null;
  hold_reason: string | null;
  first_viewed_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
};

type Profile = { full_name: string | null; email: string };

function personName(profiles: Record<string, Profile>, id: string | null) {
  if (!id) return null;
  const p = profiles[id];
  return p ? p.full_name || p.email : null;
}

function assigneeLabel(step: StepRow, orgName: string, profiles: Record<string, Profile>) {
  if (step.assigned_user_id) {
    return `${personName(profiles, step.assigned_user_id) ?? "Someone"} (${orgName})`;
  }
  if (step.assigned_role) {
    return `Any ${step.assigned_role} at ${orgName}`;
  }
  return `Any member at ${orgName}`;
}

const STATUS_ORDER: Record<string, number> = {
  in_progress: 0,
  on_hold: 0,
  pending: 1,
  approved: 2,
  rejected: 2,
  skipped: 3,
};

export default function WorkflowPanel({
  documentId,
  currentOrgId,
  currentUserId,
  instanceStatus,
  steps,
  orgNames,
  profiles,
}: {
  documentId: string;
  currentOrgId: string;
  currentUserId: string;
  instanceStatus: string;
  steps: StepRow[];
  orgNames: Record<string, string>;
  profiles: Record<string, Profile>;
}) {
  const sorted = [...steps].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-neutral-600">Workflow status:</span>
        <StatusBadge status={instanceStatus === "in_progress" ? "pending_approval" : instanceStatus} />
      </div>

      <ul className="flex flex-col gap-3">
        {sorted.map((step) => {
          const canAct =
            step.assigned_org_id === currentOrgId &&
            (!step.assigned_user_id || step.assigned_user_id === currentUserId);

          return (
            <li key={step.id} className="rounded-lg border border-surface-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{step.label}</span>
                <StatusBadge status={step.status} />
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {assigneeLabel(step, orgNames[step.assigned_org_id] ?? "Unknown company", profiles)}
              </p>

              {(step.status === "in_progress" || step.status === "on_hold") && (
                <p className="mt-1 text-xs text-neutral-400">
                  {step.first_viewed_at
                    ? `Seen ${new Date(step.first_viewed_at).toLocaleString("en-US")}`
                    : "Not yet viewed"}
                </p>
              )}

              {step.status === "on_hold" && step.hold_reason && (
                <p className="mt-2 rounded-lg bg-orange-50 px-2 py-1.5 text-xs text-orange-700">
                  On hold: {step.hold_reason}
                </p>
              )}

              {(step.status === "approved" || step.status === "rejected") && step.decided_by && (
                <p className="mt-1 text-xs text-neutral-400">
                  {personName(profiles, step.decided_by) ?? "Someone"}
                  {step.decided_at ? ` — ${new Date(step.decided_at).toLocaleString("en-US")}` : ""}
                  {step.comment ? `: ${step.comment}` : ""}
                </p>
              )}

              {canAct && (
                <div className="mt-2">
                  <WorkflowStepActions
                    status={step.status}
                    allowHold={step.allow_hold}
                    approveAction={decideWorkflowStep.bind(null, step.id, documentId, "approved")}
                    rejectAction={decideWorkflowStep.bind(null, step.id, documentId, "rejected")}
                    holdAction={holdWorkflowStep.bind(null, step.id, documentId)}
                    resumeAction={resumeWorkflowStep.bind(null, step.id, documentId)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
