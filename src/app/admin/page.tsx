import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import type {
  AdminWaitlistApplication,
  WaitlistStatus,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import { setWaitlistStatus } from "./actions";

export const dynamic = "force-dynamic";

type DistributionItem = {
  key: string;
  count: number;
};

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
  status_distribution: DistributionItem[];
  gender_distribution: DistributionItem[];
  residency_distribution: DistributionItem[];
  age_distribution: DistributionItem[];
  marriage_timeline_distribution: DistributionItem[];
  photo_privacy_distribution: DistributionItem[];
  family_involvement_distribution: DistributionItem[];
  identity_verification_distribution: DistributionItem[];
};

const labels: Record<string, string> = {
  draft: "مسودة",
  submitted: "مُرسل",
  qualified: "مؤهل",
  invited: "مدعو",
  withdrawn: "مسحوب",
  declined: "مرفوض",
  deleted: "محذوف",
  man: "رجل",
  woman: "امرأة",
  libya: "داخل ليبيا",
  diaspora: "خارج ليبيا",
  never_married: "لم يسبق له الزواج",
  divorced: "مطلق/مطلقة",
  widowed: "أرمل/أرملة",
  married: "متزوج/متزوجة",
  within_6_months: "خلال 6 أشهر",
  "6_to_12_months": "6–12 شهراً",
  "1_to_2_years": "سنة إلى سنتين",
  unsure: "غير متأكد",
  after_mutual_interest: "بعد اهتمام متبادل",
  explicit_approval: "بموافقة صريحة",
  after_family_involvement: "بعد إشراك العائلة",
  blurred: "مموهة",
  discovery_visible: "مرئية في الاستكشاف",
  none: "بدون صورة",
  early: "مبكراً",
  after_initial_interest: "بعد اهتمام أولي",
  later: "لاحقاً",
  true: "مستعدون للتحقق",
  false: "غير مستعدين الآن",
};

