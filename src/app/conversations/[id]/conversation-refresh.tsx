"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { markConversationRead } from "./actions";

export function ConversationRefresh({
  introductionId,
  lastMessageAt,
}: {
  introductionId: string;
  lastMessageAt: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    void markConversationRead(introductionId, lastMessageAt);

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [introductionId, lastMessageAt, router]);

  return null;
}
