import { getReleaseMetadata } from "@/lib/release-metadata";

type ServerErrorInput = {
  error: Error & { digest?: string };
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
      name: safeCode(input.error.name, "Error", 80),
      digest: safeCode(input.error.digest, "unknown", 120),
    },
  } as const;
}

export function recordServerError(input: ServerErrorInput) {
  console.error(JSON.stringify(buildServerErrorObservation(input)));
}
