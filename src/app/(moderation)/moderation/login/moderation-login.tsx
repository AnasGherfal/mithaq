"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ModerationLogin() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const normalizedPhone = phone.trim();
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setMessage("Enter the staff phone number in international format, starting with +.");
      return;
    }

    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
      options: { shouldCreateUser: false },
    });
    setBusy(false);

    if (error) {
      setMessage("We couldn’t send a sign-in code for this staff account.");
      return;
    }

    setSent(true);
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const token = code.replace(/\D/g, "").slice(0, 6);
    if (token.length !== 6) {
      setMessage("Enter the 6-digit code.");
      return;
    }

    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token,
      type: "sms",
    });

    if (error) {
      setBusy(false);
      setMessage("That code could not be verified.");
      return;
    }

    const { data: access, error: accessError } = await supabase.rpc(
      "get_my_moderation_access",
    );
    if (accessError || !Array.isArray(access) || access.length === 0) {
      await supabase.auth.signOut({ scope: "local" });
      setBusy(false);
      setMessage("This account does not have moderation access.");
      return;
    }

    router.replace("/moderation");
    router.refresh();
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-7 shadow-sm">
        <div className="mb-7">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#9A6A24]">MITHAQ INTERNAL</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#12241F]">Moderation sign in</h1>
          <p className="mt-3 text-sm leading-6 text-black/60">
            This console is for explicitly authorized staff accounts only. Member accounts without a staff role are refused after sign-in.
          </p>
        </div>

        {!sent ? (
          <form className="space-y-4" onSubmit={sendCode}>
            <label className="block text-sm font-medium text-[#12241F]">
              Staff phone
              <input
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+218..."
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAF8] px-4 py-3 text-base outline-none ring-[#0F4D3F] focus:ring-2"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-[#0F4D3F] px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send staff code"}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={verifyCode}>
            <p className="rounded-2xl bg-[#EEF5F2] px-4 py-3 text-sm text-[#0F4D3F]">
              Code sent to {phone.trim()}.
            </p>
            <label className="block text-sm font-medium text-[#12241F]">
              6-digit code
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAF8] px-4 py-3 text-center text-2xl tracking-[0.35em] outline-none ring-[#0F4D3F] focus:ring-2"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-[#0F4D3F] px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Checking…" : "Open moderation console"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setSent(false);
                setCode("");
                setMessage(null);
              }}
              className="w-full px-4 py-2 text-sm font-medium text-black/55"
            >
              Use a different number
            </button>
          </form>
        )}

        {message ? (
          <p role="alert" className="mt-5 rounded-2xl bg-[#FFF1F1] px-4 py-3 text-sm text-[#8D2424]">
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
