import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClasses, type ButtonVariant } from "@/components/Button";

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
};

/**
 * Same look as Button, but a real <a> (via next/link) for navigation —
 * a call to action that takes you to another page isn't a form submit,
 * so it shouldn't be a <button> semantically. See docs/design-ui-redesign.md.
 */
export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}
