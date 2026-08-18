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

type MessageTone = "success" | "error" | null;

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
          .select("display_name, about_me, occupation, education, profile_completed_at")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      const readError = userResult.error ?? profileResult.error;
      if (readError) throw readError;

      const profile = profileResult.data as MemberProfile | null;
      setDeletionPending(userResult.data?.account_status === "deletion_pending");
      setDisplayName(profile?.display_name ?? "");
      setAboutMe(profile?.about_me ?? "");
      setOccupation(profile?.occupation ?? "");
      setEducation(profile?.education ?? "");
      setComplete(Boolean(profile?.profile_completed_at));
      setLoading(false);
    } catch {
      setLoadError(true);
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (saving || deletionPending) return;

    setSaving(true);
    setMessage(null);
    setMessageTone(null);

    try {
      const { data, error } = await supabase.rpc("save_member_profile", {
        p_display_name: displayName,
        p_about_me: aboutMe,
        p_occupation: occupation,
        p_education: education,
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
        if (lower.includes("waitlist submission")) {
          setMessage(copy.registrationRequired);
          setMessageTone("error");
          return;
        }

        setMessage(copy.saveError);
        setMessageTone("error");
        return;
      }

      const row = ((Array.isArray(data) ? data[0] : data) ?? null) as ProfileSaveResult | null;
      const isComplete = Boolean(row?.profile_completed);
      setComplete(isComplete);
      setMessage(isComplete ? copy.savedComplete : copy.savedDraft);
      setMessageTone("success");
    } catch {
      setMessage(copy.networkError);
      setMessageTone("error");
    } finally {
      setSaving(false);
    }
  }

  const aboutCount = aboutMe.trim().length;
  const trimmedNameLength = displayName.trim().length;
  const nameReady = trimmedNameLength >= 2;
  const nameValid = trimmedNameLength === 0 || nameReady;
  const bioReady = aboutCount >= 40;
  const ready = nameReady && bioReady;

  function clearMessage() {
    if (!message) return;
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
        <StateCard rtl={rtl} tone="neutral" title={copy.unavailableTitle} body={copy.unavailableBody} />
      ) : (
        <View style={styles.stack}>
          <View style={styles.privacyCard}>
            <View style={styles.privacyMark}>
              <Text style={styles.privacyMarkText}>✦</Text>
            </View>
            <View style={styles.flex}>
              <Text style={[styles.privacyTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.privateTitle}</Text>
              <Text style={[styles.privacyBody, { textAlign: rtl ? "right" : "left" }]}>{copy.privateBody}</Text>
            </View>
          </View>

          <View style={styles.progressCard}>
            <View style={[styles.progressTop, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <View style={styles.flex}>
                <Text style={[styles.progressLabel, { textAlign: rtl ? "right" : "left" }]}>{copy.progress}</Text>
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
                style={[styles.progressFill, { width: `${((Number(nameReady) + Number(bioReady)) / 2) * 100}%` }]}
              />
            </View>
          </View>

          <Field
            rtl={rtl}
            label={copy.nameLabel}
            helper={!nameValid ? copy.nameInvalid : copy.nameHelper}
            value={displayName}
            onChange={(value) => {
              setDisplayName(value);
              clearMessage();
            }}
            maxLength={50}
            invalid={!nameValid}
          />

          <Field
            rtl={rtl}
            label={copy.bioLabel}
            helper={`${copy.bioHelper} · ${aboutCount}/600`}
            value={aboutMe}
            onChange={(value) => {
              setAboutMe(value);
              clearMessage();
            }}
            maxLength={600}
            multiline
          />

          <Field
            rtl={rtl}
            label={copy.occupationLabel}
            helper={copy.optional}
            value={occupation}
            onChange={(value) => {
              setOccupation(value);
              clearMessage();
            }}
            maxLength={100}
          />

          <Field
            rtl={rtl}
            label={copy.educationLabel}
            helper={copy.optional}
            value={education}
            onChange={(value) => {
              setEducation(value);
              clearMessage();
            }}
            maxLength={100}
          />

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
            <PrimaryButton disabled={!nameValid} loading={saving} onPress={() => void save()}>
              {saving ? copy.saving : complete ? copy.saveChanges : copy.save}
            </PrimaryButton>
            {complete ? (
              <PrimaryButton
                tone="quiet"
                onPress={() => router.push({ pathname: "/profile-preview", params: { locale } })}
              >
                {copy.preview}
              </PrimaryButton>
            ) : null}
          </View>
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
  invalid = false,
}: {
  rtl: boolean;
  label: string;
  helper: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  multiline?: boolean;
  invalid?: boolean;
}) {
  return (
    <View>
      <Text style={[styles.label, { textAlign: rtl ? "right" : "left" }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={invalid ? helper : undefined}
        value={value}
        onChangeText={onChange}
        maxLength={maxLength}
        multiline={multiline}
        textAlign={rtl ? "right" : "left"}
        textAlignVertical={multiline ? "top" : "center"}
        placeholderTextColor={colors.mutedSoft}
        selectionColor={colors.primary}
        style={[styles.input, multiline ? styles.textarea : null, invalid ? styles.inputInvalid : null]}
      />
      <Text style={[styles.helper, invalid ? styles.helperInvalid : null, { textAlign: rtl ? "right" : "left" }]}>
        {helper}
      </Text>
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
      registrationRequired: "أكمل تسجيل قائمة الانتظار أولاً قبل حفظ ملف التعارف الخاص.",
      privateTitle: "خاص افتراضياً",
      privateBody: "ميثاق لا ينشئ دليلاً عاماً للأعضاء. إظهار بياناتك لشخص آخر سيحتاج لاحقاً إلى تعارف مصرح به.",
      progress: "اكتمال الملف",
      complete: "ملفك الأساسي مكتمل",
      ready: "جاهز للحفظ كمكتمل",
      draft: "مسودة خاصة",
      nameLabel: "الاسم الذي تفضله",
      nameHelper: "اسمك الأول أو الاسم الذي ترتاح أن يظهر عند تعارف مصرح به.",
      nameInvalid: "اكتب حرفين على الأقل، أو اترك الاسم فارغاً لحفظ المسودة.",
      bioLabel: "نبذة عنك",
      bioHelper: "اكتب 40 حرفاً على الأقل عن شخصيتك وقيمك وما تبحث عنه في الزواج",
      occupationLabel: "العمل",
      educationLabel: "التعليم",
      optional: "اختياري حالياً",
      save: "حفظ الملف",
      saveChanges: "حفظ التعديلات",
      saving: "جارٍ الحفظ...",
      preview: "معاينة الملف كما قد يظهر في تعارف",
      savedComplete: "تم حفظ ملفك، والبيانات الأساسية مكتملة.",
      savedDraft: "تم حفظ المسودة. أكمل الاسم والنبذة عندما تكون جاهزاً.",
      networkError: "تعذر الاتصال لحفظ ملفك. لم نفترض نجاح الحفظ؛ تحقق من الشبكة ثم حاول مرة أخرى.",
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
    registrationRequired: "Complete your waitlist registration before saving a private introduction profile.",
    privateTitle: "Private by default",
    privateBody:
      "Mithaq does not create a public member directory. Showing your details to another person will later require an authorized introduction.",
    progress: "Profile completion",
    complete: "Your core profile is complete",
    ready: "Ready to save as complete",
    draft: "Private draft",
    nameLabel: "Preferred name",
    nameHelper: "Your first name or the name you are comfortable showing in an authorized introduction.",
    nameInvalid: "Use at least two characters, or leave the name empty to save a draft.",
    bioLabel: "About you",
    bioHelper: "Write at least 40 characters about your character, values, and what you want from marriage",
    occupationLabel: "Work",
    educationLabel: "Education",
    optional: "Optional for now",
    save: "Save profile",
    saveChanges: "Save changes",
    saving: "Saving...",
    preview: "Preview how this could appear in an introduction",
    savedComplete: "Your profile is saved and the core details are complete.",
    savedDraft: "Your private draft is saved. Complete the name and introduction when you are ready.",
    networkError:
      "We could not connect to save your profile. We did not assume success; check your network and try again.",
    saveError: "We couldn’t save your profile. We did not assume success; please try again.",
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingState: { minHeight: 220, alignItems: "center", justifyContent: "center" },
  stack: { gap: 18 },
  actions: { gap: 10 },
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
  inputInvalid: { borderColor: colors.danger },
  textarea: { minHeight: 150, paddingTop: 14, paddingBottom: 14 },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  helperInvalid: { color: colors.danger, fontWeight: "700" },
  message: { color: colors.muted, fontSize: 13, lineHeight: 20, fontWeight: "700" },
  messageSuccess: { color: colors.primary },
  messageError: { color: colors.danger },
});
