"use client";

import { useState } from "react";

import { sendConversationMessage } from "./actions";

function createNonce() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replaceAll("-", "");
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

export function MessageComposer({ introductionId }: { introductionId: string }) {
  const [nonce] = useState(createNonce);

  return (
    <form action={sendConversationMessage} className="rounded-3xl border border-black/8 bg-white p-4 shadow-sm">
      <input name="introduction_id" type="hidden" value={introductionId} />
      <input name="client_nonce" type="hidden" value={nonce} />
      <label className="text-xs font-black text-[#153d35]" htmlFor="conversation-message">
        رسالة جديدة
      </label>
      <textarea
        className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-black/10 bg-[#fbfaf7] px-4 py-3 text-sm leading-7 outline-none focus:border-[#153d35]/35"
        id="conversation-message"
        maxLength={2000}
        name="body"
        placeholder="اكتب رسالتك باحترام ووضوح..."
        required
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] leading-5 text-black/42">نص فقط في هذه المرحلة · الحد الأقصى 2000 حرف</p>
        <button className="rounded-xl bg-[#153d35] px-5 py-3 text-sm font-black text-white" type="submit">
          إرسال
        </button>
      </div>
    </form>
  );
}
