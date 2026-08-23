import Link from "next/link";

import { ReferralTracker } from "@/components/referral-tracker";

const principles = [
  {
    title: "نية واضحة",
    text: "ميثاق مصمم للتعارف الجاد بغرض الزواج، وليس للمواعدة العابرة.",
  },
  {
    title: "خصوصية من البداية",
    text: "لا نحتاج أن تكون صورك أو تفاصيلك الشخصية معروضة للعامة حتى تتعرف بجدية.",
  },
  {
    title: "القبول قبل التواصل",
    text: "المرحلة القادمة مبنية على تعارف مضبوط واهتمام متبادل قبل فتح المحادثة.",
  },
  {
    title: "أمان واحترام",
    text: "الحظر والإبلاغ ومراجعة الحسابات جزء من تصميم المنتج، وليس إضافة لاحقة.",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <main className="min-h-screen">
      <ReferralTracker code={ref} />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-[#153d35] text-xl font-bold text-white shadow-sm">
            م
          </div>
          <div>
            <div className="text-xl font-bold text-[#153d35]">ميثاق</div>
            <div className="text-xs text-black/50">Mithaq</div>
          </div>
        </div>
        <Link
          className="focus-ring rounded-full border border-[#153d35]/15 bg-white/70 px-4 py-2 text-sm font-bold text-[#153d35] backdrop-blur hover:bg-white"
          href="/join"
        >
          انضم لقائمة الانتظار
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:pb-24 lg:pt-20">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-[#c99a52]/35 bg-[#c99a52]/10 px-4 py-2 text-sm font-bold text-[#735322]">
            للبالغين +18 · داخل ليبيا وخارجها
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.25] tracking-tight text-[#153d35] sm:text-5xl lg:text-6xl">
            تعارف محترم وواضح
            <span className="block text-[#9d702d]">للزواج الجاد.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-black/65 sm:text-xl">
            ميثاق مساحة خاصة لليبيين الباحثين عن شريك حياة. نبدأ بقائمة انتظار قصيرة تساعدنا على بناء مجتمع متوازن قبل فتح التعارف.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="focus-ring inline-flex min-h-13 items-center justify-center rounded-2xl bg-[#153d35] px-7 py-3 font-bold text-white shadow-[0_14px_35px_rgba(21,61,53,.22)] transition hover:bg-[#0f2c27]"
              href="/join"
            >
              سجل اهتمامك
            </Link>
            <a
              className="focus-ring inline-flex min-h-13 items-center justify-center rounded-2xl border border-black/10 bg-white/70 px-7 py-3 font-bold text-black/65 hover:bg-white"
              href="#how"
            >
              كيف سيعمل ميثاق؟
            </a>
          </div>
          <p className="mt-4 text-sm leading-6 text-black/45">
            التسجيل في قائمة الانتظار لا يضمن القبول ولا يعني أن خدمة التعارف فتحت بعد.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-[#c99a52]/12 blur-2xl" />
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_28px_80px_rgba(38,42,37,.12)] backdrop-blur sm:p-7">
            <div className="rounded-[1.5rem] bg-[#153d35] p-6 text-white">
              <div className="text-sm text-white/60">الفكرة ببساطة</div>
              <div className="mt-2 text-2xl font-black">خصوصيتك قبل الفضول.</div>
              <p className="mt-3 text-sm leading-7 text-white/70">
                نريد أن تكون المعلومات التي تظهر في كل مرحلة هي المعلومات الضرورية فقط لاتخاذ قرار محترم.
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {[
                "رقم الهاتف لتسجيل الدخول والتحقق",
                "أسئلة أساسية عن نيتك وتفضيلاتك",
                "خيارات واضحة لخصوصية الصور ودور العائلة",
              ].map((item, index) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-black/7 bg-white px-4 py-4">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#c99a52]/15 text-xs font-black text-[#8b6228]">
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold leading-6 text-black/65">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="border-y border-black/7 bg-white/55">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-black text-[#9d702d]">مبادئ المنتج</p>
            <h2 className="mt-2 text-3xl font-black text-[#153d35]">تعارف أقل ضجيجاً، وأكثر قصداً.</h2>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((principle) => (
              <article key={principle.title} className="rounded-3xl border border-black/7 bg-white p-5 shadow-sm">
                <div className="mb-4 size-2 rounded-full bg-[#c99a52]" />
                <h3 className="font-black text-[#153d35]">{principle.title}</h3>
                <p className="mt-2 text-sm leading-7 text-black/58">{principle.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-5 py-16 text-center sm:px-8 lg:py-24">
        <h2 className="text-3xl font-black text-[#153d35]">نبدأ بمجتمع صغير ومدروس.</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-8 text-black/60">
          سجل الآن في قائمة الانتظار. عندما تصبح المرحلة المناسبة جاهزة، تكون معلوماتك وتفضيلاتك الأساسية محفوظة بصورة منظمة وآمنة.
        </p>
        <Link
          className="focus-ring mt-7 inline-flex min-h-13 items-center justify-center rounded-2xl bg-[#153d35] px-8 py-3 font-bold text-white hover:bg-[#0f2c27]"
          href="/join"
        >
          ابدأ التسجيل
        </Link>
      </section>

      <footer className="border-t border-black/7 px-5 py-8 text-center text-xs leading-6 text-black/45">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <span>© 2026 ميثاق</span>
          <Link href="/privacy" className="hover:text-[#153d35]">الخصوصية</Link>
          <Link href="/terms" className="hover:text-[#153d35]">الشروط</Link>
        </div>
      </footer>
    </main>
  );
}
