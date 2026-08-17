"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveWaitlistQuestionnaire } from "./actions";
import { waitlistCopy } from "./copy";
import type { WaitlistQuestionnaireInput } from "./schema";

type Draft = Omit<
  WaitlistQuestionnaireInput,
  "ageBandId" | "preferredPartnerAgeMin" | "preferredPartnerAgeMax"
> & {
  ageBandId: string;
  preferredPartnerAgeMin: string;
  preferredPartnerAgeMax: string;
};

type WaitlistQuestionnaireProps = {
  initialValue?: WaitlistQuestionnaireInput | null;
};

const defaultValue: WaitlistQuestionnaireInput = {
  gender: "man",
  ageBandId: 2,
  residencyType: "libya",
  currentCountryCode: "LY",
  currentCity: "",
  libyanOriginRegion: "",
  maritalStatus: "never_married",
  hasChildren: false,
  libyanSelfAttestation: true,
  marriageTimeline: "6_to_12_months",
  preferredPartnerAgeMin: 22,
  preferredPartnerAgeMax: 35,
  acceptedMaritalStatuses: ["never_married"],
  acceptsPartnerWithChildren: "depends",
  openToLibya: true,
  openToDiaspora: true,
  relocationWillingness: "depends",
  preferredCountries: [],
  willingIdentityVerification: true,
  photoPrivacyPreference: "after_mutual_interest",
  familyInvolvementPreference: "after_initial_interest",
};

function toDraft(value: WaitlistQuestionnaireInput): Draft {
  return {
    ...value,
    ageBandId: String(value.ageBandId),
    preferredPartnerAgeMin: String(value.preferredPartnerAgeMin),
    preferredPartnerAgeMax: String(value.preferredPartnerAgeMax),
  };
}

