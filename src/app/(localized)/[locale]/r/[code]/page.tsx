import { Link } from "@/i18n/navigation";

type PageProps = { params: Promise<{ locale: string; code: string }> };

export default async function ReferralLandingPage({ params }: PageProps) {
  const { locale, code } = await params;
  const lang = locale === "en" ? "en" : "ar";
  const safeCode = /^[A-Z0-9]{8,16}$/.test(code) ? code : "";

  const copy = lang === "ar"
    ? {
        eyebrow: "دعوة خاصة إلى ميثاق",
        title: "تعارف جاد يبدأ بالخصوصية والثقة",
        body: "وصلك هذا الرابط من شخص مسجل في قائمة انتظار ميثاق. لن نكشف له هويتك أو إجاباتك إذا قررت التسجيل.",
        note: "المرحلة الحالية هي قائمة انتظار. تأكيد الهاتف لا يعني التحقق من الهوية، ولا توجد تعارفات أو رسائل في هذه المرحلة.",
        cta: "معرفة شروط الانضمام",
      }
    : {
        eyebrow: "A private Mithaq invitation",
        title: "Serious marriage introductions start with privacy and trust",
        body: "This link was shared by someone on the Mithaq waitlist. If you register, we will not reveal your identity or questionnaire answers to the person who referred you.",
        note: "The current stage is a waitlist. Phone confirmation is not identity verification, and there are no introductions or messaging in this stage.",
        cta: "Review joining requirements",
      };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold text-primary">{copy.eyebrow}</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
      <p className="mt-5 leading-8 text-muted-foreground">{copy.body}</p>
      <p className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 p-5 text-sm leading-7 text-muted-foreground">{copy.note}</p>
      <Link
        className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
        href={safeCode ? `/waitlist?ref=${encodeURIComponent(safeCode)}` : "/waitlist"}
      >
        {copy.cta}
      </Link>
    </main>
  );
}
