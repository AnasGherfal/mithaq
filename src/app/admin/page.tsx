import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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
  declined: "غير نشط",
  deleted: "محذوف",
  man: "رجال",
  woman: "نساء",
  libya: "داخل ليبيا",
  diaspora: "خارج ليبيا",
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-LY").format(value ?? 0);
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
                <div className="h-full rounded-full bg-[#c99a52]" style={{ width: `${Math.max(2, (count / max) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) redirect("/join");

  const { data, error } = await supabase.rpc("get_admin_waitlist_analytics", {});
  if (error || !data) notFound();

  const analytics = data as unknown as AnalyticsPayload;
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
            <h1 className="mt-2 text-3xl font-black text-[#153d35]">لوحة قائمة الانتظار</h1>
            <p className="mt-2 text-sm text-black/45">بيانات مجمعة فقط · لا تعرض أرقام هواتف أو ملفات أفراد.</p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-xs font-bold text-black/45">
            آخر تحديث: {new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(analytics.generated_at))}
          </div>
        </div>

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
      </div>
    </main>
  );
}
