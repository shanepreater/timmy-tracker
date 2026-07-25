import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageContainer } from "./PageContainer";

describe("PageContainer", () => {
  it("renders children inside a main landmark", () => {
    render(
      <PageContainer>
        <p>Hello</p>
      </PageContainer>,
    );

    const main = screen.getByRole("main");
    expect(main).toHaveTextContent("Hello");
  });

  it("defaults to the 3xl max width", () => {
    render(<PageContainer>content</PageContainer>);

    expect(screen.getByRole("main").className).toContain("max-w-3xl");
  });

  it("applies the requested max width", () => {
    render(<PageContainer maxWidth="6xl">content</PageContainer>);

    expect(screen.getByRole("main").className).toContain("max-w-6xl");
  });

  it("defaults to a gap of 8", () => {
    render(<PageContainer>content</PageContainer>);

    expect(screen.getByRole("main").className).toContain("gap-8");
  });

  it("applies the requested gap", () => {
    render(<PageContainer gap={4}>content</PageContainer>);

    expect(screen.getByRole("main").className).toContain("gap-4");
  });
});
