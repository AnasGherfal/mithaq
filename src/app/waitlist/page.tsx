import Link from "next/link";
import { redirect } from "next/navigation";

import type { WaitlistStatus } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import { ReferralShare } from "./referral-share";
import { WaitlistForm, type InitialData } from "./waitlist-form";

export const dynamic = "force-dynamic";

const statusCopy: Record<WaitlistStatus, { eyebrow: string; title: string; text: string }> = {
  draft: {
    eyebrow: "طلب الانضمام",
    title: "أكمل معلومات قائمة الانتظار",
    text: "هذه المعلومات تساعدنا على مراجعة الجدية والملاءمة قبل إصدار دعوات العضوية.",
  },
  submitted: {
    eyebrow: "تم استلام الطلب",
    title: "طلبك الآن في قائمة المراجعة",
    text: "وصلتنا معلوماتك بنجاح. لم تصدر دعوة عضوية بعد، ولن يفتح الاستكشاف أو التواصل في هذه المرحلة.",
  },
  qualified: {
    eyebrow: "اجتاز المراجعة الأولية",
    title: "طلبك مؤهل لدعوة العضوية",
    text: "تمت مراجعة الطلب مبدئياً وأصبح ضمن المجموعة المؤهلة. الخطوة التالية، عند اختيار الحساب، هي إصدار دعوة صريحة للعضوية.",
  },
  invited: {
    eyebrow: "دعوة العضوية جاهزة",
    title: "يمكنك الآن تجهيز ملف ميثاق الخاص",
    text: "تم إصدار دعوة لحسابك. ستبدأ بإعداد الملف والخصوصية والأولويات قبل أن تصبح مؤهلاً لأي استكشاف أو مقدمة.",
  },
  withdrawn: {
    eyebrow: "الطلب غير نشط",
    title: "تم سحب طلبك",
    text: "طلبك ليس نشطاً حالياً في قائمة الانتظار.",
  },
  declined: {
    eyebrow: "الطلب غير نشط",
    title: "لم يتم إصدار دعوة لهذا الطلب",
    text: "طلبك ليس ضمن قائمة الانتظار النشطة في الوقت الحالي.",
  },
  deleted: {
    eyebrow: "الطلب غير متاح",
    title: "تم حذف بيانات الطلب",
    text: "بيانات قائمة الانتظار لم تعد نشطة.",
  },
};

const approvalStages = [
  { key: "submitted", label: "استلام الطلب" },
  { key: "qualified", label: "المراجعة الأولية" },
  { key: "invited", label: "دعوة العضوية" },
] as const;

function approvalStep(status: WaitlistStatus) {
  if (status === "submitted") return 0;
  if (status === "qualified") return 1;
  if (status === "invited") return 2;
  return -1;
}

function AccountActions({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {isAdmin ? (
        <Link className="focus-ring rounded-xl px-3 py-2 text-xs font-black text-[#8b6228] hover:bg-white" href="/admin">
          الإدارة
        </Link>
      ) : null}
      <Link className="focus-ring rounded-xl px-3 py-2 text-xs font-bold text-black/45 hover:bg-white" href="/settings">
        الإعدادات
      </Link>
      <form action="/auth/signout" method="post">
        <button className="focus-ring rounded-xl px-3 py-2 text-xs font-bold text-black/45 hover:bg-white" type="submit">
          تسجيل الخروج
        </button>
      </form>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="inline-flex items-center gap-3 font-black text-[#153d35]">
      <span className="grid size-10 place-items-center rounded-2xl bg-[#153d35] text-lg text-white shadow-sm">م</span>
      <span>
        <span className="block text-lg leading-5">ميثاق</span>
        <span className="mt-1 block text-[10px] font-bold tracking-[.18em] text-black/35" dir="ltr">MITHAQ</span>
      </span>
    </Link>
  );
}

