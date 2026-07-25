import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";

type AppHeaderProps = {
  email: string;
  isAdmin: boolean;
};

export function AppHeader({ email, isAdmin }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-stone-200 px-6 py-3 text-sm dark:border-stone-700">
      <Link href="/" className="flex items-center gap-3">
        <Logo size={32} />
        <span className="heading-3 hidden sm:inline">Timmy Tracker</span>
      </Link>
      <div className="flex items-center gap-4">
        <span className="text-stone-600 dark:text-stone-400">{email}</span>
        {isAdmin && (
          <Link href="/admin" className="link">
            Admin
          </Link>
        )}
        <SignOutButton />
      </div>
    </header>
  );
}
