import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

import { movePhoto, removePhoto, setPrimaryPhoto } from "./actions";
import { PhotoUploader } from "./photo-uploader";

export const dynamic = "force-dynamic";

type PhotoRecord = {
  photo_id: string;
  storage_path: string;
  position: number;
  is_primary: boolean;
  review_state: "pending" | "approved" | "needs_changes" | "rejected";
  review_after: string | null;
  created_at: string;
};

type PhotoWithUrl = PhotoRecord & { signedUrl: string | null };

type TrustSummary = {
  phone_verified: boolean;
  approved_photo: boolean;
  real_person_verified: boolean;
  age_18_plus_verified: boolean;
  identity_verified: boolean;
};

const reviewCopy: Record<PhotoRecord["review_state"], { label: string; className: string; text: string }> = {
  pending: {
    label: "قيد المراجعة",
    className: "bg-amber-50 text-amber-800",
    text: "لن تستخدم الصورة في التعارف قبل الموافقة عليها.",
  },
  approved: {
    label: "مقبولة",
    className: "bg-green-50 text-green-800",
    text: "الصورة اجتازت المراجعة ويمكن استخدامها وفق إعداد الخصوصية الخاص بك.",
  },
  needs_changes: {
    label: "تحتاج تغييراً",
    className: "bg-orange-50 text-orange-800",
    text: "استبدل هذه الصورة بصورة أوضح ومناسبة للملف.",
  },
  rejected: {
    label: "غير مقبولة",
    className: "bg-red-50 text-red-700",
    text: "هذه الصورة لن تُستخدم في الملف. يمكنك حذفها وإضافة صورة أخرى.",
  },
};

const privacyLabels: Record<string, string> = {
  none: "لا أريد عرض صورة",
  blurred: "صورة مموهة في البداية",
  after_mutual_interest: "بعد اهتمام متبادل",
  explicit_approval: "بعد موافقتي الصريحة",
  after_family_involvement: "بعد إشراك العائلة",
  discovery_visible: "يمكن إظهارها في الاستكشاف",
};

