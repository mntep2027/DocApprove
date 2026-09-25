export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex max-w-6xl animate-pulse flex-col gap-8 lg:flex-row lg:items-start"
    >
      <div className="flex flex-1 flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-2/3 rounded bg-surface" />
          <div className="h-4 w-1/3 rounded bg-surface" />
        </div>
        <div className="h-28 rounded-lg bg-surface" />
        <div className="h-20 rounded-lg bg-surface" />
        <div className="h-24 rounded-lg bg-surface" />
      </div>
      <div className="w-full shrink-0 lg:w-96">
        <div className="h-8 w-32 rounded bg-surface" />
        <div className="mt-3 h-[60vh] rounded-lg bg-surface lg:h-[calc(100vh-12rem)]" />
      </div>
      <span className="sr-only">Loading document…</span>
    </div>
  );
}
