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
      setError("تعذر إرسال رمز التحقق الآن. تأكد من الرقم وحاول مرة أخرى بعد قليل.");
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
      setError("الرمز غير صحيح أو انتهت صلاحيته. تأكد منه وحاول مرة أخرى.");
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
      <form className="mt-6 space-y-5" onSubmit={verifyOtp}>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-black">
          <div className="rounded-xl bg-green-50 px-3 py-2 text-center text-green-800">✓ الرقم</div>
          <div className="rounded-xl bg-[#153d35] px-3 py-2 text-center text-white">2 · الرمز</div>
        </div>

        <div className="rounded-2xl border border-[#153d35]/10 bg-[#153d35]/5 px-4 py-4 text-sm leading-7 text-[#153d35]">
          أرسلنا رمزاً من 6 أرقام إلى
          <span dir="ltr" className="mr-1 font-black">{verifiedPhone}</span>
          <span className="mt-1 block text-xs font-bold text-black/40">قد يستغرق وصول الرسالة لحظات حسب شركة الاتصالات.</span>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-[#153d35]">رمز التحقق</span>
          <input
            aria-label="رمز التحقق المكون من 6 أرقام"
            autoComplete="one-time-code"
            autoFocus
            className="focus-ring w-full rounded-2xl border border-black/12 bg-white px-4 py-4 text-center text-2xl font-black tracking-[.35em] shadow-inner shadow-black/[.02]"
            dir="ltr"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setOtp(event.target.value)}
            placeholder="000000"
            value={otp}
          />
        </label>

        {error ? (
          <p aria-live="polite" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
            {error}
          </p>
        ) : null}

        <button
          className="focus-ring w-full rounded-2xl bg-[#153d35] px-5 py-4 font-black text-white shadow-[0_12px_30px_rgba(21,61,53,.18)] transition hover:bg-[#0f2c27] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={busy}
          type="submit"
        >
          {busy ? "جاري التحقق..." : "تحقق وافتح الاستبيان"}
        </button>

        <button
          className="focus-ring w-full rounded-xl px-4 py-2 text-sm font-black text-black/45 hover:bg-black/[.025] hover:text-[#153d35]"
          onClick={() => {
            setStage("phone");
            setOtp("");
            setError(null);
          }}
          type="button"
        >
          الرقم غير صحيح؟ غيّره
        </button>

        <p className="text-center text-[11px] leading-5 text-black/35">
          التحقق من امتلاك رقم الهاتف هو خطوة تسجيل دخول، وليس علامة تحقق هوية داخل ميثاق.
        </p>
      </form>
    );
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={sendOtp}>
      <div className="grid grid-cols-2 gap-2 text-[11px] font-black">
        <div className="rounded-xl bg-[#153d35] px-3 py-2 text-center text-white">1 · الرقم</div>
        <div className="rounded-xl bg-black/[.035] px-3 py-2 text-center text-black/35">2 · الرمز</div>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-black text-[#153d35]">رقم الهاتف</span>
        <div className="relative">
          <input
            autoComplete="tel"
            className="focus-ring w-full rounded-2xl border border-black/12 bg-white px-4 py-4 text-left text-lg font-bold shadow-inner shadow-black/[.02]"
            dir="ltr"
            inputMode="tel"
            onChange={(event) => setPhoneInput(event.target.value)}
            placeholder="+218 91 000 0000"
            value={phoneInput}
          />
        </div>
        <span className="mt-2 block text-xs leading-5 text-black/42">
          الرقم الليبي المحلي مثل 091... مقبول. للأرقام الأخرى استخدم مفتاح الدولة مثل +44 أو +1.
        </span>
      </label>

      <div className="rounded-2xl border border-black/7 bg-[#f8f5ef] p-4">
        <div className="text-xs font-black text-[#153d35]">خصوصية الرقم</div>
        <p className="mt-1 text-xs leading-6 text-black/48">
          نستخدمه للمصادقة وأمان الحساب. لا يظهر في ملفك ولا يرسله ميثاق تلقائياً لأي عضو آخر.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/8 bg-white p-4 transition has-[:checked]:border-[#153d35]/25 has-[:checked]:bg-[#153d35]/[.035]">
        <input
          checked={ageConfirmed}
          className="mt-1 size-4 accent-[#153d35]"
          onChange={(event) => setAgeConfirmed(event.target.checked)}
          type="checkbox"
        />
        <span>
          <span className="block text-sm font-black leading-6 text-black/68">أؤكد أن عمري 18 سنة أو أكثر.</span>
          <span className="mt-1 block text-xs leading-5 text-black/38">ميثاق غير مخصص للقاصرين.</span>
        </span>
      </label>

      {error ? (
        <p aria-live="polite" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
          {error}
        </p>
      ) : null}

      <button
        className="focus-ring w-full rounded-2xl bg-[#153d35] px-5 py-4 font-black text-white shadow-[0_12px_30px_rgba(21,61,53,.18)] transition hover:bg-[#0f2c27] disabled:cursor-not-allowed disabled:opacity-55"
        disabled={busy}
        type="submit"
      >
        {busy ? "جاري إرسال الرمز..." : "أرسل رمز التحقق"}
      </button>

      <p className="text-center text-[11px] leading-5 text-black/35">
        لا ترسل الرمز لأي شخص. فريق ميثاق لن يطلب منك رمز تسجيل الدخول في رسالة أو مكالمة.
      </p>
    </form>
  );
}
