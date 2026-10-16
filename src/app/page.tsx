import Link from "next/link";
import { ShareIcon, WorkflowIcon, EyeIcon, BellIcon, LockIcon } from "@/components/icons";

const PROBLEMS = [
  "No record of who approved what, or when",
  "No visibility into who's holding things up",
  "Unclear which version is the current one",
  "Decisions scattered across email threads",
];

const PILLARS = [
  {
    icon: WorkflowIcon,
    title: "No more email back-and-forth",
    description: "Build no-code, multi-step approval chains that move on their own — no waiting on someone to forward an email.",
  },
  {
    icon: BellIcon,
    title: "Know who's holding things up",
    description: "Every action is logged, and the right people get notified the moment something needs their attention.",
  },
  {
    icon: EyeIcon,
    title: "Always the right version",
    description: "Preview images, PDFs, text, and Word docs inline, so everyone's looking at the same thing — no more \"is this the latest one?\"",
  },
  {
    icon: ShareIcon,
    title: "Built for two companies, not one",
    description: "Share documents with another organization and manage the whole approval exchange in one place, not scattered across inboxes.",
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

        <section className="bg-surface px-6 py-16">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
            <h2 className="text-2xl font-semibold text-foreground">Approvals shouldn&apos;t live in your inbox</h2>
            <p className="text-neutral-600">
              When a document has to go to another company for sign-off, email turns into the project
              tracker — and nobody has the full picture.
            </p>
          </div>
          <ul className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
            {PROBLEMS.map((problem) => (
              <li
                key={problem}
                className="flex items-start gap-2 rounded-lg border border-surface-border bg-white px-4 py-3 text-sm text-neutral-700"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-dark" />
                {problem}
              </li>
            ))}
          </ul>
        </section>

        <section className="px-6 py-16">
          <h2 className="mx-auto mb-10 max-w-3xl text-center text-2xl font-semibold text-foreground">
            How DocApprove helps
          </h2>
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 lg:grid-cols-4">
            {PILLARS.map(({ icon: Icon, title, description }, i) => (
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

        <section className="px-6 py-16">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-tint text-brand-dark">
              <LockIcon className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-semibold text-foreground">Your documents stay private</h2>
            <p className="text-neutral-600">
              Every document is only visible to your organization and whoever you&apos;ve explicitly
              shared it with — enforced at the database level, not just hidden in the interface.
              Download links are signed and expire automatically, so a link alone is never enough to
              access a file.
            </p>
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
