import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

import { moderateSafetyReport } from "./actions";

export const dynamic = "force-dynamic";

type QueueItem = {
  item_id: string;
  state: string;
  category: string | null;
  display_label: string;
  queued_at: string;
};

type SafetyCase = {
  kind: "report";
  itemId: string;
  targetUserId: string;
  reporterUserId: string;
  state: string;
  category: string;
  details: string | null;
  targetDisplayName: string | null;
  reporterDisplayName: string | null;
  reportedAt: string;
  updatedAt: string | null;
};

type ReviewReport = QueueItem & { report: SafetyCase | null };

const categoryLabels: Record<string, string> = {
  fake_identity: "اشتباه في الهوية",
  harassment: "مضايقة أو إساءة",
  inappropriate_content: "محتوى غير مناسب",
  fraud_or_money: "احتيال أو طلب مال",
  safety_concern: "مشكلة سلامة",
  other: "سبب آخر",
};

const stateLabels: Record<string, string> = {
  submitted: "جديد",
  triaged: "تم الفرز",
  investigating: "قيد التحقيق",
  actioned: "تم اتخاذ إجراء",
  dismissed: "مرفوض كبلاغ",
  closed: "مغلق",
};

function actionOptions(state: string) {
  if (state === "submitted") {
    return [
      { value: "triaged", label: "تم الفرز" },
      { value: "dismissed", label: "رفض البلاغ", danger: true },
      { value: "closed", label: "إغلاق" },
    ];
  }

  if (state === "triaged") {
    return [
      { value: "investigating", label: "بدء التحقيق" },
      { value: "dismissed", label: "رفض البلاغ", danger: true },
      { value: "closed", label: "إغلاق" },
    ];
  }

  if (state === "investigating") {
    return [
      { value: "dismissed", label: "رفض البلاغ", danger: true },
      { value: "closed", label: "إغلاق" },
    ];
  }

  return [];
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function AdminSafetyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const rpc = asUntypedSupabase(supabase);

  const { data: accessData } = await supabase.rpc("get_my_moderation_access", {});
  const access = Array.isArray(accessData) ? accessData[0] : null;
  if (!access?.can_enforce) notFound();

  const { data: queueData, error: queueError } = await rpc.rpc("list_moderation_queue", {
    p_kind: "report",
    p_limit: 100,
  });
  if (queueError) notFound();

  const queue = (Array.isArray(queueData) ? queueData : []) as QueueItem[];
  const reports: ReviewReport[] = await Promise.all(
    queue.map(async (item) => {
      const { data, error } = await rpc.rpc("get_moderation_case", {
        p_kind: "report",
        p_item_id: item.item_id,
      });
      const report = !error && data && typeof data === "object" ? (data as SafetyCase) : null;
      return { ...item, report };
    }),
  );

  return (
    <main className="px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black text-red-700">سلامة الأعضاء</p>
            <h1 className="mt-2 text-3xl font-black text-[#153d35]">بلاغات السلامة</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-black/50">
              هذا الطابور يعرض بيانات البلاغ اللازمة للتحقيق فقط. لا يعرض أرقام الهواتف أو بيانات تسجيل الدخول، وكل انتقال حالة يُسجل في سجل الإشراف.
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#153d35] shadow-sm">
            {new Intl.NumberFormat("ar-LY").format(reports.length)} بلاغ نشط
          </div>
        </div>

        {params.updated === "1" ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
            تم تحديث حالة البلاغ وتسجيل الإجراء.
          </div>
        ) : null}
        {params.error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            تعذر تحديث البلاغ. لم تتغير حالته.
          </div>
        ) : null}

        <section className="mt-6 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
          <strong>ملاحظة تشغيلية:</strong> هذه الصفحة لإدارة حالة البلاغ فقط. تعليق الحساب أو حظره إدارياً سيكون في شاشة تنفيذ منفصلة بتأكيد أقوى حتى لا يحدث إجراء خطير بالخطأ.
        </section>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {reports.map((item) => {
            const report = item.report;
            const actions = actionOptions(item.state);

            return (
              <article className="rounded-3xl border border-black/8 bg-white p-5 shadow-sm sm:p-6" key={item.item_id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                        {categoryLabels[item.category ?? ""] ?? item.category ?? "بلاغ"}
                      </span>
                      <span className="rounded-full bg-[#153d35]/8 px-3 py-1 text-xs font-black text-[#153d35]">
                        {stateLabels[item.state] ?? item.state}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-black text-[#153d35]">
                      {report?.targetDisplayName ?? item.display_label}
                    </h2>
                    <div className="mt-1 font-mono text-[11px] font-bold text-black/30" dir="ltr">
                      {item.item_id.slice(0, 8).toUpperCase()}
                    </div>
                  </div>
                  <div className="text-xs font-bold leading-6 text-black/40">{formatDate(item.queued_at)}</div>
                </div>

                {report ? (
                  <div className="mt-5 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-[#f8f5ef] p-4">
                        <div className="text-[11px] font-bold text-black/38">العضو المُبلّغ عنه</div>
                        <div className="mt-1 text-sm font-black text-[#153d35]">{report.targetDisplayName ?? "عضو"}</div>
                      </div>
                      <div className="rounded-2xl bg-[#f8f5ef] p-4">
                        <div className="text-[11px] font-bold text-black/38">مقدم البلاغ</div>
                        <div className="mt-1 text-sm font-black text-[#153d35]">{report.reporterDisplayName ?? "عضو"}</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
                      <div className="text-xs font-black text-red-700">تفاصيل البلاغ</div>
                      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-black/65">
                        {report.details || "لم يضف المستخدم تفاصيل نصية."}
                      </p>
                    </div>

                    <div className="text-xs font-bold text-black/38">أُرسل: {formatDate(report.reportedAt)}</div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                    تعذر تحميل تفاصيل البلاغ. لا تتخذ قراراً عليه الآن.
                  </div>
                )}

                {actions.length && report ? (
                  <form action={moderateSafetyReport} className="mt-5 space-y-3 border-t border-black/7 pt-4">
                    <input name="report_id" type="hidden" value={item.item_id} />
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-black/50">رمز/ملاحظة مختصرة للإجراء</span>
                      <input
                        className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm"
                        maxLength={80}
                        name="reason"
                        placeholder="مثال: insufficient_evidence"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {actions.map((action) => (
                        <button
                          className={action.danger
                            ? "rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-700"
                            : "rounded-xl bg-[#153d35] px-4 py-2 text-xs font-black text-white"}
                          key={action.value}
                          name="status"
                          type="submit"
                          value={action.value}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </form>
                ) : null}
              </article>
            );
          })}

          {reports.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/15 bg-white p-12 text-center xl:col-span-2">
              <div className="text-lg font-black text-[#153d35]">لا توجد بلاغات نشطة</div>
              <p className="mt-2 text-sm text-black/42">ستظهر هنا البلاغات الجديدة والتي ما زالت تحت الفرز أو التحقيق.</p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
