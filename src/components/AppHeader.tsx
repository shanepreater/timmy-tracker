import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

type AppHeaderProps = {
  email: string;
  isAdmin: boolean;
};

export function AppHeader({ email, isAdmin }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 text-sm dark:border-zinc-700">
      <span className="text-zinc-600 dark:text-zinc-400">{email}</span>
      <div className="flex items-center gap-4">
        {isAdmin && (
          <Link href="/admin" className="underline">
            Admin
          </Link>
        )}
        <SignOutButton />
      </div>
    </header>
  );
}