export function WaitlistQuestionnaire({
  initialValue,
}: WaitlistQuestionnaireProps) {
  const locale = useLocale() === "en" ? "en" : "ar";
  const copy = waitlistCopy[locale].questionnaire;
  const seed = initialValue ?? defaultValue;
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(() => toDraft(seed));
  const [preferredCountries, setPreferredCountries] = useState(() =>
    seed.preferredCountries.join(", "),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleAcceptedStatus(
    status: "never_married" | "divorced" | "widowed",
  ) {
    setDraft((current) => {
      const hasStatus = current.acceptedMaritalStatuses.includes(status);
      return {
        ...current,
        acceptedMaritalStatuses: hasStatus
          ? current.acceptedMaritalStatuses.filter((item) => item !== status)
          : [...current.acceptedMaritalStatuses, status],
      };
    });
  }

  async function handleSubmit() {
    setMessage(null);
    setIsSaving(true);

    const result = await saveWaitlistQuestionnaire({
      ...draft,
      ageBandId: Number(draft.ageBandId),
      preferredPartnerAgeMin: Number(draft.preferredPartnerAgeMin),
      preferredPartnerAgeMax: Number(draft.preferredPartnerAgeMax),
      currentCountryCode: draft.currentCountryCode.trim().toUpperCase(),
      libyanOriginRegion: draft.libyanOriginRegion?.trim() || undefined,
      preferredCountries: preferredCountries
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean),
    });

    setIsSaving(false);
    setIsError(!result.ok);
    setMessage(result.ok ? copy.success : copy.error);
  }

  const labels =
    locale === "ar"
      ? {
          woman: "امرأة",
          man: "رجل",
          country: "رمز الدولة الحالية",
          city: "المدينة الحالية",
          region: "المنطقة الليبية (اختياري)",
          never: "لم يسبق لي الزواج",
          divorced: "مطلق/مطلقة",
          widowed: "أرمل/أرملة",
          children: "لدي أطفال",
          libyan: "أؤكد أنني ليبي/ليبية أو من أصل ليبي",
          timeline: "الاستعداد للزواج",
          minAge: "أقل عمر مناسب",
          maxAge: "أعلى عمر مناسب",
          accepted: "الحالات الاجتماعية المقبولة",
          partnerChildren: "شريك لديه أطفال",
          libya: "منفتح على شخص في ليبيا",
          diaspora: "منفتح على شخص في الخارج",
          relocation: "الاستعداد للانتقال",
          countries: "دول مفضلة (رموز مثل GB,CA)",
          verify: "مستعد للتحقق من الهوية لاحقاً",
          photo: "خصوصية الصورة مستقبلاً",
          family: "إشراك الأسرة",
        }
      : {
          woman: "Woman",
          man: "Man",
          country: "Current country code",
          city: "Current city",
          region: "Libyan region (optional)",
          never: "Never married",
          divorced: "Divorced",
          widowed: "Widowed",
          children: "I have children",
          libyan: "I confirm I am Libyan or of Libyan origin",
          timeline: "Marriage timeline",
          minAge: "Minimum preferred age",
          maxAge: "Maximum preferred age",
          accepted: "Accepted marital statuses",
          partnerChildren: "Partner with children",
          libya: "Open to someone in Libya",
          diaspora: "Open to someone in the diaspora",
          relocation: "Relocation willingness",
          countries: "Preferred countries (codes such as GB,CA)",
          verify: "Willing to verify identity later",
          photo: "Future photo privacy",
          family: "Family involvement",
        };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold text-primary">{copy.eyebrow}</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        {copy.title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{copy.privacy}</p>

      <div className="mt-8 grid grid-cols-3 gap-2 text-center text-sm font-semibold">
        {[copy.step1, copy.step2, copy.step3].map((label, index) => (
          <div
            key={label}
            className={`rounded-xl px-3 py-3 ${
              step === index + 1
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      <section className="mt-6 space-y-6 rounded-3xl border border-primary/15 bg-card p-6 sm:p-8">
        {step === 1 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Choice
                label={labels.woman}
                checked={draft.gender === "woman"}
                onChange={() => update("gender", "woman")}
              />
              <Choice
                label={labels.man}
                checked={draft.gender === "man"}
                onChange={() => update("gender", "man")}
              />
            </div>
            <Field label={locale === "ar" ? "الفئة العمرية" : "Age range"}>
              <select
                className="h-12 w-full rounded-xl border border-input bg-background px-3"
                value={draft.ageBandId}
                onChange={(event) => update("ageBandId", event.target.value)}
              >
                {[
                  [1, "18–24"],
                  [2, "25–29"],
                  [3, "30–34"],
                  [4, "35–39"],
                  [5, "40–44"],
                  [6, "45–49"],
                  [7, "50–54"],
                  [8, "55+"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={locale === "ar" ? "مكان الإقامة" : "Residence"}>
              <select
                className="h-12 w-full rounded-xl border border-input bg-background px-3"
                value={draft.residencyType}
                onChange={(event) =>
                  update(
                    "residencyType",
                    event.target.value as Draft["residencyType"],
                  )
                }
              >
                <option value="libya">
                  {locale === "ar" ? "ليبيا" : "Libya"}
                </option>
                <option value="diaspora">
                  {locale === "ar" ? "خارج ليبيا" : "Diaspora"}
                </option>
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={labels.country}
                value={draft.currentCountryCode}
                onChange={(value) => update("currentCountryCode", value)}
                maxLength={2}
                dir="ltr"
              />
              <TextField
                label={labels.city}
                value={draft.currentCity}
                onChange={(value) => update("currentCity", value)}
              />
            </div>
            <TextField
              label={labels.region}
              value={draft.libyanOriginRegion ?? ""}
              onChange={(value) => update("libyanOriginRegion", value)}
            />
            <Field
              label={locale === "ar" ? "الحالة الاجتماعية" : "Marital status"}
            >
              <select
                className="h-12 w-full rounded-xl border border-input bg-background px-3"
                value={draft.maritalStatus}
                onChange={(event) =>
                  update(
                    "maritalStatus",
                    event.target.value as Draft["maritalStatus"],
                  )
                }
              >
                <option value="never_married">{labels.never}</option>
                <option value="divorced">{labels.divorced}</option>
                <option value="widowed">{labels.widowed}</option>
              </select>
            </Field>
            <Check
              label={labels.children}
              checked={draft.hasChildren}
              onChange={(value) => update("hasChildren", value)}
            />
            <Check
              label={labels.libyan}
              checked={draft.libyanSelfAttestation}
              onChange={(value) => update("libyanSelfAttestation", value)}
            />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Field label={labels.timeline}>
              <select
                className="h-12 w-full rounded-xl border border-input bg-background px-3"
                value={draft.marriageTimeline}
                onChange={(event) =>
                  update(
                    "marriageTimeline",
                    event.target.value as Draft["marriageTimeline"],
                  )
                }
              >
                <option value="within_6_months">
                  {locale === "ar" ? "خلال 6 أشهر" : "Within 6 months"}
                </option>
                <option value="6_to_12_months">
                  {locale === "ar" ? "6–12 شهراً" : "6–12 months"}
                </option>
                <option value="1_to_2_years">
                  {locale === "ar" ? "سنة إلى سنتين" : "1–2 years"}
                </option>
                <option value="unsure">
                  {locale === "ar" ? "غير متأكد" : "Unsure"}
                </option>
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                type="number"
                label={labels.minAge}
                value={draft.preferredPartnerAgeMin}
                onChange={(value) => update("preferredPartnerAgeMin", value)}
              />
              <TextField
                type="number"
                label={labels.maxAge}
                value={draft.preferredPartnerAgeMax}
                onChange={(value) => update("preferredPartnerAgeMax", value)}
              />
            </div>
            <Field label={labels.accepted}>
              <div className="grid gap-2 sm:grid-cols-3">
                <Check
                  label={labels.never}
                  checked={draft.acceptedMaritalStatuses.includes(
                    "never_married",
                  )}
                  onChange={() => toggleAcceptedStatus("never_married")}
                />
                <Check
                  label={labels.divorced}
                  checked={draft.acceptedMaritalStatuses.includes("divorced")}
                  onChange={() => toggleAcceptedStatus("divorced")}
                />
                <Check
                  label={labels.widowed}
                  checked={draft.acceptedMaritalStatuses.includes("widowed")}
                  onChange={() => toggleAcceptedStatus("widowed")}
                />
              </div>
            </Field>
            <Field label={labels.partnerChildren}>
              <select
                className="h-12 w-full rounded-xl border border-input bg-background px-3"
                value={draft.acceptsPartnerWithChildren}
                onChange={(event) =>
                  update(
                    "acceptsPartnerWithChildren",
                    event.target.value as Draft["acceptsPartnerWithChildren"],
                  )
                }
              >
                <option value="yes">{locale === "ar" ? "نعم" : "Yes"}</option>
                <option value="no">{locale === "ar" ? "لا" : "No"}</option>
                <option value="depends">
                  {locale === "ar" ? "يعتمد" : "Depends"}
                </option>
              </select>
            </Field>
            <Check
              label={labels.libya}
              checked={draft.openToLibya}
              onChange={(value) => update("openToLibya", value)}
            />
            <Check
              label={labels.diaspora}
              checked={draft.openToDiaspora}
              onChange={(value) => update("openToDiaspora", value)}
            />
            <Field label={labels.relocation}>
              <select
                className="h-12 w-full rounded-xl border border-input bg-background px-3"
                value={draft.relocationWillingness}
                onChange={(event) =>
                  update(
                    "relocationWillingness",
                    event.target.value as Draft["relocationWillingness"],
                  )
                }
              >
                <option value="yes">{locale === "ar" ? "نعم" : "Yes"}</option>
                <option value="no">{locale === "ar" ? "لا" : "No"}</option>
                <option value="depends">
                  {locale === "ar" ? "يعتمد" : "Depends"}
                </option>
              </select>
            </Field>
            <TextField
              label={labels.countries}
              value={preferredCountries}
              onChange={setPreferredCountries}
              dir="ltr"
            />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Check
              label={labels.verify}
              checked={draft.willingIdentityVerification}
              onChange={(value) => update("willingIdentityVerification", value)}
            />
            <Field label={labels.photo}>
              <select
                className="h-12 w-full rounded-xl border border-input bg-background px-3"
                value={draft.photoPrivacyPreference}
                onChange={(event) =>
                  update(
                    "photoPrivacyPreference",
                    event.target.value as Draft["photoPrivacyPreference"],
                  )
                }
              >
                <option value="none">
                  {locale === "ar" ? "لا أرغب بالمشاركة" : "Do not share"}
                </option>
                <option value="blurred">
                  {locale === "ar" ? "صورة مموهة" : "Blurred"}
                </option>
                <option value="after_mutual_interest">
                  {locale === "ar"
                    ? "بعد الاهتمام المتبادل"
                    : "After mutual interest"}
                </option>
                <option value="explicit_approval">
                  {locale === "ar"
                    ? "بعد موافقتي الصريحة"
                    : "After explicit approval"}
                </option>
                <option value="after_family_involvement">
                  {locale === "ar"
                    ? "بعد إشراك الأسرة"
                    : "After family involvement"}
                </option>
              </select>
            </Field>
            <Field label={labels.family}>
              <select
                className="h-12 w-full rounded-xl border border-input bg-background px-3"
                value={draft.familyInvolvementPreference}
                onChange={(event) =>
                  update(
                    "familyInvolvementPreference",
                    event.target.value as Draft["familyInvolvementPreference"],
                  )
                }
              >
                <option value="early">
                  {locale === "ar" ? "مبكراً" : "Early"}
                </option>
                <option value="after_initial_interest">
                  {locale === "ar"
                    ? "بعد اهتمام أولي"
                    : "After initial interest"}
                </option>
                <option value="later">
                  {locale === "ar" ? "لاحقاً" : "Later"}
                </option>
                <option value="unsure">
                  {locale === "ar" ? "غير متأكد" : "Unsure"}
                </option>
              </select>
            </Field>
          </>
        ) : null}

        {message ? (
          <p
            role="status"
            className={`rounded-xl px-4 py-3 text-sm font-medium ${
              isError
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
            }`}
          >
            {message}
          </p>
        ) : null}

        <div className="flex gap-3 pt-2">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((value) => value - 1)}
            >
              {copy.previous}
            </Button>
          ) : null}
          <div className="ms-auto">
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep((value) => value + 1)}
              >
                {copy.next}
              </Button>
            ) : (
              <Button type="button" disabled={isSaving} onClick={handleSubmit}>
                {isSaving ? copy.saving : copy.submit}
              </Button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  maxLength,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  maxLength?: number;
  dir?: "ltr" | "rtl";
}) {
  const id = `field-${label.replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        dir={dir}
      />
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-5 accent-primary"
      />
      <span className="text-sm leading-6 font-medium">{label}</span>
    </label>
  );
}

function Choice({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border p-4">
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="size-5 accent-primary"
      />
      <span className="font-medium">{label}</span>
    </label>
  );
}