const filterStatuses: Array<WaitlistStatus | "all"> = [
  "all",
  "submitted",
  "qualified",
  "invited",
  "declined",
  "draft",
  "withdrawn",
  "deleted",
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-LY").format(value ?? 0);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-LY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Distribution({ title, items }: { title: string; items: DistributionItem[] }) {
  const max = Math.max(1, ...items.map((item) => Number(item.count) || 0));

  return (
    <section className="rounded-3xl border border-black/8 bg-white p-5">
      <h2 className="font-black text-[#153d35]">{title}</h2>
      <div className="mt-5 space-y-4">
        {items.length === 0 ? <p className="text-sm text-black/40">لا توجد بيانات بعد.</p> : null}
        {items.map((item) => {
          const count = Number(item.count) || 0;
          return (
            <div key={`${title}-${item.key}`}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs font-bold text-black/55">
                <span>{labels[item.key] ?? item.key}</span>
                <span>{formatNumber(count)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/7">
                <div
                  className="h-full rounded-full bg-[#c99a52]"
                  style={{ width: `${Math.max(2, (count / max) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function actionOptions(status: WaitlistStatus): Array<{ status: WaitlistStatus; label: string; danger?: boolean }> {
  switch (status) {
    case "submitted":
      return [
        { status: "qualified", label: "تأهيل" },
        { status: "declined", label: "رفض", danger: true },
      ];
    case "qualified":
      return [
        { status: "invited", label: "إرسال دعوة" },
        { status: "submitted", label: "إرجاع للمراجعة" },
        { status: "declined", label: "رفض", danger: true },
      ];
    case "invited":
      return [
        { status: "qualified", label: "إرجاع لمؤهل" },
        { status: "declined", label: "إلغاء/رفض", danger: true },
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
  const shortId = application.application_id.slice(0, 8).toUpperCase();

  return (
    <article className="rounded-3xl border border-black/8 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#153d35]/8 px-3 py-1 text-xs font-black text-[#153d35]">
              {labels[application.status] ?? application.status}
            </span>
            {application.referred_by_invite ? (
              <span className="rounded-full bg-[#c99a52]/12 px-3 py-1 text-xs font-black text-[#8b6228]">
                عبر دعوة
              </span>
            ) : null}
          </div>
          <div className="mt-3 font-mono text-xs font-bold tracking-wider text-black/38" dir="ltr">
            #{shortId}
          </div>
        </div>
        <div className="text-left text-xs leading-6 text-black/42" dir="rtl">
          <div>أُرسل: {formatDate(application.submitted_at)}</div>
          <div>أُنشئ: {formatDate(application.created_at)}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl bg-[#f8f5ef] px-4 py-3">
          <div className="text-xs text-black/38">النوع والعمر</div>
          <div className="mt-1 font-bold text-black/68">
            {application.gender ? labels[application.gender] : "—"} · {application.age_band_label ?? "—"}
          </div>
        </div>
        <div className="rounded-2xl bg-[#f8f5ef] px-4 py-3">
          <div className="text-xs text-black/38">الإقامة</div>
          <div className="mt-1 font-bold text-black/68">
            {application.current_city ?? "—"}
            {application.current_country_code ? ` · ${application.current_country_code}` : ""}
          </div>
          <div className="mt-1 text-xs text-black/40">
            {application.residency_type ? labels[application.residency_type] : ""}
          </div>
        </div>
        <div className="rounded-2xl bg-[#f8f5ef] px-4 py-3">
          <div className="text-xs text-black/38">الحالة الاجتماعية</div>
          <div className="mt-1 font-bold text-black/68">
            {application.marital_status ? labels[application.marital_status] : "—"}
          </div>
          <div className="mt-1 text-xs text-black/40">
            أطفال: {application.has_children === null ? "—" : application.has_children ? "نعم" : "لا"}
          </div>
        </div>
      </div>

      {actions.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-black/7 pt-4">
          {actions.map((action) => (
            <form action={setWaitlistStatus} key={action.status}>
              <input name="application_id" type="hidden" value={application.application_id} />
              <input name="target_status" type="hidden" value={action.status} />
              <input name="current_filter" type="hidden" value={currentFilter} />
              <button
                className={
                  action.danger
                    ? "focus-ring rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 hover:bg-red-100"
                    : "focus-ring rounded-xl bg-[#153d35] px-4 py-2 text-sm font-black text-white hover:bg-[#0f2c27]"
                }
                type="submit"
              >
                {action.label}
              </button>
            </form>
          ))}
        </div>
      ) : (
        <p className="mt-5 border-t border-black/7 pt-4 text-xs font-bold text-black/38">
          لا توجد إجراءات إدارية متاحة لهذه الحالة.
        </p>
      )}
    </article>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string; updated?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) redirect("/join");

  const requestedStatus = params.status ?? "all";
  const currentFilter = filterStatuses.includes(requestedStatus as WaitlistStatus | "all")
    ? requestedStatus
    : "all";
  const statusFilter = currentFilter === "all" ? null : (currentFilter as WaitlistStatus);

  const [{ data: analyticsData, error: analyticsError }, { data: applications, error: applicationsError }] =
    await Promise.all([
      supabase.rpc("get_admin_waitlist_analytics", {}),
      supabase.rpc("list_admin_waitlist_applications", {
        p_status: statusFilter,
        p_limit: 100,
      }),
    ]);

  if (analyticsError || applicationsError || !analyticsData) notFound();

  const analytics = analyticsData as unknown as AnalyticsPayload;
  const waitlistApplications = applications ?? [];
  const summaryCards = [
    ["الحسابات المسجلة", analytics.summary.registered_accounts],
    ["طلبات قائمة الانتظار", analytics.summary.applications],
    ["الطلبات المرسلة", analytics.summary.submitted],
    ["آخر 7 أيام", analytics.summary.submitted_last_7_days],
    ["المسودات", analytics.summary.draft],
    ["رموز الدعوة النشطة", analytics.summary.active_referral_codes],
    ["تسجيلات مكتملة عبر الدعوات", analytics.summary.referral_submissions],
  ] as const;

  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="font-black text-[#153d35]" href="/waitlist">ميثاق</Link>
            <h1 className="mt-2 text-3xl font-black text-[#153d35]">إدارة قائمة الانتظار</h1>
            <p className="mt-2 text-sm text-black/45">
              لوحة داخلية. تعرض المعلومات اللازمة للمراجعة فقط ولا تعرض رقم الهاتف أو بيانات تسجيل الدخول.
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-xs font-bold text-black/45">
            آخر تحديث: {new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(analytics.generated_at))}
          </div>
        </div>

        {params.updated === "1" ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
            تم تحديث حالة الطلب وتسجيل العملية في سجل الإدارة.
          </div>
        ) : null}
        {params.error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            تعذر تنفيذ التغيير. لم يتم تعديل حالة الطلب.
          </div>
        ) : null}

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-black/8 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold text-black/45">{label}</div>
              <div className="mt-2 text-3xl font-black text-[#153d35]">{formatNumber(Number(value))}</div>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <Distribution title="حالة الطلبات" items={analytics.status_distribution} />
          <Distribution title="النوع" items={analytics.gender_distribution} />
          <Distribution title="الإقامة" items={analytics.residency_distribution} />
          <Distribution title="الفئة العمرية" items={analytics.age_distribution} />
          <Distribution title="الجدية الزمنية للزواج" items={analytics.marriage_timeline_distribution} />
          <Distribution title="تفضيل خصوصية الصور" items={analytics.photo_privacy_distribution} />
          <Distribution title="توقيت إشراك العائلة" items={analytics.family_involvement_distribution} />
          <Distribution title="الاستعداد للتحقق من الهوية" items={analytics.identity_verification_distribution} />
        </section>

        <section className="mt-9">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black text-[#9d702d]">الطلبات</p>
              <h2 className="mt-1 text-2xl font-black text-[#153d35]">مراجعة وتحريك قائمة الانتظار</h2>
              <p className="mt-2 text-sm text-black/45">
                يعرض حتى 100 طلب في كل مرة. التغييرات المسموحة تتحقق منها قاعدة البيانات وتُسجل في سجل خاص.
              </p>
            </div>
            <div className="text-sm font-black text-[#153d35]">{formatNumber(waitlistApplications.length)} طلب</div>
          </div>

          <nav className="mt-5 flex flex-wrap gap-2">
            {filterStatuses.map((status) => {
              const active = currentFilter === status;
              const href = status === "all" ? "/admin" : `/admin?status=${status}`;
              return (
                <Link
                  className={
                    active
                      ? "rounded-full bg-[#153d35] px-4 py-2 text-sm font-black text-white"
                      : "rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-black/55 hover:border-[#153d35]/30"
                  }
                  href={href}
                  key={status}
                >
                  {status === "all" ? "الكل" : labels[status] ?? status}
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {waitlistApplications.length === 0 ? (
              <div className="rounded-3xl border border-black/8 bg-white p-8 text-center text-sm text-black/45 xl:col-span-2">
                لا توجد طلبات في هذا التصنيف حالياً.
              </div>
            ) : (
              waitlistApplications.map((application) => (
                <ApplicationCard
                  application={application}
                  currentFilter={currentFilter}
                  key={application.application_id}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
