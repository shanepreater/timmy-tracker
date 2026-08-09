"use client";

import type { FormEvent, ReactNode } from "react";

type ConfirmFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  className?: string;
  children: ReactNode;
};

/**
 * A normal action-bound <form>, except the browser's native confirm()
 * has to say yes before it submits. Used for destructive admin
 * actions (delete a pebble, clear orphaned uploads) — everything else
 * in this codebase's admin forms submits immediately on click, but
 * those are all reversible (verify, move, toggle admin); deletion
 * isn't.
 */
export function ConfirmForm({ action, confirmMessage, className, children }: ConfirmFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(confirmMessage)) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} className={className} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}
