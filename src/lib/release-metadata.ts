const releaseTiers = ["local", "preview", "staging", "production"] as const;

type ReleaseTier = (typeof releaseTiers)[number] | "unknown";

type ReleaseMetadataInput = {
  version?: string;
  tier?: string;
  revision?: string;
};

function normalizeTier(value: string | undefined): ReleaseTier {
  if (releaseTiers.some((tier) => tier === value)) {
    return value as (typeof releaseTiers)[number];
  }

  return "unknown";
}

export function sanitizeReleaseRevision(value: string | undefined) {
  const revision = value?.trim();
  if (!revision || !/^[0-9a-f]{7,64}$/i.test(revision)) {
    return "unknown";
  }

  return revision.slice(0, 12).toLowerCase();
}

export function getReleaseMetadata(input: ReleaseMetadataInput = {}) {
  const revision =
    input.revision ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.CF_PAGES_COMMIT_SHA;

  return {
    version: input.version ?? process.env.MITHAQ_RELEASE_VERSION ?? "unknown",
    tier: normalizeTier(input.tier ?? process.env.APP_ENV),
    revision: sanitizeReleaseRevision(revision),
  } as const;
}
