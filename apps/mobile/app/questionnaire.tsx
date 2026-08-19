import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GuidedActionBar } from "@/components/guided-action-bar";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { questionnaireCopy } from "@/features/questionnaire-copy";
import {
  defaultQuestionnaire,
  loadQuestionnaire,
  saveQuestionnaire,
  validateQuestionnaire,
  type MaritalStatus,
  type QuestionnaireDraft,
  type YesNoDepends,
} from "@/features/questionnaire-data";
import {
  Choice,
  ChoiceGrid,
  Field,
  Label,
  Progress,
  ToggleCard,
  questionnaireStyles as styles,
  textAlign,
} from "@/features/questionnaire-ui";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

const TOTAL_STEPS = 6;
const ageBands = ["18–24", "25–29", "30–34", "35–39", "40–44", "45–49", "50–54", "55+"];
type Copy = ReturnType<typeof questionnaireCopy>;
type Update = <K extends keyof QuestionnaireDraft>(key: K, value: QuestionnaireDraft[K]) => void;

export default function QuestionnaireScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => questionnaireCopy(locale), [locale]);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<QuestionnaireDraft>(defaultQuestionnaire);
  const [countries, setCountries] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      setLoading(true);
      setLoadError(false);

      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!data.session) {
          router.replace({ pathname: "/auth", params: { locale } });
          return;
        }

        const existing = await loadQuestionnaire();
        if (!active) return;

        if (existing) {
          setDraft(existing);
          setCountries(existing.preferredCountries.join(", "));
        }

        setLoading(false);
      } catch {
        if (!active) return;
        setLoadError(true);
        setLoading(false);
      }
    }

    void hydrate();
    return () => {
      active = false;
    };
  }, [locale, loadAttempt]);

  function update<K extends keyof QuestionnaireDraft>(key: K, value: QuestionnaireDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function toggleStatus(status: MaritalStatus) {
    update(
      "acceptedMaritalStatuses",
      draft.acceptedMaritalStatuses.includes(status)
        ? draft.acceptedMaritalStatuses.filter((value) => value !== status)
        : [...draft.acceptedMaritalStatuses, status],
    );
  }

  function normalizedDraft(): QuestionnaireDraft {
    return {
      ...draft,
      currentCountryCode: draft.currentCountryCode.trim().toUpperCase(),
      preferredCountries: countries
        .split(",")
        .map((country) => country.trim().toUpperCase())
        .filter(Boolean),
    };
  }

  function validationMessage(reason: string) {
    return copy.validation[reason as keyof typeof copy.validation] ?? copy.error;
  }

  function validateStep() {
    if (step === 2) {
      const countryCode = draft.currentCountryCode.trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(countryCode)) return "country";
      if (!draft.currentCity.trim() || draft.currentCity.trim().length > 100) return "city";
      if (!draft.libyanSelfAttestation) return "libyan";
    }

    if (step === 3) {
      if (
        draft.preferredPartnerAgeMin < 18 ||
        draft.preferredPartnerAgeMax > 100 ||
        draft.preferredPartnerAgeMax < draft.preferredPartnerAgeMin
      ) {
        return "age";
      }
      if (draft.acceptedMaritalStatuses.length === 0) return "status";
    }

    if (step === 4) {
      if (!draft.openToLibya && !draft.openToDiaspora) return "location";
      const invalidCountry = countries
        .split(",")
        .map((country) => country.trim().toUpperCase())
        .filter(Boolean)
        .some((country) => !/^[A-Z]{2}$/.test(country));
      if (invalidCountry) return "countries";
    }

    return null;
  }

  function continueToNextStep() {
    const reason = validateStep();
    if (reason) {
      setError(validationMessage(reason));
      return;
    }

    setError(null);
    setStep((value) => Math.min(TOTAL_STEPS, value + 1));
  }

  function goBack() {
    if (saving) return;
    setError(null);

    if (step === 1) {
      router.back();
      return;
    }

    setStep((value) => Math.max(1, value - 1));
  }

  async function finish() {
    if (saving) return;

    const finalDraft = normalizedDraft();
    const invalid = validateQuestionnaire(finalDraft);
    if (invalid) {
      setError(validationMessage(invalid));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await saveQuestionnaire(finalDraft);

      if (!result.ok) {
        if (result.reason === "unauthorized") {
          router.replace({ pathname: "/auth", params: { locale } });
          return;
        }

        setError(validationMessage(result.reason));
        return;
      }

      router.replace({
        pathname: result.wasSubmitted ? "/status" : "/consent",
        params: { locale },
      });
    } catch {
      setError(copy.validation.database);
    } finally {
      setSaving(false);
    }
  }

  const stageTitle = copy.stageTitles[step - 1] ?? copy.title;
  const stageBody = copy.stageBodies[step - 1] ?? copy.body;

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={stageTitle}
      body={stageBody}
      rtl={rtl}
      bottomBar={
        loading || loadError ? undefined : (
          <GuidedActionBar
            rtl={rtl}
            backLabel={copy.back}
            primaryLabel={step < TOTAL_STEPS ? copy.next : copy.save}
            onBack={goBack}
            onPrimary={() => {
              if (step < TOTAL_STEPS) continueToNextStep();
              else void finish();
            }}
            loading={saving}
          />
        )
      }
    >
      {loading ? (
        <View style={localStyles.loadingState} accessibilityLiveRegion="polite">
          <ActivityIndicator accessibilityLabel={copy.loading} color={colors.primary} size="large" />
          <Text style={[localStyles.loadingText, textAlign(rtl)]}>{copy.loading}</Text>
        </View>
      ) : loadError ? (
        <View style={localStyles.loadError} accessibilityRole="alert">
          <Text style={[localStyles.loadErrorTitle, textAlign(rtl)]}>{copy.loadErrorTitle}</Text>
          <Text style={[localStyles.loadErrorBody, textAlign(rtl)]}>{copy.loadErrorBody}</Text>
          <View style={localStyles.retryAction}>
            <PrimaryButton tone="quiet" onPress={() => setLoadAttempt((value) => value + 1)}>
              {copy.retry}
            </PrimaryButton>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <Progress step={step} rtl={rtl} labels={copy.steps} />

          {step === 1 ? <BasicsStep copy={copy} rtl={rtl} draft={draft} update={update} /> : null}
          {step === 2 ? <LocationStep copy={copy} rtl={rtl} draft={draft} update={update} /> : null}
          {step === 3 ? (
            <MarriageStep
              copy={copy}
              rtl={rtl}
              draft={draft}
              update={update}
              toggleStatus={toggleStatus}
            />
          ) : null}
          {step === 4 ? (
            <ReachStep
              copy={copy}
              rtl={rtl}
              draft={draft}
              update={update}
              countries={countries}
              setCountries={(value) => {
                setCountries(value);
                setError(null);
              }}
            />
          ) : null}
          {step === 5 ? <PrivacyStep copy={copy} rtl={rtl} draft={draft} update={update} /> : null}
          {step === 6 ? <FamilyStep copy={copy} rtl={rtl} draft={draft} update={update} /> : null}

          {error ? (
            <Text accessibilityRole="alert" style={[styles.error, textAlign(rtl)]}>
              {error}
            </Text>
          ) : null}
        </View>
      )}
    </ScreenShell>
  );
}

