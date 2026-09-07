import Link from "next/link";
import { requireOrg } from "@/lib/session";
import { signOut } from "@/lib/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { org } = await requireOrg();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-surface-border bg-white px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-foreground">
            Doc<span className="text-brand">Approve</span>
          </Link>
          <nav className="flex gap-4 text-sm text-neutral-600">
            <Link href="/dashboard" className="hover:text-brand">
              Dashboard
            </Link>
            <Link href="/documents/new" className="hover:text-brand">
              Upload
            </Link>
            <Link href="/org/settings" className="hover:text-brand">
              Org settings
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-neutral-600">
          <span>{org.name}</span>
          <form action={signOut}>
            <button type="submit" className="hover:text-brand">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
