import type { AllowedUser, AccessRequest } from "@prisma/client";
import {
  approveAccessRequestAction,
  denyAccessRequestAction,
  addAllowedUserAction,
  removeAllowedUserAction,
  toggleAllowedUserAdminAction,
} from "@/app/admin/actions";
import { Button } from "@/components/Button";

type ManageUsersProps = {
  allowedUsers: AllowedUser[];
  pendingRequests: AccessRequest[];
};

export function ManageUsers({ allowedUsers, pendingRequests }: ManageUsersProps) {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h3 className="heading-3">Pending requests</h3>
        {pendingRequests.length === 0 ? (
          <p className="text-stone-600 dark:text-stone-400">No pending requests.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pendingRequests.map((request) => (
              <li key={request.id} className="card flex items-center justify-between gap-4">
                <span>
                  {request.name ? `${request.name} — ` : ""}
                  {request.email}
                </span>
                <div className="flex gap-2">
                  <form action={approveAccessRequestAction.bind(null, request.id)}>
                    <Button type="submit">Approve</Button>
                  </form>
                  <form action={denyAccessRequestAction.bind(null, request.id)}>
                    <Button type="submit" variant="danger">Deny</Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="heading-3">Allowed users</h3>
        <ul className="flex flex-col gap-3">
          {allowedUsers.map((user) => (
            <li key={user.id} className="card flex items-center justify-between gap-4">
              <span>
                {user.name ? `${user.name} — ` : ""}
                {user.email} {user.isAdmin && "(admin)"}
              </span>
              <div className="flex gap-2">
                <form action={toggleAllowedUserAdminAction.bind(null, user.id, user.isAdmin)}>
                  <Button type="submit" variant="secondary">
                    {user.isAdmin ? "Remove admin" : "Make admin"}
                  </Button>
                </form>
                <form action={removeAllowedUserAction.bind(null, user.id)}>
                  <Button type="submit" variant="danger">Remove</Button>
                </form>
              </div>
            </li>
          ))}
        </ul>

        <form action={addAllowedUserAction} className="flex items-center gap-2">
          <input
            type="email"
            name="email"
            placeholder="email@example.com"
            required
            className="input"
          />
          <label className="flex items-center gap-1 text-sm text-stone-700 dark:text-stone-300">
            <input type="checkbox" name="isAdmin" /> Admin
          </label>
          <Button type="submit">Add user</Button>
        </form>
      </section>
    </div>
  );
}