function BasicsStep({ copy, rtl, draft, update }: StepProps) {
  return (
    <View style={styles.section}>
      <Label rtl={rtl}>{copy.aboutYou}</Label>
      <ChoiceGrid rtl={rtl}>
        <Choice
          label={copy.woman}
          selected={draft.gender === "woman"}
          rtl={rtl}
          onPress={() => update("gender", "woman")}
        />
        <Choice
          label={copy.man}
          selected={draft.gender === "man"}
          rtl={rtl}
          onPress={() => update("gender", "man")}
        />
      </ChoiceGrid>

      <Label rtl={rtl}>{copy.ageRange}</Label>
      <View style={[styles.chipWrap, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        {ageBands.map((label, index) => (
          <Choice
            key={label}
            compact
            label={label}
            selected={draft.ageBandId === index + 1}
            rtl={rtl}
            onPress={() => update("ageBandId", index + 1)}
          />
        ))}
      </View>
    </View>
  );
}

function LocationStep({ copy, rtl, draft, update }: StepProps) {
  const statuses: MaritalStatus[] = ["never_married", "divorced", "widowed"];

  return (
    <View style={styles.section}>
      <Label rtl={rtl}>{copy.residence}</Label>
      <ChoiceGrid rtl={rtl}>
        <Choice
          label={copy.libya}
          selected={draft.residencyType === "libya"}
          rtl={rtl}
          onPress={() => update("residencyType", "libya")}
        />
        <Choice
          label={copy.diaspora}
          selected={draft.residencyType === "diaspora"}
          rtl={rtl}
          onPress={() => update("residencyType", "diaspora")}
        />
      </ChoiceGrid>

      <Field
        label={copy.country}
        rtl={rtl}
        value={draft.currentCountryCode}
        onChange={(value) => update("currentCountryCode", value.slice(0, 2))}
        autoCapitalize="characters"
      />
      <Field
        label={copy.city}
        rtl={rtl}
        value={draft.currentCity}
        onChange={(value) => update("currentCity", value)}
      />
      <Field
        label={copy.region}
        rtl={rtl}
        value={draft.libyanOriginRegion}
        onChange={(value) => update("libyanOriginRegion", value)}
      />

      <Label rtl={rtl}>{copy.marital}</Label>
      <View style={styles.choiceStack}>
        {statuses.map((status) => (
          <Choice
            key={status}
            label={copy.status[status]}
            selected={draft.maritalStatus === status}
            rtl={rtl}
            onPress={() => update("maritalStatus", status)}
          />
        ))}
      </View>

      <ToggleCard
        label={copy.children}
        value={draft.hasChildren}
        rtl={rtl}
        onChange={(value) => update("hasChildren", value)}
      />
      <ToggleCard
        label={copy.libyanAttestation}
        value={draft.libyanSelfAttestation}
        rtl={rtl}
        onChange={(value) => update("libyanSelfAttestation", value)}
      />
    </View>
  );
}

function MarriageStep({
  copy,
  rtl,
  draft,
  update,
  toggleStatus,
}: StepProps & { toggleStatus: (status: MaritalStatus) => void }) {
  const timelines: QuestionnaireDraft["marriageTimeline"][] = [
    "within_6_months",
    "6_to_12_months",
    "1_to_2_years",
    "unsure",
  ];
  const statuses: MaritalStatus[] = ["never_married", "divorced", "widowed"];

  return (
    <View style={styles.section}>
      <Label rtl={rtl}>{copy.timeline}</Label>
      <View style={styles.choiceStack}>
        {timelines.map((value) => (
          <Choice
            key={value}
            label={copy.timelineValues[value]}
            selected={draft.marriageTimeline === value}
            rtl={rtl}
            onPress={() => update("marriageTimeline", value)}
          />
        ))}
      </View>

      <View style={[styles.ageRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <View style={styles.ageField}>
          <Field
            label={copy.minAge}
            rtl={rtl}
            keyboardType="number-pad"
            value={String(draft.preferredPartnerAgeMin)}
            onChange={(value) =>
              update("preferredPartnerAgeMin", Number(value.replace(/\D/g, "")) || 0)
            }
          />
        </View>
        <View style={styles.ageField}>
          <Field
            label={copy.maxAge}
            rtl={rtl}
            keyboardType="number-pad"
            value={String(draft.preferredPartnerAgeMax)}
            onChange={(value) =>
              update("preferredPartnerAgeMax", Number(value.replace(/\D/g, "")) || 0)
            }
          />
        </View>
      </View>

      <Label rtl={rtl}>{copy.accepted}</Label>
      <View style={styles.choiceStack}>
        {statuses.map((status) => (
          <Choice
            key={status}
            label={copy.status[status]}
            selected={draft.acceptedMaritalStatuses.includes(status)}
            rtl={rtl}
            onPress={() => toggleStatus(status)}
          />
        ))}
      </View>

      <TriChoice
        label={copy.partnerChildren}
        value={draft.acceptsPartnerWithChildren}
        copy={copy}
        rtl={rtl}
        onChange={(value) => update("acceptsPartnerWithChildren", value)}
      />
    </View>
  );
}

function ReachStep({
  copy,
  rtl,
  draft,
  update,
  countries,
  setCountries,
}: StepProps & { countries: string; setCountries: (value: string) => void }) {
  return (
    <View style={styles.section}>
      <ToggleCard
        label={copy.openLibya}
        value={draft.openToLibya}
        rtl={rtl}
        onChange={(value) => update("openToLibya", value)}
      />
      <ToggleCard
        label={copy.openDiaspora}
        value={draft.openToDiaspora}
        rtl={rtl}
        onChange={(value) => update("openToDiaspora", value)}
      />
      <TriChoice
        label={copy.relocation}
        value={draft.relocationWillingness}
        copy={copy}
        rtl={rtl}
        onChange={(value) => update("relocationWillingness", value)}
      />
      <Field
        label={copy.countries}
        helper={copy.countriesHelp}
        rtl={rtl}
        value={countries}
        onChange={setCountries}
        autoCapitalize="characters"
      />
    </View>
  );
}

function PrivacyStep({ copy, rtl, draft, update }: StepProps) {
  const photos: QuestionnaireDraft["photoPrivacyPreference"][] = [
    "none",
    "blurred",
    "after_mutual_interest",
    "explicit_approval",
    "after_family_involvement",
  ];

  return (
    <View style={styles.section}>
      <ToggleCard
        label={copy.identity}
        value={draft.willingIdentityVerification}
        rtl={rtl}
        onChange={(value) => update("willingIdentityVerification", value)}
      />

      <Label rtl={rtl}>{copy.photo}</Label>
      <View style={styles.choiceStack}>
        {photos.map((value) => (
          <Choice
            key={value}
            label={copy.photoValues[value]}
            selected={draft.photoPrivacyPreference === value}
            rtl={rtl}
            onPress={() => update("photoPrivacyPreference", value)}
          />
        ))}
      </View>

      <View style={styles.reassurance}>
        <Text style={[styles.reassuranceTitle, textAlign(rtl)]}>{copy.reassuranceTitle}</Text>
        <Text style={[styles.reassuranceBody, textAlign(rtl)]}>{copy.reassuranceBody}</Text>
      </View>
    </View>
  );
}

function FamilyStep({ copy, rtl, draft, update }: StepProps) {
  const families: QuestionnaireDraft["familyInvolvementPreference"][] = [
    "early",
    "after_initial_interest",
    "later",
    "unsure",
  ];
  const locationValue = draft.openToLibya
    ? draft.openToDiaspora
      ? copy.locationBoth
      : copy.locationLibya
    : copy.locationDiaspora;

  return (
    <View style={styles.section}>
      <Label rtl={rtl}>{copy.family}</Label>
      <View style={styles.choiceStack}>
        {families.map((value) => (
          <Choice
            key={value}
            label={copy.familyValues[value]}
            selected={draft.familyInvolvementPreference === value}
            rtl={rtl}
            onPress={() => update("familyInvolvementPreference", value)}
          />
        ))}
      </View>

      <View style={localStyles.reviewCard}>
        <Text style={[localStyles.reviewTitle, textAlign(rtl)]}>{copy.reviewTitle}</Text>
        <Text style={[localStyles.reviewBody, textAlign(rtl)]}>{copy.reviewBody}</Text>
        <View style={localStyles.reviewRows}>
          <ReviewRow rtl={rtl} label={copy.timeline} value={copy.timelineValues[draft.marriageTimeline]} />
          <ReviewRow
            rtl={rtl}
            label={copy.reviewAge}
            value={`${draft.preferredPartnerAgeMin}–${draft.preferredPartnerAgeMax}`}
          />
          <ReviewRow rtl={rtl} label={copy.reviewLocations} value={locationValue} />
          <ReviewRow rtl={rtl} label={copy.reviewPhoto} value={copy.photoValues[draft.photoPrivacyPreference]} />
          <ReviewRow
            rtl={rtl}
            label={copy.reviewFamily}
            value={copy.familyValues[draft.familyInvolvementPreference]}
            last
          />
        </View>
      </View>
    </View>
  );
}

function ReviewRow({
  rtl,
  label,
  value,
  last = false,
}: {
  rtl: boolean;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        localStyles.reviewRow,
        !last ? localStyles.reviewRowDivider : null,
        { flexDirection: rtl ? "row-reverse" : "row" },
      ]}
    >
      <Text style={[localStyles.reviewLabel, textAlign(rtl)]}>{label}</Text>
      <Text style={[localStyles.reviewValue, textAlign(rtl)]}>{value}</Text>
    </View>
  );
}

function TriChoice({
  label,
  value,
  onChange,
  copy,
  rtl,
}: {
  label: string;
  value: YesNoDepends;
  onChange: (value: YesNoDepends) => void;
  copy: Copy;
  rtl: boolean;
}) {
  const options: YesNoDepends[] = ["yes", "no", "depends"];

  return (
    <View>
      <Label rtl={rtl}>{label}</Label>
      <ChoiceGrid rtl={rtl}>
        {options.map((option) => (
          <Choice
            key={option}
            compact
            label={copy.tri[option]}
            selected={value === option}
            rtl={rtl}
            onPress={() => onChange(option)}
          />
        ))}
      </ChoiceGrid>
    </View>
  );
}

type StepProps = {
  copy: Copy;
  rtl: boolean;
  draft: QuestionnaireDraft;
  update: Update;
};

const localStyles = StyleSheet.create({
  loadingState: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  loadError: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    padding: 18,
  },
  loadErrorTitle: {
    color: colors.foreground,
    fontSize: 17,
    lineHeight: 27,
    fontWeight: "800",
  },
  loadErrorBody: { color: colors.muted, fontSize: 13, lineHeight: 22, marginTop: 8 },
  retryAction: { marginTop: 16 },
  reviewCard: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 18,
  },
  reviewTitle: {
    width: "100%",
    color: colors.foreground,
    fontSize: 17,
    lineHeight: 28,
    fontWeight: "800",
  },
  reviewBody: {
    width: "100%",
    color: colors.muted,
    fontSize: 12,
    lineHeight: 21,
    marginTop: 5,
  },
  reviewRows: { marginTop: 14 },
  reviewRow: {
    width: "100%",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 11,
  },
  reviewRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  reviewLabel: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 20,
    fontWeight: "700",
  },
  reviewValue: {
    flex: 1.3,
    color: colors.foreground,
    fontSize: 12,
    lineHeight: 20,
    fontWeight: "800",
  },
});
