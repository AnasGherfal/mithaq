import Link from "next/link";

import { ReferralTracker } from "@/components/referral-tracker";

const journey = [
  {
    number: "01",
    title: "طلب انضمام قصير",
    text: "نبدأ بأسئلة أساسية عن الجدية والتفضيلات حتى نحافظ على مجتمع صغير ومدروس.",
  },
  {
    number: "02",
    title: "ملف خاص بعد الدعوة",
    text: "تختار ما يظهر عنك، وكيف تظهر صورك، وما إذا كنت تريد إشراك العائلة لاحقاً.",
  },
  {
    number: "03",
    title: "اهتمام متبادل ثم مقدمة",
    text: "لا يفتح التواصل بمجرد الاهتمام. كل طرف يحتاج أن يقبل المقدمة بشكل صريح ومستقل.",
  },
  {
    number: "04",
    title: "محادثة داخل ميثاق",
    text: "بعد موافقة الطرفين فقط، تفتح محادثة خاصة داخل ميثاق بدون مشاركة رقم الهاتف تلقائياً.",
  },
];

const privacyControls = [
  {
    title: "رقمك ليس بطاقة تعريف",
    text: "رقم الهاتف يستخدم للدخول والتحقق من الحساب، ولا يظهر للطرف الآخر في الاستكشاف أو المقدمة.",
  },
  {
    title: "الصور بشروطك",
    text: "ظهور الصور مرتبط بإعداداتك وموافقتك، وليس لأن شخصاً آخر طلب رؤيتها.",
  },
  {
    title: "لا محادثة قبل القبول",
    text: "الاهتمام المتبادل ينشئ مقدمة فقط. المحادثة تحتاج موافقة جديدة وصريحة من الطرفين.",
  },
  {
    title: "السلامة جزء من المسار",
    text: "الحظر والإخفاء والإبلاغ ومراجعة المحتوى موجودة داخل تصميم المنتج من البداية.",
  },
];

