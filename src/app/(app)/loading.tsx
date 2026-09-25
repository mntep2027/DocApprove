export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-brand-dark" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
