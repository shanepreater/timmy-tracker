import Link from "next/link";

export type AdminTab = "access" | "pebbles";

type AdminTabsProps = {
  active: AdminTab;
};

const TABS: { key: AdminTab; label: string; href: string }[] = [
  { key: "access", label: "Manage access", href: "/admin?tab=access" },
  { key: "pebbles", label: "Manage pebbles", href: "/admin?tab=pebbles" },
];

/**
 * Plain links, not a JS-driven ARIA tabs widget — each "tab" is a real
 * navigable URL (?tab=access|pebbles), so the correct accessible
 * pattern is a nav landmark with aria-current, not role="tablist"/"tab"
 * (which implies keyboard arrow-key handling this doesn't implement).
 * See docs/design-ui-redesign.md.
 */
export function AdminTabs({ active }: AdminTabsProps) {
  return (
    <nav aria-label="Admin sections" className="flex gap-1 border-b border-stone-200 dark:border-stone-700">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none " +
              "focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 " +
              "focus-visible:ring-offset-background " +
              (isActive
                ? "border-accent text-accent"
                : "border-transparent text-stone-600 hover:text-foreground dark:text-stone-400")
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
