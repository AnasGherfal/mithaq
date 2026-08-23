import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

import { moderateProfile } from "./actions";

export const dynamic = "force-dynamic";

type QueueItem = {
  item_kind: string;
  item_id: string;
  target_user_id: string | null;
  reporter_user_id: string | null;
  state: string;
  category: string | null;
  display_label: string;
  queued_at: string;
  priority: number;
};

type ProfileCase = {
  kind: "profile";
  itemId: string;
  targetUserId: string;
  state: string;
  reviewAfter: string | null;
  displayName: string | null;
  aboutMe: string | null;
  occupation: string | null;
  education: string | null;
  city: string | null;
  maritalStatus: string | null;
  hasChildren: boolean | null;
  profileCompletedAt: string | null;
  updatedAt: string | null;
};

type ReviewProfile = QueueItem & { profile: ProfileCase | null };

const maritalLabels: Record<string, string> = {
  never_married: "لم يسبق له/لها الزواج",
  divorced: "مطلق/مطلقة",
  widowed: "أرمل/أرملة",
  married: "متزوج/متزوجة",
};

const stateLabels: Record<string, string> = {
  pending: "قيد المراجعة",
  needs_changes: "تحتاج تعديلاً",
};

export default async function AdminProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const rpc = asUntypedSupabase(supabase);
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) redirect("/join");

  const { data: access } = await supabase.rpc("get_my_moderation_access", {});
  if (!access?.some((item) => item.can_review)) notFound();

  const { data: queueData, error: queueError } = await rpc.rpc("list_moderation_queue", {
    p_kind: "profile",
    p_limit: 50,
  });

  if (queueError) notFound();

  const queue = (Array.isArray(queueData) ? queueData : []) as QueueItem[];
  const profiles: ReviewProfile[] = await Promise.all(
    queue.map(async (item) => {
      const { data, error } = await rpc.rpc("get_moderation_case", {
        p_kind: "profile",
        p_item_id: item.item_id,
      });

      const profile = !error && data && typeof data === "object" ? (data as ProfileCase) : null;
      return { ...item, profile };
    }),
  );

  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="font-black text-[#153d35]" href="/admin">إدارة ميثاق</Link>
            <h1 className="mt-2 text-3xl font-black text-[#153d35]">مراجعة الملفات</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-black/48">
              لا يدخل أي ملف إلى الاستكشاف قبل اعتماد محتواه. لا تعرض هذه الصفحة رقم الهاتف أو الاسم القانوني للمستخدم.
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#153d35]">
            {profiles.length} ملف في الطابور
          </div>
        </div>

        {params.updated === "1" ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
            تم تسجيل قرار مراجعة الملف في سجل الإشراف.
          </div>
        ) : null}
        {params.error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            تعذر حفظ قرار المراجعة. لم تتغير حالة الملف.
          </div>
        ) : null}

        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          {profiles.map((item) => {
            const profile = item.profile;
            return (
              <article className="rounded-3xl border border-black/8 bg-white p-5 shadow-sm sm:p-6" key={item.item_id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                      {stateLabels[item.state] ?? item.state}
                    </span>
                    <h2 className="mt-3 text-xl font-black text-[#153d35]">
                      {profile?.displayName ?? item.display_label}
                    </h2>
                    <div className="mt-1 font-mono text-[11px] font-bold text-black/30" dir="ltr">
                      {item.item_id.slice(0, 8).toUpperCase()}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-black/38">
                    {new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium" }).format(new Date(item.queued_at))}
                  </span>
                </div>

                {profile ? (
                  <div className="mt-5 space-y-4">
                    <div className="flex flex-wrap gap-2 text-xs font-bold text-black/52">
                      {profile.city ? <span className="rounded-full bg-[#f8f5ef] px-3 py-2">{profile.city}</span> : null}
                      {profile.maritalStatus ? (
                        <span className="rounded-full bg-[#f8f5ef] px-3 py-2">
                          {maritalLabels[profile.maritalStatus] ?? profile.maritalStatus}
                        </span>
                      ) : null}
                      {profile.hasChildren !== null ? (
                        <span className="rounded-full bg-[#f8f5ef] px-3 py-2">
                          {profile.hasChildren ? "لديه/لديها أطفال" : "بدون أطفال"}
                        </span>
                      ) : null}
                    </div>

                    <div className="rounded-2xl bg-[#f8f5ef] p-4">
                      <div className="text-xs font-black text-[#8b6228]">النبذة</div>
                      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-black/62">
                        {profile.aboutMe || "لا توجد نبذة."}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-black/7 p-4">
                        <div className="text-xs font-bold text-black/40">المهنة</div>
                        <div className="mt-1 text-sm font-black text-[#153d35]">{profile.occupation || "—"}</div>
                      </div>
                      <div className="rounded-2xl border border-black/7 p-4">
                        <div className="text-xs font-bold text-black/40">التعليم</div>
                        <div className="mt-1 text-sm font-black text-[#153d35]">{profile.education || "—"}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                    تعذر تحميل تفاصيل هذا الملف. لا تتخذ قراراً عليه الآن.
                  </div>
                )}

                <form action={moderateProfile} className="mt-5 space-y-3">
                  <input name="user_id" type="hidden" value={item.item_id} />
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-black/50">سبب مختصر عند طلب التعديل أو الرفض</span>
                    <input
                      className="focus-ring w-full rounded-xl border border-black/10 px-3 py-3 text-sm"
                      maxLength={120}
                      name="reason"
                      placeholder="مثال: النبذة تحتوي معلومات اتصال"
                    />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      className="rounded-xl bg-green-700 px-3 py-3 text-xs font-black text-white disabled:opacity-40"
                      disabled={!profile}
                      name="state"
                      type="submit"
                      value="approved"
                    >
                      قبول
                    </button>
                    <button
                      className="rounded-xl bg-orange-100 px-3 py-3 text-xs font-black text-orange-800 disabled:opacity-40"
                      disabled={!profile}
                      name="state"
                      type="submit"
                      value="needs_changes"
                    >
                      تعديل
                    </button>
                    <button
                      className="rounded-xl bg-red-100 px-3 py-3 text-xs font-black text-red-700 disabled:opacity-40"
                      disabled={!profile}
                      name="state"
                      type="submit"
                      value="rejected"
                    >
                      رفض
                    </button>
                  </div>
                </form>
              </article>
            );
          })}

          {profiles.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/15 bg-white p-10 text-center lg:col-span-2">
              <div className="text-lg font-black text-[#153d35]">لا توجد ملفات تنتظر المراجعة</div>
              <p className="mt-2 text-sm text-black/42">أي ملف جديد أو معدل سيعود تلقائياً إلى طابور المراجعة.</p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
