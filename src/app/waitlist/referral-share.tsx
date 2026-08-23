"use client";

import { useEffect, useState } from "react";

export function ReferralShare({ code }: { code: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = origin ? `${origin}/?ref=${code}` : `/?ref=${code}`;

  async function share() {
    const shareData = {
      title: "ميثاق",
      text: "لو تبحث عن تعارف جاد بغرض الزواج، هذه قائمة انتظار ميثاق.",
      url,
    };

    if (navigator.share) {
      await navigator.share(shareData).catch(() => undefined);
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mt-5 rounded-2xl border border-[#c99a52]/25 bg-[#c99a52]/8 p-4">
      <div className="text-xs font-bold text-black/45">رمز دعوتك</div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <code className="text-lg font-black tracking-wider text-[#153d35]">{code}</code>
        <button className="focus-ring rounded-xl bg-[#153d35] px-4 py-2 text-sm font-black text-white" onClick={share} type="button">
          {copied ? "تم النسخ" : "مشاركة"}
        </button>
      </div>
    </div>
  );
}
