"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { getOrCreateReferralSessionId } from "@/lib/referral-session";
import { createClient } from "@/lib/supabase/client";

function toLatinDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function normalizePhone(value: string) {
  let phone = toLatinDigits(value).replace(/[\s()-]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (phone.startsWith("218")) phone = `+${phone}`;
  if (phone.startsWith("0")) phone = `+218${phone.slice(1)}`;
  return phone;
}

export function PhoneOtpForm() {
  const router = useRouter();
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!ageConfirmed) {
      setError("يجب تأكيد أن عمرك 18 سنة أو أكثر.");
      return;
    }

    const phone = normalizePhone(phoneInput);
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      setError("اكتب رقم هاتف صحيحاً مع مفتاح الدولة. الرقم الليبي المحلي مثل 091... مقبول أيضاً.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const referralSessionId = getOrCreateReferralSessionId();

    if (referralSessionId) {
      await supabase.rpc("record_referral_milestone", {
        p_event_type: "started",
        p_session_id: referralSessionId,
      });
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);

    if (otpError) {
      setError("تعذر إرسال رمز التحقق الآن. تأكد من الرقم وحاول مرة أخرى.");
      return;
    }

    setVerifiedPhone(phone);
    setStage("otp");
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const token = toLatinDigits(otp).replace(/\D/g, "");
    if (!/^\d{6}$/.test(token)) {
      setError("رمز التحقق يتكون من 6 أرقام.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: verifiedPhone,
      token,
      type: "sms",
    });

    if (verifyError || !data.session) {
      setBusy(false);
      setError("الرمز غير صحيح أو انتهت صلاحيته. حاول مرة أخرى.");
      return;
    }

    const referralSessionId = getOrCreateReferralSessionId();
    if (referralSessionId) {
      await supabase.rpc("record_referral_milestone", {
        p_event_type: "phone_verified",
        p_session_id: referralSessionId,
      });
    }

    router.replace("/waitlist");
    router.refresh();
  }

  if (stage === "otp") {
    return (
      <form className="mt-7 space-y-5" onSubmit={verifyOtp}>
        <div className="rounded-2xl bg-[#153d35]/6 px-4 py-3 text-sm leading-6 text-[#153d35]">
          أرسلنا رمزاً إلى <span dir="ltr" className="font-bold">{verifiedPhone}</span>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-bold">رمز التحقق</span>
          <input
            autoComplete="one-time-code"
            autoFocus
            className="focus-ring w-full rounded-2xl border border-black/12 bg-white px-4 py-4 text-center text-2xl font-black tracking-[.35em]"
            dir="ltr"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setOtp(event.target.value)}
            placeholder="000000"
            value={otp}
          />
        </label>
        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
        <button
          className="focus-ring w-full rounded-2xl bg-[#153d35] px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-55"
          disabled={busy}
          type="submit"
        >
          {busy ? "جاري التحقق..." : "تأكيد ومتابعة"}
        </button>
        <button
          className="focus-ring w-full rounded-xl px-4 py-2 text-sm font-bold text-black/50 hover:text-[#153d35]"
          onClick={() => {
            setStage("phone");
            setOtp("");
            setError(null);
          }}
          type="button"
        >
          تغيير رقم الهاتف
        </button>
      </form>
    );
  }

  return (
    <form className="mt-7 space-y-5" onSubmit={sendOtp}>
      <label className="block">
        <span className="mb-2 block text-sm font-bold">رقم الهاتف</span>
        <input
          autoComplete="tel"
          className="focus-ring w-full rounded-2xl border border-black/12 bg-white px-4 py-4 text-left text-lg"
          dir="ltr"
          inputMode="tel"
          onChange={(event) => setPhoneInput(event.target.value)}
          placeholder="+218 91 000 0000"
          value={phoneInput}
        />
        <span className="mt-2 block text-xs leading-5 text-black/42">
          للرقم غير الليبي اكتب مفتاح الدولة، مثل +44 أو +1.
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/8 bg-[#f8f5ef] p-4">
        <input
          checked={ageConfirmed}
          className="mt-1 size-4 accent-[#153d35]"
          onChange={(event) => setAgeConfirmed(event.target.checked)}
          type="checkbox"
        />
        <span className="text-sm font-bold leading-6 text-black/65">أؤكد أن عمري 18 سنة أو أكثر.</span>
      </label>

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

      <button
        className="focus-ring w-full rounded-2xl bg-[#153d35] px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-55"
        disabled={busy}
        type="submit"
      >
        {busy ? "جاري الإرسال..." : "أرسل رمز التحقق"}
      </button>
    </form>
  );
}
