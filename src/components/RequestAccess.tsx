import { getPendingAccessRequest } from "@/lib/access-requests";
import { RequestAccessButton } from "@/components/RequestAccessButton";
import { PageContainer } from "@/components/PageContainer";

type RequestAccessProps = {
  email: string;
  name: string | null;
};

export async function RequestAccess({ email, name }: RequestAccessProps) {
  const pending = await getPendingAccessRequest(email);

  return (
    <PageContainer maxWidth="md" gap={4} className="items-center text-center">
      <h1 className="heading-2">This site is invite-only</h1>
      <p className="text-stone-600 dark:text-stone-400">
        {name ? `Hi ${name} — y` : "Y"}ou&apos;re signed in as {email}, but that account isn&apos;t
        on the list yet.
      </p>
      {pending ? (
        <p role="status">Your request is pending — we&apos;ll let you know once it&apos;s approved.</p>
      ) : (
        <RequestAccessButton />
      )}
    </PageContainer>
  );
}
