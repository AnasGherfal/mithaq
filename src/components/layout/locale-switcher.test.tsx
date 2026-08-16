import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleSwitcher } from "./locale-switcher";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/ar");
  });

  it("links an Arabic page to its English equivalent", () => {
    render(
      <LocaleSwitcher
        locale="ar"
        label="View the English version"
        shortLabel="English"
      />,
    );

    const link = screen.getByRole("link", {
      name: "View the English version",
    });

    expect(link).toHaveAttribute("href", "/en");
    expect(link).toHaveAttribute("hreflang", "en");
    expect(link).toHaveAttribute("lang", "en");
    expect(link).toHaveAttribute("dir", "ltr");
  });

  it("preserves the current path while changing direction", () => {
    usePathnameMock.mockReturnValue("/en/privacy-safety");

    render(
      <LocaleSwitcher
        locale="en"
        label="عرض النسخة العربية"
        shortLabel="العربية"
      />,
    );

    const link = screen.getByRole("link", { name: "عرض النسخة العربية" });
    expect(link).toHaveAttribute("href", "/ar/privacy-safety");
    expect(link).toHaveAttribute("dir", "rtl");
  });
});
