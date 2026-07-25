import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

type SiteHeaderProps = {
  children?: ReactNode;
};

/**
 * Always present, regardless of auth-gate state — a signed-out visitor
 * (or one with the gate off entirely) still gets the logo/home link.
 * AppHeader adds the signed-in-only content (email, admin link, sign
 * out) via children rather than duplicating this markup.
 */
export function SiteHeader({ children }: SiteHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-stone-200 px-6 py-3 text-sm dark:border-stone-700">
      <Link href="/" aria-label="Timmy Tracker home" className="flex items-center gap-3">
        <Logo size={32} />
        <span aria-hidden="true" className="heading-3 hidden sm:inline">
          Timmy Tracker
        </span>
      </Link>
      {children && <div className="flex items-center gap-4">{children}</div>}
    </header>
  );
}
