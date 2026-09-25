"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MenuIcon, XIcon } from "@/components/icons";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/documents/new", label: "Upload" },
  { href: "/workflows", label: "Workflows" },
  { href: "/org/settings", label: "Org settings" },
];

export default function MobileNav({
  orgName,
  signOutAction,
}: {
  orgName: string;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div className="md:hidden" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:text-brand-dark"
      >
        {open ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-10 border-b border-surface-border bg-white px-6 py-3 shadow-sm">
          <nav className="flex flex-col gap-1 text-sm text-neutral-600">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2 hover:bg-surface hover:text-brand-dark"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 flex items-center justify-between border-t border-surface-border pt-2 text-sm text-neutral-600">
            <span>{orgName}</span>
            <form action={signOutAction}>
              <button type="submit" className="hover:text-brand-dark">
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
