import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-brand-tint px-6 py-24 text-center">
      <p className="text-sm font-medium tracking-wide text-brand uppercase">
        Document sharing &amp; approvals for companies
      </p>
      <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-foreground">
        Doc<span className="text-brand">Approve</span>
      </h1>
      <p className="max-w-md text-neutral-600">
        Share documents with other companies and manage approval workflows,
        with a full audit trail.
      </p>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-lg bg-surface px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-border"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
