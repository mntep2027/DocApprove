const STYLES: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
};

const LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  pending: "Pending",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STYLES[status] ?? "bg-neutral-100 text-neutral-600"
      }`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
