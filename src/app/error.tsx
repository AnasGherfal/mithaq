"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook point for an error reporter (e.g. Sentry). Never log personal data here.
    console.error("route_error", { digest: error.digest });
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section
        className="w-full max-w-md rounded-[2rem] border border-black/7 bg-white/90 p-8 text-center shadow-[0_25px_70px_rgba(35,43,38,.1)]"
        role="alert"
      >
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-50 text-2xl text-amber-700">!</div>
        <h1 className="mt-6 text-2xl font-black text-[#153d35]">حدث خطأ غير متوقع</h1>
        <p className="mt-3 text-sm leading-7 text-black/55">
          لم يتأثر حسابك ولا بياناتك. حاول مرة أخرى، وإذا استمرت المشكلة عد بعد قليل.
        </p>
        {error.digest ? (
          <p className="mt-3 text-[11px] text-black/35" dir="ltr">
            ref: {error.digest}
          </p>
        ) : null}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            className="focus-ring min-h-12 rounded-2xl bg-[#153d35] px-7 py-3 font-bold text-white hover:bg-[#0f2c27]"
            onClick={() => reset()}
            type="button"
          >
            إعادة المحاولة
          </button>
          <Link
            className="focus-ring inline-flex min-h-12 items-center justify-center rounded-2xl border border-black/10 px-7 py-3 font-bold text-[#153d35] hover:bg-white"
            href="/"
          >
            الرئيسية
          </Link>
        </div>
      </section>
    </main>
  );
}
