import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

import { endConversation, reportConversation } from "./actions";
import { ConversationRefresh } from "./conversation-refresh";
import { MessageComposer } from "./message-composer";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type IntroductionRow = {
  introduction_id: string;
  status: "offered" | "mutually_accepted" | "declined" | "expired" | "cancelled" | "closed";
  my_decision: "pending" | "accepted" | "declined";
  created_at: string;
  expires_at: string;
};

type MessageRow = {
  message_id: string;
  sender_is_me: boolean;
  body: string;
  sent_at: string;
};

type IntroductionPreview = {
  display_name: string;
  city: string;
  age_band_label: string;
};

const reportLabels = {
  fake_identity: "اشتباه في الهوية",
  harassment: "مضايقة أو إساءة",
  inappropriate_content: "محتوى غير مناسب",
  fraud_or_money: "احتيال أو طلب مال",
  safety_concern: "مشكلة سلامة",
  other: "سبب آخر",
} as const;

function ConversationUnavailable({ introductionId }: { introductionId: string }) {
  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-xl">
        <Link className="font-black text-[#153d35]" href={`/introductions/${introductionId}`}>
          ← العودة للمقدمة
        </Link>
        <section className="mt-7 rounded-[2rem] border border-black/7 bg-white p-7 text-center shadow-sm sm:p-9">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-black/5 text-2xl">ق</div>
          <h1 className="mt-5 text-2xl font-black text-[#153d35]">المحادثة غير متاحة الآن</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-black/52">
            قد تكون المقدمة أُغلقت، أو تغيرت حالة الأهلية أو الخصوصية، أو لم تعد شروط المشاركة متحققة للطرفين.
          </p>
        </section>
      </div>
    </main>
  );
}

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    accepted?: string;
    mutual?: string;
    sent?: string;
    error?: string;
    before?: string;
    beforeId?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  if (!uuidPattern.test(id)) {
    notFound();
  }

  const historyMode = Boolean(query.before || query.beforeId);
  const validHistoryCursor =
    !historyMode ||
    (Boolean(query.before) &&
      Boolean(query.beforeId) &&
      Number.isFinite(Date.parse(query.before ?? "")) &&
      uuidPattern.test(query.beforeId ?? ""));
  if (!validHistoryCursor) redirect(`/conversations/${id}`);

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

  const { data: introductionData, error: introductionError } = await rpc.rpc("list_my_introductions", {});
  if (introductionError || !Array.isArray(introductionData)) notFound();

  const introduction = (introductionData as IntroductionRow[]).find((item) => item.introduction_id === id);
  if (!introduction) notFound();

  if (["declined", "expired", "cancelled", "closed"].includes(introduction.status)) {
    redirect(`/introductions/${id}`);
  }

  if (introduction.status === "offered" && introduction.my_decision === "pending") {
    redirect(`/introductions/${id}`);
  }

  const { data: previewData } = await rpc.rpc("get_introduction_preview", { p_introduction_id: id });
  const preview = Array.isArray(previewData)
    ? ((previewData[0] as IntroductionPreview | undefined) ?? null)
    : null;

  if (introduction.status === "offered") {
    return (
      <main className="min-h-screen px-5 py-8 sm:py-12">
        <ConversationRefresh introductionId={id} lastMessageAt={null} />
        <div className="mx-auto w-full max-w-xl">
          <Link className="font-black text-[#153d35]" href={`/introductions/${id}`}>
            ← تفاصيل المقدمة
          </Link>
          <section className="mt-7 rounded-[2rem] border border-black/7 bg-white p-7 text-center shadow-sm sm:p-9">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#c99a52]/12 text-2xl text-[#8b6228]">…</div>
            <p className="mt-5 text-xs font-black text-[#9d702d]">تم تسجيل موافقتك</p>
            <h1 className="mt-2 text-2xl font-black text-[#153d35]">بانتظار قرار الطرف الآخر</h1>
            {preview ? (
              <p className="mt-3 text-sm font-bold text-black/55">
                {preview.display_name} · {preview.age_band_label} · {preview.city}
              </p>
            ) : null}
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-black/52">
              لن تُفتح الرسائل إلا بعد موافقة الطرفين. هذه الصفحة تتحقق من الحالة تلقائياً، ويمكنك الرجوع إلى تفاصيل المقدمة في أي وقت.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const { error: openError } = await rpc.rpc("open_my_conversation", { p_introduction_id: id });
  if (openError) return <ConversationUnavailable introductionId={id} />;

  const { data: messagesData, error: messagesError } = await rpc.rpc("list_my_conversation_messages_v2", {
    p_introduction_id: id,
    p_before_sent_at: query.before ?? null,
    p_before_message_id: query.beforeId ?? null,
    p_limit: 50,
  });
  if (messagesError || !Array.isArray(messagesData)) return <ConversationUnavailable introductionId={id} />;

  const messages = messagesData as MessageRow[];
  const firstMessage = messages[0] ?? null;
  const lastMessageAt = !historyMode && messages.length > 0 ? messages[messages.length - 1]?.sent_at ?? null : null;
  const hasOlder = messages.length === 50 && Boolean(firstMessage);

  return (
    <main className="min-h-screen px-5 py-6 sm:py-10">
      {!historyMode ? <ConversationRefresh introductionId={id} lastMessageAt={lastMessageAt} /> : null}
      <div className="mx-auto w-full max-w-3xl">
        <header className="rounded-[2rem] border border-black/7 bg-white/92 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link className="text-xs font-black text-[#8b6228]" href={`/introductions/${id}`}>
                ← تفاصيل المقدمة
              </Link>
              <h1 className="mt-2 text-2xl font-black text-[#153d35]">{preview?.display_name ?? "محادثة خاصة"}</h1>
              {preview ? (
                <p className="mt-1 text-xs font-bold text-black/45">
                  {preview.age_band_label} · {preview.city}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link className="rounded-full bg-[#f8f5ef] px-4 py-2 text-xs font-black text-[#8b6228]" href="/activity">النشاط</Link>
              <span className="rounded-full bg-green-50 px-4 py-2 text-xs font-black text-green-800">موافقة متبادلة · محادثة مفتوحة</span>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-[#f8f5ef] px-4 py-3 text-xs leading-6 text-black/50">
            ميثاق لا يشارك رقم هاتفك أو بيانات اتصالك تلقائياً. أي نص ترسله هنا سيظهر للطرف الآخر، لذلك لا ترسل معلومات خاصة قبل أن تكون مرتاحاً لذلك.
          </div>
        </header>

        {query.mutual === "1" ? (
          <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold leading-6 text-green-800">
            اكتملت الموافقة من الطرفين، وأصبحت المحادثة الخاصة متاحة.
          </div>
        ) : null}
        {query.sent === "1" ? (
          <div className="mt-4 rounded-2xl border border-green-100 bg-green-50/70 px-4 py-3 text-xs font-bold text-green-800">تم إرسال الرسالة.</div>
        ) : null}
        {query.error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
            تعذر تنفيذ العملية. إذا استمر الخطأ، لا تكرر الإرسال بسرعة؛ حد الرسائل في الخلفية يحمي المحادثة من الإغراق.
          </div>
        ) : null}

        <section className="mt-4 rounded-[2rem] border border-black/7 bg-[#f8f5ef] p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-black text-[#153d35]">{historyMode ? "سجل الرسائل" : "الرسائل"}</h2>
            <span className="text-[11px] font-bold text-black/38">
              {historyMode ? "أنت تعرض دفعة أقدم من سجل المحادثة" : "تتحدث الصفحة كل 5 ثوانٍ أثناء فتحها"}
            </span>
          </div>

          {historyMode ? (
            <div className="mt-4 flex justify-center">
              <Link className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-black text-black/55" href={`/conversations/${id}`}>
                العودة لأحدث الرسائل
              </Link>
            </div>
          ) : null}

          {messages.length === 0 ? (
            <div className="my-8 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-white text-xl text-[#153d35] shadow-sm">م</div>
              <p className="mt-3 text-sm font-black text-[#153d35]">
                {historyMode ? "لا توجد رسائل أقدم" : "ابدأ برسالة هادئة وواضحة"}
              </p>
              <p className="mt-1 text-xs leading-6 text-black/45">
                {historyMode ? "يمكنك العودة لأحدث الرسائل من الزر أعلاه." : "يمكن لكل طرف إنهاء المحادثة في أي وقت."}
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3" aria-live="polite">
              {messages.map((message) => (
                <div className={`flex ${message.sender_is_me ? "justify-start" : "justify-end"}`} key={message.message_id}>
                  <div
                    className={`max-w-[86%] rounded-3xl px-4 py-3 text-sm leading-7 shadow-sm sm:max-w-[72%] ${
                      message.sender_is_me ? "bg-[#153d35] text-white" : "bg-white text-black/70"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <div className={`mt-1 text-[10px] font-bold ${message.sender_is_me ? "text-white/55" : "text-black/35"}`}>
                      {new Intl.DateTimeFormat("ar-LY", { dateStyle: "short", timeStyle: "short" }).format(new Date(message.sent_at))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasOlder && firstMessage ? (
            <div className="mt-5 flex justify-center">
              <Link
                className="rounded-xl bg-[#153d35] px-4 py-2.5 text-xs font-black text-white"
                href={`/conversations/${id}?before=${encodeURIComponent(firstMessage.sent_at)}&beforeId=${firstMessage.message_id}`}
              >
                عرض 50 رسالة أقدم
              </Link>
            </div>
          ) : null}
        </section>

        {!historyMode ? (
          <div className="mt-4">
            <MessageComposer introductionId={id} />
          </div>
        ) : null}

        <section className="mt-4 rounded-[2rem] border border-black/7 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-black text-[#153d35]">السلامة والتحكم</h2>
          <p className="mt-2 text-xs leading-6 text-black/45">
            الإبلاغ يذهب إلى مسار السلامة. يمكنك اختيار الإبلاغ فقط أو الإبلاغ مع حظر الطرف الآخر فوراً.
          </p>

          <details className="mt-4 rounded-2xl border border-red-100 bg-red-50/35 px-4 py-3">
            <summary className="cursor-pointer text-xs font-black text-red-700">الإبلاغ عن مشكلة</summary>
            <form action={reportConversation} className="mt-4 space-y-3">
              <input name="introduction_id" type="hidden" value={id} />
              <label className="block text-xs font-black text-black/55" htmlFor="report-category">السبب</label>
              <select className="w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm" defaultValue="safety_concern" id="report-category" name="category">
                {Object.entries(reportLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <label className="block text-xs font-black text-black/55" htmlFor="report-details">تفاصيل اختيارية</label>
              <textarea className="min-h-24 w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6" id="report-details" maxLength={1200} name="details" />
              <label className="block text-xs font-black text-black/55" htmlFor="report-action">بعد الإبلاغ</label>
              <select className="w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm" defaultValue="yes" id="report-action" name="block_target">
                <option value="yes">الإبلاغ وحظر الطرف الآخر</option>
                <option value="no">الإبلاغ فقط</option>
              </select>
              <button className="rounded-xl bg-red-700 px-4 py-3 text-xs font-black text-white" type="submit">إرسال البلاغ</button>
            </form>
          </details>

          <details className="mt-3 rounded-2xl border border-black/8 px-4 py-3">
            <summary className="cursor-pointer text-xs font-black text-black/55">إنهاء هذه المحادثة</summary>
            <p className="mt-2 text-xs leading-6 text-black/45">إنهاء المحادثة يغلق المقدمة أيضاً ولا يعيد فتحها من هذه الصفحة.</p>
            <form action={endConversation} className="mt-3">
              <input name="introduction_id" type="hidden" value={id} />
              <button className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-black text-black/60" type="submit">إنهاء المحادثة</button>
            </form>
          </details>
        </section>
      </div>
    </main>
  );
}
