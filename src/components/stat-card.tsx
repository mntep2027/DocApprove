import type { ReactNode } from "react";

type StatVariant = "brand" | "orange" | "amber" | "green" | "red" | "neutral";

const VARIANT_STYLES: Record<StatVariant, string> = {
  brand: "bg-brand-tint text-brand-dark",
  orange: "bg-orange-100 text-orange-700",
  amber: "bg-amber-100 text-amber-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  neutral: "bg-surface text-neutral-600",
};

export function StatCard({
  href,
  icon,
  value,
  label,
  variant,
  delayMs = 0,
}: {
  href?: string;
  icon: ReactNode;
  value: number;
  label: string;
  variant: StatVariant;
  delayMs?: number;
}) {
  const className =
    "animate-stat-in flex min-h-[44px] flex-col gap-2 rounded-xl border border-surface-border bg-white p-4 transition-shadow hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";
  const content = (
    <>
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${VARIANT_STYLES[variant]}`}>
        {icon}
      </span>
      <span className="text-2xl font-semibold text-foreground">{value}</span>
      <span className="text-xs text-neutral-500">{label}</span>
    </>
  );

  if (href) {
    return (
      <a href={href} style={{ animationDelay: `${delayMs}ms` }} className={className}>
        {content}
      </a>
    );
  }

  return (
    <div style={{ animationDelay: `${delayMs}ms` }} className={className}>
      {content}
    </div>
  );
}