function TrustItem({ ok, title, note }: { ok: boolean; title: string; note: string }) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className={ok ? "grid size-7 place-items-center rounded-full bg-green-100 text-sm font-black text-green-800" : "grid size-7 place-items-center rounded-full bg-black/6 text-sm font-black text-black/35"}>
          {ok ? "✓" : "·"}
        </span>
        <span className="font-black text-[#153d35]">{title}</span>
      </div>
      <p className="mt-2 text-xs leading-6 text-black/45">{note}</p>
    </div>
  );
}

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const rpc = asUntypedSupabase(supabase);
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/join");

  const [{ data: application }, { data: profile }, { data: spaces }] = await Promise.all([
    supabase
      .from("waitlist_applications")
      .select("id,status")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("member_profiles")
      .select("profile_completed_at")
      .eq("user_id", userId)
      .maybeSingle(),
    rpc.rpc("list_my_connection_spaces"),
  ]);

  const activeMarriageSpace = Array.isArray(spaces)
    ? spaces.some(
        (space: { space?: string; membership_state?: string }) =>
          space.space === "marriage" && space.membership_state === "active",
      )
    : false;

  if (application?.status !== "invited") redirect("/waitlist");
  if (!profile?.profile_completed_at || !activeMarriageSpace) redirect("/onboarding");

  const [{ data: photoRows, error: photoError }, { data: trustRows }, { data: preferences }] =
    await Promise.all([
      rpc.rpc("list_my_member_photos"),
      rpc.rpc("get_my_identity_trust_summary"),
      supabase
        .from("waitlist_preferences")
        .select("photo_privacy_preference")
        .eq("application_id", application.id)
        .maybeSingle(),
    ]);

  if (photoError) {
    return (
      <main className="min-h-screen px-5 py-10">
        <div className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-white p-7 text-center">
          <h1 className="text-xl font-black text-red-700">تعذر تحميل الصور</h1>
          <p className="mt-2 text-sm leading-6 text-black/55">حاول تحديث الصفحة. لم يتم حذف أو تغيير أي صورة.</p>
        </div>
      </main>
    );
  }

  const photos = ((Array.isArray(photoRows) ? photoRows : []) as PhotoRecord[]).sort(
    (a, b) => a.position - b.position,
  );
  const trust = ((Array.isArray(trustRows) ? trustRows[0] : null) ?? {
    phone_verified: false,
    approved_photo: false,
    real_person_verified: false,
    age_18_plus_verified: false,
    identity_verified: false,
  }) as TrustSummary;

  const photosWithUrls: PhotoWithUrl[] = await Promise.all(
    photos.map(async (photo) => {
      const { data, error } = await supabase.storage
        .from("member-profile-photos")
        .createSignedUrl(photo.storage_path, 10 * 60);
      return { ...photo, signedUrl: error ? null : data.signedUrl };
    }),
  );

  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/member" className="inline-flex items-center gap-2 font-black text-[#153d35]">
            <span className="grid size-9 place-items-center rounded-xl bg-[#153d35] text-white">م</span>
            ميثاق
          </Link>
          <Link className="text-sm font-bold text-black/45 hover:text-[#153d35]" href="/member">العودة لملفي</Link>
        </div>

        {params.updated ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
            تم تحديث صورك.
          </div>
        ) : null}
        {params.error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            تعذر تنفيذ التغيير. لم نتجاوز صلاحيات حسابك أو نجعل أي صورة عامة.
          </div>
        ) : null}

        <section className="mt-7 rounded-[2rem] border border-black/7 bg-white/88 p-6 shadow-[0_25px_70px_rgba(35,43,38,.1)] sm:p-9">
          <p className="text-sm font-black text-[#9d702d]">الصور والثقة</p>
          <h1 className="mt-2 text-3xl font-black text-[#153d35]">صورك خاصة حتى يقرر النظام أين تظهر</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-black/55">
            كل ملف صورة في مساحة تخزين خاصة. رفع الصورة لا يجعلها مرئية لأعضاء آخرين، والصور الجديدة تدخل المراجعة قبل استخدامها في أي تجربة تعارف.
          </p>

          <div className="mt-6 rounded-2xl border border-[#c99a52]/25 bg-[#c99a52]/8 p-4 text-sm leading-7 text-black/58">
            <span className="font-black text-[#8b6228]">تفضيل الصور الذي اخترته:</span>{" "}
            {privacyLabels[preferences?.photo_privacy_preference ?? ""] ?? "غير محدد"}.
            <span className="block text-xs text-black/42">هذا التفضيل يُطبّق لاحقاً مع قواعد الموافقة والمراجعة؛ رفع الصورة لا يتجاوز اختيارك.</span>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photosWithUrls.map((photo, index) => {
              const review = reviewCopy[photo.review_state];
              return (
                <article className="overflow-hidden rounded-3xl border border-black/8 bg-white" key={photo.photo_id}>
                  <div className="aspect-[4/5] bg-black/5">
                    {photo.signedUrl ? (
                      <img alt="صورة ملف خاصة" className="h-full w-full object-cover" src={photo.signedUrl} />
                    ) : (
                      <div className="grid h-full place-items-center px-5 text-center text-xs font-bold text-black/35">تعذر إنشاء معاينة مؤقتة للصورة.</div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${review.className}`}>{review.label}</span>
                      {photo.is_primary ? <span className="rounded-full bg-[#153d35]/8 px-3 py-1 text-xs font-black text-[#153d35]">الرئيسية</span> : null}
                    </div>
                    <p className="mt-3 text-xs leading-6 text-black/45">{review.text}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {!photo.is_primary ? (
                        <form action={setPrimaryPhoto}>
                          <input name="photo_id" type="hidden" value={photo.photo_id} />
                          <button className="rounded-xl bg-[#153d35] px-3 py-2 text-xs font-black text-white" type="submit">اجعلها الرئيسية</button>
                        </form>
                      ) : null}
                      {index > 0 ? (
                        <form action={movePhoto}>
                          <input name="photo_id" type="hidden" value={photo.photo_id} />
                          <input name="direction" type="hidden" value="up" />
                          <button className="rounded-xl border border-black/10 px-3 py-2 text-xs font-bold text-black/55" type="submit">تقديم</button>
                        </form>
                      ) : null}
                      {index < photosWithUrls.length - 1 ? (
                        <form action={movePhoto}>
                          <input name="photo_id" type="hidden" value={photo.photo_id} />
                          <input name="direction" type="hidden" value="down" />
                          <button className="rounded-xl border border-black/10 px-3 py-2 text-xs font-bold text-black/55" type="submit">تأخير</button>
                        </form>
                      ) : null}
                      <form action={removePhoto}>
                        <input name="photo_id" type="hidden" value={photo.photo_id} />
                        <button className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700" type="submit">حذف</button>
                      </form>
                    </div>
                  </div>
                </article>
              );
            })}

            {photosWithUrls.length === 0 ? (
              <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-black/15 bg-[#f8f5ef] p-6 text-center sm:col-span-2 lg:col-span-3">
                <div>
                  <div className="text-lg font-black text-[#153d35]">لم تضف صوراً بعد</div>
                  <p className="mt-2 text-sm leading-6 text-black/45">ابدأ بصورة واضحة وحديثة. أول صورة تسجل تصبح الصورة الرئيسية تلقائياً.</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mx-auto mt-6 max-w-md">
            <PhotoUploader photoCount={photosWithUrls.length} userId={userId} />
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-black/7 bg-white/88 p-6 sm:p-8">
          <p className="text-sm font-black text-[#9d702d]">حالة الثقة</p>
          <h2 className="mt-2 text-2xl font-black text-[#153d35]">ما الذي تم التحقق منه؟</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TrustItem ok={trust.phone_verified} title="رقم الهاتف" note="يُثبت امتلاك وسيلة الدخول للحساب، ولا يظهر في الملف." />
            <TrustItem ok={trust.approved_photo} title="صورة مقبولة" note="تتحول لهذه الحالة بعد اجتياز مراجعة الصورة." />
            <TrustItem ok={trust.real_person_verified} title="شخص حقيقي" note="يحتاج مسار تحقق رسمي بصورة ذاتية/مزود تحقق. لم نفعّله للمستخدمين الجدد بعد." />
            <TrustItem ok={trust.age_18_plus_verified} title="+18 موثّق" note="تأكيد الاستبيان وحده لا يساوي تحقق هوية رسمي؛ هذه العلامة تحتاج دليلاً موثقاً." />
            <TrustItem ok={trust.identity_verified} title="الهوية موثقة" note="لن نطلب مستند الهوية عبر رسائل أو واتساب. سيظهر المسار داخل ميثاق عند ربط مزود التحقق." />
          </div>
          <div className="mt-5 rounded-2xl bg-[#f8f5ef] p-4 text-xs leading-6 text-black/48">
            لا نعرض علامة تحقق غير موجودة فعلياً. ربط مزود التحقق الخارجي ما زال خطوة منفصلة قبل فتح الاستكشاف.
          </div>
        </section>
      </div>
    </main>
  );
}
