import Link from "next/link";
import { notFound } from "next/navigation";

import type {
  AdminWaitlistApplication,
  WaitlistStatus,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import { setWaitlistStatus } from "../actions";

export const dynamic = "force-dynamic";

type AnalyticsPayload = {
  generated_at: string;
  summary: {
    registered_accounts: number;
    applications: number;
    draft: number;
    submitted: number;
    submitted_last_7_days: number;
    active_referral_codes: number;
    referral_submissions: number;
  };
};

const labels: Record<string, string> = {
  draft: "مسودة",
  submitted: "بانتظار المراجعة",
  qualified: "مؤهل",
  invited: "مدعو للعضوية",
  withdrawn: "مسحوب",
  declined: "مرفوض",
  deleted: "محذوف",
  man: "رجل",
  woman: "امرأة",
  libya: "داخل ليبيا",
  diaspora: "خارج ليبيا",
  never_married: "لم يسبق له/لها الزواج",
  divorced: "مطلق/مطلقة",
  widowed: "أرمل/أرملة",
  married: "متزوج/متزوجة",
};

const filterStatuses: Array<WaitlistStatus | "all"> = [
  "submitted",
  "qualified",
  "invited",
  "declined",
  "all",
];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-LY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function actionOptions(
  status: WaitlistStatus,
): Array<{ status: WaitlistStatus; label: string; danger?: boolean }> {
  switch (status) {
    case "submitted":
      return [
        { status: "qualified", label: "تأهيل الطلب" },
        { status: "declined", label: "رفض", danger: true },
      ];
    case "qualified":
      return [
        { status: "invited", label: "دعوة للعضوية" },
        { status: "submitted", label: "إرجاع للمراجعة" },
        { status: "declined", label: "رفض", danger: true },
      ];
    case "invited":
      return [
        { status: "qualified", label: "إيقاف الدعوة" },
        { status: "declined", label: "إلغاء ورفض", danger: true },
      ];
    case "declined":
      return [{ status: "submitted", label: "إعادة فتح الطلب" }];
    default:
      return [];
  }
}

function ApplicationCard({
  application,
  currentFilter,
}: {
  application: AdminWaitlistApplication;
  currentFilter: string;
}) {
  const actions = actionOptions(application.status);

  return (
    <article className="rounded-3xl border border-black/8 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-[#153d35]/8 px-3 py-1 text-xs font-black text-[#153d35]">
            {labels[application.status] ?? application.status}
          </span>
          <div
            className="mt-3 font-mono text-[11px] font-bold tracking-wider text-black/35"
            dir="ltr"
          >
            #{application.application_id.slice(0, 8).toUpperCase()}
          </div>
        </div>
        <div className="text-xs leading-6 text-black/42">
          <div>أُرسل: {formatDate(application.submitted_at)}</div>
          <div>أُنشئ: {formatDate(application.created_at)}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#f8f5ef] p-4">
          <div className="text-[11px] font-bold text-black/38">
            النوع والعمر
          </div>
          <div className="mt-1 text-sm font-black text-[#153d35]">
            {application.gender ? labels[application.gender] : "—"} ·{" "}
            {application.age_band_label ?? "—"}
          </div>
        </div>
        <div className="rounded-2xl bg-[#f8f5ef] p-4">
          <div className="text-[11px] font-bold text-black/38">الإقامة</div>
          <div className="mt-1 text-sm font-black text-[#153d35]">
            {application.current_city ?? "—"}
            {application.current_country_code
              ? ` · ${application.current_country_code}`
              : ""}
          </div>
          <div className="mt-1 text-[11px] text-black/40">
            {application.residency_type
              ? labels[application.residency_type]
              : ""}
          </div>
        </div>
        <div className="rounded-2xl bg-[#f8f5ef] p-4">
          <div className="text-[11px] font-bold text-black/38">
            الحالة الاجتماعية
          </div>
          <div className="mt-1 text-sm font-black text-[#153d35]">
            {application.marital_status
              ? labels[application.marital_status]
              : "—"}
          </div>
          <div className="mt-1 text-[11px] text-black/40">
            أطفال:{" "}
            {application.has_children === null
              ? "—"
              : application.has_children
                ? "نعم"
                : "لا"}
          </div>
        </div>
      </div>

      {actions.length ? (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-black/7 pt-4">
          {actions.map((action) => (
            <form action={setWaitlistStatus} key={action.status}>
              <input
                name="application_id"
                type="hidden"
                value={application.application_id}
              />
              <input name="target_status" type="hidden" value={action.status} />
              <input
                name="current_filter"
                type="hidden"
                value={currentFilter}
              />
              <button
                className={
                  action.danger
                    ? "rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-700 hover:bg-red-100"
                    : "rounded-xl bg-[#153d35] px-4 py-2 text-xs font-black text-white hover:bg-[#102f29]"
                }
                type="submit"
              >
                {action.label}
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default async function AdminWaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string; updated?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const requestedStatus = params.status ?? "submitted";
  const currentFilter = filterStatuses.includes(
    requestedStatus as WaitlistStatus | "all",
  )
    ? requestedStatus
    : "submitted";
  const statusFilter =
    currentFilter === "all" ? null : (currentFilter as WaitlistStatus);

  const [
    { data: analyticsData, error: analyticsError },
    { data: applications, error: applicationsError },
  ] = await Promise.all([
    supabase.rpc("get_admin_waitlist_analytics", {}),
    supabase.rpc("list_admin_waitlist_applications", {
      p_status: statusFilter,
      p_limit: 100,
    }),
  ]);

  if (analyticsError || applicationsError || !analyticsData) notFound();

  const analytics = analyticsData as unknown as AnalyticsPayload;
  const items = applications ?? [];

  const submittedCount =
    currentFilter === "submitted" ? items.length : undefined;
  const summary = [
    ["طلبات نشطة", analytics.summary.submitted],
    ["طلبات آخر 7 أيام", analytics.summary.submitted_last_7_days],
    ["إجمالي الطلبات", analytics.summary.applications],
    ["الحسابات المسجلة", analytics.summary.registered_accounts],
  ] as const;

  return (
    <main className="px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black text-[#9d702d]">بوابة العضوية</p>
            <h1 className="mt-2 text-3xl font-black text-[#153d35]">
              مراجعة قائمة الانتظار
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-black/50">
              المسار الإداري واضح: <strong>مُرسل ← مؤهل ← مدعو</strong>. حالة
              «مدعو» هي الموافقة التي تسمح للمستخدم بالدخول إلى إعداد العضوية.
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-xs font-bold text-black/45 shadow-sm">
            آخر تحديث: {formatDate(analytics.generated_at)}
          </div>
        </div>

        {params.updated === "1" ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
            تم تحديث حالة الطلب وتسجيل العملية في سجل الإدارة.
          </div>
        ) : null}
        {params.error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            تعذر تنفيذ التغيير. لم تتغير حالة الطلب.
          </div>
        ) : null}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map(([label, value]) => (
            <div
              className="rounded-3xl border border-black/8 bg-white p-5 shadow-sm"
              key={label}
            >
              <div className="text-xs font-bold text-black/42">{label}</div>
              <div className="mt-2 text-3xl font-black text-[#153d35]">
                {new Intl.NumberFormat("ar-LY").format(Number(value))}
              </div>
            </div>
          ))}
        </section>

        <nav className="mt-7 flex flex-wrap gap-2">
          {filterStatuses.map((status) => (
            <Link
              className={
                currentFilter === status
                  ? "rounded-full bg-[#153d35] px-4 py-2 text-sm font-black text-white"
                  : "rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-black/55 hover:border-[#153d35]/30"
              }
              href={
                status === "submitted"
                  ? "/admin/waitlist"
                  : `/admin/waitlist?status=${status}`
              }
              key={status}
            >
              {status === "all" ? "الكل" : (labels[status] ?? status)}
            </Link>
          ))}
        </nav>

        <div className="mt-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-black text-[#153d35]">
            {labels[currentFilter] ?? "كل الطلبات"}
          </h2>
          <span className="text-xs font-black text-black/42">
            {submittedCount !== undefined
              ? `${submittedCount} بانتظار المراجعة`
              : `${items.length} نتيجة`}
          </span>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {items.length ? (
            items.map((application) => (
              <ApplicationCard
                application={application}
                currentFilter={currentFilter}
                key={application.application_id}
              />
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-black/15 bg-white p-10 text-center text-sm text-black/45 xl:col-span-2">
              لا توجد طلبات في هذا التصنيف حالياً.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
