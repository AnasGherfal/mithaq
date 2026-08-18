import { getReleaseMetadata } from "@/lib/release-metadata";

type ServerErrorInput = {
  error: unknown;
  method: string;
  routePath: string;
  routeType: string;
  routerKind: string;
};

function safeCode(value: string | undefined, fallback: string, maxLength = 80) {
  const normalized = value?.trim();
  if (!normalized || !/^[A-Za-z0-9_./()[\]-]+$/.test(normalized)) {
    return fallback;
  }

  return normalized.slice(0, maxLength);
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : undefined;
}

function errorDigest(error: unknown) {
  if (typeof error !== "object" || error === null) return undefined;

  try {
    const digest = Reflect.get(error, "digest");
    return typeof digest === "string" ? digest : undefined;
  } catch {
    return undefined;
  }
}

export function buildServerErrorObservation(input: ServerErrorInput) {
  return {
    event: "server_request_error",
    severity: "error",
    release: getReleaseMetadata(),
    request: {
      method: safeCode(input.method.toUpperCase(), "UNKNOWN", 12),
      route: safeCode(input.routePath, "unknown", 160),
      routeType: safeCode(input.routeType, "unknown", 40),
      routerKind: safeCode(input.routerKind, "unknown", 40),
    },
    error: {
      name: safeCode(errorName(input.error), "Error", 80),
      digest: safeCode(errorDigest(input.error), "unknown", 120),
    },
  } as const;
}

export function recordServerError(input: ServerErrorInput) {
  console.error(JSON.stringify(buildServerErrorObservation(input)));
}
