import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-surface-border px-6 py-10 text-center">
      <div className="text-neutral-300">{icon}</div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-sm text-neutral-500">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
