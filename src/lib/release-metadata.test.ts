import { describe, expect, it } from "vitest";
import {
  getReleaseMetadata,
  sanitizeReleaseRevision,
} from "@/lib/release-metadata";

describe("release metadata", () => {
  it("keeps only allowlisted deployment tiers", () => {
    expect(
      getReleaseMetadata({ tier: "staging", revision: "abcdef1234567890" }),
    ).toMatchObject({
      version: "0.1.0",
      tier: "staging",
      revision: "abcdef123456",
    });

    expect(
      getReleaseMetadata({ tier: "secret-project", revision: "abcdef1" }).tier,
    ).toBe("unknown");
  });

  it("rejects revisions that are not commit-like hashes", () => {
    expect(sanitizeReleaseRevision("abcdef1234567890")).toBe("abcdef123456");
    expect(sanitizeReleaseRevision(" deploy-token ")).toBe("unknown");
    expect(sanitizeReleaseRevision(undefined)).toBe("unknown");
  });
});
