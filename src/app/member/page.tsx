import Link from "next/link";
import { redirect } from "next/navigation";

import { MemberPrimaryNav } from "@/components/member-primary-nav";
import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

export const dynamic = "force-dynamic";

type IntroductionSummary = {
  introduction_id: string;
  status: string;
  my_decision: string;
};

type ConversationUnread = {
  introduction_id: string;
  unread_count: number | string;
};

const reviewLabels: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "معتمد",
  needs_changes: "يحتاج تعديلاً",
  rejected: "غير معتمد",
};

export default async function MemberPage({
  searchParams,
}: {
  searchParams: Promise<{ ready?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const rpc = asUntypedSupabase(supabase);
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/join");

  const [{ data: application }, { data: profile }, { data: spaces }, { data: review }] = await Promise.all([
    supabase.from("waitlist_applications").select("status").eq("user_id", userId).maybeSingle(),
    supabase
      .from("member_profiles")
      .select("display_name,profile_completed_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.rpc("list_my_connection_spaces", {}),
    rpc.from("member_profile_reviews").select("state,reason_code").eq("user_id", userId).maybeSingle(),
  ]);

  if (application?.status !== "invited") redirect("/waitlist");

  const hasMarriageSpace = spaces?.some(
    (space) => space.space === "marriage" && space.membership_state === "active",
  ) ?? false;
  if (!profile?.profile_completed_at || !hasMarriageSpace) redirect("/onboarding");

  const [
    { data: priorities },
    { data: visibility },
    { data: introductionsData },
    { data: conversationUnreadData },
    { data: notificationUnreadData },
  ] = await Promise.all([
    supabase.rpc("get_my_marriage_practical_priorities", {}),
    supabase.rpc("get_my_marriage_visibility", {}),
    rpc.rpc("list_my_introductions", {}),
    rpc.rpc("list_my_conversation_unread_counts", {}),
    rpc.rpc("get_my_notification_unread_count", {}),
  ]);

  if (!priorities?.[0]?.completed_at) redirect("/onboarding?step=priorities");

  const reviewState = typeof review?.state === "string" ? review.state : "pending";
  const discoveryReady = reviewState === "approved";
  const introductions = Array.isArray(introductionsData) ? (introductionsData as IntroductionSummary[]) : [];
  const pendingIntroductions = introductions.filter(
    (item) => item.status === "offered" && item.my_decision === "pending",
  ).length;
  const activeIntroductions = introductions.filter(
    (item) => item.status === "offered" || item.status === "mutually_accepted",
  ).length;
  const conversationUnreads = Array.isArray(conversationUnreadData)
    ? (conversationUnreadData as ConversationUnread[])
    : [];
  const unreadMessages = conversationUnreads.reduce(
    (sum, item) => sum + (Number(item.unread_count) || 0),
    0,
  );
  const unreadActivity = Number(notificationUnreadData) || 0;

  const nextAction = pendingIntroductions > 0
    ? {
        eyebrow: "قرار بانتظارك",
        title: `لديك ${pendingIntroductions} مقدمة تحتاج قرارك`,
        text: "راجع المقدمة بهدوء. لا تفتح المحادثة إلا بعد موافقة صريحة من الطرفين.",
        href: "/introductions",
        label: "مراجعة المقدمات",
      }
    : unreadMessages > 0
      ? {
          eyebrow: "رسائل جديدة",
          title: `لديك ${unreadMessages} رسالة غير مقروءة`,
          text: "افتح المحادثة داخل ميثاق. رقم هاتفك وبيانات اتصالك لا تُشارك تلقائياً.",
          href: "/conversations",
          label: "فتح المحادثات",
        }
      : discoveryReady
        ? {
            eyebrow: "جاهز للاستكشاف",
            title: "شاهد الملفات المتوافقة مع شروط الطرفين",
            text: "يعرض ميثاق عدداً محدوداً من الملفات المناسبة، وليس دليلاً عاماً أو سحباً لا نهائياً.",
            href: "/discovery",
            label: "ابدأ الاستكشاف",
          }
        : {
            eyebrow: "مراجعة الملف",
            title: "ملفك لم يدخل الاستكشاف بعد",
            text: "بعد اعتماد الملف ستظهر لك فقط الملفات التي تحقق الشروط الأساسية للطرفين.",
            href: "/onboarding?step=profile",
            label: "مراجعة ملفي",
          };

  return (
    <main className="min-h-screen px-5 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/member" className="inline-flex items-center gap-3 font-black text-[#153d35]">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#153d35] text-white">م</span>
            <span>
              <span className="block text-lg">ميثاق</span>
              <span className="block text-[10px] font-bold tracking-[.18em] text-black/35" dir="ltr">MEMBER</span>
            </span>
          </Link>
          <MemberPrimaryNav
            pendingIntroductions={pendingIntroductions}
            unreadMessages={unreadMessages}
            unreadActivity={unreadActivity}
          />
        </header>

        {params.ready === "1" ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
            اكتمل إعداد ملفك. الخطوة التالية هي مراجعة الملف قبل أن يفتح الاستكشاف.
          </div>
        ) : null}

        <section className="mt-7 overflow-hidden rounded-[2.25rem] border border-black/7 bg-white shadow-[0_28px_80px_rgba(35,43,38,.10)]">
          <div className="grid lg:grid-cols-[1.15fr_.85fr]">
            <div className="p-6 sm:p-9">
              <p className="text-sm font-black text-[#9d702d]">مساحتك الخاصة</p>
              <h1 className="mt-2 text-3xl font-black leading-tight text-[#153d35] sm:text-4xl">
                أهلاً {profile?.display_name ? `، ${profile.display_name}` : "بك"}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-black/52">
                ركّز على خطوة واحدة في كل مرة. ميثاق لا يعرض دليلاً عاماً للأعضاء، ولا يفتح التواصل قبل اهتمام متبادل وموافقة جديدة من الطرفين.
              </p>

              <div className="mt-7 rounded-3xl bg-[#153d35] p-6 text-white">
                <p className="text-xs font-black text-[#e6c995]">{nextAction.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-black">{nextAction.title}</h2>
                <p className="mt-3 text-sm leading-7 text-white/70">{nextAction.text}</p>
                <Link className="focus-ring mt-5 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#153d35]" href={nextAction.href}>
                  {nextAction.label}
                </Link>
              </div>
            </div>

            <aside className="border-t border-black/7 bg-[#f8f5ef] p-6 lg:border-r lg:border-t-0 sm:p-8">
              <p className="text-xs font-black text-[#9d702d]">حالة الحساب</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-xs font-bold text-black/38">مراجعة الملف</div>
                  <div className={`mt-1 font-black ${discoveryReady ? "text-green-800" : "text-amber-800"}`}>
                    {reviewLabels[reviewState] ?? reviewState}
                  </div>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-xs font-bold text-black/38">وضع الظهور</div>
                  <div className="mt-1 font-black text-[#153d35]">{visibility === "standard" ? "عادي" : "خاص"}</div>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-xs font-bold text-black/38">مقدمات نشطة</div>
                  <div className="mt-1 text-2xl font-black text-[#153d35]">{activeIntroductions}</div>
                </div>
              </div>

              {review?.reason_code && reviewState !== "approved" ? (
                <div className="mt-4 rounded-2xl bg-orange-50 p-4 text-xs font-bold leading-6 text-orange-800">
                  ملاحظة المراجعة: {review.reason_code}
                </div>
              ) : null}
            </aside>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <Link className="rounded-3xl border border-black/8 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg" href="/onboarding?step=profile">
            <div className="text-xs font-black text-[#9d702d]">ملفي</div>
            <div className="mt-2 text-lg font-black text-[#153d35]">تعديل المعلومات</div>
            <p className="mt-2 text-xs leading-6 text-black/45">الاسم الظاهر والنبذة والمعلومات الاختيارية. التعديلات الجوهرية قد تعيد الملف للمراجعة.</p>
          </Link>
          <Link className="rounded-3xl border border-black/8 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg" href="/photos">
            <div className="text-xs font-black text-[#9d702d]">الثقة</div>
            <div className="mt-2 text-lg font-black text-[#153d35]">الصور والخصوصية</div>
            <p className="mt-2 text-xs leading-6 text-black/45">أدر صورك الخاصة وحالة مراجعتها بدون جعلها عامة على الإنترنت.</p>
          </Link>
          <Link className="rounded-3xl border border-black/8 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg" href="/activity">
            <div className="text-xs font-black text-[#9d702d]">آخر المستجدات</div>
            <div className="mt-2 text-lg font-black text-[#153d35]">النشاط {unreadActivity > 0 ? `· ${unreadActivity}` : ""}</div>
            <p className="mt-2 text-xs leading-6 text-black/45">إشعارات مختصرة بدون نص الرسائل أو بيانات اتصال الطرف الآخر.</p>
          </Link>
        </section>

        <div className="mt-5 rounded-3xl border border-[#c99a52]/20 bg-[#c99a52]/8 p-5 text-xs leading-6 text-black/50">
          رقم هاتفك مخصص للدخول والأمان ولا يظهر تلقائياً في ملفك أو المقدمات أو المحادثات.
        </div>
      </div>
    </main>
  );
}
