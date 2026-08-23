import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

export const dynamic = "force-dynamic";

type ModerationAccess = {
  moderation_role: string;
  can_review: boolean;
  can_enforce: boolean;
};

type QueueItem = {
  item_kind: string;
  item_id: string;
};

type QueueCard = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  count: number | null;
  enabled: boolean;
};

const roleLabels: Record<string, string> = {
  reviewer: "مراجع المحتوى",
  moderator: "مشرف السلامة",
  admin: "مدير العمليات",
};

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const rpc = asUntypedSupabase(supabase);

  const { data: accessData, error: accessError } = await supabase.rpc("get_my_moderation_access", {});
  if (accessError || !Array.isArray(accessData) || accessData.length === 0) notFound();

  const access = accessData[0] as ModerationAccess;
  const canManageWaitlist = access.moderation_role === "admin";

  let waitlistCount: number | null = null;
  let profileCount: number | null = null;
  let photoCount: number | null = null;
  let safetyCount: number | null = null;

  if (canManageWaitlist) {
    const { data, error } = await supabase.rpc("list_admin_waitlist_applications", {
      p_status: "submitted",
      p_limit: 200,
    });
    if (!error) waitlistCount = Array.isArray(data) ? data.length : 0;
  }

  if (access.can_review) {
    const [{ data: profiles, error: profileError }, { data: photos, error: photoError }] = await Promise.all([
      rpc.rpc("list_moderation_queue", { p_kind: "profile", p_limit: 100 }),
      rpc.rpc("list_moderation_queue", { p_kind: "photo", p_limit: 100 }),
    ]);

    if (!profileError) profileCount = Array.isArray(profiles) ? (profiles as QueueItem[]).length : 0;
    if (!photoError) photoCount = Array.isArray(photos) ? (photos as QueueItem[]).length : 0;
  }

  if (access.can_enforce) {
    const { data: reports, error } = await rpc.rpc("list_moderation_queue", { p_kind: "report", p_limit: 100 });
    if (!error) safetyCount = Array.isArray(reports) ? (reports as QueueItem[]).length : 0;
  }

  const queues: QueueCard[] = [
    {
      href: "/admin/waitlist",
      eyebrow: "بوابة العضوية",
      title: "طلبات قائمة الانتظار",
      description: "راجع الطلب ثم أهّله. الدعوة هي القرار الذي يفتح إعداد العضوية للمستخدم.",
      count: waitlistCount,
      enabled: canManageWaitlist,
    },
    {
      href: "/admin/profiles",
      eyebrow: "قبل الاستكشاف",
      title: "مراجعة الملفات",
      description: "اعتماد النبذة ومحتوى الملف أو طلب تعديل قبل أن يظهر العضو في الاستكشاف.",
      count: profileCount,
      enabled: access.can_review,
    },
    {
      href: "/admin/photos",
      eyebrow: "صور خاصة",
      title: "مراجعة الصور",
      description: "مراجعة الصور عبر روابط مؤقتة من التخزين الخاص بدون كشف مسار التخزين للمستخدمين.",
      count: photoCount,
      enabled: access.can_review,
    },
    {
      href: "/admin/safety",
      eyebrow: "أولوية عالية",
      title: "بلاغات السلامة",
      description: "فرز البلاغات والتحقيق فيها وإغلاقها ضمن سجل إشراف قابل للتدقيق.",
      count: safetyCount,
      enabled: access.can_enforce,
    },
  ];

  return (
    <main className="px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-7xl">
        <section className="overflow-hidden rounded-[2rem] bg-[#153d35] p-6 text-white shadow-[0_24px_70px_rgba(16,47,41,.18)] sm:p-9">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-black text-[#e1b870]">عمليات ميثاق</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">لوحة الإدارة</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
                هذه مساحة تشغيل داخلية وليست جزءاً من تجربة الأعضاء. كل طابور له قرار واضح وصلاحيات مستقلة، ولا نعرض أرقام الهواتف أو بيانات تسجيل الدخول هنا.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-xs font-black text-white/75">
              صلاحيتك: {roleLabels[access.moderation_role] ?? access.moderation_role}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {queues.filter((queue) => queue.enabled).map((queue) => (
            <Link
              className="group rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#153d35]/25 hover:shadow-md"
              href={queue.href}
              key={queue.href}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black text-[#9d702d]">{queue.eyebrow}</p>
                  <h2 className="mt-2 text-xl font-black text-[#153d35]">{queue.title}</h2>
                </div>
                {queue.count !== null ? (
                  <span className="rounded-full bg-[#153d35]/8 px-3 py-2 text-xs font-black text-[#153d35]">
                    {new Intl.NumberFormat("ar-LY").format(queue.count)}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-7 text-black/48">{queue.description}</p>
              <div className="mt-5 text-xs font-black text-[#8b6228] group-hover:underline">فتح الطابور ←</div>
            </Link>
          ))}
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-[#c99a52]/25 bg-[#c99a52]/8 p-5 sm:p-6">
          <h2 className="text-sm font-black text-[#8b6228]">كيف يعمل القبول؟</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/75 p-4">
              <div className="text-xs font-black text-[#153d35]">1 · قائمة الانتظار</div>
              <p className="mt-2 text-xs leading-6 text-black/52">مُرسل → مؤهل → <strong>مدعو</strong>. الدعوة تفتح إعداد العضوية.</p>
            </div>
            <div className="rounded-2xl bg-white/75 p-4">
              <div className="text-xs font-black text-[#153d35]">2 · الملف والصور</div>
              <p className="mt-2 text-xs leading-6 text-black/52">بعد الإعداد، يجب اعتماد الملف والصور حسب قواعد المراجعة قبل الاستكشاف.</p>
            </div>
            <div className="rounded-2xl bg-white/75 p-4">
              <div className="text-xs font-black text-[#153d35]">3 · السلامة</div>
              <p className="mt-2 text-xs leading-6 text-black/52">البلاغات منفصلة عن القبول وتذهب لمسار إشراف وتدقيق مستقل.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
