import type { Instrumentation } from "next";
import { recordServerError } from "@/lib/operational-log";

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  recordServerError({
    error,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
  });
};
