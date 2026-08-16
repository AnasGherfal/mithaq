#!/usr/bin/env bash
set -euo pipefail

mkdir -p src/components/ui src/components/layout src/components/pwa
cat > src/components/ui/button.tsx <<'EOF'
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90",
        outline:
          "border border-border bg-background text-foreground shadow-xs hover:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-12 px-5 py-2",
        sm: "h-11 rounded-xl px-4",
        lg: "h-[3.25rem] rounded-xl px-7 text-base",
        icon: "size-11"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
EOF
cat > src/components/ui/card.tsx <<'EOF'
import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-6 rounded-2xl border border-border bg-card py-6 text-card-foreground shadow-[0_16px_45px_-36px_rgba(15,77,63,0.45)]",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("grid gap-2 px-6", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-lg font-semibold leading-snug", className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm leading-7 text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
};
EOF
cat > src/components/ui/input.tsx <<'EOF'
import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-xl border border-input bg-background px-4 py-2 text-base text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  );
}

export { Input };
EOF
cat > src/components/ui/label.tsx <<'EOF'
"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Label };
EOF
cat > src/components/ui/alert.tsx <<'EOF'
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded-2xl border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        destructive:
          "border-destructive/35 bg-destructive/5 text-destructive [&>svg]:text-current"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 font-semibold leading-5", className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm leading-6 text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
EOF
cat > src/components/ui/separator.tsx <<'EOF'
"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  );
}

export { Separator };
EOF
cat > src/components/ui/sonner.tsx <<'EOF'
"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-border bg-card text-card-foreground shadow-lg",
          description: "text-muted-foreground"
        }
      }}
      {...props}
    />
  );
}

export { Toaster };
EOF
cat > src/components/layout/locale-switcher.tsx <<'EOF'
"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locale";
import {
  getDirection,
  getOppositeLocale,
  switchLocaleInPath
} from "@/i18n/locale";

type LocaleSwitcherProps = {
  locale: Locale;
  label: string;
  shortLabel: string;
};

export function LocaleSwitcher({
  locale,
  label,
  shortLabel
}: LocaleSwitcherProps) {
  const pathname = usePathname();
  const targetLocale = getOppositeLocale(locale);
  const targetPath = switchLocaleInPath(pathname, targetLocale);

  return (
    <Button asChild variant="outline" size="sm">
      <a
        href={targetPath}
        hrefLang={targetLocale}
        lang={targetLocale}
        dir={getDirection(targetLocale)}
        aria-label={label}
      >
        {shortLabel}
      </a>
    </Button>
  );
}
EOF
cat > src/components/pwa/connectivity-status.tsx <<'EOF'
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
    () => true
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
            : "border-destructive/25 bg-destructive/5 text-destructive"
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
EOF
cat > src/components/pwa/pwa-provider.tsx <<'EOF'
"use client";

import type { ReactNode } from "react";
import { SerwistProvider } from "@serwist/turbopack/react";

export function PwaProvider({ children }: { children: ReactNode }) {
  return <SerwistProvider swUrl="/serwist/sw.js">{children}</SerwistProvider>;
}
EOF
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
  const isReloading = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;
    let installingWorker: ServiceWorker | null = null;

    const handleControllerChange = () => {
      if (isReloading.current) {
        return;
      }

      isReloading.current = true;
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
            onClick={() =>
              waitingWorker.postMessage({ type: "SKIP_WAITING" })
            }
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
