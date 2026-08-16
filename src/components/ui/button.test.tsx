import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders an accessible button and forwards interaction", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={onClick}>Continue securely</Button>);
    await user.click(screen.getByRole("button", { name: "Continue securely" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("can provide button styling to an accessible external link", () => {
    render(
      <Button asChild variant="outline">
        <a href="https://example.com">Mithaq</a>
      </Button>,
    );

    expect(screen.getByRole("link", { name: "Mithaq" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });
});
