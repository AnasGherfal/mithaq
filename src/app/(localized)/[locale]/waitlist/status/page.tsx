import { redirect } from "next/navigation";
import {
  requestDeletion,
  withdrawCommunications,
} from "@/features/waitlist/completion-actions";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    communications?: string;
    deletion?: string;
    error?: string;
  }>;
};

export default async function WaitlistStatusPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const lang = locale === "en" ? "en" : "ar";
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (!userId) redirect(`/${lang}/waitlist`);

  const [
    { data: application },
    { data: referral },
    { data: deletion },
    { data: communicationsConsent },
    { data: referralConversions },
  ] = await Promise.all([
    supabase
      .from("waitlist_applications")
      .select("status, questionnaire_completed_at, submitted_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("referral_codes")
      .select("code")
      .eq("owner_user_id", userId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("deletion_requests")
      .select("status, request_scope, requested_at")
      .eq("user_id", userId)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("waitlist_consents")
      .select("event_type")
      .eq("user_id", userId)
      .eq("consent_type", "communications")
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.rpc("get_my_referral_conversion_count"),
  ]);

  const communicationsEnabled =
    communicationsConsent?.event_type === "granted";

  const copy =
    lang === "ar"
      ? {
          title: "حالة التسجيل",
          phone: "رقم الهاتف مؤكد",
          questionnaire: "الاستبيان",
          submitted: "قائمة الانتظار",
          identity: "التحقق من الهوية",
          complete: "مكتمل",
          pending: "غير مكتمل",
          unavailable: "غير متاح بعد",
          edit: "تعديل إجابات الاستبيان",
          referral: "رمز الدعوة",
          referralConversions: "تسجيلات مكتملة عبر دعوتك",
          communications: "تحديثات ميثاق",
          communicationsOn: "مفعّلة",
          communicationsOff: "غير مفعّلة",
          withdrawCommunications: "إيقاف تحديثات ميثاق",
          communicationsWithdrawn: "تم إيقاف تحديثات ميثاق.",
          deletion: "حذف البيانات أو الحساب",
          deletionBody:
            "يمكنك طلب حذف بيانات قائمة الانتظار فقط أو حذف الحساب بالكامل. سيظهر الطلب هنا أثناء معالجته.",
          waitlistData: "حذف بيانات قائمة الانتظار",
          entireAccount: "حذف الحساب بالكامل",
          request: "إرسال طلب الحذف",
          requested: "تم استلام طلب الحذف.",
          error: "تعذر تنفيذ الطلب حالياً.",
        }
      : {
          title: "Registration status",
          phone: "Phone number verified",
          questionnaire: "Questionnaire",
          submitted: "Waitlist",
          identity: "Identity verification",
          complete: "Complete",
          pending: "Incomplete",
          unavailable: "Not available yet",
          edit: "Edit questionnaire answers",
          referral: "Referral code",
          referralConversions: "Completed registrations from your invitation",
          communications: "Mithaq updates",
          communicationsOn: "Enabled",
          communicationsOff: "Not enabled",
          withdrawCommunications: "Stop Mithaq updates",
          communicationsWithdrawn: "Mithaq updates have been stopped.",
          deletion: "Delete data or account",
          deletionBody:
            "You can request deletion of only your waitlist data or your entire account. The request status appears here while it is processed.",
          waitlistData: "Delete waitlist data",
          entireAccount: "Delete entire account",
          request: "Submit deletion request",
          requested: "Your deletion request was received.",
          error: "We could not complete that request right now.",
        };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {copy.title}
      </h1>
      <div className="mt-8 grid gap-3">
        <StatusRow label={copy.phone} value={copy.complete} />
        <StatusRow
          label={copy.questionnaire}
          value={
            application?.questionnaire_completed_at
              ? copy.complete
              : copy.pending
          }
        />
        <StatusRow
          label={copy.submitted}
          value={application?.status === "submitted" ? copy.complete : copy.pending}
        />
        <StatusRow label={copy.identity} value={copy.unavailable} />
        <StatusRow
          label={copy.communications}
          value={
            communicationsEnabled
              ? copy.communicationsOn
              : copy.communicationsOff
          }
        />
      </div>

      <div className="mt-5">
        <Link
          className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 font-semibold hover:bg-muted"
          href="/waitlist/questionnaire"
        >
          {copy.edit}
        </Link>
      </div>

      {query.communications === "withdrawn" ? (
        <p className="mt-6 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
          {copy.communicationsWithdrawn}
        </p>
      ) : null}

      {query.error ? (
        <p className="mt-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {copy.error}
        </p>
      ) : null}

      {communicationsEnabled ? (
        <form action={withdrawCommunications} className="mt-6">
          <input type="hidden" name="locale" value={lang} />
          <button
            className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted"
            type="submit"
          >
            {copy.withdrawCommunications}
          </button>
        </form>
      ) : null}

      {referral?.code ? (
        <section className="mt-8 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">{copy.referral}</h2>
          <code className="mt-2 block text-sm" dir="ltr">
            {referral.code}
          </code>
          <p className="mt-3 text-sm text-muted-foreground">
            {copy.referralConversions}: {referralConversions ?? 0}
          </p>
        </section>
      ) : null}

      <section className="mt-10 rounded-3xl border border-destructive/20 bg-card p-6">
        <h2 className="text-xl font-bold">{copy.deletion}</h2>
        <p className="mt-3 leading-7 text-muted-foreground">
          {copy.deletionBody}
        </p>
        {query.deletion === "requested" ? (
          <p className="mt-4 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
            {copy.requested}
          </p>
        ) : null}
        {deletion ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {deletion.request_scope} · {deletion.status}
          </p>
        ) : null}
        <form action={requestDeletion} className="mt-5 space-y-4">
          <input type="hidden" name="locale" value={lang} />
          <label className="flex gap-3">
            <input
              type="radio"
              name="scope"
              value="waitlist_data"
              required
            />
            <span>{copy.waitlistData}</span>
          </label>
          <label className="flex gap-3">
            <input
              type="radio"
              name="scope"
              value="entire_account"
              required
            />
            <span>{copy.entireAccount}</span>
          </label>
          <button
            className="min-h-12 rounded-xl border border-destructive px-5 font-semibold text-destructive hover:bg-destructive/5"
            type="submit"
          >
            {copy.request}
          </button>
        </form>
      </section>
    </main>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4">
      <span className="font-medium">{label}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}
