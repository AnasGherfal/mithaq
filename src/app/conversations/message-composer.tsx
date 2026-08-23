"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { sendConversationMessage } from "./actions";

function SubmitButton({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="rounded-xl bg-[#153d35] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!ready || pending}
      type="submit"
    >
      {pending ? "جارٍ الإرسال..." : "إرسال"}
    </button>
  );
}

export function MessageComposer({ introductionId }: { introductionId: string }) {
  const [nonce, setNonce] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    setNonce(crypto.randomUUID());
  }, []);

  return (
    <form action={sendConversationMessage} className="border-t border-black/7 bg-white p-4 sm:p-5">
      <input name="introduction_id" type="hidden" value={introductionId} />
      <input name="client_nonce" type="hidden" value={nonce} />
      <label className="block">
        <span className="sr-only">اكتب رسالة</span>
        <textarea
          className="focus-ring min-h-24 w-full resize-y rounded-2xl border border-black/10 bg-[#faf9f6] px-4 py-3 text-sm leading-7"
          maxLength={2000}
          name="body"
          onChange={(event) => setBody(event.target.value)}
          placeholder="اكتب رسالة محترمة وواضحة..."
          required
          value={body}
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] font-bold text-black/35">
          {body.length.toLocaleString("ar-LY")} / 2,000 · لا تشارك معلومات حساسة قبل أن تكون مرتاحاً لذلك.
        </div>
        <SubmitButton ready={nonce.length >= 16 && body.trim().length > 0} />
      </div>
    </form>
  );
}
