import { expect, test } from "@playwright/test";

test("public responses enforce the checked-in security header baseline", async ({
  request,
}) => {
  const response = await request.get("/ar");
  expect(response.ok()).toBe(true);

  const headers = response.headers();
  const csp = headers["content-security-policy"] ?? "";

  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("base-uri 'self'");
  expect(csp).toContain("form-action 'self'");
  expect(csp).toContain(
    "connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321",
  );
  expect(csp).not.toContain("'unsafe-eval'");

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["x-powered-by"]).toBeUndefined();
});
