import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { WaitlistStatus } from "@/lib/supabase/database.types";

import { ReferralShare } from "./referral-share";
import { WaitlistForm } from "./waitlist-form";

export const dynamic = "force-dynamic";

const statusCopy: Record<WaitlistStatus, { title: string; text: string }> = {
  draft: { title: "أكمل التسجيل", text: "بقيت بعض المعلومات قبل إضافتك لقائمة الانتظار." },
  submitted: { title: "تم تسجيلك في قائمة الانتظار", text: "وصلتنا معلوماتك. سنستخدمها لتجهيز الإطلاق واختيار الدعوات الأولى بصورة منظمة." },
  qualified: { title: "طلبك مؤهل للمرحلة القادمة", text: "حسابك ضمن المجموعة المؤهلة. سنوضح الخطوة التالية عندما تصبح جاهزة." },
  invited: { title: "لديك دعوة للمرحلة القادمة", text: "تم اختيار حسابك للانتقال إلى المرحلة التالية من ميثاق." },
  withdrawn: { title: "تم سحب طلبك", text: "طلبك ليس نشطاً حالياً في قائمة الانتظار." },
  declined: { title: "الطلب غير نشط", text: "طلبك ليس ضمن قائمة الانتظار النشطة في الوقت الحالي." },
  deleted: { title: "تم حذف بيانات الطلب", text: "بيانات قائمة الانتظار لم تعد نشطة." },
};

export default async function WaitlistPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/join");

  const { data: ageBands, error: ageError } = await supabase
    .from("age_bands")
    .select("id,label")
    .order("sort_order");

  const { data: application, error: applicationError } = await supabase
    .from("waitlist_applications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (ageError || applicationError) {
    return (
      <main className="min-h-screen px-5 py-10">
        <div className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-white p-7 text-center">
          <h1 className="text-xl font-black text-red-700">تعذر تحميل التسجيل</h1>
          <p className="mt-2 text-sm leading-6 text-black/55">حاول تحديث الصفحة. إذا استمرت المشكلة فلا تعِد إدخال بياناتك عدة مرات.</p>
        </div>
      </main>
    );
  }

  if (application && application.status !== "draft") {
    const { data: referral } = await supabase
      .from("referral_codes")
      .select("code")
      .eq("owner_user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    const { data: conversionCount } = await supabase.rpc("get_my_referral_conversion_count", {});
    const copy = statusCopy[application.status];

    return (
      <main className="min-h-screen px-5 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-xl">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="inline-flex items-center gap-2 font-black text-[#153d35]">
              <span className="grid size-9 place-items-center rounded-xl bg-[#153d35] text-white">م</span>
              ميثاق
            </Link>
            <form action="/auth/signout" method="post">
              <button className="focus-ring rounded-xl px-3 py-2 text-sm font-bold text-black/45 hover:bg-white" type="submit">تسجيل الخروج</button>
            </form>
          </div>

          <section className="mt-8 rounded-[2rem] border border-black/7 bg-white/85 p-7 shadow-[0_25px_70px_rgba(35,43,38,.1)] sm:p-9">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#153d35]/8 text-3xl text-[#153d35]">✓</div>
            <h1 className="mt-5 text-center text-2xl font-black text-[#153d35]">{copy.title}</h1>
            <p className="mx-auto mt-3 max-w-md text-center text-sm leading-7 text-black/55">{copy.text}</p>

            {referral?.code && ["submitted", "qualified", "invited"].includes(application.status) ? (
              <>
                <ReferralShare code={referral.code} />
                <p className="mt-3 text-center text-xs text-black/40">
                  تسجيلات مكتملة عبر دعوتك: <span className="font-black text-[#153d35]">{conversionCount ?? 0}</span>
                </p>
              </>
            ) : null}

            <div className="mt-6 rounded-2xl bg-[#f8f5ef] p-4 text-xs leading-6 text-black/48">
              لا ترسل صوراً شخصية أو مستندات هوية لأي شخص يدّعي أنه يمثل ميثاق. أي خطوة تحقق مستقبلية ستظهر داخل المنتج نفسه.
            </div>
          </section>
        </div>
      </main>
    );
  }

  let preferences = null;
  let acceptedStatuses: Array<{ marital_status: "never_married" | "divorced" | "widowed" | "married" }> = [];

  if (application) {
    const preferencesResult = await supabase
      .from("waitlist_preferences")
      .select("*")
      .eq("application_id", application.id)
      .maybeSingle();
    preferences = preferencesResult.data;

    const statusesResult = await supabase
      .from("waitlist_accepted_marital_statuses")
      .select("marital_status")
      .eq("application_id", application.id);
    acceptedStatuses = statusesResult.data ?? [];
  }

  const initialData = {
    gender: application?.gender ?? "",
    ageBandId: application?.age_band_id ? String(application.age_band_id) : "",
    residencyType: application?.residency_type ?? ("libya" as const),
    currentCountryCode: application?.current_country_code?.trim() ?? "LY",
    currentCity: application?.current_city ?? "",
    libyanOriginRegion: application?.libyan_origin_region ?? "",
    maritalStatus: application?.marital_status ?? "",
    hasChildren:
      application?.has_children === true ? ("yes" as const) : application?.has_children === false ? ("no" as const) : ("" as const),
    libyanSelfAttestation: application?.libyan_self_attestation ?? false,
    marriageTimeline: preferences?.marriage_timeline ?? "",
    willingIdentityVerification:
      preferences?.willing_identity_verification === true
        ? ("yes" as const)
        : preferences?.willing_identity_verification === false
          ? ("no" as const)
          : ("" as const),
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
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 font-black text-[#153d35]">
            <span className="grid size-9 place-items-center rounded-xl bg-[#153d35] text-white">م</span>
            ميثاق
          </Link>
          <form action="/auth/signout" method="post">
            <button className="focus-ring rounded-xl px-3 py-2 text-sm font-bold text-black/45 hover:bg-white" type="submit">تسجيل الخروج</button>
          </form>
        </div>

        <section className="mt-7 rounded-[2rem] border border-black/7 bg-white/88 p-6 shadow-[0_25px_70px_rgba(35,43,38,.1)] sm:p-9">
          <WaitlistForm ageBands={ageBands ?? []} initialData={initialData} />
        </section>
      </div>
    </main>
  );
}
