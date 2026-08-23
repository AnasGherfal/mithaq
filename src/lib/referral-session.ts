const REFERRAL_SESSION_KEY = "mithaq_referral_session_id";
const REFERRAL_CODE_KEY = "mithaq_referral_code";

export function getOrCreateReferralSessionId() {
  if (typeof window === "undefined") return null;

  const existing = window.localStorage.getItem(REFERRAL_SESSION_KEY);
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;

  const sessionId = window.crypto.randomUUID();
  window.localStorage.setItem(REFERRAL_SESSION_KEY, sessionId);
  return sessionId;
}

export function rememberReferralCode(code: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REFERRAL_CODE_KEY, code);
}
