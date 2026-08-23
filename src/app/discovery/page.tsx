import Link from "next/link";
import { redirect } from "next/navigation";

import { MemberPrimaryNav } from "@/components/member-primary-nav";
import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

import { hideCandidate, noticeCandidate, skipCandidate } from "./actions";

export const dynamic = "force-dynamic";

type DiscoveryCandidate = {
  user_id: string;
  display_name: string | null;
  about_me: string | null;
  occupation: string | null;
  education: string | null;
  city: string | null;
  origin_region: string | null;
  age_band_id: number;
  age_band_label: string;
  marital_status: string;
  has_children: boolean;
  photo_id: string | null;
  photo_display_mode: string;
  alignment_reasons: string[];
  alignment_count: number;
  real_person_verified: boolean;
  age_18_plus_verified: boolean;
  identity_verified: boolean;
};

type CandidateView = DiscoveryCandidate & { signedPhotoUrl: string | null };
type ConversationUnread = { unread_count: number | string };
type IntroductionSummary = { status: string; my_decision: string };

const maritalLabels: Record<string, string> = {
  never_married: "لم يسبق له/لها الزواج",
  divorced: "مطلق/مطلقة",
  widowed: "أرمل/أرملة",
  married: "متزوج/متزوجة",
};

const alignmentLabels: Record<string, string> = {
  same_city: "نفس المدينة",
  living_arrangement: "السكن بعد الزواج",
  children_plan: "الأطفال مستقبلاً",
  work_after_marriage: "العمل بعد الزواج",
  wedding_style: "أسلوب حفل الزواج",
};

const reviewLabels: Record<string, { title: string; text: string }> = {
  pending: {
    title: "ملفك في المراجعة",
    text: "الاستكشاف يبقى مغلقاً حتى يراجع ملفك. كل عضو يدخل هذه المساحة يمر بنفس البوابة.",
  },
  needs_changes: {
    title: "نحتاج تعديلاً بسيطاً على ملفك",
    text: "راجع ملاحظة الفريق وعدّل الملف. بعد الحفظ يعود تلقائياً إلى المراجعة.",
  },
  rejected: {
    title: "الاستكشاف غير متاح لهذا الملف الآن",
    text: "يمكنك تعديل الملف وإرساله للمراجعة من جديد. لن يظهر في الاستكشاف قبل اعتماده.",
  },
};

function TrustBadges({ candidate }: { candidate: DiscoveryCandidate }) {
  const badges = [
    candidate.real_person_verified ? "شخص حقيقي" : null,
    candidate.age_18_plus_verified ? "+18 موثق" : null,
    candidate.identity_verified ? "هوية موثقة" : null,
  ].filter(Boolean) as string[];

  if (badges.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span className="rounded-full bg-green-50 px-3 py-1.5 text-[11px] font-black text-green-800" key={badge}>
          ✓ {badge}
        </span>
      ))}
    </div>
  );
}

