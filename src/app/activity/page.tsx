import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

import { markAllActivityRead } from "./actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type NotificationRow = {
  notification_id: string;
  notification_kind: string;
  introduction_id: string;
  created_at: string;
  is_read: boolean;
};

const activityCopy: Record<string, { title: string; text: string }> = {
  introduction_offered: {
    title: "مقدمة جديدة",
    text: "لديك مقدمة خاصة جديدة تحتاج أن تراجعها وتتخذ قرارك بشكل مستقل.",
  },
  introduction_mutually_accepted: {
    title: "اكتملت الموافقة المتبادلة",
    text: "وافق الطرفان على المقدمة، وأصبحت المحادثة الخاصة داخل ميثاق متاحة ما دامت شروط الأهلية والسلامة مستمرة.",
  },
  message_received: {
    title: "رسالة جديدة",
    text: "وصلتك رسالة داخل محادثة ميثاق. لا نعرض نص الرسالة في مركز النشاط حفاظاً على الخصوصية.",
  },
};

function activityHref(item: NotificationRow) {
  if (item.notification_kind === "introduction_offered") {
    return `/introductions/${item.introduction_id}`;
  }
  if (item.notification_kind === "introduction_mutually_accepted" || item.notification_kind === "message_received") {
    return `/conversations/${item.introduction_id}`;
  }
  return `/introductions/${item.introduction_id}`;
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ before?: string; beforeId?: string }>;
}) {
  const query = await searchParams;
  const hasCursorPart = Boolean(query.before || query.beforeId);
  const validCursor =
    !hasCursorPart ||
    (Boolean(query.before) &&
      Boolean(query.beforeId) &&
      Number.isFinite(Date.parse(query.before ?? "")) &&
      uuidPattern.test(query.beforeId ?? ""));

  if (!validCursor) redirect("/activity");

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

  const [{ data: notificationData, error: notificationError }, { data: unreadData }] = await Promise.all([
    rpc.rpc("list_my_notifications_v2", {
      p_before_created_at: query.before ?? null,
      p_before_notification_id: query.beforeId ?? null,
      p_limit: PAGE_SIZE,
    }),
    rpc.rpc("get_my_notification_unread_count", {}),
  ]);

  const notifications =
    !notificationError && Array.isArray(notificationData) ? (notificationData as NotificationRow[]) : [];
  const unreadCount = Number(unreadData) || 0;
  const last = notifications[notifications.length - 1];
  const hasOlder = notifications.length === PAGE_SIZE && Boolean(last);

  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link className="font-black text-[#153d35]" href="/member">← حسابي</Link>
          <div className="flex items-center gap-2">
            <Link className="text-xs font-black text-[#8b6228]" href="/introductions">المقدمات</Link>
            <Link className="text-xs font-black text-[#8b6228]" href="/conversations">المحادثات</Link>
          </div>
        </div>

        <section className="mt-7 rounded-[2rem] border border-black/7 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black text-[#9d702d]">Stage G</p>
              <h1 className="mt-2 text-3xl font-black text-[#153d35]">مركز النشاط</h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-black/52">
                إشعارات مختصرة عن المقدمات والموافقة المتبادلة والرسائل. لا نعرض نص الرسائل أو أرقام الهواتف أو بيانات اتصال خاصة هنا.
              </p>
            </div>
            {unreadCount > 0 ? (
              <form action={markAllActivityRead}>
                <button className="rounded-xl border border-[#153d35]/15 bg-[#153d35]/5 px-4 py-2.5 text-xs font-black text-[#153d35]" type="submit">
                  تمييز الكل كمقروء ({unreadCount})
                </button>
              </form>
            ) : (
              <span className="rounded-full bg-green-50 px-4 py-2 text-xs font-black text-green-800">لا يوجد جديد</span>
            )}
          </div>
        </section>

        <div className="mt-5 space-y-3">
          {notifications.length === 0 ? (
            <section className="rounded-[2rem] border border-black/7 bg-white p-7 text-center shadow-sm">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#153d35]/8 text-xl text-[#153d35]">ن</div>
              <h2 className="mt-4 text-xl font-black text-[#153d35]">لا يوجد نشاط بعد</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-black/48">
                ستظهر هنا المقدمات الجديدة، اكتمال الموافقة المتبادلة، ووصول الرسائل بدون كشف محتوى خاص في الإشعار.
              </p>
            </section>
          ) : (
            notifications.map((item) => {
              const copy = activityCopy[item.notification_kind] ?? {
                title: "نشاط جديد",
                text: "لديك تحديث جديد داخل ميثاق.",
              };

              return (
                <Link
                  className={`block rounded-[1.75rem] border p-5 shadow-sm transition hover:border-[#153d35]/25 ${
                    item.is_read ? "border-black/7 bg-white" : "border-[#c99a52]/30 bg-[#c99a52]/8"
                  }`}
                  href={activityHref(item)}
                  key={item.notification_id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-black text-[#153d35]">{copy.title}</h2>
                        {!item.is_read ? (
                          <span className="rounded-full bg-[#153d35] px-2.5 py-1 text-[10px] font-black text-white">جديد</span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs leading-6 text-black/50">{copy.text}</p>
                    </div>
                    <time className="text-[11px] font-bold text-black/35" dateTime={item.created_at}>
                      {new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}
                    </time>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {(query.before || hasOlder) ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {query.before ? (
              <Link className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-black text-black/55" href="/activity">
                أحدث النشاط
              </Link>
            ) : null}
            {hasOlder && last ? (
              <Link
                className="rounded-xl bg-[#153d35] px-4 py-2.5 text-xs font-black text-white"
                href={`/activity?before=${encodeURIComponent(last.created_at)}&beforeId=${last.notification_id}`}
              >
                نشاط أقدم
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
