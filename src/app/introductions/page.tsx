import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

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
  presentation_mode: string;
  alignment_reasons: string[];
  real_person_verified: boolean;
  age_18_plus_verified: boolean;
  identity_verified: boolean;
};

type InboxItem = IntroductionRow & { preview: IntroductionPreview | null };

const statusLabels: Record<IntroductionRow["status"], string> = {
  offered: "بانتظار القرار",
  mutually_accepted: "موافقة متبادلة",
  declined: "تم الرفض",
  expired: "انتهت المهلة",
  cancelled: "أُلغيت",
  closed: "مغلقة",
};

const decisionLabels: Record<IntroductionRow["my_decision"], string> = {
  pending: "لم تقرر بعد",
  accepted: "وافقت",
  declined: "رفضت",
};

function isActive(status: IntroductionRow["status"]) {
  return status === "offered" || status === "mutually_accepted";
}

export default async function IntroductionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    declined?: string;
    expired?: string;
    cancelled?: string;
    hidden?: string;
    blocked?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
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

  const { data, error } = await rpc.rpc("list_my_introductions", {});
  const rows = !error && Array.isArray(data) ? (data as IntroductionRow[]) : [];

  const items: InboxItem[] = await Promise.all(
    rows.map(async (row) => {
      if (!isActive(row.status)) return { ...row, preview: null };

      const { data: previewData, error: previewError } = await rpc.rpc("get_introduction_preview", {
        p_introduction_id: row.introduction_id,
      });
      const preview = !previewError && Array.isArray(previewData)
        ? (previewData[0] as IntroductionPreview | undefined) ?? null
        : null;
      return { ...row, preview };
    }),
  );

  const active = items.filter((item) => isActive(item.status));
  const history = items.filter((item) => !isActive(item.status));

  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link className="font-black text-[#153d35]" href="/member">ميثاق</Link>
            <h1 className="mt-2 text-3xl font-black text-[#153d35]">المقدمات</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-black/50">
              حتى بعد وجود اهتمام متبادل، لا يعتبر ذلك موافقة على التعارف. كل مقدمة تحتاج قراراً صريحاً جديداً من الطرفين خلال المهلة المحددة.
            </p>
          </div>
          <Link className="rounded-xl border border-black/10 bg-white px-4 py-3 text-xs font-black text-[#153d35]" href="/discovery">
            العودة للاستكشاف
          </Link>
        </div>

        {params.declined === "1" ? (
          <div className="mt-5 rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm font-bold text-black/55">تم تسجيل الرفض وإنهاء المقدمة.</div>
        ) : null}
        {params.expired === "1" ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">انتهت مهلة المقدمة قبل اكتمال القرار.</div>
        ) : null}
        {params.cancelled === "1" ? (
          <div className="mt-5 rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm font-bold text-black/55">أُلغيت المقدمة لأن شروط الأهلية أو الخصوصية لم تعد متحققة.</div>
        ) : null}
        {params.hidden === "1" ? (
          <div className="mt-5 rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm font-bold text-black/55">تم إخفاء هذا الشخص بينكما وإغلاق أي مقدمة نشطة بدون مشاركة سبب الإخفاء معه.</div>
        ) : null}
        {params.blocked === "1" ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">تم حظر هذا الشخص. لن يظهر لك في مسارات التعارف المتاحة.</div>
        ) : null}
        {params.error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">تعذر تنفيذ العملية. لم يتم تغيير قرارك.</div>
        ) : null}

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-[#153d35]">المقدمات النشطة</h2>
            <span className="text-xs font-bold text-black/38">{active.length}</span>
          </div>

          <div className="mt-4 space-y-3">
            {active.map((item) => (
              <Link
                className="block rounded-3xl border border-black/8 bg-white p-5 shadow-sm transition hover:border-[#153d35]/25"
                href={`/introductions/${item.introduction_id}`}
                key={item.introduction_id}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-[#153d35]">{item.preview?.display_name ?? "مقدمة خاصة"}</h3>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black ${item.status === "mutually_accepted" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
                        {statusLabels[item.status]}
                      </span>
                    </div>
                    {item.preview ? (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-black/42">
                        <span>{item.preview.age_band_label}</span>
                        <span>{item.preview.city}</span>
                        <span>{item.preview.gender === "man" ? "رجل" : "امرأة"}</span>
                      </div>
                    ) : null}
                    <p className="mt-3 text-xs font-bold text-black/48">قرارك: {decisionLabels[item.my_decision]}</p>
                  </div>
                  <div className="text-left text-xs font-bold text-black/38" dir="rtl">
                    تنتهي {new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.expires_at))}
                  </div>
                </div>
              </Link>
            ))}

            {active.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-black/15 bg-white p-8 text-center">
                <div className="text-base font-black text-[#153d35]">لا توجد مقدمات نشطة الآن</div>
                <p className="mt-2 text-sm leading-6 text-black/42">عندما يكون الاهتمام متبادلاً بين ملفين مؤهلين، تظهر مقدمة هنا ويحتاج الطرفان إلى قرار جديد.</p>
              </div>
            ) : null}
          </div>
        </section>

        {history.length > 0 ? (
          <section className="mt-9">
            <h2 className="text-lg font-black text-[#153d35]">السجل</h2>
            <div className="mt-3 space-y-2">
              {history.map((item) => (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/7 bg-white/65 px-4 py-3" key={item.introduction_id}>
                  <div>
                    <div className="text-sm font-black text-black/60">{statusLabels[item.status]}</div>
                    <div className="mt-1 text-[11px] font-bold text-black/35">قرارك: {decisionLabels[item.my_decision]}</div>
                  </div>
                  <div className="text-xs font-bold text-black/35">
                    {new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium" }).format(new Date(item.created_at))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-8 rounded-3xl border border-[#c99a52]/25 bg-[#c99a52]/8 p-5 text-xs leading-6 text-black/52">
          الموافقة المتبادلة لا تكشف رقم الهاتف أو تفتح تواصلاً خارج ميثاق. واجهة المحادثة نفسها تبقى خطوة منفصلة ولن تفتح إلا للمقدمات التي وافق عليها الطرفان.
        </div>
      </div>
    </main>
  );
}
