import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { PhoneOtpForm } from "./phone-otp-form";

export const dynamic = "force-dynamic";

const trustPoints = [
  {
    title: "رقمك لتسجيل الدخول فقط",
    text: "لا نعرض رقم الهاتف في الاستكشاف أو المقدمات أو المحادثات.",
  },
  {
    title: "طلب قصير قبل أي تعارف",
    text: "نستخدم معلومات أساسية لفهم الجدية والتفضيلات قبل إرسال الدعوات.",
  },
  {
    title: "الدعوة لا تعني كشف بياناتك",
    text: "حتى بعد القبول تبقى المشاركة تدريجية، والمحادثة لا تفتح إلا بعد موافقة الطرفين.",
  },
];

export default async function JoinPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims?.sub) redirect("/waitlist");

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,.52),transparent_36%)] px-5 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3 font-black text-[#153d35]">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#153d35] text-lg text-white shadow-sm">م</span>
            <span>
              <span className="block text-lg leading-5">ميثاق</span>
              <span className="mt-1 block text-[10px] font-bold tracking-[.18em] text-black/35" dir="ltr">MITHAQ</span>
            </span>
          </Link>
          <div className="flex items-center gap-1 text-xs font-bold text-black/45">
            <Link className="rounded-xl px-3 py-2 hover:bg-white" href="/safety">الأمان</Link>
            <Link className="rounded-xl px-3 py-2 hover:bg-white" href="/privacy">الخصوصية</Link>
          </div>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.02fr_.98fr] lg:items-start lg:gap-14 lg:pt-10">
          <section className="lg:sticky lg:top-10">
            <div className="inline-flex rounded-full border border-[#c99a52]/30 bg-[#c99a52]/10 px-4 py-2 text-xs font-black text-[#805d27]">
              دخول خاص · للبالغين +18
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.22] tracking-tight text-[#153d35] sm:text-5xl">
              ابدأ بهدوء.
              <span className="block text-[#9d702d]">رقمك لا يصبح ملفك العام.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-black/58 sm:text-lg">
              نتحقق من رقم الهاتف أولاً، ثم نطلب منك استبياناً قصيراً لقائمة الانتظار. لا توجد ملفات عامة، ولا سحب يمين ويسار، ولا فتح للمحادثة قبل قبول واضح من الطرفين.
            </p>

            <div className="mt-8 space-y-3">
              {trustPoints.map((point, index) => (
                <div className="flex gap-4 rounded-3xl border border-black/7 bg-white/62 p-4 backdrop-blur" key={point.title}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#153d35] text-xs font-black text-white">{index + 1}</span>
                  <div>
                    <h2 className="text-sm font-black text-[#153d35]">{point.title}</h2>
                    <p className="mt-1 text-xs leading-6 text-black/48">{point.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-[#153d35]/12 bg-[#153d35]/5 p-5">
              <div className="text-xs font-black text-[#153d35]">ما الذي يحدث بعد التحقق؟</div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-black/48">
                <span className="rounded-full bg-white px-3 py-2">استبيان قائمة الانتظار</span>
                <span>←</span>
                <span className="rounded-full bg-white px-3 py-2">مراجعة الطلب</span>
                <span>←</span>
                <span className="rounded-full bg-white px-3 py-2">دعوة للعضوية</span>
              </div>
            </div>
          </section>

          <section className="rounded-[2.25rem] border border-black/7 bg-white/92 p-5 shadow-[0_30px_90px_rgba(31,48,42,.12)] sm:p-8">
            <div className="border-b border-black/7 pb-5">
              <p className="text-xs font-black text-[#9d702d]">الخطوة الأولى</p>
              <h2 className="mt-2 text-2xl font-black text-[#153d35]">تحقق من رقم هاتفك</h2>
              <p className="mt-2 text-sm leading-7 text-black/50">
                سيصلك رمز SMS لمرة واحدة. التحقق من الرقم لا يعني التحقق من الهوية الشخصية.
              </p>
            </div>

            <PhoneOtpForm />

            <div className="mt-6 border-t border-black/7 pt-5 text-xs leading-6 text-black/42">
              بالمتابعة، أنت تؤكد أنك تبلغ 18 سنة أو أكثر. الشروط وسياسة الخصوصية تُراجعان وتُقبلان صراحة قبل إرسال طلب قائمة الانتظار.
            </div>
          </section>
        </div>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-black/7 py-6 text-xs text-black/38">
          <span>© 2026 ميثاق</span>
          <Link className="font-bold hover:text-[#153d35]" href="/">العودة للموقع</Link>
        </footer>
      </div>
    </main>
  );
}
