import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SignOutButton } from "@/components/SignOutButton";

type AppHeaderProps = {
  email: string;
  isAdmin: boolean;
};

export function AppHeader({ email, isAdmin }: AppHeaderProps) {
  return (
    <SiteHeader>
      <span className="text-stone-600 dark:text-stone-400">{email}</span>
      {isAdmin && (
        <Link href="/admin" className="link">
          Admin
        </Link>
      )}
      <SignOutButton />
    </SiteHeader>
  );
}
