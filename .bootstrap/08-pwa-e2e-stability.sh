#!/usr/bin/env bash
set -euo pipefail

cat > src/components/pwa/pwa-update-banner.tsx <<'EOF'
"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function PwaUpdateBanner() {
  const t = useTranslations("PwaUpdate");
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const shouldReload = useRef(false);
  const hasReloaded = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;
    let installingWorker: ServiceWorker | null = null;

    const handleControllerChange = () => {
      // The first service-worker installation can fire controllerchange.
      // Reload only after the user explicitly activates a waiting update.
      if (!shouldReload.current || hasReloaded.current) {
        return;
      }

      hasReloaded.current = true;
      window.location.reload();
    };

    const handleWorkerStateChange = () => {
      if (
        installingWorker?.state === "installed" &&
        navigator.serviceWorker.controller
      ) {
        setWaitingWorker(registration?.waiting ?? installingWorker);
        setDismissed(false);
      }
    };

    const handleUpdateFound = () => {
      installingWorker = registration?.installing ?? null;
      installingWorker?.addEventListener("statechange", handleWorkerStateChange);
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );

    void navigator.serviceWorker.ready.then((readyRegistration) => {
      registration = readyRegistration;

      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
      }

      registration.addEventListener("updatefound", handleUpdateFound);
      void registration.update();
    });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
      registration?.removeEventListener("updatefound", handleUpdateFound);
      installingWorker?.removeEventListener(
        "statechange",
        handleWorkerStateChange
      );
    };
  }, []);

  if (!waitingWorker || dismissed) {
    return null;
  }

  return (
    <Alert
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl shadow-xl"
      aria-live="polite"
    >
      <RefreshCw aria-hidden="true" />
      <AlertTitle>{t("title")}</AlertTitle>
      <AlertDescription>
        <span>{t("body")}</span>
        <span className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              shouldReload.current = true;
              waitingWorker.postMessage({ type: "SKIP_WAITING" });
            }}
          >
            {t("action")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
          >
            {t("dismiss")}
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}
EOF

python3 <<'PY'
from pathlib import Path

path = Path("tests/e2e/foundation.spec.ts")
content = path.read_text(encoding="utf-8")
old = '''    await page.goto(locale.path);
    const results = await new AxeBuilder({ page })
'''
new = '''    await page.goto(locale.path, { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      locale.language
    );
    await page.waitForFunction(() => document.readyState === "complete");

    const results = await new AxeBuilder({ page })
'''
if old not in content:
    raise SystemExit("Accessibility test target was not found")
path.write_text(content.replace(old, new, 1), encoding="utf-8")
PY
