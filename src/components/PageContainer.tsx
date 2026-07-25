import type { ReactNode } from "react";

const MAX_WIDTHS = {
  md: "max-w-md",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
} as const;

type PageContainerProps = {
  children: ReactNode;
  maxWidth?: keyof typeof MAX_WIDTHS;
  className?: string;
};

/**
 * Replaces the near-identical
 * "mx-auto flex w-full max-w-* flex-1 flex-col gap-* px-6 py-16"
 * className repeated across every page — see docs/design-ui-redesign.md.
 */
export function PageContainer({ children, maxWidth = "3xl", className }: PageContainerProps) {
  const classes = [
    "mx-auto flex w-full flex-1 flex-col gap-8 px-6 py-16",
    MAX_WIDTHS[maxWidth],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <main className={classes}>{children}</main>;
}
