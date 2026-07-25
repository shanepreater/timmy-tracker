import type { ReactNode } from "react";

const MAX_WIDTHS = {
  md: "max-w-md",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
} as const;

const GAPS = {
  4: "gap-4",
  8: "gap-8",
  16: "gap-16",
} as const;

type PageContainerProps = {
  children: ReactNode;
  maxWidth?: keyof typeof MAX_WIDTHS;
  gap?: keyof typeof GAPS;
  className?: string;
};

/**
 * Replaces the near-identical
 * "mx-auto flex w-full max-w-* flex-1 flex-col gap-* px-6 py-16"
 * className repeated across every page — see docs/design-ui-redesign.md.
 * gap/maxWidth are props (not raw className overrides) so conflicting
 * Tailwind utilities (e.g. two different gap-* classes) never end up in
 * the same class list, where cascade order — not the className string
 * order — would decide which one wins.
 */
export function PageContainer({
  children,
  maxWidth = "3xl",
  gap = 8,
  className,
}: PageContainerProps) {
  const classes = [
    "mx-auto flex w-full flex-1 flex-col px-6 py-16",
    MAX_WIDTHS[maxWidth],
    GAPS[gap],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <main className={classes}>{children}</main>;
}
