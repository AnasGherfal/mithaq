import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { GuidedActionBar } from "@/components/guided-action-bar";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  isConnectionSpaceFeatureUnavailable,
  loadMyFriendshipProfile,
  saveMyFriendshipProfile,
} from "@/lib/connection-spaces";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

type InterestKey =
  | "coffee"
  | "books"
  | "sports"
  | "travel"
  | "food"
  | "arts"
  | "technology"
  | "business"
  | "parenting"
  | "volunteering"
  | "outdoors"
  | "gaming";

const interestKeys: InterestKey[] = [
  "coffee",
  "books",
  "sports",
  "travel",
  "food",
  "arts",
  "technology",
  "business",
  "parenting",
  "volunteering",
  "outdoors",
  "gaming",
];

export default function FriendshipProfileScreen() {
  const params = useLocalSearchParams<{ locale?: string; preview?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const preview = params.preview === "1";
  const copy = useMemo(() => profileCopy(locale), [locale]);
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(!preview);
  const [loadError, setLoadError] = useState(false);
  const [featurePending, setFeaturePending] = useState(preview);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [interests, setInterests] = useState<InterestKey[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (preview) {
      setFeaturePending(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(false);
    setFeaturePending(false);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }

      const profile = await loadMyFriendshipProfile();
      if (profile) {
        setDisplayName(profile.displayName);
        setCity(profile.city);
        setAboutMe(profile.aboutMe);
        setInterests(
          profile.interests.filter((value): value is InterestKey =>
            interestKeys.includes(value as InterestKey),
          ),
        );
      }
    } catch (error) {
      if (__DEV__ && isConnectionSpaceFeatureUnavailable(error)) {
        setFeaturePending(true);
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [locale, preview]);

  useEffect(() => {
    void load();
  }, [load]);

  const nameReady = displayName.trim().length >= 2 && displayName.trim().length <= 50;
  const cityReady = city.trim().length >= 1 && city.trim().length <= 100;
  const aboutReady = aboutMe.trim().length >= 40 && aboutMe.trim().length <= 600;
  const interestsReady = interests.length >= 2;
  const complete = nameReady && cityReady && aboutReady && interestsReady;

  function toggleInterest(key: InterestKey) {
    setMessage(null);
    setInterests((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      if (current.length >= 8) return current;
      return [...current, key];
    });
  }

  function continueFromBasics() {
    if (!nameReady || !cityReady) {
      setMessage(copy.basicsError);
      return;
    }
    setMessage(null);
    setStep(2);
  }

  async function save() {
    if (saving) return;
    if (!complete) {
      setMessage(copy.completeError);
      return;
    }

    if (featurePending) {
      setMessage(copy.previewSave);
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const result = await saveMyFriendshipProfile({
        displayName: displayName.trim(),
        city: city.trim(),
        aboutMe: aboutMe.trim(),
        interests,
      });

      if (!result.profileCompleted) {
        setMessage(copy.saveIncomplete);
        return;
      }

      router.replace({ pathname: "/friendship", params: { locale } });
    } catch {
      setMessage(copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell
      eyebrow={`${copy.eyebrow} · ${step}/2`}
      title={step === 1 ? copy.basicsTitle : copy.interestsTitle}
      body={step === 1 ? copy.basicsBody : copy.interestsBody}
      rtl={rtl}
      bottomBar={
        <GuidedActionBar
          rtl={rtl}
          backLabel={step === 1 ? copy.friends : copy.back}
          primaryLabel={step === 1 ? copy.continue : copy.save}
          loading={saving}
          onBack={() => {
            if (step === 1) {
              router.replace({
                pathname: "/friendship",
                params: featurePending ? { locale, preview: "1" } : { locale },
              });
            } else {
              setMessage(null);
              setStep(1);
            }
          }}
          onPrimary={() => {
            if (step === 1) continueFromBasics();
            else void save();
          }}
        />
      }
    >
      {loading ? (
        <View style={styles.loadingState} accessibilityLabel={copy.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : loadError ? (
        <StateCard
          rtl={rtl}
          tone="error"
          title={copy.loadErrorTitle}
          body={copy.loadErrorBody}
          actionLabel={copy.retry}
          onAction={() => void load()}
        />
      ) : (
        <View style={styles.page}>
          <View
            style={[
              styles.separationNote,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            <View style={styles.separationMark}>
              <Text style={styles.separationMarkText}>2</Text>
            </View>
            <View style={styles.flex}>
              <Text style={[styles.separationTitle, { textAlign, writingDirection }]}>
                {copy.separationTitle}
              </Text>
              <Text style={[styles.separationBody, { textAlign, writingDirection }]}>
                {copy.separationBody}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.progress,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            <View style={[styles.progressSegment, styles.progressSegmentActive]} />
            <View
              style={[
                styles.progressSegment,
                step === 2 ? styles.progressSegmentActive : null,
              ]}
            />
          </View>

          {step === 1 ? (
            <View style={styles.form}>
              <Field
                rtl={rtl}
                label={copy.nameLabel}
                helper={copy.nameHelper}
                value={displayName}
                maxLength={50}
                onChange={(value) => {
                  setDisplayName(value);
                  setMessage(null);
                }}
              />
              <Field
                rtl={rtl}
                label={copy.cityLabel}
                helper={copy.cityHelper}
                value={city}
                maxLength={100}
                onChange={(value) => {
                  setCity(value);
                  setMessage(null);
                }}
              />
              <Field
                rtl={rtl}
                label={copy.aboutLabel}
                helper={`${copy.aboutHelper} · ${aboutMe.trim().length}/600`}
                value={aboutMe}
                maxLength={600}
                multiline
                onChange={(value) => {
                  setAboutMe(value);
                  setMessage(null);
                }}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <View>
                <Text style={[styles.label, { textAlign, writingDirection }]}>
                  {copy.chooseInterests}
                </Text>
                <Text style={[styles.helper, { textAlign, writingDirection }]}>
                  {copy.interestHelper(interests.length)}
                </Text>
                <View
                  style={[
                    styles.interestGrid,
                    { flexDirection: rtl ? "row-reverse" : "row" },
                  ]}
                >
                  {interestKeys.map((key) => {
                    const selected = interests.includes(key);
                    return (
                      <Pressable
                        key={key}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        onPress={() => toggleInterest(key)}
                        style={({ pressed }) => [
                          styles.interestChip,
                          selected ? styles.interestChipSelected : null,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.interestText,
                            selected ? styles.interestTextSelected : null,
                            { writingDirection },
                          ]}
                        >
                          {copy.interestLabels[key]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View
                style={[
                  styles.preview,
                  { alignItems: rtl ? "flex-end" : "flex-start" },
                ]}
              >
                <Text style={[styles.previewEyebrow, { textAlign, writingDirection }]}>
                  {copy.previewEyebrow}
                </Text>
                <Text style={[styles.previewName, { textAlign, writingDirection }]}>
                  {displayName.trim() || copy.friend}
                </Text>
                <Text style={[styles.previewCity, { textAlign, writingDirection }]}>
                  {city.trim() || copy.cityFallback}
                </Text>
                <Text style={[styles.previewAbout, { textAlign, writingDirection }]}>
                  {aboutMe.trim() || copy.aboutFallback}
                </Text>
                <View
                  style={[
                    styles.previewInterests,
                    { flexDirection: rtl ? "row-reverse" : "row" },
                  ]}
                >
                  {interests.map((key) => (
                    <View key={key} style={styles.previewInterest}>
                      <Text style={[styles.previewInterestText, { writingDirection }]}>
                        {copy.interestLabels[key]}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {message ? (
            <Text
              accessibilityRole="alert"
              style={[styles.message, { textAlign, writingDirection }]}
            >
              {message}
            </Text>
          ) : null}

          {featurePending ? (
            <Text style={[styles.previewNote, { textAlign, writingDirection }]}>
              {copy.previewNote}
            </Text>
          ) : null}
        </View>
      )}
    </ScreenShell>
  );
}

function Field({
  rtl,
  label,
  helper,
  value,
  onChange,
  maxLength,
  multiline = false,
}: {
  rtl: boolean;
  label: string;
  helper: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  multiline?: boolean;
}) {
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";

  return (
    <View>
      <Text style={[styles.label, { textAlign, writingDirection }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        maxLength={maxLength}
        multiline={multiline}
        textAlign={textAlign}
        textAlignVertical={multiline ? "top" : "center"}
        selectionColor={colors.accent}
        placeholderTextColor={colors.mutedSoft}
        style={[styles.input, multiline ? styles.textarea : null]}
      />
      <Text style={[styles.helper, { textAlign, writingDirection }]}>{helper}</Text>
    </View>
  );
}

function profileCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  return {
    eyebrow: ar ? "ملف الصداقة" : "FRIENDSHIP PROFILE",
    basicsTitle: ar ? "عرّف بنفسك كصديق" : "Introduce yourself as a friend",
    basicsBody: ar
      ? "اكتب ما يساعد الناس على فهم شخصيتك ووقتك واهتماماتك، بعيداً عن أسئلة الزواج."
      : "Share what helps people understand your personality, time, and interests—without marriage questions.",
    interestsTitle: ar ? "ما الذي يجمعك بالناس؟" : "What connects you with people?",
    interestsBody: ar
      ? "اختر اهتمامات حقيقية تساعد ميثاق على بناء اكتشاف صداقة منفصل."
      : "Choose genuine interests that help Mithaq build a separate friendship discovery experience.",
    friends: ar ? "الأصدقاء" : "Friends",
    back: ar ? "رجوع" : "Back",
    continue: ar ? "متابعة" : "Continue",
    save: ar ? "حفظ ملف الصداقة" : "Save friendship profile",
    loading: ar ? "جارٍ تحميل ملف الصداقة" : "Loading friendship profile",
    loadErrorTitle: ar ? "تعذر تحميل ملف الصداقة" : "We couldn’t load your friendship profile",
    loadErrorBody: ar ? "لم نغيّر أي بيانات. تحقق من الاتصال ثم حاول مرة أخرى." : "No data was changed. Check your connection and try again.",
    retry: ar ? "إعادة المحاولة" : "Try again",
    separationTitle: ar ? "ملف مستقل" : "A separate profile",
    separationBody: ar
      ? "لن ننسخ نبذة الزواج أو تفضيلاته أو صوره إلى هنا. هذه المساحة لها نية وظهور مختلفان."
      : "Your marriage bio, preferences, and photos are not copied here. This space has its own intent and visibility.",
    nameLabel: ar ? "الاسم الذي تفضله" : "Preferred name",
    nameHelper: ar ? "الاسم الذي ترتاح لظهوره داخل مساحة الأصدقاء." : "The name you are comfortable showing inside Friends.",
    cityLabel: ar ? "المدينة" : "City",
    cityHelper: ar ? "تساعد المدينة على اقتراح مجتمع وأنشطة قريبة لاحقاً." : "Your city can support local community and activity suggestions later.",
    aboutLabel: ar ? "نبذة الصداقة" : "Friendship introduction",
    aboutHelper: ar ? "40 حرفاً على الأقل عن شخصيتك وما تستمتع به مع الأصدقاء" : "At least 40 characters about your personality and what you enjoy with friends",
    chooseInterests: ar ? "اختر من اهتمامين إلى 8" : "Choose 2 to 8 interests",
    interestHelper: (count: number) => ar ? `${count}/8 محددة` : `${count}/8 selected`,
    interestLabels: {
      coffee: ar ? "قهوة وحديث" : "Coffee & conversation",
      books: ar ? "كتب وقراءة" : "Books & reading",
      sports: ar ? "رياضة" : "Sports",
      travel: ar ? "سفر" : "Travel",
      food: ar ? "طعام وتجارب" : "Food & experiences",
      arts: ar ? "فن وثقافة" : "Arts & culture",
      technology: ar ? "تقنية" : "Technology",
      business: ar ? "أعمال ومشاريع" : "Business & projects",
      parenting: ar ? "الأبوة والأسرة" : "Parenting & family life",
      volunteering: ar ? "تطوع" : "Volunteering",
      outdoors: ar ? "طبيعة ومشي" : "Outdoors & walks",
      gaming: ar ? "ألعاب" : "Gaming",
    } as Record<InterestKey, string>,
    previewEyebrow: ar ? "معاينة ملف الأصدقاء" : "FRIENDS PROFILE PREVIEW",
    friend: ar ? "عضو ميثاق" : "Mithaq member",
    cityFallback: ar ? "مدينتك" : "Your city",
    aboutFallback: ar ? "ستظهر نبذتك هنا." : "Your introduction will appear here.",
    basicsError: ar ? "أدخل اسماً صحيحاً ومدينتك للمتابعة." : "Add a valid name and city to continue.",
    completeError: ar ? "أكمل نبذة من 40 حرفاً واختر اهتمامين على الأقل." : "Complete a 40-character introduction and choose at least two interests.",
    saveIncomplete: ar ? "تم حفظ مسودة، لكن الملف ما زال يحتاج إلى إكمال." : "A draft was saved, but the profile still needs completion.",
    saveError: ar ? "تعذر حفظ ملف الصداقة الآن. لم نفترض نجاح العملية." : "We couldn’t save the friendship profile. We did not assume success.",
    previewSave: ar ? "الحفظ غير مفعّل في المعاينة قبل تطبيق ترحيل المساحات على الاستضافة." : "Saving is disabled in preview until the spaces migration is deployed to hosted staging.",
    previewNote: ar ? "يمكنك تجربة التصميم الآن، لكن البيانات لن تُحفظ في وضع المعاينة." : "You can test the design now, but preview-mode data is not persisted.",
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingState: { minHeight: 320, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 18 },
  separationNote: { width: "100%", alignItems: "flex-start", gap: 12, borderRadius: radius.lg, backgroundColor: colors.accentWash, padding: 16 },
  separationMark: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.accentSoft },
  separationMarkText: { color: colors.accent, fontSize: 13, fontWeight: "900" },
  separationTitle: { width: "100%", color: colors.foreground, fontSize: 14, lineHeight: 22, fontWeight: "800" },
  separationBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 19, marginTop: 3 },
  progress: { width: "100%", gap: 8 },
  progressSegment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border },
  progressSegmentActive: { backgroundColor: colors.accent },
  form: { width: "100%", gap: 18 },
  label: { width: "100%", color: colors.foreground, fontSize: 13, lineHeight: 21, fontWeight: "800", marginBottom: 8 },
  input: { width: "100%", minHeight: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceRaised, color: colors.foreground, fontSize: 15, paddingHorizontal: 15 },
  textarea: { minHeight: 150, paddingTop: 14, paddingBottom: 14 },
  helper: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 6 },
  interestGrid: { width: "100%", flexWrap: "wrap", gap: 9, marginTop: 13 },
  interestChip: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, paddingHorizontal: 12, paddingVertical: 10 },
  interestChipSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  interestText: { color: colors.muted, fontSize: 11, lineHeight: 17, fontWeight: "700" },
  interestTextSelected: { color: colors.accent, fontWeight: "800" },
  preview: { width: "100%", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.accentSoft, backgroundColor: colors.accentWash, padding: 19, ...shadows.card },
  previewEyebrow: { width: "100%", color: colors.accent, fontSize: 10, lineHeight: 16, fontWeight: "800" },
  previewName: { width: "100%", color: colors.foreground, fontSize: 23, lineHeight: 35, fontWeight: "800", marginTop: 9 },
  previewCity: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 1 },
  previewAbout: { width: "100%", color: colors.foreground, fontSize: 13, lineHeight: 23, marginTop: 13 },
  previewInterests: { width: "100%", flexWrap: "wrap", gap: 7, marginTop: 14 },
  previewInterest: { borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, paddingHorizontal: 9, paddingVertical: 7 },
  previewInterestText: { color: colors.accent, fontSize: 9, lineHeight: 13, fontWeight: "800" },
  message: { width: "100%", color: colors.danger, fontSize: 12, lineHeight: 20, fontWeight: "700" },
  previewNote: { width: "100%", color: colors.gold, fontSize: 11, lineHeight: 19, fontWeight: "700" },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
});
