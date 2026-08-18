import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Switch, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

type DisclosurePreferences = {
  share_occupation: boolean;
  share_education: boolean;
  share_origin_region: boolean;
};

type DisclosureResult = DisclosurePreferences;

type MessageTone = "success" | "error" | null;

const defaultPreferences: DisclosurePreferences = {
  share_occupation: false,
  share_education: false,
  share_origin_region: false,
};

export default function ProfileVisibilityScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => visibilityCopy(locale), [locale]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletionPending, setDeletionPending] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [preferences, setPreferences] = useState<DisclosurePreferences>(defaultPreferences);
  const [savedPreferences, setSavedPreferences] =
    useState<DisclosurePreferences>(defaultPreferences);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setMessage(null);
    setMessageTone(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!sessionData.session) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }

      const userId = sessionData.session.user.id;
      const [userResult, profileResult] = await Promise.all([
        supabase.from("users").select("account_status").eq("id", userId).maybeSingle(),
        supabase
          .from("member_profiles")
          .select(
            "profile_completed_at, share_occupation, share_education, share_origin_region",
          )
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      const readError = userResult.error ?? profileResult.error;
      if (readError) throw readError;

      const nextPreferences: DisclosurePreferences = {
        share_occupation: Boolean(profileResult.data?.share_occupation),
        share_education: Boolean(profileResult.data?.share_education),
        share_origin_region: Boolean(profileResult.data?.share_origin_region),
      };

      setDeletionPending(userResult.data?.account_status === "deletion_pending");
      setProfileComplete(Boolean(profileResult.data?.profile_completed_at));
      setPreferences(nextPreferences);
      setSavedPreferences(nextPreferences);
      setLoading(false);
    } catch {
      setLoadError(true);
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty =
    preferences.share_occupation !== savedPreferences.share_occupation ||
    preferences.share_education !== savedPreferences.share_education ||
    preferences.share_origin_region !== savedPreferences.share_origin_region;

  async function save() {
    if (saving || deletionPending || !profileComplete || !dirty) return;

    setSaving(true);
    setMessage(null);
    setMessageTone(null);

    try {
      const { data, error } = await supabase.rpc("set_profile_disclosure_preferences", {
        p_share_occupation: preferences.share_occupation,
        p_share_education: preferences.share_education,
        p_share_origin_region: preferences.share_origin_region,
      });

      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes("authentication")) {
          router.replace({ pathname: "/auth", params: { locale } });
          return;
        }
        if (lower.includes("account unavailable")) {
          setDeletionPending(true);
          setMessage(copy.unavailableBody);
          setMessageTone("error");
          return;
        }
        if (lower.includes("complete profile")) {
          setProfileComplete(false);
          setMessage(copy.profileRequiredBody);
          setMessageTone("error");
          return;
        }

        setMessage(copy.saveError);
        setMessageTone("error");
        return;
      }

      const row = ((Array.isArray(data) ? data[0] : data) ?? null) as DisclosureResult | null;
      const nextPreferences: DisclosurePreferences = {
        share_occupation: Boolean(row?.share_occupation),
        share_education: Boolean(row?.share_education),
        share_origin_region: Boolean(row?.share_origin_region),
      };

      setPreferences(nextPreferences);
      setSavedPreferences(nextPreferences);
      setMessage(copy.saved);
      setMessageTone("success");
    } catch {
      setMessage(copy.networkError);
      setMessageTone("error");
    } finally {
      setSaving(false);
    }
  }

  function updatePreference(key: keyof DisclosurePreferences, value: boolean) {
    setPreferences((current) => ({ ...current, [key]: value }));
    setMessage(null);
    setMessageTone(null);
  }

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={
        <PrimaryButton tone="quiet" onPress={() => router.back()}>
          {copy.back}
        </PrimaryButton>
      }
    >
      {loading ? (
        <View
          style={styles.loadingState}
          accessibilityLiveRegion="polite"
          accessibilityLabel={copy.loading}
        >
          <ActivityIndicator color={colors.primary} size="large" />
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
      ) : deletionPending ? (
        <StateCard
          rtl={rtl}
          tone="neutral"
          title={copy.unavailableTitle}
          body={copy.unavailableBody}
        />
      ) : !profileComplete ? (
        <StateCard
          rtl={rtl}
          tone="neutral"
          title={copy.profileRequiredTitle}
          body={copy.profileRequiredBody}
          actionLabel={copy.completeProfile}
          onAction={() => router.replace({ pathname: "/profile", params: { locale } })}
        />
      ) : (
        <View style={styles.stack}>
          <View style={styles.privateCard}>
            <View style={styles.privateMark}>
              <Text style={styles.privateMarkText}>✦</Text>
            </View>
            <View style={styles.flex}>
              <Text style={[styles.privateTitle, { textAlign: rtl ? "right" : "left" }]}>
                {copy.privateTitle}
              </Text>
              <Text style={[styles.privateBody, { textAlign: rtl ? "right" : "left" }]}>
                {copy.privateBody}
              </Text>
            </View>
          </View>

          <View style={styles.coreCard}>
            <Text style={[styles.coreTitle, { textAlign: rtl ? "right" : "left" }]}>
              {copy.coreTitle}
            </Text>
            <Text style={[styles.coreBody, { textAlign: rtl ? "right" : "left" }]}>
              {copy.coreBody}
            </Text>
          </View>

          <View style={styles.optionsCard}>
            <DisclosureToggle
              rtl={rtl}
              label={copy.occupationTitle}
              body={copy.occupationBody}
              value={preferences.share_occupation}
              onChange={(value) => updatePreference("share_occupation", value)}
            />
            <View style={styles.rule} />
            <DisclosureToggle
              rtl={rtl}
              label={copy.educationTitle}
              body={copy.educationBody}
              value={preferences.share_education}
              onChange={(value) => updatePreference("share_education", value)}
            />
            <View style={styles.rule} />
            <DisclosureToggle
              rtl={rtl}
              label={copy.originTitle}
              body={copy.originBody}
              value={preferences.share_origin_region}
              onChange={(value) => updatePreference("share_origin_region", value)}
            />
          </View>

          <Text style={[styles.helper, { textAlign: rtl ? "right" : "left" }]}>
            {copy.helper}
          </Text>

          {message ? (
            <Text
              accessibilityRole={messageTone === "error" ? "alert" : undefined}
              accessibilityLiveRegion="polite"
              style={[
                styles.message,
                messageTone === "success" ? styles.messageSuccess : null,
                messageTone === "error" ? styles.messageError : null,
                { textAlign: rtl ? "right" : "left" },
              ]}
            >
              {message}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton disabled={!dirty} loading={saving} onPress={() => void save()}>
              {saving ? copy.saving : dirty ? copy.save : copy.savedState}
            </PrimaryButton>
            <PrimaryButton
              tone="quiet"
              onPress={() => router.push({ pathname: "/profile-preview", params: { locale } })}
            >
              {copy.preview}
            </PrimaryButton>
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

function DisclosureToggle({
  rtl,
  label,
  body,
  value,
  onChange,
}: {
  rtl: boolean;
  label: string;
  body: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={[styles.toggleRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <View style={styles.flex}>
        <Text style={[styles.toggleTitle, { textAlign: rtl ? "right" : "left" }]}>{label}</Text>
        <Text style={[styles.toggleBody, { textAlign: rtl ? "right" : "left" }]}>{body}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityRole="switch"
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.borderStrong, true: colors.primarySoft }}
        thumbColor={value ? colors.primary : colors.surfaceRaised}
      />
    </View>
  );
}

function visibilityCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "خصوصية التعارف",
      title: "أنت تحدد أي تفاصيل إضافية يمكن مشاركتها",
      body: "ملفك ليس عاماً. هذه الإعدادات تخص فقط تعارفاً متحكماً به ومصرحاً به مستقبلاً.",
      loading: "جارٍ تحميل إعدادات خصوصية ملفك",
      back: "رجوع",
      retry: "إعادة المحاولة",
      loadErrorTitle: "تعذر تحميل إعدادات الخصوصية",
      loadErrorBody: "لم نغيّر أي إعداد. تحقق من اتصالك ثم حاول مرة أخرى.",
      unavailableTitle: "إعدادات الملف متوقفة",
      unavailableBody: "طلب حذف حسابك قيد المعالجة، لذلك لن نقبل تغييرات جديدة على بيانات ملفك.",
      profileRequiredTitle: "أكمل ملفك الخاص أولاً",
      profileRequiredBody: "إعدادات المشاركة تصبح متاحة بعد اكتمال ملف التعارف الأساسي.",
      completeProfile: "إكمال الملف الخاص",
      privateTitle: "الاختيار الافتراضي هو الخصوصية",
      privateBody: "العمل والتعليم والمنطقة الأصلية تبقى مخفية ما لم تختَر أنت إظهار كل عنصر بشكل منفصل.",
      coreTitle: "البيانات الأساسية في التعارف",
      coreBody:
        "الاسم المفضل، النبذة، الجنس، الفئة العمرية، المدينة، الحالة الاجتماعية، ووجود أطفال هي معلومات أساسية لسياق التعارف عند إطلاقه.",
      occupationTitle: "إظهار العمل",
      occupationBody: "اسمح بإظهار وصف العمل الذي كتبته في ملفك.",
      educationTitle: "إظهار التعليم",
      educationBody: "اسمح بإظهار وصف التعليم الذي كتبته في ملفك.",
      originTitle: "إظهار المنطقة الليبية الأصلية",
      originBody: "اسمح بإظهار المنطقة الأصلية من إجابات الاستبيان.",
      helper: "يمكنك تغيير هذه الاختيارات لاحقاً. ميثاق لا ينشئ دليلاً عاماً للأعضاء.",
      save: "حفظ اختيارات المشاركة",
      saving: "جارٍ الحفظ...",
      savedState: "الاختيارات محفوظة",
      saved: "تم حفظ اختيارات المشاركة الخاصة بك.",
      preview: "معاينة ما قد يظهر في تعارف",
      networkError: "تعذر الاتصال لحفظ الإعدادات. لم نفترض نجاح الحفظ؛ تحقق من الشبكة ثم حاول مرة أخرى.",
      saveError: "تعذر حفظ إعدادات المشاركة الآن. حاول مرة أخرى.",
    };
  }

  return {
    eyebrow: "Introduction privacy",
    title: "You decide which extra details may be shared",
    body: "Your profile is not public. These settings apply only to a future authorized, controlled introduction.",
    loading: "Loading your profile privacy settings",
    back: "Back",
    retry: "Try again",
    loadErrorTitle: "We couldn’t load your privacy settings",
    loadErrorBody: "No setting was changed. Check your connection and try again.",
    unavailableTitle: "Profile settings are paused",
    unavailableBody: "Your account deletion request is being processed, so we won’t accept new profile-data changes.",
    profileRequiredTitle: "Complete your private profile first",
    profileRequiredBody: "Disclosure controls become available after your core introduction profile is complete.",
    completeProfile: "Complete private profile",
    privateTitle: "Privacy is the default",
    privateBody: "Occupation, education, and Libyan origin region stay hidden unless you explicitly enable each item.",
    coreTitle: "Core introduction details",
    coreBody:
      "Preferred name, introduction, gender, age band, city, marital status, and whether you have children are core context for an introduction when that feature launches.",
    occupationTitle: "Show occupation",
    occupationBody: "Allow the occupation description from your private profile to appear.",
    educationTitle: "Show education",
    educationBody: "Allow the education description from your private profile to appear.",
    originTitle: "Show Libyan origin region",
    originBody: "Allow the origin region from your questionnaire to appear.",
    helper: "You can change these choices later. Mithaq does not create a public member directory.",
    save: "Save disclosure choices",
    saving: "Saving...",
    savedState: "Choices saved",
    saved: "Your private disclosure choices are saved.",
    preview: "Preview what an introduction could show",
    networkError:
      "We could not connect to save your settings. We did not assume success; check your network and try again.",
    saveError: "We couldn’t save disclosure settings right now. Try again.",
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingState: { minHeight: 220, alignItems: "center", justifyContent: "center" },
  stack: { gap: 16 },
  actions: { gap: 10 },
  privateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.primaryWash,
    padding: 15,
  },
  privateMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.goldSoft,
  },
  privateMarkText: { color: colors.gold, fontSize: 18, fontWeight: "900" },
  privateTitle: { color: colors.primary, fontSize: 14, fontWeight: "900" },
  privateBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 4 },
  coreCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 15,
  },
  coreTitle: { color: colors.foreground, fontSize: 13, fontWeight: "900" },
  coreBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 5 },
  optionsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    overflow: "hidden",
  },
  toggleRow: { alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 15 },
  toggleTitle: { color: colors.foreground, fontSize: 14, fontWeight: "800" },
  toggleBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  rule: { height: 1, backgroundColor: colors.border },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  message: { color: colors.muted, fontSize: 13, lineHeight: 20, fontWeight: "700" },
  messageSuccess: { color: colors.primary },
  messageError: { color: colors.danger },
});
