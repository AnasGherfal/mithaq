import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

import {
  blockIntroductionMember,
  hideRecognizedIntroduction,
  respondToIntroduction,
  revealIntroductionPhoto,
} from "../actions";

export const dynamic = "force-dynamic";

type IntroductionRow = {
  introduction_id: string;
  status: "offered" | "mutually_accepted" | "declined" | "expired" | "cancelled" | "closed";
  my_decision: "pending" | "accepted" | "declined";
  created_at: string;
  expires_at: string;
};

type IntroductionPreview = {
  display_name: string;
  about_me: string;
  occupation: string | null;
  education: string | null;
  gender: "man" | "woman";
  age_band_id: number;
  age_band_label: string;
  country_code: string;
  city: string;
  origin_region: string | null;
  marital_status: string;
  has_children: boolean;
  primary_photo_url: string | null;
  presentation_mode: "open_profile" | "controlled_reveal" | string;
  alignment_reasons: string[];
  real_person_verified: boolean;
  age_18_plus_verified: boolean;
  identity_verified: boolean;
};

type RevealState = {
  photo_preference: string;
  approved_photo_available: boolean;
  photo_revealed: boolean;
  can_reveal_photo: boolean;
  other_photo_revealed: boolean;
};

const maritalLabels: Record<string, string> = {
  never_married: "لم يسبق له/لها الزواج",
  divorced: "مطلق/مطلقة",
  widowed: "أرمل/أرملة",
  married: "متزوج/متزوجة",
};

const alignmentLabels: Record<string, string> = {
  same_city: "نفس المدينة",
  living_arrangement: "توافق في السكن",
  children_plan: "توافق حول الأطفال",
  work_after_marriage: "توافق حول العمل",
  wedding_style: "توافق في شكل الزواج",
};

const terminalCopy: Record<string, { title: string; text: string }> = {
  declined: { title: "انتهت هذه المقدمة بالرفض", text: "لن تُفتح محادثة أو وسيلة اتصال من هذه المقدمة." },
  expired: { title: "انتهت مهلة المقدمة", text: "انتهت المهلة قبل اكتمال القرار من الطرفين." },
  cancelled: { title: "أُلغيت المقدمة", text: "أحد شروط الأهلية أو الخصوصية لم يعد متحققاً، لذلك أُغلقت المقدمة." },
  closed: { title: "هذه المقدمة مغلقة", text: "لم تعد هذه المقدمة نشطة." },
};

function extractPhotoId(value: string | null) {
  if (!value?.startsWith("mithaq-introduction-photo://")) return null;
  const id = value.split("/").pop();
  return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}

