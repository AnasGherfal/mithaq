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

type PreviewRow = {
  display_name: string;
  age_band_label: string;
  city: string;
};

type UnreadRow = {
  introduction_id: string;
  unread_count: number | string;
};

type ConversationItem = IntroductionRow & {
  preview: PreviewRow | null;
  unread: number;
};

export default async function ConversationsPage() {
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
    { data: introductionData },
    { data: unreadData },
    { data: activityUnreadData },
  ] = await Promise.all([
    rpc.rpc("list_my_introductions", {}),
    rpc.rpc("list_my_conversation_unread_counts", {}),
    rpc.rpc("get_my_notification_unread_count", {}),
  ]);

  const allIntroductions = Array.isArray(introductionData) ? (introductionData as IntroductionRow[]) : [];
  const relevant = allIntroductions.filter(
    (item) => item.status === "mutually_accepted" || (item.status === "offered" && item.my_decision === "accepted"),
  );
  const pendingIntroductionCount = allIntroductions.filter(
    (item) => item.status === "offered" && item.my_decision === "pending",
  ).length;

  const unreadMap = new Map<string, number>();
  if (Array.isArray(unreadData)) {
    for (const row of unreadData as UnreadRow[]) {
      unreadMap.set(row.introduction_id, Number(row.unread_count) || 0);
    }
  }

  const items: ConversationItem[] = await Promise.all(
    relevant.map(async (introduction) => {
      const { data } = await rpc.rpc("get_introduction_preview", {
        p_introduction_id: introduction.introduction_id,
      });
      const preview = Array.isArray(data) ? ((data[0] as PreviewRow | undefined) ?? null) : null;
      return {
        ...introduction,
        preview,
        unread: unreadMap.get(introduction.introduction_id) ?? 0,
      };
    }),
  );

  const open = items
    .filter((item) => item.status === "mutually_accepted")
    .sort((a, b) => b.unread - a.unread || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const waiting = items
    .filter((item) => item.status === "offered")
    .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
  const totalUnread = open.reduce((sum, item) => sum + item.unread, 0);
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
            pendingIntroductions={pendingIntroductionCount}
            unreadMessages={totalUnread}
            unreadActivity={activityUnread}
          />
        </header>

        <section className="mt-8 rounded-[2rem] border border-black/7 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="text-xs font-black text-[#9d702d]">بعد الموافقة المتبادلة</p>
              <h1 className="mt-2 text-3xl font-black text-[#153d35]">المحادثات الخاصة</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-black/52">
                هذه الصفحة تفرق بين مقدمة وافقت عليها وما زالت تنتظر الطرف الآخر، وبين محادثة فُتحت فعلاً بعد موافقة الطرفين.
              </p>
            </div>
            <div className="flex gap-2 text-center text-xs">
              <div className="min-w-24 rounded-2xl bg-[#153d35]/7 px-4 py-3 text-[#153d35]">
                <div className="text-2xl font-black">{open.length}</div>
                <div className="mt-1 font-bold">مفتوحة</div>
              </div>
              <div className="min-w-24 rounded-2xl bg-[#c99a52]/10 px-4 py-3 text-[#8b6228]">
                <div className="text-2xl font-black">{waiting.length}</div>
                <div className="mt-1 font-bold">بانتظار الرد</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-[#9d702d]">يمكنك التحدث الآن</p>
              <h2 className="mt-1 text-xl font-black text-[#153d35]">المحادثات المفتوحة</h2>
            </div>
            {totalUnread > 0 ? (
              <span className="rounded-full bg-[#153d35] px-4 py-2 text-xs font-black text-white">{totalUnread} غير مقروءة</span>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {open.map((item) => (
              <Link
                className="block rounded-[1.75rem] border border-black/7 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#153d35]/25"
                href={`/conversations/${item.introduction_id}`}
                key={item.introduction_id}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-[#153d35]">{item.preview?.display_name ?? "محادثة خاصة"}</h3>
                    {item.preview ? (
                      <p className="mt-1 text-xs font-bold text-black/42">{item.preview.age_band_label} · {item.preview.city}</p>
                    ) : null}
                    <p className="mt-3 text-xs leading-6 text-black/50">
                      {item.unread > 0
                        ? `لديك ${item.unread} رسالة غير مقروءة. افتح المحادثة للقراءة والرد.`
                        : "المحادثة مفتوحة داخل ميثاق ولا توجد رسائل جديدة حالياً."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.unread > 0 ? (
                      <span className="rounded-full bg-[#153d35] px-3 py-2 text-[11px] font-black text-white">{item.unread} جديدة</span>
                    ) : (
                      <span className="rounded-full bg-green-50 px-3 py-2 text-[11px] font-black text-green-800">مفتوحة</span>
                    )}
                    <span className="text-lg text-black/25">←</span>
                  </div>
                </div>
              </Link>
            ))}

            {open.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-black/15 bg-white p-8 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#153d35]/8 text-xl text-[#153d35]">م</div>
                <h3 className="mt-4 text-lg font-black text-[#153d35]">لا توجد محادثة مفتوحة بعد</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-black/45">
                  المحادثة لا تُفتح بمجرد الاهتمام أو موافقتك وحدك. يجب أن يوافق الطرفان على نفس المقدمة أولاً.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {waiting.length > 0 ? (
          <section className="mt-9">
            <div>
              <p className="text-xs font-black text-[#9d702d]">ليست محادثات بعد</p>
              <h2 className="mt-1 text-lg font-black text-[#153d35]">مقدمات وافقت عليها وتنتظر الرد</h2>
              <p className="mt-2 text-xs leading-6 text-black/45">ستنتقل تلقائياً إلى الأعلى فقط إذا اكتملت الموافقة من الطرفين.</p>
            </div>
            <div className="mt-4 space-y-2">
              {waiting.map((item) => (
                <Link
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#c99a52]/20 bg-[#c99a52]/7 px-5 py-4"
                  href={`/introductions/${item.introduction_id}`}
                  key={item.introduction_id}
                >
                  <div>
                    <div className="text-sm font-black text-[#153d35]">{item.preview?.display_name ?? "مقدمة خاصة"}</div>
                    <div className="mt-1 text-xs text-black/45">وافقت · بانتظار قرار الطرف الآخر</div>
                  </div>
                  <div className="text-xs font-bold text-[#8b6228]">
                    تنتهي {new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium" }).format(new Date(item.expires_at))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-black/8 bg-white p-5 text-xs leading-6 text-black/48">
          <p className="max-w-2xl">
            الرسائل تبقى داخل ميثاق. لا نشارك رقم الهاتف أو بيانات الاتصال تلقائياً حتى بعد فتح المحادثة.
          </p>
          <Link className="font-black text-[#8b6228] underline" href="/introductions">عرض كل المقدمات</Link>
        </div>
      </div>
    </main>
  );
}
