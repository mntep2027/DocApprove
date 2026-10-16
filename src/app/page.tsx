import Link from "next/link";
import { ShareIcon, WorkflowIcon, EyeIcon, BellIcon } from "@/components/icons";

const FEATURES = [
  {
    icon: ShareIcon,
    title: "Cross-company sharing & approvals",
    description: "Share a document with another company and get a clear approve or reject decision back.",
  },
  {
    icon: WorkflowIcon,
    title: "No-code approval workflows",
    description: "Build multi-step, multi-company approval chains with a drag-and-drop workflow builder.",
  },
  {
    icon: EyeIcon,
    title: "In-app document preview",
    description: "Review images, PDFs, text, and Word documents right in the browser — no downloading required.",
  },
  {
    icon: BellIcon,
    title: "Audit trail & email notifications",
    description: "Every action is logged, and the right people get emailed the moment something needs attention.",
  },
];

const STEPS = [
  { number: "1", title: "Upload", description: "Add a document to DocApprove, with versions tracked automatically." },
  { number: "2", title: "Share", description: "Send it to another company, or start a no-code approval workflow." },
  { number: "3", title: "Decide", description: "Reviewers approve, reject, or ask for clarification — all logged." },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-border bg-white/80 px-6 py-4 backdrop-blur">
        <span className="font-semibold text-foreground">
          Doc<span className="text-brand-dark">Approve</span>
        </span>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className="text-neutral-600 hover:text-brand-dark">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-dark px-4 py-2 font-medium text-white hover:bg-brand-hover"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="flex flex-col items-center gap-8 px-6 py-24 text-center">
          <p className="text-sm font-medium tracking-wide text-brand-dark uppercase">
            Document sharing &amp; approvals for companies
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-foreground">
            Doc<span className="text-brand">Approve</span>
          </h1>
          <p className="max-w-md text-neutral-600">
            Share documents with other companies and manage approval workflows,
            with a full audit trail.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
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
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description }, i) => (
              <div
                key={title}
                style={{ animationDelay: `${i * 60}ms` }}
                className="animate-stat-in flex flex-col gap-3 rounded-xl border border-surface-border bg-white p-5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-tint text-brand-dark">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-neutral-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-surface px-6 py-16">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-dark text-sm font-semibold text-white">
                  {step.number}
                </span>
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm text-neutral-600">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col items-center gap-5 bg-brand-dark px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold text-white">Ready to simplify your approvals?</h2>
          <Link
            href="/signup"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-brand-dark hover:bg-surface"
          >
            Get started
          </Link>
        </section>
      </main>

      <footer className="flex flex-col items-center gap-3 border-t border-surface-border px-6 py-8 text-sm text-neutral-500 sm:flex-row sm:justify-between">
        <span className="font-semibold text-foreground">
          Doc<span className="text-brand-dark">Approve</span>
        </span>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="hover:text-brand-dark">
            Log in
          </Link>
          <Link href="/signup" className="hover:text-brand-dark">
            Sign up
          </Link>
        </nav>
        <span>&copy; {new Date().getFullYear()} DocApprove</span>
      </footer>
    </div>
  );
}