function TrustBadges({ preview }: { preview: IntroductionPreview }) {
  const badges = [
    preview.real_person_verified ? "شخص حقيقي" : null,
    preview.age_18_plus_verified ? "+18 موثق" : null,
    preview.identity_verified ? "هوية موثقة" : null,
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

export default async function IntroductionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    new?: string;
    accepted?: string;
    mutual?: string;
    revealed?: string;
    error?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) notFound();

  const supabase = await createClient();
  const rpc = asUntypedSupabase(supabase);
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/join");

  const { data: application } = await supabase
    .from("waitlist_applications")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  if (application?.status !== "invited") redirect("/waitlist");

  const { data: listData, error: listError } = await rpc.rpc("list_my_introductions", {});
  if (listError || !Array.isArray(listData)) notFound();

  const row = (listData as IntroductionRow[]).find((item) => item.introduction_id === id);
  if (!row) notFound();

  const active = row.status === "offered" || row.status === "mutually_accepted";
  let preview: IntroductionPreview | null = null;
  let signedPhotoUrl: string | null = null;
  let revealState: RevealState | null = null;

  if (active) {
    const { data: previewData, error: previewError } = await rpc.rpc("get_introduction_preview", {
      p_introduction_id: id,
    });

    if (!previewError && Array.isArray(previewData)) {
      preview = (previewData[0] as IntroductionPreview | undefined) ?? null;
    }

    const photoId = extractPhotoId(preview?.primary_photo_url ?? null);
    if (photoId) {
      const { data: storagePath, error: pathError } = await rpc.rpc("get_my_introduction_photo_path", {
        p_introduction_id: id,
        p_photo_id: photoId,
      });
      if (!pathError && typeof storagePath === "string") {
        const { data: signed, error: signedError } = await supabase.storage
          .from("member-profile-photos")
          .createSignedUrl(storagePath, 5 * 60);
        if (!signedError) signedPhotoUrl = signed.signedUrl;
      }
    }

    if (row.status === "mutually_accepted") {
      const { data: revealData, error: revealError } = await rpc.rpc("get_my_introduction_reveal_state", {
        p_introduction_id: id,
      });
      if (!revealError && Array.isArray(revealData)) {
        revealState = (revealData[0] as RevealState | undefined) ?? null;
      }
    }
  }

  if (!active) {
    const copy = terminalCopy[row.status] ?? terminalCopy.closed;
    return (
      <main className="min-h-screen px-5 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-xl">
          <Link className="font-black text-[#153d35]" href="/introductions">← المقدمات</Link>
          <section className="mt-7 rounded-[2rem] border border-black/7 bg-white p-7 text-center shadow-sm sm:p-9">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-black/5 text-2xl">✓</div>
            <h1 className="mt-5 text-2xl font-black text-[#153d35]">{copy.title}</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-black/52">{copy.text}</p>
            <Link className="mt-6 inline-block rounded-xl bg-[#153d35] px-5 py-3 text-sm font-black text-white" href="/discovery">
              العودة للاستكشاف
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link className="font-black text-[#153d35]" href="/introductions">← المقدمات</Link>
          <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-black/45">
            تنتهي {new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.expires_at))}
          </span>
        </div>

        {query.new === "1" ? (
          <div className="mt-5 rounded-2xl border border-[#c99a52]/30 bg-[#c99a52]/10 px-4 py-3 text-sm font-bold leading-6 text-[#8b6228]">
            كان الاهتمام متبادلاً، لذلك أنشأ ميثاق مقدمة خاصة. هذا لا يعني أنك وافقت على التعارف بعد؛ اختر قرارك من جديد أدناه.
          </div>
        ) : null}
        {query.accepted === "1" ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
            تم تسجيل موافقتك. لن تُفتح المرحلة التالية إلا إذا وافق الطرف الآخر أيضاً.
          </div>
        ) : null}
        {query.mutual === "1" ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold leading-6 text-green-800">
            وافق الطرفان على هذه المقدمة. لا توجد مشاركة لأرقام الهواتف، والمحادثة نفسها ما زالت مغلقة حتى نفتح طبقتها الآمنة.
          </div>
        ) : null}
        {query.revealed === "1" ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
            وافقت على إظهار صورتك المعتمدة لهذا الطرف ضمن هذه المقدمة فقط.
          </div>
        ) : null}
        {query.error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            تعذر تنفيذ العملية. لم نغيّر قرارك أو إعدادات الخصوصية.
          </div>
        ) : null}

        <section className="mt-7 overflow-hidden rounded-[2rem] border border-black/7 bg-white shadow-sm">
          <div className="aspect-[16/9] bg-[#f1eee7] sm:aspect-[2/1]">
            {signedPhotoUrl ? (
              <img alt="صورة معتمدة ضمن المقدمة" className="h-full w-full object-cover" src={signedPhotoUrl} />
            ) : (
              <div className="grid h-full place-items-center p-6 text-center">
                <div>
                  <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#153d35]/8 text-2xl text-[#153d35]">م</div>
                  <div className="mt-3 text-sm font-black text-[#153d35]">الصورة غير ظاهرة حالياً</div>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-black/42">
                    ظهور الصور داخل المقدمة يتبع إعداد الخصوصية الذي اختاره صاحب الصورة، وليس قرار الطرف الآخر.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8">
            {preview ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-black text-[#153d35]">{preview.display_name}</h1>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-black/45">
                      <span>{preview.gender === "man" ? "رجل" : "امرأة"}</span>
                      <span>{preview.age_band_label}</span>
                      <span>{preview.city}</span>
                      <span>{maritalLabels[preview.marital_status] ?? preview.marital_status}</span>
                      <span>{preview.has_children ? "لديه/لديها أطفال" : "بدون أطفال"}</span>
                    </div>
                  </div>
                  <span className={`rounded-full px-4 py-2 text-xs font-black ${row.status === "mutually_accepted" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
                    {row.status === "mutually_accepted" ? "موافقة متبادلة" : row.my_decision === "accepted" ? "وافقت · بانتظار الطرف الآخر" : "قرارك مطلوب"}
                  </span>
                </div>

                <TrustBadges preview={preview} />

                <p className="mt-5 whitespace-pre-line text-sm leading-7 text-black/62">{preview.about_me}</p>

                {(preview.occupation || preview.education || preview.origin_region) ? (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#153d35]">
                    {preview.occupation ? <span className="rounded-full bg-[#153d35]/7 px-3 py-2">{preview.occupation}</span> : null}
                    {preview.education ? <span className="rounded-full bg-[#153d35]/7 px-3 py-2">{preview.education}</span> : null}
                    {preview.origin_region ? <span className="rounded-full bg-[#153d35]/7 px-3 py-2">الأصل: {preview.origin_region}</span> : null}
                  </div>
                ) : null}

                {preview.alignment_reasons?.length ? (
                  <div className="mt-6 rounded-2xl bg-[#f8f5ef] p-4">
                    <div className="text-xs font-black text-[#8b6228]">نقاط توافق ظهرت قبل المقدمة</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {preview.alignment_reasons.map((reason) => (
                        <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-black/55" key={reason}>
                          {alignmentLabels[reason] ?? reason}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                تعذر تحميل تفاصيل المقدمة بأمان. لا تتخذ قراراً حتى تعود التفاصيل للظهور.
              </div>
            )}

            {row.status === "offered" && row.my_decision === "pending" && preview ? (
              <div className="mt-7 rounded-3xl border border-[#c99a52]/25 bg-[#c99a52]/8 p-5">
                <h2 className="text-lg font-black text-[#153d35]">هل تقبل هذه المقدمة؟</h2>
                <p className="mt-2 text-xs leading-6 text-black/52">
                  هذا قرار مستقل عن زر الاهتمام السابق. الرفض ينهي المقدمة، والموافقة وحدها لا تفتح تواصلاً ما لم يوافق الطرف الآخر أيضاً.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <form action={respondToIntroduction}>
                    <input name="introduction_id" type="hidden" value={id} />
                    <input name="decision" type="hidden" value="accept" />
                    <button className="w-full rounded-xl bg-[#153d35] px-4 py-3 text-sm font-black text-white" type="submit">أقبل المقدمة</button>
                  </form>
                  <form action={respondToIntroduction}>
                    <input name="introduction_id" type="hidden" value={id} />
                    <input name="decision" type="hidden" value="decline" />
                    <button className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-black/55" type="submit">لا أقبل</button>
                  </form>
                </div>
              </div>
            ) : null}

            {row.status === "offered" && row.my_decision === "accepted" ? (
              <div className="mt-7 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-bold leading-6 text-green-800">
                أنت وافقت على المقدمة. بانتظار قرار الطرف الآخر، ولن يعرف أي وسيلة اتصال خاصة بك من هذه الخطوة.
              </div>
            ) : null}

            {row.status === "mutually_accepted" ? (
              <div className="mt-7 space-y-4">
                <div className="rounded-3xl border border-green-200 bg-green-50 p-5">
                  <h2 className="text-lg font-black text-green-900">موافقة متبادلة</h2>
                  <p className="mt-2 text-xs leading-6 text-green-800/80">
                    وافق الطرفان على التعارف داخل ميثاق. لم نفتح المحادثة في هذا الإصدار بعد، ولن نشارك أرقام الهواتف تلقائياً.
                  </p>
                </div>

                {revealState?.can_reveal_photo ? (
                  <form action={revealIntroductionPhoto} className="rounded-2xl border border-[#c99a52]/25 bg-[#c99a52]/8 p-4">
                    <input name="introduction_id" type="hidden" value={id} />
                    <div className="text-sm font-black text-[#8b6228]">إظهار صورتي لهذا الطرف</div>
                    <p className="mt-1 text-xs leading-6 text-black/50">
                      إعدادك الحالي يتطلب موافقة صريحة منك. هذا الزر يكشف صورك المعتمدة داخل هذه المقدمة فقط.
                    </p>
                    <button className="mt-3 rounded-xl bg-[#8b6228] px-4 py-3 text-xs font-black text-white" type="submit">أوافق على إظهار صورتي</button>
                  </form>
                ) : null}

                {revealState?.photo_revealed ? (
                  <div className="rounded-2xl bg-[#f8f5ef] p-4 text-xs font-bold leading-6 text-black/52">صورتك أصبحت متاحة للطرف الآخر وفق إعداد الخصوصية لهذه المقدمة.</div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-7 border-t border-black/7 pt-5">
              <details className="rounded-2xl border border-black/8 px-4 py-3">
                <summary className="cursor-pointer text-xs font-black text-black/55">أعرف هذا الشخص ولا أريد أن نرى بعضنا</summary>
                <p className="mt-2 text-xs leading-6 text-black/45">
                  يستخدم هذا للإخفاء المتبادل في مسار التعارف ويغلق المقدمة النشطة بدون إرسال سبب الإخفاء للطرف الآخر.
                </p>
                <form action={hideRecognizedIntroduction} className="mt-3">
                  <input name="introduction_id" type="hidden" value={id} />
                  <button className="rounded-xl border border-black/10 px-4 py-2 text-xs font-black text-black/60" type="submit">إخفاء هذا الشخص</button>
                </form>
              </details>

              <details className="mt-2 rounded-2xl border border-red-100 bg-red-50/30 px-4 py-3">
                <summary className="cursor-pointer text-xs font-black text-red-700">حظر هذا الشخص</summary>
                <p className="mt-2 text-xs leading-6 text-red-700/75">الحظر أقوى من الإخفاء ويمنع مسارات التفاعل المتاحة بينكما.</p>
                <form action={blockIntroductionMember} className="mt-3">
                  <input name="introduction_id" type="hidden" value={id} />
                  <button className="rounded-xl bg-red-700 px-4 py-2 text-xs font-black text-white" type="submit">تأكيد الحظر</button>
                </form>
              </details>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
