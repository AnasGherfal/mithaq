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

type PreviewRow = {
  display_name: string;
  age_band_label: string;
  city: string;
};

type UnreadRow = {
  introduction_id: string;
  unread_count: number | string;
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

  const [{ data: introductionData }, { data: unreadData }] = await Promise.all([
    rpc.rpc("list_my_introductions", {}),
    rpc.rpc("list_my_conversation_unread_counts", {}),
  ]);

  const introductions = Array.isArray(introductionData)
    ? (introductionData as IntroductionRow[]).filter(
        (item) => item.status === "mutually_accepted" || (item.status === "offered" && item.my_decision === "accepted"),
      )
    : [];

  const unreadMap = new Map<string, number>();
  if (Array.isArray(unreadData)) {
    for (const row of unreadData as UnreadRow[]) {
      unreadMap.set(row.introduction_id, Number(row.unread_count) || 0);
    }
  }

  const previews = new Map<string, PreviewRow | null>();
  await Promise.all(
    introductions.map(async (introduction) => {
      const { data } = await rpc.rpc("get_introduction_preview", {
        p_introduction_id: introduction.introduction_id,
      });
      previews.set(
        introduction.introduction_id,
        Array.isArray(data) ? ((data[0] as PreviewRow | undefined) ?? null) : null,
      );
    }),
  );

  const totalUnread = introductions.reduce(
    (sum, introduction) => sum + (unreadMap.get(introduction.introduction_id) ?? 0),
    0,
  );

  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link className="font-black text-[#153d35]" href="/member">← حسابي</Link>
          <Link className="text-xs font-black text-[#8b6228]" href="/introductions">كل المقدمات</Link>
        </div>

        <section className="mt-7 rounded-[2rem] border border-black/7 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black text-[#9d702d]">Stage F</p>
              <h1 className="mt-2 text-3xl font-black text-[#153d35]">المحادثات الخاصة</h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-black/52">
                لا تظهر هنا إلا المقدمات التي وافقت عليها أنت. الرسائل نفسها لا تُفتح إلا بعد موافقة الطرفين واستمرار شروط الأهلية والسلامة.
              </p>
            </div>
            {totalUnread > 0 ? (
              <span className="rounded-full bg-[#153d35] px-4 py-2 text-xs font-black text-white">{totalUnread} غير مقروءة</span>
            ) : null}
          </div>
        </section>

        <div className="mt-5 space-y-3">
          {introductions.length === 0 ? (
            <section className="rounded-[2rem] border border-black/7 bg-white p-7 text-center shadow-sm">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#153d35]/8 text-xl text-[#153d35]">م</div>
              <h2 className="mt-4 text-xl font-black text-[#153d35]">لا توجد محادثات بعد</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-black/48">
                عندما تقبل مقدمة، ستظهر هنا. إذا وافق الطرف الآخر أيضاً، تتحول إلى محادثة نصية خاصة داخل ميثاق.
              </p>
              <Link className="mt-5 inline-block rounded-xl bg-[#153d35] px-5 py-3 text-sm font-black text-white" href="/introductions">
                فتح المقدمات
              </Link>
            </section>
          ) : (
            introductions.map((introduction) => {
              const preview = previews.get(introduction.introduction_id);
              const unread = unreadMap.get(introduction.introduction_id) ?? 0;
              const waiting = introduction.status === "offered";

              return (
                <Link
                  className="block rounded-[1.75rem] border border-black/7 bg-white p-5 shadow-sm transition hover:border-[#153d35]/25"
                  href={`/conversations/${introduction.introduction_id}`}
                  key={introduction.introduction_id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-black text-[#153d35]">{preview?.display_name ?? "مقدمة خاصة"}</h2>
                      {preview ? (
                        <p className="mt-1 text-xs font-bold text-black/42">{preview.age_band_label} · {preview.city}</p>
                      ) : null}
                      <p className="mt-3 text-xs leading-6 text-black/50">
                        {waiting
                          ? "وافقت على المقدمة · بانتظار قرار الطرف الآخر"
                          : unread > 0
                            ? `المحادثة مفتوحة · ${unread} رسالة غير مقروءة`
                            : "المحادثة مفتوحة · لا توجد رسائل غير مقروءة"}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-2 text-[11px] font-black ${waiting ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800"}`}>
                      {waiting ? "بانتظار الموافقة" : unread > 0 ? `${unread} جديدة` : "مفتوحة"}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
