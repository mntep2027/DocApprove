import Link from "next/link";
import { requireOrg } from "@/lib/session";
import { signOut } from "@/lib/actions/auth";
import MobileNav from "@/components/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { org } = await requireOrg();

  return (
    <div className="flex flex-1 flex-col">
      <header className="relative flex items-center justify-between border-b border-surface-border bg-white px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-foreground">
            Doc<span className="text-brand-dark">Approve</span>
          </Link>
          <nav className="hidden gap-4 text-sm text-neutral-600 md:flex">
            <Link href="/dashboard" className="hover:text-brand-dark">
              Dashboard
            </Link>
            <Link href="/documents/new" className="hover:text-brand-dark">
              Upload
            </Link>
            <Link href="/workflows" className="hover:text-brand-dark">
              Workflows
            </Link>
            <Link href="/org/settings" className="hover:text-brand-dark">
              Org settings
            </Link>
          </nav>
        </div>
        <div className="hidden items-center gap-3 text-sm text-neutral-600 md:flex">
          <span>{org.name}</span>
          <form action={signOut}>
            <button type="submit" className="hover:text-brand-dark">
              Sign out
            </button>
          </form>
        </div>
        <MobileNav orgName={org.name} signOutAction={signOut} />
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
