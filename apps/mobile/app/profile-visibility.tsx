import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  getMyIdentityTrustSummary,
  getMyMarriageVisibility,
  setMyMarriageVisibility,
  type IdentityTrustSummary,
  type MarriageVisibilityMode,
} from "@/lib/marriage-privacy";
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

const defaultTrust: IdentityTrustSummary = {
  phoneVerified: false,
  approvedPhoto: false,
  realPersonVerified: false,
  age18PlusVerified: false,
  identityVerified: false,
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
  const [savedPreferences, setSavedPreferences] = useState<DisclosurePreferences>(defaultPreferences);
  const [visibilityMode, setVisibilityMode] = useState<MarriageVisibilityMode>("private");
  const [savedVisibilityMode, setSavedVisibilityMode] = useState<MarriageVisibilityMode>("private");
  const [trust, setTrust] = useState<IdentityTrustSummary>(defaultTrust);
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
      const [userResult, profileResult, nextVisibility, nextTrust] = await Promise.all([
        supabase.from("users").select("account_status").eq("id", userId).maybeSingle(),
        supabase
          .from("member_profiles")
          .select("profile_completed_at, share_occupation, share_education, share_origin_region")
          .eq("user_id", userId)
          .maybeSingle(),
        getMyMarriageVisibility(),
        getMyIdentityTrustSummary(),
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
      setVisibilityMode(nextVisibility);
      setSavedVisibilityMode(nextVisibility);
      setTrust(nextTrust);
      setLoading(false);
    } catch {
      setLoadError(true);
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const disclosureDirty =
    preferences.share_occupation !== savedPreferences.share_occupation ||
    preferences.share_education !== savedPreferences.share_education ||
    preferences.share_origin_region !== savedPreferences.share_origin_region;
  const visibilityDirty = visibilityMode !== savedVisibilityMode;
  const dirty = disclosureDirty || visibilityDirty;

  async function save() {
    if (saving || deletionPending || !profileComplete || !dirty) return;

    setSaving(true);
    setMessage(null);
    setMessageTone(null);

    try {
      let nextPreferences = savedPreferences;
      let nextVisibility = savedVisibilityMode;

      if (disclosureDirty) {
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
          throw error;
        }

        const row = ((Array.isArray(data) ? data[0] : data) ?? null) as DisclosureResult | null;
        nextPreferences = {
          share_occupation: Boolean(row?.share_occupation),
          share_education: Boolean(row?.share_education),
          share_origin_region: Boolean(row?.share_origin_region),
        };
      }

      if (visibilityDirty) {
        nextVisibility = await setMyMarriageVisibility(visibilityMode);
      }

      setPreferences(nextPreferences);
      setSavedPreferences(nextPreferences);
      setVisibilityMode(nextVisibility);
      setSavedVisibilityMode(nextVisibility);
      setMessage(copy.saved);
      setMessageTone("success");
    } catch {
      setMessage(copy.saveError);
      setMessageTone("error");
      await load();
    } finally {
      setSaving(false);
    }
  }

  function updatePreference(key: keyof DisclosurePreferences, value: boolean) {
    setPreferences((current) => ({ ...current, [key]: value }));
    setMessage(null);
    setMessageTone(null);
  }

  function chooseVisibility(value: MarriageVisibilityMode) {
    setVisibilityMode(value);
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
        <View style={styles.loadingState} accessibilityLiveRegion="polite" accessibilityLabel={copy.loading}>
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
        <StateCard rtl={rtl} tone="neutral" title={copy.unavailableTitle} body={copy.unavailableBody} />
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
              <Text style={[styles.privateTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.privateTitle}</Text>
              <Text style={[styles.privateBody, { textAlign: rtl ? "right" : "left" }]}>{copy.privateBody}</Text>
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.discoverabilityTitle}</Text>
            <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left" }]}>{copy.discoverabilityBody}</Text>
          </View>

          <View style={styles.visibilityChoices}>
            <VisibilityChoice
              rtl={rtl}
              selected={visibilityMode === "private"}
              title={copy.privateModeTitle}
              badge={copy.recommended}
              body={copy.privateModeBody}
              onPress={() => chooseVisibility("private")}
            />
            <VisibilityChoice
              rtl={rtl}
              selected={visibilityMode === "standard"}
              title={copy.standardModeTitle}
              body={copy.standardModeBody}
              onPress={() => chooseVisibility("standard")}
            />
          </View>

          <View style={styles.trustCard}>
            <Text style={[styles.trustTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.trustTitle}</Text>
            <Text style={[styles.trustBody, { textAlign: rtl ? "right" : "left" }]}>{copy.trustBody}</Text>
            <View style={styles.trustRows}>
              <TrustRow rtl={rtl} label={copy.phoneTrust} verified={trust.phoneVerified} verifiedLabel={copy.verified} pendingLabel={copy.notVerified} />
              <TrustRow rtl={rtl} label={copy.photoTrust} verified={trust.approvedPhoto} verifiedLabel={copy.photoApproved} pendingLabel={copy.noApprovedPhoto} />
              <TrustRow rtl={rtl} label={copy.personTrust} verified={trust.realPersonVerified} verifiedLabel={copy.verified} pendingLabel={copy.verificationComing} />
              <TrustRow rtl={rtl} label={copy.ageTrust} verified={trust.age18PlusVerified} verifiedLabel={copy.verified} pendingLabel={copy.verificationComing} />
              <TrustRow rtl={rtl} label={copy.identityTrust} verified={trust.identityVerified} verifiedLabel={copy.verified} pendingLabel={copy.verificationComing} last />
            </View>
            <Text style={[styles.trustNote, { textAlign: rtl ? "right" : "left" }]}>{copy.selfDeclaredNote}</Text>
          </View>

          <View style={styles.coreCard}>
            <Text style={[styles.coreTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.coreTitle}</Text>
            <Text style={[styles.coreBody, { textAlign: rtl ? "right" : "left" }]}>{copy.coreBody}</Text>
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

          <Text style={[styles.helper, { textAlign: rtl ? "right" : "left" }]}>{copy.helper}</Text>

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

function VisibilityChoice({
  rtl,
  selected,
  title,
  body,
  badge,
  onPress,
}: {
  rtl: boolean;
  selected: boolean;
  title: string;
  body: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.visibilityChoice,
        selected ? styles.visibilityChoiceSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.visibilityTop, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <View style={[styles.radio, selected ? styles.radioSelected : null]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
        <Text style={[styles.visibilityTitle, { textAlign: rtl ? "right" : "left" }]}>{title}</Text>
        {badge ? (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.visibilityBody, { textAlign: rtl ? "right" : "left" }]}>{body}</Text>
    </Pressable>
  );
}

function TrustRow({
  rtl,
  label,
  verified,
  verifiedLabel,
  pendingLabel,
  last = false,
}: {
  rtl: boolean;
  label: string;
  verified: boolean;
  verifiedLabel: string;
  pendingLabel: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.trustRow, !last ? styles.rule : null, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <Text style={[styles.trustLabel, { textAlign: rtl ? "right" : "left" }]}>{label}</Text>
      <Text style={[styles.trustState, verified ? styles.trustStateVerified : null, { textAlign: rtl ? "left" : "right" }]}>
        {verified ? verifiedLabel : pendingLabel}
      </Text>
    </View>
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
      eyebrow: "خصوصية الظهور",
      title: "أنت تتحكم بمن يمكن أن يكتشف وجودك",
      body: "يمكنك البحث بصدق دون الحاجة لكشف هويتك أو صورتك للجميع.",
      loading: "جارٍ تحميل إعدادات خصوصية ملفك",
      back: "رجوع",
      retry: "إعادة المحاولة",
      loadErrorTitle: "تعذر تحميل إعدادات الخصوصية",
      loadErrorBody: "لم نغيّر أي إعداد. تحقق من اتصالك ثم حاول مرة أخرى.",
      unavailableTitle: "إعدادات الملف متوقفة",
      unavailableBody: "طلب حذف حسابك قيد المعالجة، لذلك لن نقبل تغييرات جديدة على بيانات ملفك.",
      profileRequiredTitle: "أكمل ملفك الخاص أولاً",
      profileRequiredBody: "إعدادات الظهور تصبح متاحة بعد اكتمال ملف الزواج الأساسي.",
      completeProfile: "إكمال الملف الخاص",
      privateTitle: "الخصوصية لا تتطلب معلومات مزيفة",
      privateBody: "استخدم اسماً ظاهراً ترتاح له وتحكم في صورتك وظهورك. ميثاق يفصل ما يراه الآخرون عما نتحقق منه بشكل خاص.",
      discoverabilityTitle: "من يمكنه العثور عليك في اكتشاف الزواج؟",
      discoverabilityBody: "هذا لا يغير قدرتك على رؤية الأشخاص المؤهلين لك.",
      privateModeTitle: "ظهور خاص",
      privateModeBody: "لن تظهر لهذا الشخص في اكتشاف الزواج إلا بعد أن تختاره أنت بشكل خاص. لن نخبره أنك اخترته. يمكن لميثاق أيضاً تقديم تعارف منسق لكما دون نشر ملفك في الاكتشاف.",
      standardModeTitle: "ظهور عادي",
      standardModeBody: "قد يظهر ملفك للأشخاص المؤهلين الذين يختارهم ترتيب ميثاق، وفق إعدادات الصورة والتفاصيل الخاصة بك.",
      recommended: "موصى به",
      trustTitle: "ما الذي تحقق منه ميثاق فعلاً؟",
      trustBody: "نفرّق بوضوح بين المعلومات التي تحققنا منها والمعلومات التي صرّح بها العضو بنفسه.",
      phoneTrust: "رقم الهاتف",
      photoTrust: "صورة معتمدة",
      personTrust: "شخص حقيقي مطابق للصورة",
      ageTrust: "العمر 18+",
      identityTrust: "الهوية",
      verified: "تم التحقق",
      notVerified: "غير متحقق",
      photoApproved: "تمت مراجعتها",
      noApprovedPhoto: "لا توجد صورة معتمدة",
      verificationComing: "لم يتم التحقق بعد",
      selfDeclaredNote: "الحالة الاجتماعية والأطفال والمدينة وإجابات الملف هي معلومات يصرّح بها العضو حالياً. لن نصفها بأنها «موثقة» ما لم نملك وسيلة حقيقية للتحقق منها.",
      coreTitle: "الهوية الظاهرة ليست هويتك القانونية",
      coreBody: "الاسم الظاهر يمكن أن يكون اسمك الأول أو اسماً تفضله. إذا جمع ميثاق اسماً قانونياً للتحقق لاحقاً، فلن يظهر تلقائياً للأعضاء الآخرين.",
      occupationTitle: "إظهار العمل",
      occupationBody: "اسمح بإظهار وصف العمل الذي كتبته في ملفك.",
      educationTitle: "إظهار التعليم",
      educationBody: "اسمح بإظهار وصف التعليم الذي كتبته في ملفك.",
      originTitle: "إظهار المنطقة الليبية الأصلية",
      originBody: "اسمح بإظهار المنطقة الأصلية من إجابات الاستبيان.",
      helper: "يمكنك تغيير هذه الاختيارات لاحقاً. لا يوجد دليل عام للأعضاء ولا يعرف أحد أنك تستخدم ميثاق لمجرد وجود حسابك.",
      save: "حفظ إعدادات الظهور",
      saving: "جارٍ الحفظ...",
      savedState: "الإعدادات محفوظة",
      saved: "تم حفظ إعدادات الخصوصية والظهور.",
      preview: "معاينة ما قد يظهر للآخرين",
      saveError: "تعذر حفظ إعدادات الخصوصية الآن. أعدنا تحميل الحالة الحالية؛ حاول مرة أخرى.",
    };
  }

  return {
    eyebrow: "Visibility privacy",
    title: "You control who can discover that you’re here",
    body: "You can be truthful without exposing your identity or photo to everyone.",
    loading: "Loading your profile privacy settings",
    back: "Back",
    retry: "Try again",
    loadErrorTitle: "We couldn’t load your privacy settings",
    loadErrorBody: "No setting was changed. Check your connection and try again.",
    unavailableTitle: "Profile settings are paused",
    unavailableBody: "Your account deletion request is being processed, so we won’t accept new profile-data changes.",
    profileRequiredTitle: "Complete your private profile first",
    profileRequiredBody: "Visibility controls become available after your core Marriage profile is complete.",
    completeProfile: "Complete private profile",
    privateTitle: "Privacy should not require fake information",
    privateBody: "Use a display name you are comfortable with and control your photo and visibility. Mithaq separates what other members see from what we privately verify.",
    discoverabilityTitle: "Who can find you in Marriage Discover?",
    discoverabilityBody: "This does not stop you from seeing eligible people yourself.",
    privateModeTitle: "Private visibility",
    privateModeBody: "You won’t appear to a person in Marriage Discover until you privately choose them first. We do not tell them you chose them. Mithaq can still offer curated introductions without publishing you in Discover.",
    standardModeTitle: "Standard visibility",
    standardModeBody: "Your profile may appear to eligible people selected by Mithaq’s ranking, still subject to your photo and detail privacy settings.",
    recommended: "Recommended",
    trustTitle: "What has Mithaq actually verified?",
    trustBody: "We clearly separate verified evidence from information a member has declared themselves.",
    phoneTrust: "Phone number",
    photoTrust: "Approved photo",
    personTrust: "Real person matches photo",
    ageTrust: "Age 18+",
    identityTrust: "Identity",
    verified: "Verified",
    notVerified: "Not verified",
    photoApproved: "Reviewed",
    noApprovedPhoto: "No approved photo",
    verificationComing: "Not verified yet",
    selfDeclaredNote: "Marital status, children, city, and profile answers are currently self-declared. Mithaq will never label them as verified unless we have a real way to verify them.",
    coreTitle: "Your display identity is not your legal identity",
    coreBody: "Your displayed name can be your first name or a preferred name. If Mithaq later collects a legal name for verification, it will not automatically be shown to other members.",
    occupationTitle: "Show occupation",
    occupationBody: "Allow the occupation description from your private profile to appear.",
    educationTitle: "Show education",
    educationBody: "Allow the education description from your private profile to appear.",
    originTitle: "Show Libyan origin region",
    originBody: "Allow the origin region from your questionnaire to appear.",
    helper: "You can change these choices later. There is no public member directory, and simply having a Mithaq account does not tell other people you use it.",
    save: "Save visibility settings",
    saving: "Saving...",
    savedState: "Settings saved",
    saved: "Your privacy and visibility settings are saved.",
    preview: "Preview what others may see",
    saveError: "We couldn’t save all privacy settings. We reloaded the current state; try again.",
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingState: { minHeight: 220, alignItems: "center", justifyContent: "center" },
  stack: { gap: 18 },
  actions: { gap: 10 },
  pressed: { opacity: 0.62 },
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
  sectionHeading: { gap: 5 },
  sectionTitle: { color: colors.foreground, fontSize: 16, lineHeight: 24, fontWeight: "900" },
  sectionBody: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  visibilityChoices: { gap: 10 },
  visibilityChoice: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 16,
    gap: 9,
  },
  visibilityChoiceSelected: { borderColor: colors.primary, backgroundColor: colors.primaryWash },
  visibilityTop: { alignItems: "center", gap: 9 },
  visibilityTitle: { flex: 1, color: colors.foreground, fontSize: 14, lineHeight: 21, fontWeight: "900" },
  visibilityBody: { color: colors.muted, fontSize: 12, lineHeight: 20 },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  recommendedBadge: { borderRadius: radius.pill, backgroundColor: colors.goldSoft, paddingHorizontal: 8, paddingVertical: 4 },
  recommendedText: { color: colors.gold, fontSize: 9, fontWeight: "900" },
  trustCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 16,
  },
  trustTitle: { color: colors.foreground, fontSize: 15, lineHeight: 23, fontWeight: "900" },
  trustBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 5 },
  trustRows: { marginTop: 12 },
  trustRow: { minHeight: 43, alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 9 },
  trustLabel: { flex: 1, color: colors.foreground, fontSize: 11, lineHeight: 18, fontWeight: "700" },
  trustState: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 17, fontWeight: "800" },
  trustStateVerified: { color: colors.primary },
  trustNote: { color: colors.muted, fontSize: 10, lineHeight: 18, marginTop: 12 },
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
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  message: { color: colors.muted, fontSize: 13, lineHeight: 20, fontWeight: "700" },
  messageSuccess: { color: colors.primary },
  messageError: { color: colors.danger },
});
