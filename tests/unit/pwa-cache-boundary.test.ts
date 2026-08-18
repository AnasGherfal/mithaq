import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const serviceWorkerPath = resolve(process.cwd(), "src/app/sw.ts");

describe("PWA privacy cache boundary", () => {
  it("keeps runtime caching disabled for authenticated and API data", async () => {
    const source = await readFile(serviceWorkerPath, "utf8");

    expect(source).toContain("runtimeCaching: []");
    expect(source).not.toMatch(/CacheFirst|NetworkFirst|StaleWhileRevalidate/);
    expect(source).not.toMatch(/\/api\/|supabase|authorization|cookie/i);
  });

  it("keeps the offline fallback limited to document navigation", async () => {
    const source = await readFile(serviceWorkerPath, "utf8");

    expect(source).toContain('url: "/~offline"');
    expect(source).toContain('request.destination === "document"');
  });
});
