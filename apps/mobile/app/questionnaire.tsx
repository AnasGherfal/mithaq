import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { questionnaireCopy } from "@/features/questionnaire-copy";
import {
  defaultQuestionnaire,
  loadQuestionnaire,
  saveQuestionnaire,
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
  SectionTitle,
  ToggleCard,
  questionnaireStyles as styles,
  textAlign,
} from "@/features/questionnaire-ui";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      const { data } = await supabase.auth.getSession();
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
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, [locale]);

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

  async function finish() {
    setSaving(true);
    setError(null);
    const result = await saveQuestionnaire({
      ...draft,
      currentCountryCode: draft.currentCountryCode.trim().toUpperCase(),
      preferredCountries: countries
        .split(",")
        .map((country) => country.trim().toUpperCase())
        .filter(Boolean),
    });
    setSaving(false);
    if (!result.ok) {
      setError(copy.error);
      return;
    }
    router.replace({
      pathname: result.wasSubmitted ? "/status" : "/consent",
      params: { locale },
    });
  }

  return (
    <ScreenShell
      eyebrow={`${copy.eyebrow} · ${step} / 3`}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={
        <View style={styles.footerButtons}>
          {step > 1 ? (
            <PrimaryButton tone="quiet" onPress={() => setStep((value) => value - 1)}>
              {copy.back}
            </PrimaryButton>
          ) : null}
          <PrimaryButton
            loading={saving}
            onPress={() => {
              if (step < 3) setStep((value) => value + 1);
              else void finish();
            }}
          >
            {step < 3 ? copy.next : copy.save}
          </PrimaryButton>
        </View>
      }
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" />
      ) : (
        <View style={styles.content}>
          <Progress step={step} rtl={rtl} labels={copy.steps} />
          {step === 1 ? <StepOne copy={copy} rtl={rtl} draft={draft} update={update} /> : null}
          {step === 2 ? (
            <StepTwo
              copy={copy}
              rtl={rtl}
              draft={draft}
              update={update}
              toggleStatus={toggleStatus}
              countries={countries}
              setCountries={setCountries}
            />
          ) : null}
          {step === 3 ? <StepThree copy={copy} rtl={rtl} draft={draft} update={update} /> : null}
          {error ? <Text style={[styles.error, textAlign(rtl)]}>{error}</Text> : null}
        </View>
      )}
    </ScreenShell>
  );
}

function StepOne({ copy, rtl, draft, update }: { copy: Copy; rtl: boolean; draft: QuestionnaireDraft; update: Update }) {
  const statuses: MaritalStatus[] = ["never_married", "divorced", "widowed"];
  return (
    <View style={styles.section}>
      <SectionTitle rtl={rtl} title={copy.aboutYou} body={copy.aboutYouBody} />
      <ChoiceGrid>
        <Choice label={copy.woman} selected={draft.gender === "woman"} rtl={rtl} onPress={() => update("gender", "woman")} />
        <Choice label={copy.man} selected={draft.gender === "man"} rtl={rtl} onPress={() => update("gender", "man")} />
      </ChoiceGrid>
      <Label rtl={rtl}>{copy.ageRange}</Label>
      <View style={styles.chipWrap}>
        {ageBands.map((label, index) => (
          <Choice key={label} compact label={label} selected={draft.ageBandId === index + 1} rtl={rtl} onPress={() => update("ageBandId", index + 1)} />
        ))}
      </View>
      <Label rtl={rtl}>{copy.residence}</Label>
      <ChoiceGrid>
        <Choice label={copy.libya} selected={draft.residencyType === "libya"} rtl={rtl} onPress={() => update("residencyType", "libya")} />
        <Choice label={copy.diaspora} selected={draft.residencyType === "diaspora"} rtl={rtl} onPress={() => update("residencyType", "diaspora")} />
      </ChoiceGrid>
      <Field label={copy.country} rtl={rtl} value={draft.currentCountryCode} onChange={(value) => update("currentCountryCode", value.slice(0, 2))} autoCapitalize="characters" />
      <Field label={copy.city} rtl={rtl} value={draft.currentCity} onChange={(value) => update("currentCity", value)} />
      <Field label={copy.region} rtl={rtl} value={draft.libyanOriginRegion} onChange={(value) => update("libyanOriginRegion", value)} />
      <Label rtl={rtl}>{copy.marital}</Label>
      <View style={styles.choiceStack}>
        {statuses.map((status) => (
          <Choice key={status} label={copy.status[status]} selected={draft.maritalStatus === status} rtl={rtl} onPress={() => update("maritalStatus", status)} />
        ))}
      </View>
      <ToggleCard label={copy.children} value={draft.hasChildren} rtl={rtl} onChange={(value) => update("hasChildren", value)} />
      <ToggleCard label={copy.libyanAttestation} value={draft.libyanSelfAttestation} rtl={rtl} onChange={(value) => update("libyanSelfAttestation", value)} />
    </View>
  );
}

