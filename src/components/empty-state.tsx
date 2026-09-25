import type { ReactNode } from "react";

export function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.75h7.25L19 8.5V19.5a.75.75 0 0 1-.75.75H7a.75.75 0 0 1-.75-.75V4.5A.75.75 0 0 1 7 3.75Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3.75V8.5h4.75" />
    </svg>
  );
}

export function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 12c0-3.9 3.58-7 8-7s8 3.1 8 7-3.58 7-8 7c-1 0-1.95-.16-2.82-.46L4 20l1.2-3.6C4.44 15.4 4 13.76 4 12Z"
      />
    </svg>
  );
}

export function WorkflowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <circle cx="5" cy="6" r="2.25" />
      <circle cx="5" cy="18" r="2.25" />
      <circle cx="18" cy="12" r="2.25" />
      <path strokeLinecap="round" d="M7 6.7 15.8 11M7 17.3 15.8 13" />
    </svg>
  );
}

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
