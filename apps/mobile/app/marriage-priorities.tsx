import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  defaultMarriagePriorities,
  isMarriagePrioritiesUnavailable,
  loadMarriagePriorities,
  saveMarriagePriorities,
  type ChildrenPlan,
  type LivingArrangement,
  type MarriagePriorities,
  type WeddingStyle,
  type WorkAfterMarriage,
} from "@/lib/marriage-priorities";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

type EditablePriorities = Omit<MarriagePriorities, "completedAt">;

export default function MarriagePrioritiesScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => prioritiesCopy(locale), [locale]);
  const direction = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<EditablePriorities>({
    livingArrangement: defaultMarriagePriorities.livingArrangement,
    childrenPlan: defaultMarriagePriorities.childrenPlan,
    workAfterMarriage: defaultMarriagePriorities.workAfterMarriage,
    weddingStyle: defaultMarriagePriorities.weddingStyle,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setPreviewOnly(false);
    setSaved(false);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }

      const existing = await loadMarriagePriorities();
      if (existing) {
        setDraft({
          livingArrangement: existing.livingArrangement,
          childrenPlan: existing.childrenPlan,
          workAfterMarriage: existing.workAfterMarriage,
          weddingStyle: existing.weddingStyle,
        });
      }
    } catch (error) {
      if (__DEV__ && isMarriagePrioritiesUnavailable(error)) {
        setPreviewOnly(true);
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  function change<K extends keyof EditablePriorities>(key: K, value: EditablePriorities[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function save() {
    if (saving) return;
    if (previewOnly) {
      setSaved(true);
      return;
    }

    setSaving(true);
    setSaved(false);
    try {
      await saveMarriagePriorities(draft);
      setSaved(true);
    } catch (error) {
      if (__DEV__ && isMarriagePrioritiesUnavailable(error)) {
        setPreviewOnly(true);
        setSaved(true);
      } else {
        setLoadError(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed ? styles.pressed : null]}
        >
          <Text style={[styles.backText, { writingDirection: direction }]}>{copy.back}</Text>
        </Pressable>
      }
    >
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : loadError ? (
        <StateCard
          rtl={rtl}
          tone="error"
          title={copy.errorTitle}
          body={copy.errorBody}
          actionLabel={copy.retry}
          onAction={() => void load()}
        />
      ) : (
        <View style={styles.page}>
          <View style={[styles.reassurance, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
            <Text style={[styles.reassuranceTitle, { textAlign, writingDirection: direction }]}>
              {copy.reassuranceTitle}
            </Text>
            <Text style={[styles.reassuranceBody, { textAlign, writingDirection: direction }]}>
              {copy.reassuranceBody}
            </Text>
          </View>

          {previewOnly ? (
            <View style={styles.previewNotice}>
              <Text style={[styles.previewTitle, { textAlign, writingDirection: direction }]}>{copy.previewTitle}</Text>
              <Text style={[styles.previewBody, { textAlign, writingDirection: direction }]}>{copy.previewBody}</Text>
            </View>
          ) : null}

          <PrioritySection title={copy.livingTitle} body={copy.livingBody} rtl={rtl}>
            {(Object.keys(copy.livingValues) as LivingArrangement[]).map((value) => (
              <ChoiceCard
                key={value}
                label={copy.livingValues[value]}
                selected={draft.livingArrangement === value}
                rtl={rtl}
                onPress={() => change("livingArrangement", value)}
              />
            ))}
          </PrioritySection>

          <PrioritySection title={copy.childrenTitle} body={copy.childrenBody} rtl={rtl}>
            {(Object.keys(copy.childrenValues) as ChildrenPlan[]).map((value) => (
              <ChoiceCard
                key={value}
                label={copy.childrenValues[value]}
                selected={draft.childrenPlan === value}
                rtl={rtl}
                onPress={() => change("childrenPlan", value)}
              />
            ))}
          </PrioritySection>

          <PrioritySection title={copy.workTitle} body={copy.workBody} rtl={rtl}>
            {(Object.keys(copy.workValues) as WorkAfterMarriage[]).map((value) => (
              <ChoiceCard
                key={value}
                label={copy.workValues[value]}
                selected={draft.workAfterMarriage === value}
                rtl={rtl}
                onPress={() => change("workAfterMarriage", value)}
              />
            ))}
          </PrioritySection>

          <PrioritySection title={copy.weddingTitle} body={copy.weddingBody} rtl={rtl}>
            {(Object.keys(copy.weddingValues) as WeddingStyle[]).map((value) => (
              <ChoiceCard
                key={value}
                label={copy.weddingValues[value]}
                selected={draft.weddingStyle === value}
                rtl={rtl}
                onPress={() => change("weddingStyle", value)}
              />
            ))}
          </PrioritySection>

          <View style={styles.saveBlock}>
            <PrimaryButton loading={saving} onPress={() => void save()}>
              {copy.save}
            </PrimaryButton>
            {saved ? (
              <Text accessibilityLiveRegion="polite" style={[styles.saved, { textAlign, writingDirection: direction }]}>
                {previewOnly ? copy.previewSaved : copy.saved}
              </Text>
            ) : null}
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

function PrioritySection({
  title,
  body,
  rtl,
  children,
}: {
  title: string;
  body: string;
  rtl: boolean;
  children: React.ReactNode;
}) {
  const direction = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { textAlign, writingDirection: direction }]}>{title}</Text>
      <Text style={[styles.sectionBody, { textAlign, writingDirection: direction }]}>{body}</Text>
      <View style={styles.choices}>{children}</View>
    </View>
  );
}

function ChoiceCard({
  label,
  selected,
  rtl,
  onPress,
}: {
  label: string;
  selected: boolean;
  rtl: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected ? styles.choiceSelected : null,
        { flexDirection: rtl ? "row-reverse" : "row" },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.radio, selected ? styles.radioSelected : null]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <Text
        style={[
          styles.choiceText,
          selected ? styles.choiceTextSelected : null,
          { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function prioritiesCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  return {
    eyebrow: ar ? "الزواج · أولوياتك" : "MARRIAGE · YOUR PRIORITIES",
    title: ar ? "الأشياء العملية التي تستحق الوضوح" : "The practical things worth being clear about",
    body: ar
      ? "اختيارات خاصة تساعد ميثاق على تجنب الفروقات الأساسية قبل أن يستثمر الطرفان وقتاً في التعارف."
      : "Private choices that help Mithaq avoid fundamental mismatches before two people invest time in an introduction.",
    reassuranceTitle: ar ? "لا توجد إجابة صحيحة واحدة" : "There is no one right answer",
    reassuranceBody: ar
      ? "هذه ليست شروط قبول في ميثاق ولا نتيجة توافق. نستخدمها لاحقاً لشرح نقاط الاتفاق والاختلاف بوضوح."
      : "These are not admission rules and they are not a compatibility score. They can later help explain where two people align or differ.",
    livingTitle: ar ? "السكن بعد الزواج" : "Living after marriage",
    livingBody: ar ? "ما الذي يبدو أقرب لما تتوقعه؟" : "Which setup is closest to what you expect?",
    livingValues: {
      independent_home: ar ? "بيت مستقل" : "An independent home",
      with_family_initially: ar ? "مع العائلة في البداية" : "With family initially",
      with_family_long_term: ar ? "مع العائلة على المدى الطويل" : "With family long-term",
      flexible: ar ? "مرن وأفضّل مناقشته" : "Flexible — I’d rather discuss it",
    } satisfies Record<LivingArrangement, string>,
    childrenTitle: ar ? "الأطفال مستقبلاً" : "Children in the future",
    childrenBody: ar
      ? "اختر ما يعبر عنك اليوم، ويمكنك تغييره لاحقاً."
      : "Choose what reflects you today. You can change it later.",
    childrenValues: {
      want_children: ar ? "أريد أطفالاً" : "I want children",
      do_not_want_children: ar ? "لا أريد أطفالاً" : "I do not want children",
      unsure: ar ? "غير متأكد بعد" : "I’m not sure yet",
    } satisfies Record<ChildrenPlan, string>,
    workTitle: ar ? "العمل بعد الزواج" : "Work after marriage",
    workBody: ar ? "أي توقع أقرب لطريقة تفكيرك؟" : "Which expectation is closest to how you think about it?",
    workValues: {
      both_work: ar ? "أفضل أن يستمر الطرفان في العمل" : "I prefer both partners to keep working",
      one_may_pause: ar ? "قد يتوقف أحد الطرفين لفترة حسب الظروف" : "One partner may pause depending on circumstances",
      open_to_discuss: ar ? "أفضّل أن نقرر ذلك معاً" : "I’d rather decide it together",
      no_preference: ar ? "ليس لدي تفضيل محدد" : "I have no specific preference",
    } satisfies Record<WorkAfterMarriage, string>,
    weddingTitle: ar ? "شكل حفل الزواج" : "Wedding style",
    weddingBody: ar
      ? "التوقعات المالية والاجتماعية تستحق الوضوح مبكراً."
      : "Financial and social expectations are worth making clear early.",
    weddingValues: {
      simple: ar ? "بسيط" : "Simple",
      moderate: ar ? "متوسط" : "Moderate",
      large: ar ? "كبير" : "Large",
      discuss_together: ar ? "نقرر معاً" : "Decide together",
    } satisfies Record<WeddingStyle, string>,
    save: ar ? "حفظ أولوياتي" : "Save my priorities",
    saved: ar ? "تم حفظ أولوياتك." : "Your priorities are saved.",
    previewTitle: ar ? "يمكنك تجربة هذه الصفحة الآن" : "You can explore this page now",
    previewBody: ar
      ? "الحفظ الدائم غير متاح في هذه المعاينة بعد، لكن يمكنك تجربة جميع الاختيارات."
      : "Permanent saving is not available in this preview yet, but you can try every choice.",
    previewSaved: ar ? "تم حفظ الاختيارات لهذه المعاينة فقط." : "Saved for this preview only.",
    errorTitle: ar ? "تعذر فتح أولويات الزواج" : "We couldn’t open Marriage priorities",
    errorBody: ar
      ? "لم نغيّر اختياراتك. تحقق من الاتصال ثم حاول مرة أخرى."
      : "Your choices were not changed. Check your connection and try again.",
    retry: ar ? "إعادة المحاولة" : "Try again",
    back: ar ? "رجوع" : "Back",
  };
}

const styles = StyleSheet.create({
  loading: { minHeight: 360, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 14 },
  reassurance: {
    width: "100%",
    gap: 5,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryWash,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    padding: 15,
  },
  reassuranceTitle: { color: colors.primaryStrong, fontSize: 13, lineHeight: 20, fontWeight: "900" },
  reassuranceBody: { color: colors.muted, fontSize: 11, lineHeight: 19 },
  previewNotice: {
    width: "100%",
    borderRadius: radius.lg,
    backgroundColor: colors.goldSoft,
    padding: 14,
    gap: 4,
  },
  previewTitle: { color: colors.gold, fontSize: 12, lineHeight: 19, fontWeight: "900" },
  previewBody: { color: colors.muted, fontSize: 10, lineHeight: 17 },
  section: {
    width: "100%",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 16,
    ...shadows.card,
  },
  sectionTitle: { color: colors.foreground, fontSize: 18, lineHeight: 26, fontWeight: "900" },
  sectionBody: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 3 },
  choices: { width: "100%", gap: 8, marginTop: 13 },
  choice: {
    width: "100%",
    minHeight: 50,
    alignItems: "center",
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primaryWash },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  choiceText: { flex: 1, color: colors.foreground, fontSize: 12, lineHeight: 19, fontWeight: "700" },
  choiceTextSelected: { color: colors.primaryStrong, fontWeight: "900" },
  saveBlock: { width: "100%", gap: 8, paddingTop: 4 },
  saved: { width: "100%", color: colors.primaryStrong, fontSize: 11, lineHeight: 18, fontWeight: "800" },
  back: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  backText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.58 },
});
