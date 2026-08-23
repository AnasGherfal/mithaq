import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const maritalLabels: Record<string, string> = {
  never_married: "لم يسبق له/لها الزواج",
  divorced: "مطلق/مطلقة",
  widowed: "أرمل/أرملة",
  married: "متزوج/متزوجة",
};

export default async function MemberPage({
  searchParams,
}: {
  searchParams: Promise<{ ready?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/join");

  const [{ data: application }, { data: profile }, { data: spaces }] = await Promise.all([
    supabase
      .from("waitlist_applications")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("member_profiles")
      .select("display_name,about_me,occupation,education,profile_completed_at,share_occupation,share_education,share_origin_region")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.rpc("list_my_connection_spaces", {}),
  ]);

  if (application?.status !== "invited") redirect("/waitlist");

  const hasMarriageSpace =
    spaces?.some((space) => space.space === "marriage" && space.membership_state === "active") ?? false;
  if (!profile?.profile_completed_at || !hasMarriageSpace) redirect("/onboarding");

  const [{ data: priorities }, { data: visibility }, { data: previewRows }] = await Promise.all([
    supabase.rpc("get_my_marriage_practical_priorities", {}),
    supabase.rpc("get_my_marriage_visibility", {}),
    supabase.rpc("get_own_introduction_preview", {}),
  ]);

  if (!priorities?.[0]?.completed_at) redirect("/onboarding?step=priorities");

  const preview = previewRows?.[0];
  let ageLabel = "—";
  if (preview?.age_band_id) {
    const { data: band } = await supabase
      .from("age_bands")
      .select("label")
      .eq("id", preview.age_band_id)
      .maybeSingle();
    ageLabel = band?.label ?? "—";
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/waitlist" className="inline-flex items-center gap-2 font-black text-[#153d35]">
            <span className="grid size-9 place-items-center rounded-xl bg-[#153d35] text-white">م</span>
            ميثاق
          </Link>
          <div className="flex items-center gap-1">
            <Link className="focus-ring rounded-xl px-3 py-2 text-sm font-bold text-black/45 hover:bg-white" href="/photos">الصور والثقة</Link>
            <Link className="focus-ring rounded-xl px-3 py-2 text-sm font-bold text-black/45 hover:bg-white" href="/settings">الإعدادات</Link>
            <form action="/auth/signout" method="post">
              <button className="focus-ring rounded-xl px-3 py-2 text-sm font-bold text-black/45 hover:bg-white" type="submit">تسجيل الخروج</button>
            </form>
          </div>
        </div>

        {params.ready === "1" ? (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
            تم حفظ إعداد ملفك بنجاح.
          </div>
        ) : null}

        <section className="mt-7 rounded-[2rem] border border-black/7 bg-white/88 p-6 shadow-[0_25px_70px_rgba(35,43,38,.1)] sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-black text-[#9d702d]">المرحلة الخاصة</p>
              <h1 className="mt-2 text-3xl font-black text-[#153d35]">ملفك الأساسي جاهز</h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-black/55">
                أكملت معلومات الملف والأولويات الأساسية. يمكنك الآن إدارة صورك ومتابعة حالة الثقة، بينما يظل الاستكشاف والمحادثة مغلقين حتى نكمل ضوابط المرحلة التالية.
              </p>
            </div>
            <span className="rounded-full bg-[#153d35]/8 px-4 py-2 text-xs font-black text-[#153d35]">
              الظهور: {visibility === "standard" ? "عادي" : "خاص"}
            </span>
          </div>

          <div className="mt-7 rounded-3xl border border-black/8 bg-[#f8f5ef] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-[#9d702d]">معاينة</p>
                <h2 className="mt-1 text-xl font-black text-[#153d35]">ما قد يظهر عنك</h2>
              </div>
              <Link className="text-xs font-black text-[#8b6228] underline" href="/onboarding?step=privacy">تعديل الخصوصية</Link>
            </div>

            {preview ? (
              <div className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
                <h3 className="text-2xl font-black text-[#153d35]">{preview.display_name}</h3>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-black/45">
                  <span>{preview.gender === "man" ? "رجل" : "امرأة"}</span>
                  <span>{ageLabel}</span>
                  <span>{preview.city}</span>
                  <span>{maritalLabels[preview.marital_status] ?? preview.marital_status}</span>
                  <span>{preview.has_children ? "لديه/لديها أطفال" : "بدون أطفال"}</span>
                </div>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-black/62">{preview.about_me}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                  {preview.occupation ? <span className="rounded-full bg-[#153d35]/7 px-3 py-2 text-[#153d35]">{preview.occupation}</span> : null}
                  {preview.education ? <span className="rounded-full bg-[#153d35]/7 px-3 py-2 text-[#153d35]">{preview.education}</span> : null}
                  {preview.origin_region ? <span className="rounded-full bg-[#153d35]/7 px-3 py-2 text-[#153d35]">الأصل: {preview.origin_region}</span> : null}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-black/45">تعذر تجهيز المعاينة الآن.</p>
            )}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Link className="rounded-3xl border border-black/8 bg-white p-5 transition hover:border-[#153d35]/25" href="/onboarding?step=profile">
              <div className="text-sm font-black text-[#153d35]">تعديل ملفي</div>
              <p className="mt-2 text-xs leading-6 text-black/45">الاسم الظاهر، النبذة، المهنة والتعليم.</p>
            </Link>
            <Link className="rounded-3xl border border-black/8 bg-white p-5 transition hover:border-[#153d35]/25" href="/onboarding?step=priorities">
              <div className="text-sm font-black text-[#153d35]">تعديل أولويات الزواج</div>
              <p className="mt-2 text-xs leading-6 text-black/45">السكن، الأطفال، العمل وحجم حفل الزواج.</p>
            </Link>
          </div>

          <Link className="mt-6 block rounded-3xl border border-[#c99a52]/25 bg-[#c99a52]/8 p-5 transition hover:border-[#c99a52]/45" href="/photos">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-[#8b6228]">الصور وحالة الثقة</div>
                <p className="mt-2 text-xs leading-6 text-black/52">
                  أضف صوراً خاصة، اختر الرئيسية، تابع المراجعة، وشاهد ما تم التحقق منه فعلياً في حسابك.
                </p>
              </div>
              <span className="text-xl text-[#8b6228]">‹</span>
            </div>
          </Link>

          <div className="mt-4 rounded-2xl bg-[#f8f5ef] p-4 text-xs leading-6 text-black/45">
            تحقق الهوية الرسمي لم يتم ربطه بمزود خارجي بعد. لن نعرض أي علامة تحقق قبل وجود دليل فعلي في النظام.
          </div>
        </section>
      </div>
    </main>
  );
}
