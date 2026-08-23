"use client";

import { useEffect } from "react";

import { getOrCreateReferralSessionId, rememberReferralCode } from "@/lib/referral-session";
import { createClient } from "@/lib/supabase/client";

export function ReferralTracker({ code }: { code?: string }) {
  useEffect(() => {
    const normalized = code?.trim().toUpperCase();
    if (!normalized || !/^[A-Z0-9]{8,16}$/.test(normalized)) return;

    const sessionId = getOrCreateReferralSessionId();
    if (!sessionId) return;

    rememberReferralCode(normalized);
    const supabase = createClient();
    void supabase.rpc("record_referral_open", {
      p_code: normalized,
      p_session_id: sessionId,
    });
  }, [code]);

  return null;
}