function StepTwo({ copy, rtl, draft, update, toggleStatus, countries, setCountries }: { copy: Copy; rtl: boolean; draft: QuestionnaireDraft; update: Update; toggleStatus: (status: MaritalStatus) => void; countries: string; setCountries: (value: string) => void }) {
  const timelines: QuestionnaireDraft["marriageTimeline"][] = ["within_6_months", "6_to_12_months", "1_to_2_years", "unsure"];
  const statuses: MaritalStatus[] = ["never_married", "divorced", "widowed"];
  return (
    <View style={styles.section}>
      <SectionTitle rtl={rtl} title={copy.preferences} body={copy.preferencesBody} />
      <Label rtl={rtl}>{copy.timeline}</Label>
      <View style={styles.choiceStack}>{timelines.map((value) => <Choice key={value} label={copy.timelineValues[value]} selected={draft.marriageTimeline === value} rtl={rtl} onPress={() => update("marriageTimeline", value)} />)}</View>
      <View style={styles.ageRow}>
        <View style={styles.ageField}><Field label={copy.minAge} rtl={rtl} keyboardType="number-pad" value={String(draft.preferredPartnerAgeMin)} onChange={(value) => update("preferredPartnerAgeMin", Number(value.replace(/\D/g, "")) || 0)} /></View>
        <View style={styles.ageField}><Field label={copy.maxAge} rtl={rtl} keyboardType="number-pad" value={String(draft.preferredPartnerAgeMax)} onChange={(value) => update("preferredPartnerAgeMax", Number(value.replace(/\D/g, "")) || 0)} /></View>
      </View>
      <Label rtl={rtl}>{copy.accepted}</Label>
      <View style={styles.choiceStack}>{statuses.map((status) => <Choice key={status} label={copy.status[status]} selected={draft.acceptedMaritalStatuses.includes(status)} rtl={rtl} onPress={() => toggleStatus(status)} />)}</View>
      <TriChoice label={copy.partnerChildren} value={draft.acceptsPartnerWithChildren} copy={copy} rtl={rtl} onChange={(value) => update("acceptsPartnerWithChildren", value)} />
      <ToggleCard label={copy.openLibya} value={draft.openToLibya} rtl={rtl} onChange={(value) => update("openToLibya", value)} />
      <ToggleCard label={copy.openDiaspora} value={draft.openToDiaspora} rtl={rtl} onChange={(value) => update("openToDiaspora", value)} />
      <TriChoice label={copy.relocation} value={draft.relocationWillingness} copy={copy} rtl={rtl} onChange={(value) => update("relocationWillingness", value)} />
      <Field label={copy.countries} helper={copy.countriesHelp} rtl={rtl} value={countries} onChange={setCountries} autoCapitalize="characters" />
    </View>
  );
}

function StepThree({ copy, rtl, draft, update }: { copy: Copy; rtl: boolean; draft: QuestionnaireDraft; update: Update }) {
  const photos: QuestionnaireDraft["photoPrivacyPreference"][] = ["none", "blurred", "after_mutual_interest", "explicit_approval", "after_family_involvement"];
  const families: QuestionnaireDraft["familyInvolvementPreference"][] = ["early", "after_initial_interest", "later", "unsure"];
  return (
    <View style={styles.section}>
      <SectionTitle rtl={rtl} title={copy.privacyTitle} body={copy.privacyBody} />
      <ToggleCard label={copy.identity} value={draft.willingIdentityVerification} rtl={rtl} onChange={(value) => update("willingIdentityVerification", value)} />
      <Label rtl={rtl}>{copy.photo}</Label>
      <View style={styles.choiceStack}>{photos.map((value) => <Choice key={value} label={copy.photoValues[value]} selected={draft.photoPrivacyPreference === value} rtl={rtl} onPress={() => update("photoPrivacyPreference", value)} />)}</View>
      <Label rtl={rtl}>{copy.family}</Label>
      <View style={styles.choiceStack}>{families.map((value) => <Choice key={value} label={copy.familyValues[value]} selected={draft.familyInvolvementPreference === value} rtl={rtl} onPress={() => update("familyInvolvementPreference", value)} />)}</View>
      <View style={styles.reassurance}>
        <Text style={[styles.reassuranceTitle, textAlign(rtl)]}>{copy.reassuranceTitle}</Text>
        <Text style={[styles.reassuranceBody, textAlign(rtl)]}>{copy.reassuranceBody}</Text>
      </View>
    </View>
  );
}

function TriChoice({ label, value, onChange, copy, rtl }: { label: string; value: YesNoDepends; onChange: (value: YesNoDepends) => void; copy: Copy; rtl: boolean }) {
  const options: YesNoDepends[] = ["yes", "no", "depends"];
  return (
    <View>
      <Label rtl={rtl}>{label}</Label>
      <ChoiceGrid>{options.map((option) => <Choice key={option} compact label={copy.tri[option]} selected={value === option} rtl={rtl} onPress={() => onChange(option)} />)}</ChoiceGrid>
    </View>
  );
}
