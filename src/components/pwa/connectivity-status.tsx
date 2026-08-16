"use client";

import { useSyncExternalStore } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function subscribeToConnectivity(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);

  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function getConnectivitySnapshot() {
  return navigator.onLine;
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribeToConnectivity,
    getConnectivitySnapshot,
    () => true,
  );
}

export function ConnectivityStatus() {
  const t = useTranslations("Connectivity");
  const isOnline = useOnlineStatus();
  const Icon = isOnline ? Wifi : WifiOff;

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        data-testid="connectivity-status"
        data-state={isOnline ? "online" : "offline"}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
          isOnline
            ? "border-primary/20 bg-primary/5 text-primary"
            : "border-destructive/25 bg-destructive/5 text-destructive",
        )}
      >
        <Icon aria-hidden="true" />
        <span>{isOnline ? t("online") : t("offline")}</span>
      </div>

      {!isOnline && (
        <Alert
          variant="destructive"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl shadow-xl"
        >
          <WifiOff aria-hidden="true" />
          <AlertTitle>{t("offline")}</AlertTitle>
          <AlertDescription>{t("offlineDetail")}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