function StatusProgress({ status }: { status: WaitlistStatus }) {
  const current = approvalStep(status);
  if (current < 0) return null;

  return (
    <div className="mt-7 rounded-3xl border border-black/7 bg-[#f8f5ef] p-4 sm:p-5">
      <div className="grid gap-2 sm:grid-cols-3">
        {approvalStages.map((stage, index) => {
          const complete = index < current;
          const active = index === current;
          return (
            <div
              className={`rounded-2xl border px-4 py-3 ${
                active
                  ? "border-[#153d35]/20 bg-white shadow-sm"
                  : complete
                    ? "border-green-100 bg-green-50/70"
                    : "border-transparent bg-white/45"
              }`}
              key={stage.key}
            >
              <div className={`text-[10px] font-black ${complete ? "text-green-700" : active ? "text-[#9d702d]" : "text-black/28"}`}>
                {complete ? "✓ مكتمل" : active ? "المرحلة الحالية" : "لاحقاً"}
              </div>
              <div className={`mt-1 text-xs font-black ${complete || active ? "text-[#153d35]" : "text-black/32"}`}>{stage.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function WaitlistPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/join");

  const { data: moderationAccess } = await supabase.rpc("get_my_moderation_access", {});
  const isAdmin = moderationAccess?.some((access) => access.moderation_role === "admin") ?? false;

  const [{ data: ageBands, error: ageError }, { data: application, error: applicationError }] = await Promise.all([
    supabase.from("age_bands").select("id,label").order("sort_order"),
    supabase.from("waitlist_applications").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  if (ageError || applicationError) {
    return (
      <main className="min-h-screen px-5 py-10">
        <div className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-white p-7 text-center shadow-sm">
          <h1 className="text-xl font-black text-red-700">تعذر تحميل التسجيل</h1>
          <p className="mt-2 text-sm leading-6 text-black/55">حاول تحديث الصفحة. إذا استمرت المشكلة فلا تعِد إدخال بياناتك عدة مرات.</p>
          <Link className="mt-5 inline-flex rounded-xl border border-black/10 px-4 py-2 text-sm font-black text-[#153d35]" href="/">العودة للموقع</Link>
        </div>
      </main>
    );
  }

  if (application && application.status !== "draft") {
    const [{ data: referral }, { data: conversionCount }] = await Promise.all([
      supabase.from("referral_codes").select("code").eq("owner_user_id", userId).eq("status", "active").maybeSingle(),
      supabase.rpc("get_my_referral_conversion_count", {}),
    ]);
    const copy = statusCopy[application.status];

    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,.5),transparent_38%)] px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto w-full max-w-5xl">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <Brand />
            <AccountActions isAdmin={isAdmin} />
          </header>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
            <section className="rounded-[2.25rem] border border-black/7 bg-white/92 p-6 shadow-[0_28px_80px_rgba(31,48,42,.1)] sm:p-9">
              <div className="inline-flex rounded-full border border-[#c99a52]/25 bg-[#c99a52]/9 px-4 py-2 text-xs font-black text-[#805d27]">{copy.eyebrow}</div>
              <h1 className="mt-5 max-w-xl text-3xl font-black leading-[1.3] text-[#153d35] sm:text-4xl">{copy.title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-8 text-black/55 sm:text-base">{copy.text}</p>

              <StatusProgress status={application.status} />

              {application.status === "invited" ? (
                <div className="mt-6 rounded-3xl border border-[#153d35]/12 bg-[#153d35]/5 p-5">
                  <div className="text-sm font-black text-[#153d35]">دعوة العضوية لا تفتح التعارف مباشرة</div>
                  <p className="mt-2 text-xs leading-6 text-black/48">
                    ستكمل ملفك وأولويات الزواج والخصوصية أولاً، ثم يمر الملف بالمراجعة قبل دخوله إلى الاستكشاف الخاص.
                  </p>
                  <Link
                    className="focus-ring mt-4 flex w-full items-center justify-center rounded-2xl bg-[#153d35] px-6 py-4 font-black text-white shadow-[0_14px_35px_rgba(21,61,53,.18)] hover:bg-[#0f2c27] sm:w-auto sm:inline-flex"
                    href="/onboarding"
                  >
                    ابدأ إعداد ملف العضوية
                  </Link>
                </div>
              ) : null}

              <div className="mt-6 rounded-2xl border border-black/7 bg-[#f8f5ef] p-4 text-xs leading-6 text-black/48">
                لا ترسل صوراً شخصية أو مستندات هوية لأي شخص يدّعي أنه يمثل ميثاق. أي خطوة تحقق رسمية ستظهر داخل المنتج نفسه.
                <Link className="mr-1 font-black text-[#8b6228] underline" href="/safety">إرشادات الأمان</Link>
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-[2rem] border border-black/7 bg-[#153d35] p-6 text-white shadow-sm">
                <p className="text-xs font-black text-[#e7c788]">ماذا يعني هذا الطلب؟</p>
                <h2 className="mt-2 text-xl font-black">قائمة الانتظار هي بوابة العضوية، وليست صفحة تعارف.</h2>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  لا يظهر طلبك لأعضاء آخرين. المراجعة هنا منفصلة عن مراجعة الملف والصور التي تحدث بعد دعوة العضوية.
                </p>
              </section>

              {referral?.code && ["submitted", "qualified", "invited"].includes(application.status) ? (
                <section className="rounded-[2rem] border border-black/7 bg-white/88 p-5 shadow-sm">
                  <div className="text-xs font-black text-[#9d702d]">دعوة شخص مناسب</div>
                  <ReferralShare code={referral.code} />
                  <p className="mt-3 text-center text-xs text-black/40">
                    تسجيلات مكتملة عبر دعوتك: <span className="font-black text-[#153d35]">{conversionCount ?? 0}</span>
                  </p>
                </section>
              ) : null}

              <section className="rounded-[2rem] border border-black/7 bg-white/75 p-5 text-xs leading-6 text-black/45">
                <div className="font-black text-[#153d35]">تحتاج مساعدة؟</div>
                <p className="mt-1">يمكنك مراجعة الخصوصية والأمان أو إدارة حسابك من الإعدادات. لا تحتاج لإعادة تقديم الطلب لمجرد أن حالته لم تتغير بعد.</p>
              </section>
            </aside>
          </div>
        </div>
      </main>
    );
  }

  let preferences = null;
  let acceptedStatuses: Array<{ marital_status: "never_married" | "divorced" | "widowed" | "married" }> = [];

  if (application) {
    const [preferencesResult, statusesResult] = await Promise.all([
      supabase.from("waitlist_preferences").select("*").eq("application_id", application.id).maybeSingle(),
      supabase.from("waitlist_accepted_marital_statuses").select("marital_status").eq("application_id", application.id),
    ]);
    preferences = preferencesResult.data;
    acceptedStatuses = statusesResult.data ?? [];
  }

  const initialData: InitialData = {
    gender: application?.gender ?? "",
    ageBandId: application?.age_band_id ? String(application.age_band_id) : "",
    residencyType: application?.residency_type ?? "libya",
    currentCountryCode: application?.current_country_code?.trim() ?? "LY",
    currentCity: application?.current_city ?? "",
    libyanOriginRegion: application?.libyan_origin_region ?? "",
    maritalStatus: application?.marital_status ?? "",
    hasChildren: application?.has_children === true ? "yes" : application?.has_children === false ? "no" : "",
    libyanSelfAttestation: application?.libyan_self_attestation ?? false,
    marriageTimeline: preferences?.marriage_timeline ?? "",
    willingIdentityVerification:
      preferences?.willing_identity_verification === true
        ? "yes"
        : preferences?.willing_identity_verification === false
          ? "no"
          : "",
    photoPrivacyPreference: preferences?.photo_privacy_preference ?? "",
    familyInvolvementPreference: preferences?.family_involvement_preference ?? "",
    relocationWillingness: preferences?.relocation_willingness ?? "",
    openToLibya: preferences?.open_to_libya ?? true,
    openToDiaspora: preferences?.open_to_diaspora ?? false,
    preferredPartnerAgeMin: preferences?.preferred_partner_age_min ? String(preferences.preferred_partner_age_min) : "",
    preferredPartnerAgeMax: preferences?.preferred_partner_age_max ? String(preferences.preferred_partner_age_max) : "",
    acceptsPartnerWithChildren: preferences?.accepts_partner_with_children ?? "",
    acceptedMaritalStatuses: acceptedStatuses.map((item) => item.marital_status),
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,.5),transparent_34%)] px-5 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Brand />
          <AccountActions isAdmin={isAdmin} />
        </header>

        <div className="mt-9 grid gap-6 lg:grid-cols-[.72fr_1.28fr] lg:items-start lg:gap-8">
          <aside className="space-y-4 lg:sticky lg:top-8">
            <section className="rounded-[2rem] border border-black/7 bg-[#153d35] p-6 text-white shadow-sm">
              <div className="text-xs font-black text-[#e7c788]">طلب قائمة الانتظار</div>
              <h1 className="mt-2 text-2xl font-black leading-[1.35]">نريد الحد الأدنى من المعلومات التي تساعد على بناء تعارف جاد.</h1>
              <p className="mt-3 text-sm leading-7 text-white/68">
                إجاباتك هنا ليست ملفاً عاماً. نستخدمها لإدارة قائمة الانتظار، فهم التفضيلات الأساسية، وتجنب دعوات غير مناسبة من البداية.
              </p>
            </section>

            <section className="rounded-[2rem] border border-black/7 bg-white/82 p-5 shadow-sm">
              <div className="text-xs font-black text-[#9d702d]">قبل أن تبدأ</div>
              <div className="mt-4 space-y-4 text-xs leading-6 text-black/48">
                <div><span className="font-black text-[#153d35]">حوالي 4 خطوات</span><br />معلومات أساسية، تفضيلات التجربة، حدود التوافق، ثم الموافقات.</div>
                <div><span className="font-black text-[#153d35]">لا يوجد نشر تلقائي</span><br />إرسال الطلب لا يجعل معلوماتك قابلة للبحث أو المشاهدة من الأعضاء.</div>
                <div><span className="font-black text-[#153d35]">يمكنك التوقف والعودة</span><br />المسودة تُحمّل من حسابك عند العودة إلى هذه الصفحة.</div>
              </div>
            </section>

            <div className="flex flex-wrap gap-3 px-2 text-xs font-bold text-black/38">
              <Link className="hover:text-[#153d35]" href="/privacy" target="_blank">الخصوصية</Link>
              <Link className="hover:text-[#153d35]" href="/terms" target="_blank">الشروط</Link>
              <Link className="hover:text-[#153d35]" href="/safety" target="_blank">الأمان</Link>
            </div>
          </aside>

          <section className="rounded-[2.25rem] border border-black/7 bg-white/94 p-5 shadow-[0_28px_80px_rgba(31,48,42,.1)] sm:p-8 lg:p-9">
            <WaitlistForm ageBands={ageBands ?? []} initialData={initialData} />
          </section>
        </div>
      </div>
    </main>
  );
}
