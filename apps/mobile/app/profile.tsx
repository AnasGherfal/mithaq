import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

type MemberProfile = {
  display_name: string | null;
  about_me: string | null;
  occupation: string | null;
  education: string | null;
  profile_completed_at: string | null;
};

type ProfileSaveResult = {
  profile_completed: boolean;
  profile_completed_at: string | null;
};

export default function ProfileScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => profileCopy(locale), [locale]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletionPending, setDeletionPending] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [occupation, setOccupation] = useState("");
  const [education, setEducation] = useState("");
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setMessage(null);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    if (!sessionData.session) {
      router.replace({ pathname: "/auth", params: { locale } });
      return;
    }

    const userId = sessionData.session.user.id;
    const [userResult, profileResult] = await Promise.all([
      supabase.from("users").select("account_status").eq("id", userId).maybeSingle(),
      supabase
        .from("member_profiles")
        .select("display_name, about_me, occupation, education, profile_completed_at")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (userResult.error || profileResult.error) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    const profile = profileResult.data as MemberProfile | null;
    setDeletionPending(userResult.data?.account_status === "deletion_pending");
    setDisplayName(profile?.display_name ?? "");
    setAboutMe(profile?.about_me ?? "");
    setOccupation(profile?.occupation ?? "");
    setEducation(profile?.education ?? "");
    setComplete(Boolean(profile?.profile_completed_at));
    setLoading(false);
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (saving || deletionPending) return;

    setSaving(true);
    setMessage(null);

    const { data, error } = await supabase.rpc("save_member_profile", {
      p_display_name: displayName,
      p_about_me: aboutMe,
      p_occupation: occupation,
      p_education: education,
    });

    if (error) {
      setSaving(false);
      setMessage(copy.saveError);
      return;
    }

    const row = ((Array.isArray(data) ? data[0] : data) ?? null) as ProfileSaveResult | null;
    setComplete(Boolean(row?.profile_completed));
    setSaving(false);
    setMessage(row?.profile_completed ? copy.savedComplete : copy.savedDraft);
  }

  const aboutCount = aboutMe.trim().length;
  const nameReady = displayName.trim().length >= 2;
  const bioReady = aboutCount >= 40;
  const ready = nameReady && bioReady;

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
          accessibilityLabel={rtl ? "جارٍ تحميل ملفك الخاص" : "Loading your private profile"}
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
      ) : (
        <View style={styles.stack}>
          <View style={styles.privacyCard}>
            <View style={styles.privacyMark}>
              <Text style={styles.privacyMarkText}>✦</Text>
            </View>
            <View style={styles.flex}>
              <Text style={[styles.privacyTitle, { textAlign: rtl ? "right" : "left" }]}>
                {copy.privateTitle}
              </Text>
              <Text style={[styles.privacyBody, { textAlign: rtl ? "right" : "left" }]}>
                {copy.privateBody}
              </Text>
            </View>
          </View>

          <View style={styles.progressCard}>
            <View style={[styles.progressTop, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <View style={styles.flex}>
                <Text style={[styles.progressLabel, { textAlign: rtl ? "right" : "left" }]}>
                  {copy.progress}
                </Text>
                <Text style={[styles.progressTitle, { textAlign: rtl ? "right" : "left" }]}>
                  {complete ? copy.complete : ready ? copy.ready : copy.draft}
                </Text>
              </View>
              <View style={[styles.statusPill, complete ? styles.statusPillComplete : null]}>
                <Text style={[styles.statusText, complete ? styles.statusTextComplete : null]}>
                  {complete ? "✓" : `${Number(nameReady) + Number(bioReady)}/2`}
                </Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((Number(nameReady) + Number(bioReady)) / 2) * 100}%` },
                ]}
              />
            </View>
          </View>

          <Field
            rtl={rtl}
            label={copy.nameLabel}
            helper={copy.nameHelper}
            value={displayName}
            onChange={setDisplayName}
            maxLength={50}
          />

          <Field
            rtl={rtl}
            label={copy.bioLabel}
            helper={`${copy.bioHelper} · ${aboutCount}/600`}
            value={aboutMe}
            onChange={setAboutMe}
            maxLength={600}
            multiline
          />

          <Field
            rtl={rtl}
            label={copy.occupationLabel}
            helper={copy.optional}
            value={occupation}
            onChange={setOccupation}
            maxLength={100}
          />

          <Field
            rtl={rtl}
            label={copy.educationLabel}
            helper={copy.optional}
            value={education}
            onChange={setEducation}
            maxLength={100}
          />

          {message ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                styles.message,
                complete ? styles.messageSuccess : null,
                { textAlign: rtl ? "right" : "left" },
              ]}
            >
              {message}
            </Text>
          ) : null}

          <PrimaryButton loading={saving} onPress={() => void save()}>
            {saving ? copy.saving : complete ? copy.saveChanges : copy.save}
          </PrimaryButton>
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
  return (
    <View>
      <Text style={[styles.label, { textAlign: rtl ? "right" : "left" }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        maxLength={maxLength}
        multiline={multiline}
        textAlign={rtl ? "right" : "left"}
        textAlignVertical={multiline ? "top" : "center"}
        placeholderTextColor={colors.mutedSoft}
        selectionColor={colors.primary}
        style={[styles.input, multiline ? styles.textarea : null]}
      />
      <Text style={[styles.helper, { textAlign: rtl ? "right" : "left" }]}>{helper}</Text>
    </View>
  );
}

function profileCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "ملفك الخاص",
      title: "عرّف عن نفسك بوضوح، بدون عرض عام",
      body: "هذا الملف يجهزك للتعارف الخاص مستقبلاً. لا يمكن للأعضاء تصفحه الآن.",
      back: "رجوع",
      retry: "إعادة المحاولة",
      loadErrorTitle: "تعذر تحميل ملفك",
      loadErrorBody: "لم نغيّر أي بيانات. تحقق من اتصالك ثم حاول مرة أخرى.",
      unavailableTitle: "تعديل الملف متوقف",
      unavailableBody: "طلب حذف حسابك قيد المعالجة، لذلك لن نقبل بيانات شخصية جديدة.",
      privateTitle: "خاص افتراضياً",
      privateBody: "ميثاق لا ينشئ دليلاً عاماً للأعضاء. إظهار بياناتك لشخص آخر سيحتاج لاحقاً إلى تعارف مصرح به.",
      progress: "اكتمال الملف",
      complete: "ملفك الأساسي مكتمل",
      ready: "جاهز للحفظ كمكتمل",
      draft: "مسودة خاصة",
      nameLabel: "الاسم الذي تفضله",
      nameHelper: "اسمك الأول أو الاسم الذي ترتاح أن يظهر عند تعارف مصرح به.",
      bioLabel: "نبذة عنك",
      bioHelper: "اكتب 40 حرفاً على الأقل عن شخصيتك وقيمك وما تبحث عنه في الزواج",
      occupationLabel: "العمل",
      educationLabel: "التعليم",
      optional: "اختياري حالياً",
      save: "حفظ الملف",
      saveChanges: "حفظ التعديلات",
      saving: "جارٍ الحفظ...",
      savedComplete: "تم حفظ ملفك، والبيانات الأساسية مكتملة.",
      savedDraft: "تم حفظ المسودة. أكمل الاسم والنبذة عندما تكون جاهزاً.",
      saveError: "تعذر حفظ ملفك الآن. لم نفترض نجاح الحفظ؛ حاول مرة أخرى.",
    };
  }

  return {
    eyebrow: "Your private profile",
    title: "Introduce yourself clearly, without a public directory",
    body: "This prepares you for future private introductions. Other members cannot browse it now.",
    back: "Back",
    retry: "Try again",
    loadErrorTitle: "We couldn’t load your profile",
    loadErrorBody: "No data was changed. Check your connection and try again.",
    unavailableTitle: "Profile editing is paused",
    unavailableBody: "Your account deletion request is being processed, so we won’t accept new personal data.",
    privateTitle: "Private by default",
    privateBody: "Mithaq does not create a public member directory. Showing your details to another person will later require an authorized introduction.",
    progress: "Profile completion",
    complete: "Your core profile is complete",
    ready: "Ready to save as complete",
    draft: "Private draft",
    nameLabel: "Preferred name",
    nameHelper: "Your first name or the name you are comfortable showing in an authorized introduction.",
    bioLabel: "About you",
    bioHelper: "Write at least 40 characters about your character, values, and what you want from marriage",
    occupationLabel: "Work",
    educationLabel: "Education",
    optional: "Optional for now",
    save: "Save profile",
    saveChanges: "Save changes",
    saving: "Saving...",
    savedComplete: "Your profile is saved and the core details are complete.",
    savedDraft: "Your private draft is saved. Complete the name and introduction when you are ready.",
    saveError: "We couldn’t save your profile. We did not assume success; please try again.",
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingState: { minHeight: 220, alignItems: "center", justifyContent: "center" },
  stack: { gap: 18 },
  privacyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.primaryWash,
    padding: 15,
  },
  privacyMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.goldSoft,
  },
  privacyMarkText: { color: colors.gold, fontSize: 18, fontWeight: "900" },
  privacyTitle: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  privacyBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 4 },
  progressCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    padding: 17,
  },
  progressTop: { alignItems: "center", gap: 14 },
  progressLabel: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "700" },
  progressTitle: { color: colors.white, fontSize: 17, fontWeight: "800", marginTop: 3 },
  statusPill: {
    minWidth: 44,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
  },
  statusPillComplete: { backgroundColor: colors.surfaceRaised },
  statusText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  statusTextComplete: { color: colors.primary },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
    marginTop: 15,
  },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: colors.goldSoft },
  label: { color: colors.foreground, fontSize: 13, fontWeight: "800", marginBottom: 9 },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 15,
    color: colors.foreground,
    backgroundColor: colors.surfaceRaised,
    fontSize: 15,
  },
  textarea: { minHeight: 150, paddingTop: 14, paddingBottom: 14 },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  message: { color: colors.muted, fontSize: 13, lineHeight: 20, fontWeight: "700" },
  messageSuccess: { color: colors.primary },
});
