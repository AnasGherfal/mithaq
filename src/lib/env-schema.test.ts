import { describe, expect, it } from "vitest";
import { environmentSchema } from "./env-schema";

const validEnvironment = {
  APP_ENV: "local",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-placeholder",
};

describe("environment schema", () => {
  it("accepts a complete safe public configuration", () => {
    expect(environmentSchema.safeParse(validEnvironment).success).toBe(true);
  });

  it("rejects missing keys and invalid URLs", () => {
    expect(
      environmentSchema.safeParse({
        ...validEnvironment,
        NEXT_PUBLIC_SITE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      }).success,
    ).toBe(false);
  });

  it("does not define a service-role credential", () => {
    expect(Object.keys(environmentSchema.shape)).not.toContain(
      "SUPABASE_SERVICE_ROLE_KEY",
    );
  });
});
