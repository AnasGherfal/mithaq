import Link from "next/link";
import { redirect } from "next/navigation";

import { MemberPrimaryNav } from "@/components/member-primary-nav";
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
  age_band_label: string;
  city: string;
};

type UnreadRow = {
  introduction_id: string;
  unread_count: number | string;
};

type InboxItem = IntroductionRow & { preview: IntroductionPreview | null };

const statusLabels: Record<IntroductionRow["status"], string> = {
  offered: "مقدمة نشطة",
  mutually_accepted: "موافقة متبادلة",
  declined: "تم الرفض",
  expired: "انتهت المهلة",
  cancelled: "أُلغيت",
  closed: "مغلقة",
};

const decisionLabels: Record<IntroductionRow["my_decision"], string> = {
  pending: "قرارك مطلوب",
  accepted: "وافقت",
  declined: "رفضت",
};

function isActive(status: IntroductionRow["status"]) {
  return status === "offered" || status === "mutually_accepted";
}

function actionCopy(item: InboxItem) {
  if (item.status === "mutually_accepted") {
    return {
      badge: "المحادثة متاحة",
      badgeClass: "bg-green-50 text-green-800",
      title: "وافقتما على المقدمة",
      text: "يمكنكما الآن التحدث داخل ميثاق. لا يتم كشف رقم الهاتف أو أي وسيلة اتصال تلقائياً.",
      cta: "فتح المقدمة والمحادثة",
    };
  }

  if (item.my_decision === "pending") {
    return {
      badge: "قرارك مطلوب",
      badgeClass: "bg-amber-50 text-amber-800",
      title: "اهتمام متبادل، لكن الموافقة لم تتم بعد",
      text: "راجع التفاصيل واتخذ قراراً جديداً مستقلاً عن الاهتمام الذي سجلته في الاستكشاف.",
      cta: "مراجعة واتخاذ قرار",
    };
  }

  return {
    badge: "بانتظار الطرف الآخر",
    badgeClass: "bg-[#c99a52]/12 text-[#8b6228]",
    title: "أنت وافقت على المقدمة",
    text: "لن تُفتح المحادثة إلا إذا وافق الطرف الآخر أيضاً، ولن نكشف لك قراره قبل أن يصبح نهائياً.",
    cta: "متابعة حالة المقدمة",
  };
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

  const [
    { data, error },
    { data: unreadData },
    { data: activityUnreadData },
  ] = await Promise.all([
    rpc.rpc("list_my_introductions", {}),
    rpc.rpc("list_my_conversation_unread_counts", {}),
    rpc.rpc("get_my_notification_unread_count", {}),
  ]);

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

  const active = items
    .filter((item) => isActive(item.status))
    .sort((a, b) => {
      const priority = (item: InboxItem) =>
        item.status === "offered" && item.my_decision === "pending" ? 0 : item.status === "mutually_accepted" ? 1 : 2;
      return priority(a) - priority(b) || new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
    });
  const history = items.filter((item) => !isActive(item.status));
  const pendingCount = active.filter((item) => item.status === "offered" && item.my_decision === "pending").length;
  const totalUnread = Array.isArray(unreadData)
    ? (unreadData as UnreadRow[]).reduce((sum, row) => sum + (Number(row.unread_count) || 0), 0)
    : 0;
  const activityUnread = Number(activityUnreadData) || 0;

  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/member" className="inline-flex items-center gap-2 font-black text-[#153d35]">
            <span className="grid size-9 place-items-center rounded-xl bg-[#153d35] text-white">م</span>
            ميثاق
          </Link>
          <MemberPrimaryNav
            pendingIntroductions={pendingCount}
            unreadMessages={totalUnread}
            unreadActivity={activityUnread}
          />
        </header>

        <section className="mt-8 rounded-[2rem] border border-black/7 bg-[#153d35] p-6 text-white shadow-[0_25px_70px_rgba(35,43,38,.14)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black text-[#e8c991]">الخطوة بعد الاهتمام المتبادل</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">المقدمات</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                الاهتمام المتبادل لا يساوي الموافقة على التعارف. كل مقدمة تعطي الطرفين فرصة جديدة ومحدودة الوقت لقراءة التفاصيل واتخاذ قرار صريح.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <div className="text-2xl font-black">{pendingCount}</div>
                <div className="mt-1 text-white/60">تحتاج قرارك</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <div className="text-2xl font-black">{active.length}</div>
                <div className="mt-1 text-white/60">نشطة الآن</div>
              </div>
            </div>
          </div>
        </section>

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

        <section className="mt-7 space-y-4">
          {active.map((item) => {
            const copy = actionCopy(item);
            return (
              <Link
                className="block rounded-[2rem] border border-black/8 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#153d35]/25 sm:p-6"
                href={`/introductions/${item.introduction_id}`}
                key={item.introduction_id}
              >
                <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black text-[#153d35]">{item.preview?.display_name ?? "مقدمة خاصة"}</h2>
                      <span className={`rounded-full px-3 py-1.5 text-[11px] font-black ${copy.badgeClass}`}>{copy.badge}</span>
                    </div>
                    {item.preview ? (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-black/42">
                        <span>{item.preview.age_band_label}</span>
                        <span>{item.preview.city}</span>
                      </div>
                    ) : null}
                    <h3 className="mt-4 text-sm font-black text-black/68">{copy.title}</h3>
                    <p className="mt-1 max-w-2xl text-xs leading-6 text-black/48">{copy.text}</p>
                  </div>
                  <div className="sm:text-left">
                    <div className="text-[11px] font-bold text-black/35">
                      تنتهي {new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.expires_at))}
                    </div>
                    <div className="mt-3 inline-flex rounded-xl bg-[#f8f5ef] px-4 py-2 text-xs font-black text-[#153d35]">{copy.cta}</div>
                  </div>
                </div>
              </Link>
            );
          })}

          {active.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-black/15 bg-white p-9 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#153d35]/7 text-xl text-[#153d35]">م</div>
              <h2 className="mt-4 text-lg font-black text-[#153d35]">لا توجد مقدمات تحتاج انتباهك الآن</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-black/45">
                عندما يكون الاهتمام متبادلاً بين ملفين مؤهلين، ينشئ ميثاق مقدمة محدودة الوقت هنا. إذا كان عدد أعضاء البيتا صغيراً فقد تمر فترات بدون مقدمات وهذا طبيعي.
              </p>
              <Link className="mt-5 inline-flex rounded-xl bg-[#153d35] px-5 py-3 text-sm font-black text-white" href="/discovery">العودة للاستكشاف</Link>
            </div>
          ) : null}
        </section>

        {history.length > 0 ? (
          <details className="mt-8 rounded-3xl border border-black/8 bg-white p-5">
            <summary className="cursor-pointer text-sm font-black text-[#153d35]">سجل المقدمات السابقة · {history.length}</summary>
            <div className="mt-4 space-y-2">
              {history.map((item) => (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f8f5ef] px-4 py-3" key={item.introduction_id}>
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
          </details>
        ) : null}

        <div className="mt-7 rounded-3xl border border-[#c99a52]/25 bg-[#c99a52]/8 p-5 text-xs leading-6 text-black/52">
          <strong className="text-[#8b6228]">خصوصية:</strong> حتى بعد الموافقة المتبادلة، ميثاق يفتح محادثة داخلية فقط. رقم الهاتف وبيانات تسجيل الدخول ووسائل الاتصال الخارجية لا تُشارك تلقائياً.
        </div>
      </div>
    </main>
  );
}
