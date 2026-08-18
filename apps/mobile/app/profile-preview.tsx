import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

type PreviewData = {
  displayName: string;
  aboutMe: string;
  occupation: string | null;
  education: string | null;
  gender: "woman" | "man";
  ageBandId: number;
  countryCode: string;
  city: string;
  originRegion: string | null;
  maritalStatus: "never_married" | "divorced" | "widowed";
  hasChildren: boolean;
};

const ageBands = ["18–24", "25–29", "30–34", "35–39", "40–44", "45–49", "50–54", "55+"];

export default function ProfilePreviewScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => previewCopy(locale), [locale]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!sessionData.session) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }

      const userId = sessionData.session.user.id;
      const [userResult, profileResult, applicationResult] = await Promise.all([
        supabase.from("users").select("account_status").eq("id", userId).maybeSingle(),
        supabase
          .from("member_profiles")
          .select("display_name, about_me, occupation, education, profile_completed_at")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("waitlist_applications")
          .select(
            "status, gender, age_band_id, current_country_code, current_city, libyan_origin_region, marital_status, has_children",
          )
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      const readError = userResult.error ?? profileResult.error ?? applicationResult.error;
      if (readError) throw readError;

      if (userResult.data?.account_status !== "active") {
        setPreview(null);
        setLoading(false);
        return;
      }

      const profile = profileResult.data;
      const application = applicationResult.data;
      const submitted = application?.status === "submitted" || application?.status === "qualified" || application?.status === "invited";

      if (
        !submitted ||
        !profile?.profile_completed_at ||
        !profile.display_name ||
        !profile.about_me ||
        !application?.gender ||
        !application.age_band_id ||
        !application.current_country_code ||
        !application.current_city ||
        !application.marital_status
      ) {
        setPreview(null);
        setLoading(false);
        return;
      }

      setPreview({
        displayName: profile.display_name,
        aboutMe: profile.about_me,
        occupation: profile.occupation,
        education: profile.education,
        gender: application.gender as PreviewData["gender"],
        ageBandId: application.age_band_id,
        countryCode: application.current_country_code,
        city: application.current_city,
        originRegion: application.libyan_origin_region,
        maritalStatus: application.marital_status as PreviewData["maritalStatus"],
        hasChildren: application.has_children,
      });
      setLoading(false);
    } catch {
      setLoadError(true);
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const initial = preview?.displayName.trim().charAt(0) || "م";

  return (
    <ScreenShell eyebrow={copy.eyebrow} title={copy.title} body={copy.body} rtl={rtl}>
      {loading ? (
        <View style={styles.loadingState} accessibilityLiveRegion="polite">
          <ActivityIndicator accessibilityLabel={copy.loading} color={colors.primary} size="large" />
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
      ) : !preview ? (
        <StateCard
          rtl={rtl}
          tone="neutral"
          title={copy.incompleteTitle}
          body={copy.incompleteBody}
          actionLabel={copy.completeProfile}
          onAction={() => router.replace({ pathname: "/profile", params: { locale } })}
        />
      ) : (
        <View style={styles.stack}>
          <View style={styles.previewBanner}>
            <Text style={[styles.previewBannerTitle, { textAlign: rtl ? "right" : "left" }]}>
              {copy.previewOnlyTitle}
            </Text>
            <Text style={[styles.previewBannerBody, { textAlign: rtl ? "right" : "left" }]}>
              {copy.previewOnlyBody}
            </Text>
          </View>

          <View style={styles.profileCard}>
            <View style={[styles.identityRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={styles.identityCopy}>
                <Text style={[styles.name, { textAlign: rtl ? "right" : "left" }]}>{preview.displayName}</Text>
                <Text style={[styles.identityMeta, { textAlign: rtl ? "right" : "left" }]}>
                  {copy.gender[preview.gender]} · {ageBands[preview.ageBandId - 1] ?? copy.ageUnknown}
                </Text>
                <Text style={[styles.identityMeta, { textAlign: rtl ? "right" : "left" }]}>
                  {preview.city}, {preview.countryCode}
                </Text>
              </View>
            </View>

            <View style={styles.rule} />

            <Text style={[styles.sectionLabel, { textAlign: rtl ? "right" : "left" }]}>{copy.about}</Text>
            <Text style={[styles.about, { textAlign: rtl ? "right" : "left" }]}>{preview.aboutMe}</Text>

            <View style={styles.factGrid}>
              <Fact rtl={rtl} label={copy.marital} value={copy.maritalStatus[preview.maritalStatus]} />
              <Fact rtl={rtl} label={copy.children} value={preview.hasChildren ? copy.yes : copy.no} />
              {preview.originRegion ? <Fact rtl={rtl} label={copy.origin} value={preview.originRegion} /> : null}
              {preview.occupation ? <Fact rtl={rtl} label={copy.occupation} value={preview.occupation} /> : null}
              {preview.education ? <Fact rtl={rtl} label={copy.education} value={preview.education} /> : null}
            </View>
          </View>

          <View style={styles.hiddenCard}>
            <Text style={[styles.hiddenTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.hiddenTitle}</Text>
            <Text style={[styles.hiddenBody, { textAlign: rtl ? "right" : "left" }]}>{copy.hiddenBody}</Text>
          </View>

          <View style={styles.actions}>
            <PrimaryButton onPress={() => router.push({ pathname: "/profile", params: { locale } })}>
              {copy.editProfile}
            </PrimaryButton>
            <PrimaryButton tone="quiet" onPress={() => router.replace({ pathname: "/status", params: { locale } })}>
              {copy.status}
            </PrimaryButton>
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

function Fact({ rtl, label, value }: { rtl: boolean; label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={[styles.factLabel, { textAlign: rtl ? "right" : "left" }]}>{label}</Text>
      <Text style={[styles.factValue, { textAlign: rtl ? "right" : "left" }]}>{value}</Text>
    </View>
  );
}

function previewCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "معاينة خاصة",
      title: "هكذا قد يظهر ملفك في تعارف ميثاق",
      body: "هذه معاينة لك فقط. لا يمكن لأي عضو تصفحها، ولا يوجد دليل أعضاء عام.",
      loading: "جارٍ إعداد معاينة ملفك الخاص",
      loadErrorTitle: "تعذر إعداد المعاينة",
      loadErrorBody: "لم نعرض بيانات ناقصة أو قديمة. تحقق من الاتصال ثم حاول مرة أخرى.",
      retry: "إعادة المحاولة",
      incompleteTitle: "أكمل ملفك الخاص أولاً",
      incompleteBody: "المعاينة تُفتح بعد اكتمال التسجيل والاسم والتعريف المختصر المطلوبين.",
      completeProfile: "إكمال الملف الخاص",
      previewOnlyTitle: "معاينة فقط — ليست منشورة",
      previewOnlyBody: "عند إطلاق التعارف لاحقاً، سنكشف فقط البيانات المسموح بها وفي سياق تعارف متحكم به.",
      gender: { woman: "امرأة", man: "رجل" },
      ageUnknown: "العمر غير متاح",
      about: "نبذة",
      marital: "الحالة الاجتماعية",
      maritalStatus: { never_married: "لم يسبق الزواج", divorced: "مطلق/مطلقة", widowed: "أرمل/أرملة" },
      children: "الأطفال",
      yes: "نعم",
      no: "لا",
      origin: "المنطقة الليبية",
      occupation: "العمل",
      education: "التعليم",
      hiddenTitle: "ما لا تعرضه هذه المعاينة",
      hiddenBody: "رقم هاتفك، سجل الموافقات، حالة الأمان، وبيانات الدخول لا تظهر في ملف التعارف. الصور والتحقق من الهوية لم يتم تفعليهما بعد.",
      editProfile: "تعديل الملف الخاص",
      status: "العودة إلى حالة الحساب",
    };
  }

  return {
    eyebrow: "Private preview",
    title: "How your profile could appear in a Mithaq introduction",
    body: "This preview is visible only to you. Other members cannot browse it, and there is no public member directory.",
    loading: "Preparing your private profile preview",
    loadErrorTitle: "We could not prepare the preview",
    loadErrorBody: "We did not show incomplete or stale data. Check your connection and try again.",
    retry: "Try again",
    incompleteTitle: "Complete your private profile first",
    incompleteBody: "Preview becomes available after registration and the required display name and introduction are complete.",
    completeProfile: "Complete private profile",
    previewOnlyTitle: "Preview only — not published",
    previewOnlyBody: "When introductions launch later, Mithaq will reveal only permitted details inside a controlled introduction context.",
    gender: { woman: "Woman", man: "Man" },
    ageUnknown: "Age unavailable",
    about: "About",
    marital: "Marital status",
    maritalStatus: { never_married: "Never married", divorced: "Divorced", widowed: "Widowed" },
    children: "Children",
    yes: "Yes",
    no: "No",
    origin: "Libyan region",
    occupation: "Occupation",
    education: "Education",
    hiddenTitle: "What this preview never shows",
    hiddenBody: "Your phone number, consent history, security state, and sign-in data are not part of an introduction profile. Photos and identity verification are not enabled yet.",
    editProfile: "Edit private profile",
    status: "Back to account status",
  };
}

const styles = StyleSheet.create({
  loadingState: { minHeight: 220, alignItems: "center", justifyContent: "center" },
  stack: { gap: 14 },
  previewBanner: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    backgroundColor: colors.goldWash,
    padding: 15,
  },
  previewBannerTitle: { color: colors.gold, fontSize: 13, fontWeight: "900" },
  previewBannerBody: { color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 5 },
  profileCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 18,
  },
  identityRow: { alignItems: "center", gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.primarySoft,
  },
  avatarText: { color: colors.white, fontSize: 25, fontWeight: "900" },
  identityCopy: { flex: 1 },
  name: { color: colors.foreground, fontSize: 21, lineHeight: 29, fontWeight: "900" },
  identityMeta: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 2 },
  rule: { height: 1, backgroundColor: colors.border, marginVertical: 18 },
  sectionLabel: { color: colors.gold, fontSize: 11, fontWeight: "900", marginBottom: 7 },
  about: { color: colors.foreground, fontSize: 14, lineHeight: 23 },
  factGrid: { gap: 9, marginTop: 18 },
  fact: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  factLabel: { color: colors.muted, fontSize: 10, lineHeight: 15, fontWeight: "800" },
  factValue: { color: colors.foreground, fontSize: 13, lineHeight: 20, fontWeight: "700", marginTop: 2 },
  hiddenCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryWash,
    padding: 15,
  },
  hiddenTitle: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  hiddenBody: { color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 5 },
  actions: { gap: 10 },
});
