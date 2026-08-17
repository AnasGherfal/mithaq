import {
  BellRing,
  CheckCircle2,
  CircleDashed,
  FilePenLine,
  Gift,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { redirect } from "next/navigation";
import {
  requestDeletion,
  withdrawCommunications,
} from "@/features/waitlist/completion-actions";
import { Button } from "@/components/ui/button";
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

  const communicationsEnabled = communicationsConsent?.event_type === "granted";

  const copy =
    lang === "ar"
      ? {
          eyebrow: "حسابك الخاص",
          title: "حالة التسجيل",
          intro:
            "تابع تسجيلك وخصوصيتك من مكان واحد. لا توجد ملفات عامة أو تصفح للأعضاء في هذه المرحلة.",
          phone: "رقم الهاتف مؤكد",
          questionnaire: "الاستبيان",
          submitted: "قائمة الانتظار",
          identity: "التحقق من الهوية",
          complete: "مكتمل",
          pending: "غير مكتمل",
          unavailable: "غير متاح بعد",
          edit: "تعديل إجابات الاستبيان",
          referral: "دعوتك الخاصة",
          referralConversions: "تسجيلات مكتملة عبر دعوتك",
          referralPrivacy: "نُظهر العدد فقط، وليس هوية الأشخاص.",
          communications: "تحديثات ميثاق",
          communicationsOn: "مفعّلة",
          communicationsOff: "غير مفعّلة",
          withdrawCommunications: "إيقاف تحديثات ميثاق",
          communicationsWithdrawn: "تم إيقاف تحديثات ميثاق.",
          deletion: "التحكم في بياناتك",
          deletionBody:
            "يمكنك طلب حذف بيانات قائمة الانتظار فقط أو حذف الحساب بالكامل. هذه الإجراءات منفصلة عن استخدامك اليومي لتجنب الحذف غير المقصود.",
          waitlistData: "حذف بيانات قائمة الانتظار",
          entireAccount: "حذف الحساب بالكامل",
          request: "إرسال طلب الحذف",
          requested: "تم استلام طلب الحذف.",
          error: "تعذر تنفيذ الطلب حالياً.",
        }
      : {
          eyebrow: "Your private account",
          title: "Registration status",
          intro:
            "Manage your registration and privacy in one place. There are no public profiles or member browsing at this stage.",
          phone: "Phone number verified",
          questionnaire: "Questionnaire",
          submitted: "Waitlist",
          identity: "Identity verification",
          complete: "Complete",
          pending: "Incomplete",
          unavailable: "Not available yet",
          edit: "Edit questionnaire answers",
          referral: "Your private invitation",
          referralConversions: "Completed registrations from your invitation",
          referralPrivacy: "Only the count is shown, never people's identities.",
          communications: "Mithaq updates",
          communicationsOn: "Enabled",
          communicationsOff: "Not enabled",
          withdrawCommunications: "Stop Mithaq updates",
          communicationsWithdrawn: "Mithaq updates have been stopped.",
          deletion: "Control your data",
          deletionBody:
            "You can request deletion of only your waitlist data or your entire account. These actions are kept separate from everyday account controls to reduce accidental deletion.",
          waitlistData: "Delete waitlist data",
          entireAccount: "Delete entire account",
          request: "Submit deletion request",
          requested: "Your deletion request was received.",
          error: "We could not complete that request right now.",
        };

  return (
    <main className="relative isolate overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="premium-orb -start-40 top-8" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-4xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">
              {copy.eyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.025em] sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-4 leading-7 text-muted-foreground">{copy.intro}</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/waitlist/questionnaire">
              <FilePenLine aria-hidden="true" />
              {copy.edit}
            </Link>
          </Button>
        </div>

        <section className="premium-panel mt-8 rounded-[2rem] p-5 sm:p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <StatusCard label={copy.phone} value={copy.complete} complete />
            <StatusCard
              label={copy.questionnaire}
              value={
                application?.questionnaire_completed_at
                  ? copy.complete
                  : copy.pending
              }
              complete={Boolean(application?.questionnaire_completed_at)}
            />
            <StatusCard
              label={copy.submitted}
              value={
                application?.status === "submitted"
                  ? copy.complete
                  : copy.pending
              }
              complete={application?.status === "submitted"}
            />
            <StatusCard
              label={copy.identity}
              value={copy.unavailable}
              complete={false}
            />
          </div>
        </section>

        {query.communications === "withdrawn" ? (
          <p className="mt-6 rounded-2xl border border-primary/10 bg-primary/8 px-4 py-3 text-sm font-semibold text-primary">
            {copy.communicationsWithdrawn}
          </p>
        ) : null}

        {query.error ? (
          <p className="mt-6 rounded-2xl border border-destructive/15 bg-destructive/8 px-4 py-3 text-sm font-semibold text-destructive">
            {copy.error}
          </p>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <section className="premium-panel rounded-[2rem] p-6">
            <div className="flex items-start gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary">
                <BellRing className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold">{copy.communications}</h2>
                  <span className="rounded-full bg-primary/8 px-3 py-1 text-xs font-bold text-primary">
                    {communicationsEnabled
                      ? copy.communicationsOn
                      : copy.communicationsOff}
                  </span>
                </div>
                {communicationsEnabled ? (
                  <form action={withdrawCommunications} className="mt-4">
                    <input type="hidden" name="locale" value={lang} />
                    <Button type="submit" size="sm" variant="outline">
                      {copy.withdrawCommunications}
                    </Button>
                  </form>
                ) : null}
              </div>
            </div>
          </section>

          {referral?.code ? (
            <section className="premium-panel rounded-[2rem] p-6">
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold">
                  <Gift className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold">{copy.referral}</h2>
                  <code
                    className="mt-2 block overflow-x-auto rounded-xl bg-background/70 px-3 py-2 text-sm"
                    dir="ltr"
                  >
                    {referral.code}
                  </code>
                  <p className="mt-3 text-sm font-semibold">
                    {copy.referralConversions}: {referralConversions ?? 0}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {copy.referralPrivacy}
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <section className="mt-10 rounded-[2rem] border border-destructive/15 bg-card/85 p-6 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-destructive/8 text-destructive">
              <Trash2 className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{copy.deletion}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                {copy.deletionBody}
              </p>
            </div>
          </div>

          {query.deletion === "requested" ? (
            <p className="mt-4 rounded-xl bg-primary/8 px-4 py-3 text-sm font-semibold text-primary">
              {copy.requested}
            </p>
          ) : null}

          {deletion ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {deletion.request_scope} · {deletion.status}
            </p>
          ) : null}

          <form action={requestDeletion} className="mt-5 space-y-3">
            <input type="hidden" name="locale" value={lang} />
            <label className="flex cursor-pointer gap-3 rounded-xl border border-border/70 p-3 has-[:checked]:border-destructive/30 has-[:checked]:bg-destructive/[0.035]">
              <input
                className="mt-1 accent-destructive"
                type="radio"
                name="scope"
                value="waitlist_data"
                required
              />
              <span>{copy.waitlistData}</span>
            </label>
            <label className="flex cursor-pointer gap-3 rounded-xl border border-border/70 p-3 has-[:checked]:border-destructive/30 has-[:checked]:bg-destructive/[0.035]">
              <input
                className="mt-1 accent-destructive"
                type="radio"
                name="scope"
                value="entire_account"
                required
              />
              <span>{copy.entireAccount}</span>
            </label>
            <Button type="submit" variant="destructive" className="mt-2">
              {copy.request}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}

function StatusCard({
  label,
  value,
  complete,
}: {
  label: string;
  value: string;
  complete: boolean;
}) {
  const Icon = complete ? CheckCircle2 : CircleDashed;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/65 bg-background/55 p-4">
      <div
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${
          complete ? "bg-primary/8 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{value}</p>
      </div>
      {complete ? (
        <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
      ) : null}
    </div>
  );
}
