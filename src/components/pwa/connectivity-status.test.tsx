import { act, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import englishMessages from "@/messages/en.json";
import {
  ConnectivityStatus,
  getConnectivitySnapshot,
} from "./connectivity-status";

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  });
}

function renderStatus() {
  return render(
    <NextIntlClientProvider locale="en" messages={englishMessages}>
      <ConnectivityStatus />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  setOnline(true);
  vi.restoreAllMocks();
});

describe("connectivity status", () => {
  it("reads the browser connectivity snapshot", () => {
    setOnline(false);
    expect(getConnectivitySnapshot()).toBe(false);

    setOnline(true);
    expect(getConnectivitySnapshot()).toBe(true);
  });

  it("reacts to offline and online browser events", () => {
    setOnline(true);
    renderStatus();

    expect(screen.getByTestId("connectivity-status")).toHaveAttribute(
      "data-state",
      "online",
    );

    setOnline(false);
    act(() => window.dispatchEvent(new Event("offline")));

    expect(screen.getByTestId("connectivity-status")).toHaveAttribute(
      "data-state",
      "offline",
    );
    expect(
      screen.getByText(
        "The saved interface remains available, but submitting data will require a connection.",
      ),
    ).toBeInTheDocument();
  });
});
