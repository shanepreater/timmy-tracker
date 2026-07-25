"use client";

import { signOutAction } from "@/app/actions/sign-out";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="link">
        Sign out
      </button>
    </form>
  );
}
