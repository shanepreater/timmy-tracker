import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const baseClasses =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover",
  secondary:
    "border border-stone-300 text-foreground hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800",
  danger:
    "border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950",
};

/**
 * Wraps a native <button> — same accessible role/text as before this
 * primitive existed, so existing getByRole("button", { name }) tests
 * keep working untouched. See docs/design-ui-redesign.md.
 */
export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  const classes = [baseClasses, variantClasses[variant], className].filter(Boolean).join(" ");
  return <button className={classes} {...props} />;
}
