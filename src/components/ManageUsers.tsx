import type { AllowedUser, AccessRequest } from "@prisma/client";
import {
  approveAccessRequestAction,
  denyAccessRequestAction,
  addAllowedUserAction,
  removeAllowedUserAction,
  toggleAllowedUserAdminAction,
} from "@/app/admin/actions";

type ManageUsersProps = {
  allowedUsers: AllowedUser[];
  pendingRequests: AccessRequest[];
};

export function ManageUsers({ allowedUsers, pendingRequests }: ManageUsersProps) {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Pending requests</h2>
        {pendingRequests.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">No pending requests.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pendingRequests.map((request) => (
              <li
                key={request.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
              >
                <span>
                  {request.name ? `${request.name} — ` : ""}
                  {request.email}
                </span>
                <div className="flex gap-2">
                  <form action={approveAccessRequestAction.bind(null, request.id)}>
                    <button type="submit">Approve</button>
                  </form>
                  <form action={denyAccessRequestAction.bind(null, request.id)}>
                    <button type="submit">Deny</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Allowed users</h2>
        <ul className="flex flex-col gap-3">
          {allowedUsers.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
            >
              <span>
                {user.name ? `${user.name} — ` : ""}
                {user.email} {user.isAdmin && "(admin)"}
              </span>
              <div className="flex gap-2">
                <form action={toggleAllowedUserAdminAction.bind(null, user.id, user.isAdmin)}>
                  <button type="submit">{user.isAdmin ? "Remove admin" : "Make admin"}</button>
                </form>
                <form action={removeAllowedUserAction.bind(null, user.id)}>
                  <button type="submit">Remove</button>
                </form>
              </div>
            </li>
          ))}
        </ul>

        <form action={addAllowedUserAction} className="flex items-center gap-2">
          <input type="email" name="email" placeholder="email@example.com" required />
          <label className="flex items-center gap-1">
            <input type="checkbox" name="isAdmin" /> Admin
          </label>
          <button type="submit">Add user</button>
        </form>
      </section>
    </div>
  );
}