const faqs = [
  {
    q: "هل ميثاق تطبيق مواعدة؟",
    a: "لا. ميثاق مصمم للتعارف الجاد بغرض الزواج، مع مراحل قبول واضحة وحدود أقوى للخصوصية والتواصل.",
  },
  {
    q: "هل سيرى الآخرون رقم هاتفي؟",
    a: "لا نعرض رقم الهاتف في الاستكشاف أو المقدمات أو المحادثة. مشاركة أي وسيلة اتصال خارجية تبقى قراراً منك.",
  },
  {
    q: "هل الصور إجبارية أو عامة؟",
    a: "الصور خاصة، وظهورها يتبع إعداد الخصوصية الذي تختاره. لا يوجد معرض عام للصور أو دليل مفتوح للأعضاء.",
  },
  {
    q: "متى يمكن بدء المحادثة؟",
    a: "بعد اهتمام متبادل تنشأ مقدمة محدودة. لا تفتح المحادثة إلا إذا وافق الطرفان على المقدمة بشكل صريح.",
  },
  {
    q: "لماذا توجد قائمة انتظار؟",
    a: "نفتح العضوية على دفعات حتى نحافظ على جودة المجتمع والتوازن التشغيلي قبل التوسع.",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <main className="min-h-screen overflow-hidden bg-[#f8f5ef]">
      <ReferralTracker code={ref} />

      <header className="relative z-20 border-b border-black/[.055] bg-[#f8f5ef]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8">
          <Link className="inline-flex items-center gap-3" href="/">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#153d35] text-xl font-black text-white shadow-[0_10px_30px_rgba(21,61,53,.18)]">
              م
            </span>
            <span>
              <span className="block text-xl font-black tracking-tight text-[#153d35]">ميثاق</span>
              <span className="block text-[10px] font-bold tracking-[.18em] text-black/35" dir="ltr">MITHAQ</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 text-sm font-black text-black/50 lg:flex">
            <a className="rounded-xl px-3 py-2 hover:bg-white hover:text-[#153d35]" href="#how">كيف يعمل</a>
            <a className="rounded-xl px-3 py-2 hover:bg-white hover:text-[#153d35]" href="#privacy">الخصوصية</a>
            <Link className="rounded-xl px-3 py-2 hover:bg-white hover:text-[#153d35]" href="/safety">الأمان والثقة</Link>
            <a className="rounded-xl px-3 py-2 hover:bg-white hover:text-[#153d35]" href="#faq">الأسئلة</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link className="hidden rounded-xl px-3 py-2 text-xs font-black text-black/48 hover:bg-white sm:inline-flex" href="/join">
              لديك حساب؟
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#153d35] px-5 py-2.5 text-sm font-black text-white shadow-[0_12px_30px_rgba(21,61,53,.16)] transition hover:-translate-y-0.5 hover:bg-[#102f29]"
              href="/join"
            >
              طلب الانضمام
            </Link>
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[42rem] bg-[radial-gradient(circle_at_78%_18%,rgba(201,154,82,.18),transparent_30rem),radial-gradient(circle_at_10%_40%,rgba(21,61,53,.08),transparent_26rem)]" />
        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-28 lg:pt-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c99a52]/30 bg-white/70 px-4 py-2 text-xs font-black text-[#7c5925] shadow-sm backdrop-blur">
              <span className="size-1.5 rounded-full bg-[#c99a52]" />
              +18 · لليبيين في ليبيا والمهجر · عضوية بالدعوة
            </div>

            <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[1.18] tracking-[-.025em] text-[#153d35] sm:text-5xl lg:text-[4.25rem]">
              تعارف جاد للزواج،
              <span className="mt-2 block text-[#9d702d]">بدون أن تدفع خصوصيتك الثمن.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-9 text-black/58 sm:text-xl">
              ميثاق يبني التعارف على مراحل واضحة: توافق أساسي، اهتمام متبادل، مقدمة محدودة، ثم موافقة صريحة من الطرفين قبل أي محادثة.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#153d35] px-7 py-3 font-black text-white shadow-[0_18px_45px_rgba(21,61,53,.2)] transition hover:-translate-y-0.5 hover:bg-[#102f29]"
                href="/join"
              >
                انضم إلى قائمة الانتظار
              </Link>
              <a
                className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-black/9 bg-white/72 px-7 py-3 font-black text-black/58 shadow-sm backdrop-blur transition hover:bg-white hover:text-[#153d35]"
                href="#how"
              >
                شاهد رحلة التعارف
              </a>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-black/42">
              <span>✓ لا دليل عام للأعضاء</span>
              <span>✓ لا مشاركة تلقائية لرقم الهاتف</span>
              <span>✓ قبول الطرفين قبل المحادثة</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="absolute -inset-8 rounded-[3rem] bg-[#c99a52]/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.4rem] border border-white/80 bg-white/82 p-4 shadow-[0_35px_100px_rgba(31,43,38,.15)] backdrop-blur-xl sm:p-6">
              <div className="rounded-[1.9rem] bg-[#153d35] p-6 text-white sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black text-[#e1b870]">المبدأ الأساسي</p>
                    <h2 className="mt-2 text-2xl font-black">كل مرحلة تكشف ما تحتاجه فقط.</h2>
                  </div>
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-lg">م</span>
                </div>
                <p className="mt-4 max-w-md text-sm leading-7 text-white/65">
                  لا نبدأ بصورة ورقم هاتف. نبدأ بسؤال أبسط: هل يوجد توافق كافٍ يستحق مقدمة محترمة؟
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  ["الاستكشاف", "معلومات محدودة + توافق أساسي", "لا توجد محادثة"],
                  ["المقدمة", "ملف أوسع حسب الخصوصية", "قرار جديد من الطرفين"],
                  ["المحادثة", "بعد موافقة متبادلة فقط", "داخل ميثاق"],
                ].map(([title, detail, guard], index) => (
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-black/7 bg-[#fbfaf7] p-4" key={title}>
                    <span className="grid size-9 place-items-center rounded-xl bg-[#c99a52]/13 text-xs font-black text-[#8b6228]">0{index + 1}</span>
                    <div>
                      <div className="text-sm font-black text-[#153d35]">{title}</div>
                      <div className="mt-1 text-xs font-bold text-black/42">{detail}</div>
                    </div>
                    <span className="rounded-full bg-[#153d35]/7 px-3 py-1.5 text-[10px] font-black text-[#153d35]">{guard}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-black/7 bg-white p-4">
                  <div className="text-[10px] font-black text-[#9d702d]">الصور</div>
                  <div className="mt-1 text-sm font-black text-[#153d35]">بإعداداتك أنت</div>
                </div>
                <div className="rounded-2xl border border-black/7 bg-white p-4">
                  <div className="text-[10px] font-black text-[#9d702d]">التواصل</div>
                  <div className="mt-1 text-sm font-black text-[#153d35]">ليس قبل القبول</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="border-y border-black/6 bg-[#153d35] text-white">
        <div className="mx-auto w-full max-w-7xl px-5 py-18 sm:px-8 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-black text-[#e1b870]">رحلة واضحة</p>
              <h2 className="mt-2 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">لا انتقال للمرحلة التالية بدون سبب واضح وموافقة واضحة.</h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-white/58">نفتح العضوية على دفعات. الدخول للمجتمع لا يعني أن بياناتك تصبح عامة أو أن أي شخص يستطيع مراسلتك.</p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {journey.map((step) => (
              <article className="rounded-3xl border border-white/10 bg-white/[.055] p-5" key={step.number}>
                <div className="text-xs font-black text-[#e1b870]">{step.number}</div>
                <h3 className="mt-6 text-lg font-black">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/58">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="privacy" className="mx-auto w-full max-w-7xl px-5 py-18 sm:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-black text-[#9d702d]">خصوصية عملية</p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-[#153d35] sm:text-4xl">الخصوصية ليست صفحة شروط. هي طريقة عمل المنتج.</h2>
            <p className="mt-4 text-sm leading-7 text-black/52">في ميثاق، التحكم في الصورة، التواصل، الإخفاء، والحظر ليس إضافة جانبية بعد الإطلاق.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link className="rounded-xl border border-black/9 bg-white px-4 py-2 text-xs font-black text-[#153d35]" href="/privacy">سياسة الخصوصية</Link>
              <Link className="rounded-xl border border-black/9 bg-white px-4 py-2 text-xs font-black text-[#153d35]" href="/safety">الأمان والثقة</Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {privacyControls.map((item) => (
              <article className="rounded-[1.75rem] border border-black/7 bg-white p-6 shadow-sm" key={item.title}>
                <div className="mb-5 size-2 rounded-full bg-[#c99a52]" />
                <h3 className="text-lg font-black text-[#153d35]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-black/50">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-black/6 bg-white/65">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-16 sm:px-8 lg:grid-cols-3 lg:py-20">
          <div className="rounded-3xl bg-[#f8f5ef] p-6">
            <p className="text-[11px] font-black text-[#9d702d]">مجتمع أصغر</p>
            <h3 className="mt-2 text-xl font-black text-[#153d35]">الدعوات على دفعات</h3>
            <p className="mt-3 text-sm leading-7 text-black/50">نفضل التوسع المنضبط على فتح الأبواب بدون قدرة حقيقية على المراجعة والسلامة.</p>
          </div>
          <div className="rounded-3xl bg-[#f8f5ef] p-6">
            <p className="text-[11px] font-black text-[#9d702d]">لليبيا والمهجر</p>
            <h3 className="mt-2 text-xl font-black text-[#153d35]">نفس الجدية، أينما كنت</h3>
            <p className="mt-3 text-sm leading-7 text-black/50">التسجيل مصمم لليبيين البالغين داخل ليبيا وخارجها مع تفضيلات واضحة للسكن والانتقال.</p>
          </div>
          <div className="rounded-3xl bg-[#f8f5ef] p-6">
            <p className="text-[11px] font-black text-[#9d702d]">العائلة باختيارك</p>
            <h3 className="mt-2 text-xl font-black text-[#153d35]">إشراكها في الوقت المناسب</h3>
            <p className="mt-3 text-sm leading-7 text-black/50">نحافظ على مساحة للتعارف الجاد مع خيارات مدروسة لإشراك شخص موثوق أو العائلة لاحقاً.</p>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto w-full max-w-4xl px-5 py-18 sm:px-8 lg:py-24">
        <div className="text-center">
          <p className="text-xs font-black text-[#9d702d]">قبل التسجيل</p>
          <h2 className="mt-2 text-3xl font-black text-[#153d35]">أسئلة مهمة، بإجابات مباشرة.</h2>
        </div>

        <div className="mt-8 space-y-3">
          {faqs.map((item) => (
            <details className="group rounded-2xl border border-black/7 bg-white p-5 shadow-sm" key={item.q}>
              <summary className="cursor-pointer list-none text-sm font-black text-[#153d35] marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-lg font-normal text-[#9d702d] transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-4 border-t border-black/6 pt-4 text-sm leading-7 text-black/52">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="px-5 pb-18 sm:px-8 lg:pb-24">
        <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#153d35] p-7 text-center text-white shadow-[0_30px_90px_rgba(21,61,53,.2)] sm:p-10 lg:p-14">
          <p className="text-xs font-black text-[#e1b870]">العضوية بالدعوة</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">إذا كان هدفك زواجاً جاداً، ابدأ بطلب الانضمام.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/62">التسجيل لا يضمن الدعوة فوراً. نراجع الطلبات ونفتح العضوية تدريجياً.</p>
          <Link className="mt-7 inline-flex min-h-13 items-center justify-center rounded-2xl bg-white px-7 py-3 font-black text-[#153d35] transition hover:-translate-y-0.5" href="/join">
            انضم إلى قائمة الانتظار
          </Link>
        </div>
      </section>

      <footer className="border-t border-black/7 bg-white/50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-8 text-xs text-black/42 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-xl bg-[#153d35] font-black text-white">م</span>
            <div>
              <div className="font-black text-[#153d35]">ميثاق</div>
              <div>© 2026 Mithaq</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 font-bold">
            <Link className="hover:text-[#153d35]" href="/safety">الأمان والثقة</Link>
            <Link className="hover:text-[#153d35]" href="/privacy">الخصوصية</Link>
            <Link className="hover:text-[#153d35]" href="/terms">الشروط</Link>
            <Link className="hover:text-[#153d35]" href="/account-deletion-requested">حذف الحساب</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
