"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const referralCodeSchema = z.string().regex(/^[A-Z0-9]{8,16}$/);
const referralEventSchema = z.enum(["started", "phone_verified", "submitted"]);
const referralSessionSchema = z.string().uuid();

const REFERRAL_SESSION_COOKIE = "mithaq_referral_session";

export async function captureReferral(code: string) {
  const parsedCode = referralCodeSchema.safeParse(code.toUpperCase());
  if (!parsedCode.success) return false;

  const cookieStore = await cookies();
  const existingSession = referralSessionSchema.safeParse(
    cookieStore.get(REFERRAL_SESSION_COOKIE)?.value,
  );
  const sessionId = existingSession.success
    ? existingSession.data
    : randomUUID();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("record_referral_open", {
    p_code: parsedCode.data,
    p_session_id: sessionId,
  });

  if (error || data !== true) return false;

  cookieStore.set(REFERRAL_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.APP_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return true;
}

export async function recordReferralMilestone(
  eventType: "started" | "phone_verified" | "submitted",
) {
  const parsedEvent = referralEventSchema.safeParse(eventType);
  if (!parsedEvent.success) return false;

  const cookieStore = await cookies();
  const parsedSession = referralSessionSchema.safeParse(
    cookieStore.get(REFERRAL_SESSION_COOKIE)?.value,
  );

  if (!parsedSession.success) return false;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("record_referral_milestone", {
    p_session_id: parsedSession.data,
    p_event_type: parsedEvent.data,
  });

  if (error) return false;

  if (parsedEvent.data === "submitted") {
    cookieStore.delete(REFERRAL_SESSION_COOKIE);
  }

  return data === true;
}
