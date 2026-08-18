import packageJson from "../package.json" with { type: "json" };

const hostedTiers = new Set(["staging", "production"]);

export function validateHostedBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("MITHAQ_RELEASE_BASE_URL must be a valid absolute URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("Hosted release verification requires HTTPS");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    throw new Error(
      "Hosted release verification cannot target a local address",
    );
  }

  return url;
}

export function normalizeExpectedRevision(value) {
  const revision = value?.trim();
  if (!revision || !/^[0-9a-f]{7,64}$/i.test(revision)) {
    throw new Error(
      "MITHAQ_EXPECTED_REVISION must be a 7-64 character hexadecimal commit SHA",
    );
  }

  return revision.slice(0, 12).toLowerCase();
}

export function validateHealthPayload(payload, { tier, version, revision }) {
  const errors = [];

  if (payload?.status !== "ok") errors.push("health status is not ok");
  if (payload?.application !== "Mithaq")
    errors.push("health application identity is not Mithaq");
  if (payload?.release?.version !== version) {
    errors.push(
      `release version ${payload?.release?.version ?? "missing"} does not match ${version}`,
    );
  }
  if (payload?.release?.tier !== tier) {
    errors.push(
      `release tier ${payload?.release?.tier ?? "missing"} does not match ${tier}`,
    );
  }
  if (payload?.release?.revision !== revision) {
    errors.push(
      `release revision ${payload?.release?.revision ?? "missing"} does not match ${revision}`,
    );
  }

  return errors;
}

export function validateHostedHeaders(headers, tier) {
  const errors = [];
  const requiredExact = {
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-frame-options": "DENY",
    "permissions-policy":
      "camera=(), microphone=(), geolocation=(), payment=()",
  };

  for (const [name, expected] of Object.entries(requiredExact)) {
    if (headers.get(name) !== expected) {
      errors.push(`${name} header is missing or unexpected`);
    }
  }

  const csp = headers.get("content-security-policy") ?? "";
  for (const directive of [
    "default-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ]) {
    if (!csp.includes(directive))
      errors.push(`content-security-policy is missing ${directive}`);
  }

  if (headers.has("x-powered-by")) {
    errors.push("x-powered-by must not be exposed");
  }

  if (tier === "production") {
    const hsts = headers.get("strict-transport-security") ?? "";
    if (
      !hsts.includes("max-age=63072000") ||
      !hsts.includes("includeSubDomains")
    ) {
      errors.push(
        "production strict-transport-security header is missing or incomplete",
      );
    }
    if (!csp.includes("upgrade-insecure-requests")) {
      errors.push(
        "production content-security-policy must upgrade insecure requests",
      );
    }
  }

  return errors;
}

export async function verifyHostedRelease({
  baseUrl,
  tier,
  revision,
  fetchImpl = fetch,
}) {
  if (!hostedTiers.has(tier)) {
    throw new Error("Hosted release tier must be staging or production");
  }

  const url = validateHostedBaseUrl(baseUrl);
  const expectedRevision = normalizeExpectedRevision(revision);
  const errors = [];

  const healthResponse = await fetchImpl(new URL("/api/health", url), {
    redirect: "error",
    headers: { Accept: "application/json" },
  });
  if (!healthResponse.ok) {
    throw new Error(`Health endpoint returned HTTP ${healthResponse.status}`);
  }
  if (!healthResponse.headers.get("cache-control")?.includes("no-store")) {
    errors.push("health endpoint must be served with Cache-Control: no-store");
  }

  let healthPayload;
  try {
    healthPayload = await healthResponse.json();
  } catch {
    throw new Error("Health endpoint did not return valid JSON");
  }
  errors.push(
    ...validateHealthPayload(healthPayload, {
      tier,
      version: packageJson.version,
      revision: expectedRevision,
    }),
  );

  const rootResponse = await fetchImpl(url, { redirect: "error" });
  if (!rootResponse.ok) {
    throw new Error(`Hosted root returned HTTP ${rootResponse.status}`);
  }
  errors.push(...validateHostedHeaders(rootResponse.headers, tier));

  if (errors.length > 0) {
    throw new Error(
      `Hosted release verification failed:\n- ${errors.join("\n- ")}`,
    );
  }

  return {
    tier,
    version: packageJson.version,
    revision: expectedRevision,
    origin: url.origin,
  };
}

async function main() {
  const tier = process.argv[2];
  const baseUrl = process.env.MITHAQ_RELEASE_BASE_URL;
  const revision = process.env.MITHAQ_EXPECTED_REVISION;

  if (!baseUrl) throw new Error("MITHAQ_RELEASE_BASE_URL is required");

  const result = await verifyHostedRelease({ baseUrl, tier, revision });
  console.log(
    `Hosted Mithaq ${result.tier} release verified: v${result.version} ${result.revision} at ${result.origin}`,
  );
}

const invokedPath = process.argv[1]
  ? new URL(`file://${process.argv[1]}`).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
