import { getPendingAccessRequest } from "@/lib/access-requests";
import { RequestAccessButton } from "@/components/RequestAccessButton";

type RequestAccessProps = {
  email: string;
  name: string | null;
};

export async function RequestAccess({ email, name }: RequestAccessProps) {
  const pending = await getPendingAccessRequest(email);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">This site is invite-only</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {name ? `Hi ${name} — y` : "Y"}ou&apos;re signed in as {email}, but that account isn&apos;t
        on the list yet.
      </p>
      {pending ? (
        <p role="status">Your request is pending — we&apos;ll let you know once it&apos;s approved.</p>
      ) : (
        <RequestAccessButton />
      )}
    </main>
  );
}
