const STYLES: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  on_hold: "bg-orange-100 text-orange-700",
  skipped: "bg-neutral-100 text-neutral-400",
};

const LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  pending: "Pending",
  in_progress: "In progress",
  on_hold: "On hold",
  skipped: "Skipped",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-300 ${
        STYLES[status] ?? "bg-neutral-100 text-neutral-600"
      }`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
