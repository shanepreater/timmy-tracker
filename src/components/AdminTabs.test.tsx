import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminTabs } from "./AdminTabs";

describe("AdminTabs", () => {
  it("shows access and pebbles tabs by default, marking the active one", () => {
    render(<AdminTabs active="pebbles" />);

    expect(screen.getByRole("link", { name: /manage access/i })).toBeInTheDocument();
    const pebblesTab = screen.getByRole("link", { name: /manage pebbles/i });
    expect(pebblesTab).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: /orphaned photos/i })).not.toBeInTheDocument();
  });

  it("adds the orphaned-photos tab when showOrphans is true", () => {
    render(<AdminTabs active="orphans" showOrphans />);

    const orphansTab = screen.getByRole("link", { name: /orphaned photos/i });
    expect(orphansTab).toHaveAttribute("href", "/admin?tab=orphans");
    expect(orphansTab).toHaveAttribute("aria-current", "page");
  });
});
