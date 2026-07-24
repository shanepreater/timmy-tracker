import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * JWT sessions only — no Prisma adapter. The session cookie just proves
 * which Google account signed in; whitelist/admin status is our own
 * lookup (see src/lib/auth-guards.ts), kept out of Auth.js's own data
 * model entirely. See docs/design-access-control.md.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
});
