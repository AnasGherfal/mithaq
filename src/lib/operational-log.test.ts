import { describe, expect, it } from "vitest";
import { buildServerErrorObservation } from "@/lib/operational-log";

describe("operational error logging", () => {
  it("keeps server error observations free of error messages and request data", () => {
    const error = Object.assign(
      new Error("phone +218912345678 token=super-secret message=private"),
      { digest: "abc123def456" },
    );

    const observation = buildServerErrorObservation({
      error,
      method: "post",
      routePath: "/[locale]/waitlist/consent",
      routeType: "action",
      routerKind: "App Router",
    });

    expect(observation).toMatchObject({
      event: "server_request_error",
      severity: "error",
      request: {
        method: "POST",
        route: "/[locale]/waitlist/consent",
        routeType: "action",
      },
      error: {
        name: "Error",
        digest: "abc123def456",
      },
    });

    expect(JSON.stringify(observation)).not.toMatch(
      /218912345678|super-secret|private/,
    );
  });

  it("drops unsafe operational labels instead of logging arbitrary text", () => {
    const error = Object.assign(new Error("ignored"), {
      name: "Error with private text",
      digest: "unsafe digest with spaces",
    });

    const observation = buildServerErrorObservation({
      error,
      method: "GET secret",
      routePath: "/safe?phone=123",
      routeType: "route",
      routerKind: "App Router",
    });

    expect(observation.request.method).toBe("UNKNOWN");
    expect(observation.request.route).toBe("unknown");
    expect(observation.error.name).toBe("Error");
    expect(observation.error.digest).toBe("unknown");
  });
});