export default async function DiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ noticed?: string; skipped?: string; hidden?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const rpc = asUntypedSupabase(supabase);
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/join");

  const [{ data: application }, { data: profile }, { data: review }] = await Promise.all([
    supabase.from("waitlist_applications").select("status").eq("user_id", userId).maybeSingle(),
    supabase.from("member_profiles").select("profile_completed_at").eq("user_id", userId).maybeSingle(),
    rpc.from("member_profile_reviews").select("state,reason_code").eq("user_id", userId).maybeSingle(),
  ]);

  if (application?.status !== "invited") redirect("/waitlist");
  if (!profile?.profile_completed_at) redirect("/onboarding");

  if (!review || review.state !== "approved") {
    const copy = reviewLabels[review?.state ?? "pending"] ?? reviewLabels.pending;
    return (
      <main className="min-h-screen px-5 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-xl">
          <Link className="inline-flex items-center gap-2 font-black text-[#153d35]" href="/member">
            <span className="grid size-9 place-items-center rounded-xl bg-[#153d35] text-white">م</span>
            ميثاق
          </Link>
          <section className="mt-8 rounded-[2rem] border border-black/7 bg-white p-7 text-center shadow-sm sm:p-9">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#c99a52]/10 text-2xl">⌛</div>
            <p className="mt-5 text-xs font-black text-[#9d702d]">بوابة الاستكشاف</p>
            <h1 className="mt-2 text-2xl font-black text-[#153d35]">{copy.title}</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-black/55">{copy.text}</p>
            {review?.reason_code ? (
              <div className="mt-5 rounded-2xl bg-orange-50 p-4 text-sm font-bold text-orange-800">
                ملاحظة المراجعة: {review.reason_code}
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link className="rounded-xl bg-[#153d35] px-5 py-3 text-sm font-black text-white" href="/onboarding?step=profile">مراجعة ملفي</Link>
              <Link className="rounded-xl border border-black/10 px-5 py-3 text-sm font-black text-[#153d35]" href="/member">العودة للرئيسية</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const [
    { data: discoveryData, error: discoveryError },
    { data: introductionData },
    { data: conversationUnreadData },
    { data: notificationUnreadData },
  ] = await Promise.all([
    rpc.rpc("list_marriage_discovery", { p_limit: 6 }),
    rpc.rpc("list_my_introductions", {}),
    rpc.rpc("list_my_conversation_unread_counts", {}),
    rpc.rpc("get_my_notification_unread_count", {}),
  ]);

  const introductions = Array.isArray(introductionData) ? (introductionData as IntroductionSummary[]) : [];
  const pendingIntroductions = introductions.filter(
    (item) => item.status === "offered" && item.my_decision === "pending",
  ).length;
  const conversationUnreads = Array.isArray(conversationUnreadData)
    ? (conversationUnreadData as ConversationUnread[])
    : [];
  const unreadMessages = conversationUnreads.reduce((sum, item) => sum + (Number(item.unread_count) || 0), 0);
  const unreadActivity = Number(notificationUnreadData) || 0;

  const rawCandidates = !discoveryError && Array.isArray(discoveryData)
    ? (discoveryData as DiscoveryCandidate[])
    : [];

  const candidates: CandidateView[] = await Promise.all(
    rawCandidates.map(async (candidate) => {
      if (!candidate.photo_id || candidate.photo_display_mode !== "full") {
        return { ...candidate, signedPhotoUrl: null };
      }

      const { data: storagePath, error: pathError } = await rpc.rpc("get_my_marriage_discovery_photo_path", {
        p_candidate_user_id: candidate.user_id,
        p_photo_id: candidate.photo_id,
      });

      if (pathError || typeof storagePath !== "string") {
        return { ...candidate, signedPhotoUrl: null };
      }

      const { data: signed, error: signedError } = await supabase.storage
        .from("member-profile-photos")
        .createSignedUrl(storagePath, 5 * 60);

      return { ...candidate, signedPhotoUrl: signedError ? null : signed.signedUrl };
    }),
  );

  return (
    <main className="min-h-screen px-5 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/member" className="inline-flex items-center gap-3 font-black text-[#153d35]">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#153d35] text-white">م</span>
            <span>
              <span className="block text-lg">ميثاق</span>
              <span className="block text-[10px] font-bold tracking-[.18em] text-black/35" dir="ltr">DISCOVERY</span>
            </span>
          </Link>
          <MemberPrimaryNav
            pendingIntroductions={pendingIntroductions}
            unreadMessages={unreadMessages}
            unreadActivity={unreadActivity}
          />
        </header>

        <section className="mt-7 rounded-[2.25rem] bg-[#153d35] p-6 text-white shadow-[0_28px_70px_rgba(21,61,53,.18)] sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl">
              <p className="text-xs font-black text-[#e6c995]">استكشاف محدود ومقصود</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">ملفات تحقق شروط الطرفين الأساسية</h1>
              <p className="mt-4 text-sm leading-7 text-white/72">
                لا يوجد سحب لا نهائي ولا دليل عام. تسجيل الاهتمام يبقى خاصاً؛ إذا كان الاهتمام متبادلاً تنشأ مقدمة منفصلة، ثم يحتاج كل طرف إلى قبولها قبل فتح المحادثة.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-4 text-center">
              <div className="text-3xl font-black">{candidates.length}</div>
              <div className="mt-1 text-xs font-bold text-white/60">ملفات متاحة الآن</div>
            </div>
          </div>
        </section>

        {params.noticed === "1" ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
            تم تسجيل اهتمامك بشكل خاص. إذا سجّل الطرف الآخر اهتماماً أيضاً، ستظهر مقدمة للطرفين.
          </div>
        ) : null}
        {params.skipped === "1" ? (
          <div className="mt-5 rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm font-bold text-black/55">
            تم التخطي. لن نعيد هذا الملف لك خلال 14 يوماً على الأقل.
          </div>
        ) : null}
        {params.hidden === "1" ? (
          <div className="mt-5 rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm font-bold text-black/55">
            تم إخفاء هذا الشخص من الاستكشاف بينكما.
          </div>
        ) : null}
        {params.error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            تعذر تنفيذ الإجراء. قد يكون الملف لم يعد متاحاً أو تغيرت حالة الأهلية.
          </div>
        ) : null}

        <section className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {candidates.map((candidate) => {
            const isPrivate = !candidate.display_name;
            const reasons = candidate.alignment_reasons ?? [];

            return (
              <article className="overflow-hidden rounded-[2rem] border border-black/8 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl" key={candidate.user_id}>
                <div className="aspect-[4/3] bg-[#f1eee7]">
                  {candidate.signedPhotoUrl ? (
                    <img alt="صورة ملف معتمدة" className="h-full w-full object-cover" src={candidate.signedPhotoUrl} />
                  ) : (
                    <div className="grid h-full place-items-center p-6 text-center">
                      <div>
                        <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#153d35]/8 text-2xl text-[#153d35]">م</div>
                        <div className="mt-3 text-sm font-black text-[#153d35]">
                          {isPrivate ? "ملف خاص" : "الصورة غير ظاهرة الآن"}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-black/42">إعدادات الخصوصية تحدد ما يظهر في هذه المرحلة.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-[#153d35]">{candidate.display_name ?? "ملف خاص"}</h2>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-black/45">
                        <span>{candidate.age_band_label}</span>
                        {candidate.city ? <span>{candidate.city}</span> : null}
                        <span>{maritalLabels[candidate.marital_status] ?? candidate.marital_status}</span>
                        <span>{candidate.has_children ? "لديه/لديها أطفال" : "بدون أطفال"}</span>
                      </div>
                    </div>
                    {candidate.alignment_count > 0 ? (
                      <span className="shrink-0 rounded-full bg-[#c99a52]/12 px-3 py-1.5 text-[11px] font-black text-[#8b6228]">
                        {candidate.alignment_count} توافق
                      </span>
                    ) : null}
                  </div>

                  <TrustBadges candidate={candidate} />

                  {candidate.about_me ? (
                    <p className="mt-4 line-clamp-5 whitespace-pre-line text-sm leading-7 text-black/60">{candidate.about_me}</p>
                  ) : (
                    <p className="mt-4 text-sm leading-7 text-black/48">بعض تفاصيل هذا الملف غير معروضة في مرحلة الاستكشاف.</p>
                  )}

                  {(candidate.occupation || candidate.education || candidate.origin_region) ? (
                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-[#153d35]">
                      {candidate.occupation ? <span className="rounded-full bg-[#153d35]/7 px-3 py-2">{candidate.occupation}</span> : null}
                      {candidate.education ? <span className="rounded-full bg-[#153d35]/7 px-3 py-2">{candidate.education}</span> : null}
                      {candidate.origin_region ? <span className="rounded-full bg-[#153d35]/7 px-3 py-2">الأصل: {candidate.origin_region}</span> : null}
                    </div>
                  ) : null}

                  {reasons.length > 0 ? (
                    <div className="mt-5 rounded-2xl bg-[#f8f5ef] p-4">
                      <div className="text-xs font-black text-[#8b6228]">نقاط توافق واضحة</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {reasons.map((reason) => (
                          <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-black/55" key={reason}>
                            {alignmentLabels[reason] ?? reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <form action={noticeCandidate}>
                      <input name="candidate_id" type="hidden" value={candidate.user_id} />
                      <button className="focus-ring w-full rounded-xl bg-[#153d35] px-4 py-3 text-sm font-black text-white" type="submit">مهتم/ة</button>
                    </form>
                    <form action={skipCandidate}>
                      <input name="candidate_id" type="hidden" value={candidate.user_id} />
                      <button className="focus-ring w-full rounded-xl border border-black/10 px-4 py-3 text-sm font-black text-black/55" type="submit">ليس مناسباً</button>
                    </form>
                  </div>

                  <details className="mt-3 rounded-xl border border-red-100 bg-red-50/35 px-3 py-2">
                    <summary className="cursor-pointer text-xs font-bold text-red-700">إخفاء هذا الشخص مستقبلاً</summary>
                    <p className="mt-2 text-[11px] leading-5 text-red-700/75">أقوى من التخطي: يخفي هذا الشخص من الاستكشاف بينكما.</p>
                    <form action={hideCandidate} className="mt-2">
                      <input name="candidate_id" type="hidden" value={candidate.user_id} />
                      <button className="rounded-lg bg-red-700 px-3 py-2 text-xs font-black text-white" type="submit">تأكيد الإخفاء</button>
                    </form>
                  </details>
                </div>
              </article>
            );
          })}
        </section>

        {candidates.length === 0 ? (
          <section className="mt-7 rounded-[2rem] border border-dashed border-black/15 bg-white p-9 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#153d35]/7 text-2xl">⌁</div>
            <h2 className="mt-4 text-xl font-black text-[#153d35]">لا توجد مطابقة مناسبة الآن</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-black/48">
              هذا لا يعني وجود مشكلة. في المجموعات الصغيرة قد لا يوجد شخص يحقق شروط الطرفين في الوقت نفسه. سنعرض ملفات جديدة عندما تصبح هناك مطابقة صالحة.
            </p>
          </section>
        ) : null}

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 text-xs leading-6 text-black/50"><strong className="text-[#153d35]">الاهتمام خاص.</strong> لا يرسل رسالة مباشرة للطرف الآخر.</div>
          <div className="rounded-2xl bg-white p-4 text-xs leading-6 text-black/50"><strong className="text-[#153d35]">المقدمة خطوة منفصلة.</strong> تظهر فقط بعد اهتمام متبادل.</div>
          <div className="rounded-2xl bg-white p-4 text-xs leading-6 text-black/50"><strong className="text-[#153d35]">المحادثة تحتاج قبولين.</strong> ولا يشارك ميثاق رقم الهاتف تلقائياً.</div>
        </div>
      </div>
    </main>
  );
}
