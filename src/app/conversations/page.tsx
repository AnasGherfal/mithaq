import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

export const dynamic = "force-dynamic";

type IntroductionRow = {
  introduction_id: string;
  status: string;
  my_decision: string;
  created_at: string;
  expires_at: string;
};

type Preview = {
  display_name: string;
  age_band_label: string;
  city: string;
  gender: "man" | "woman";
};

type UnreadRow = {
  introduction_id: string;
  unread_count: number | string;
};

type ConversationItem = IntroductionRow & {
  preview: Preview | null;
  unreadCount: number;
};

const errorCopy: Record<string, string> = {
  invalid: "تعذر تحديد المحادثة المطلوبة.",
  message: "الرسالة غير صالحة.",
  unavailable: "لم تعد هذه المحادثة متاحة.",
  report: "تعذر إرسال البلاغ الآن.",
};

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    ended?: string;
    reported?: string;
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

  const [{ data: introData, error: introError }, { data: unreadData }] = await Promise.all([
    rpc.rpc("list_my_introductions", {}),
    rpc.rpc("list_my_conversation_unread_counts", {}),
  ]);

  const introductions = !introError && Array.isArray(introData)
    ? (introData as IntroductionRow[]).filter((item) => item.status === "mutually_accepted")
    : [];
  const unreadRows = Array.isArray(unreadData) ? (unreadData as UnreadRow[]) : [];
  const unreadMap = new Map(
    unreadRows.map((item) => [item.introduction_id, Number(item.unread_count) || 0]),
  );

  const items: ConversationItem[] = await Promise.all(
    introductions.map(async (item) => {
      const { data: previewData, error: previewError } = await rpc.rpc("get_introduction_preview", {
        p_introduction_id: item.introduction_id,
      });
      const preview = !previewError && Array.isArray(previewData)
        ? (previewData[0] as Preview | undefined) ?? null
        : null;
      return {
        ...item,
        preview,
        unreadCount: unreadMap.get(item.introduction_id) ?? 0,
      };
    }),
  );

  items.sort((a, b) => {
    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const totalUnread = items.reduce((sum, item) => sum + item.unreadCount, 0);

  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link className="font-black text-[#153d35]" href="/member">ميثاق</Link>
            <h1 className="mt-2 text-3xl font-black text-[#153d35]">المحادثات</h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-black/50">
              لا تظهر هنا إلا المقدمات التي وافق عليها الطرفان صراحة. لا توجد محادثات مفتوحة خارج هذا المسار.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {totalUnread > 0 ? (
              <span className="rounded-xl bg-[#153d35] px-4 py-3 text-xs font-black text-white">{totalUnread} غير مقروءة</span>
            ) : null}
            <Link className="rounded-xl border border-black/10 bg-white px-4 py-3 text-xs font-black text-[#153d35]" href="/introductions">
              المقدمات
            </Link>
          </div>
        </div>

        {params.ended === "1" ? (
          <div className="mt-5 rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm font-bold text-black/55">
            تم إنهاء المحادثة وإغلاق المقدمة. لا يمكن إرسال رسائل جديدة من خلالها.
          </div>
        ) : null}
        {params.reported === "1" ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
            تم إرسال البلاغ وحظر الطرف الآخر وإغلاق المحادثة. سيظهر البلاغ في طابور الإشراف.
          </div>
        ) : null}
        {params.error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorCopy[params.error] ?? "تعذر تنفيذ العملية."}
          </div>
        ) : null}

        <section className="mt-7 space-y-3">
          {items.map((item) => (
            <Link
              className="block rounded-3xl border border-black/8 bg-white p-5 shadow-sm transition hover:border-[#153d35]/25"
              href={`/conversations/${item.introduction_id}`}
              key={item.introduction_id}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-black text-[#153d35]">{item.preview?.display_name ?? "محادثة خاصة"}</h2>
                    {item.unreadCount > 0 ? (
                      <span className="rounded-full bg-[#c99a52]/15 px-3 py-1 text-[11px] font-black text-[#8b6228]">{item.unreadCount} جديدة</span>
                    ) : null}
                  </div>
                  {item.preview ? (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-black/40">
                      <span>{item.preview.gender === "man" ? "رجل" : "امرأة"}</span>
                      <span>{item.preview.age_band_label}</span>
                      <span>{item.preview.city}</span>
                    </div>
                  ) : null}
                  <p className="mt-2 text-xs text-black/40">موافقة متبادلة · محادثة داخل ميثاق فقط</p>
                </div>
                <span className="shrink-0 text-xl text-[#153d35]">←</span>
              </div>
            </Link>
          ))}

          {items.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-black/15 bg-white p-9 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#153d35]/7 text-2xl">✦</div>
              <h2 className="mt-4 text-xl font-black text-[#153d35]">لا توجد محادثات حتى الآن</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-black/45">
                المحادثة لا تصبح متاحة إلا بعد اهتمام متبادل ثم مقدمة وافق عليها الطرفان بشكل مستقل.
              </p>
              <Link className="mt-5 inline-block rounded-xl bg-[#153d35] px-5 py-3 text-sm font-black text-white" href="/discovery">
                فتح الاستكشاف
              </Link>
            </div>
          ) : null}
        </section>

        <div className="mt-7 rounded-3xl bg-[#f8f5ef] p-5 text-xs leading-6 text-black/48">
          الرسائل داخل ميثاق لا تعني أن عليك مشاركة رقمك أو عنوانك أو معلومات مالية. يمكنك إنهاء المحادثة أو الإبلاغ والحظر في أي وقت.
        </div>
      </div>
    </main>
  );
}
