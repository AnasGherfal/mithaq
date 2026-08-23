import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { GuidedActionBar } from "@/components/guided-action-bar";
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

type ProfileReview = {
  state: "pending" | "approved" | "needs_changes" | "rejected";
  review_after: string | null;
};

type ProfileSaveResult = {
  profile_completed: boolean;
  profile_completed_at: string | null;
};

type MessageTone = "success" | "error" | null;

const TOTAL_STEPS = 3;

export default function ProfileScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const copy = useMemo(() => profileCopy(locale), [locale]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletionPending, setDeletionPending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [occupation, setOccupation] = useState("");
  const [education, setEducation] = useState("");
  const [complete, setComplete] = useState(false);
  const [review, setReview] = useState<ProfileReview>({ state: "pending", review_after: null });
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

      const currentUserId = sessionData.session.user.id;
      const [userResult, profileResult, reviewResult] = await Promise.all([
        supabase.from("users").select("account_status").eq("id", currentUserId).maybeSingle(),
        supabase
          .from("member_profiles")
          .select("display_name, about_me, occupation, education, profile_completed_at")
          .eq("user_id", currentUserId)
          .maybeSingle(),
        supabase
          .from("member_profile_reviews")
          .select("state, review_after")
          .eq("user_id", currentUserId)
          .maybeSingle(),
      ]);

      const readError = userResult.error ?? profileResult.error ?? reviewResult.error;
      if (readError) throw readError;

      const profile = profileResult.data as MemberProfile | null;
      setUserId(currentUserId);
      setDeletionPending(userResult.data?.account_status === "deletion_pending");
      setDisplayName(profile?.display_name ?? "");
      setAboutMe(profile?.about_me ?? "");
      setOccupation(profile?.occupation ?? "");
      setEducation(profile?.education ?? "");
      setComplete(Boolean(profile?.profile_completed_at));
      setReview(reviewResult.data ? (reviewResult.data as ProfileReview) : { state: "pending", review_after: null });
      setLoading(false);
    } catch {
      setLoadError(true);
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refreshReviewState() {
    if (!userId) return;

    const { data, error } = await supabase
      .from("member_profile_reviews")
      .select("state, review_after")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error) {
      setReview(data ? (data as ProfileReview) : { state: "pending", review_after: null });
    }
  }

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
      await refreshReviewState();
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
  const progress = (Number(nameReady) + Number(bioReady)) / 2;

  const reviewTitle =
    review.state === "approved"
      ? copy.reviewApprovedTitle
      : review.state === "needs_changes"
        ? copy.reviewChangesTitle
        : review.state === "rejected"
          ? copy.reviewRejectedTitle
          : copy.reviewPendingTitle;
  const reviewBody =
    review.state === "approved"
      ? copy.reviewApprovedBody
      : review.state === "needs_changes"
        ? copy.reviewChangesBody
        : review.state === "rejected"
          ? copy.reviewRejectedBody
          : copy.reviewPendingBody;
  const reviewDate = review.review_after
    ? new Date(review.review_after).toLocaleDateString(locale === "ar" ? "ar-LY" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  function clearMessage() {
    setMessage(null);
    setMessageTone(null);
  }

  function goBack() {
    if (saving) return;
    clearMessage();
    if (step === 1) router.back();
    else setStep((value) => Math.max(1, value - 1));
  }

  function continueFlow() {
    clearMessage();
    if (step < TOTAL_STEPS) {
      setStep((value) => Math.min(TOTAL_STEPS, value + 1));
      return;
    }
    void save();
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
        loading || loadError || deletionPending ? undefined : (
          <GuidedActionBar
            rtl={rtl}
            backLabel={copy.back}
            primaryLabel={step < TOTAL_STEPS ? copy.next : complete ? copy.saveChanges : copy.save}
            onBack={goBack}
            onPrimary={continueFlow}
            loading={saving}
            primaryDisabled={step === 1 && !nameValid}
          />
        )
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
      ) : (
        <View style={styles.page}>
          <ProfileProgress rtl={rtl} step={step} total={TOTAL_STEPS} label={copy.steps[step - 1] ?? ""} />

          {step === 1 ? (
            <View style={styles.section}>
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

              <View style={styles.readiness}>
                <View style={[styles.readinessTop, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                  <Text style={[styles.readinessLabel, { textAlign, writingDirection }]}>
                    {ready ? copy.ready : copy.draft}
                  </Text>
                  <Text style={styles.readinessValue}>{Math.round(progress * 100)}%</Text>
                </View>
                <View style={[styles.readinessTrack, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                  <View style={[styles.readinessFill, { width: `${progress * 100}%` }]} />
                </View>
              </View>
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.section}>
              <View style={[styles.privacyNote, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                <View style={styles.privacyIcon}>
                  <AppIcon name="privacy" active size={18} />
                </View>
                <Text style={[styles.privacyText, { textAlign, writingDirection }]}>{copy.optionalNote}</Text>
              </View>
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
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.section}>
              <View style={styles.previewCard}>
                <View style={[styles.previewIdentity, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{displayName.trim().charAt(0) || "م"}</Text>
                  </View>
                  <View style={[styles.flex, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
                    <Text style={[styles.previewName, { textAlign, writingDirection }]}>
                      {displayName.trim() || copy.member}
                    </Text>
                    <Text style={[styles.previewMeta, { textAlign, writingDirection }]}>
                      {[occupation.trim(), education.trim()].filter(Boolean).join(" · ") || copy.optionalHidden}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.previewAbout, { textAlign, writingDirection }]}>
                  {aboutMe.trim() || copy.bioMissing}
                </Text>
              </View>

              <View style={[styles.privateSummary, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                <View style={styles.privateIcon}>
                  <AppIcon name="shield" active size={18} />
                </View>
                <View style={[styles.flex, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
                  <Text style={[styles.privateTitle, { textAlign, writingDirection }]}>{copy.privateTitle}</Text>
                  <Text style={[styles.privateBody, { textAlign, writingDirection }]}>{copy.privateBody}</Text>
                </View>
              </View>

              {complete ? (
                <ReviewState
                  rtl={rtl}
                  title={reviewTitle}
                  body={reviewBody}
                  date={reviewDate}
                  dateLabel={copy.reviewAfter}
                  state={review.state}
                />
              ) : null}

              {message ? (
                <Text
                  accessibilityRole={messageTone === "error" ? "alert" : undefined}
                  accessibilityLiveRegion="polite"
                  style={[
                    styles.message,
                    messageTone === "success" ? styles.messageSuccess : null,
                    messageTone === "error" ? styles.messageError : null,
                    { textAlign, writingDirection },
                  ]}
                >
                  {message}
                </Text>
              ) : null}

              {complete ? (
                <View style={styles.secondaryActions}>
                  <PrimaryButton
                    tone="quiet"
                    onPress={() => router.push({ pathname: "/profile-preview", params: { locale } })}
                  >
                    {copy.preview}
                  </PrimaryButton>
                  <PrimaryButton
                    tone="quiet"
                    onPress={() => router.push({ pathname: "/profile-visibility", params: { locale } })}
                  >
                    {copy.visibility}
                  </PrimaryButton>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      )}
    </ScreenShell>
  );
}

function ProfileProgress({ rtl, step, total, label }: { rtl: boolean; step: number; total: number; label: string }) {
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";

  return (
    <View style={styles.progress}>
      <View style={[styles.progressTop, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <Text style={[styles.progressLabel, { textAlign, writingDirection }]}>{label}</Text>
        <Text style={styles.progressCount}>
          {step}/{total}
        </Text>
      </View>
      <View style={[styles.progressSegments, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            style={[
              styles.progressSegment,
              index + 1 < step ? styles.progressSegmentComplete : null,
              index + 1 === step ? styles.progressSegmentActive : null,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function ReviewState({
  rtl,
  title,
  body,
  date,
  dateLabel,
  state,
}: {
  rtl: boolean;
  title: string;
  body: string;
  date: string | null;
  dateLabel: string;
  state: ProfileReview["state"];
}) {
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";

  return (
    <View
      style={[
        styles.reviewState,
        state === "approved" ? styles.reviewApproved : null,
        state === "needs_changes" ? styles.reviewChanges : null,
        state === "rejected" ? styles.reviewRejected : null,
      ]}
    >
      <Text style={[styles.reviewTitle, { textAlign, writingDirection }]}>{title}</Text>
      <Text style={[styles.reviewBody, { textAlign, writingDirection }]}>{body}</Text>
      {date ? (
        <Text style={[styles.reviewDate, { textAlign, writingDirection }]}>
          {dateLabel}: {date}
        </Text>
      ) : null}
    </View>
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
  const writingDirection = rtl ? "rtl" : "ltr";

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { textAlign: rtl ? "right" : "left", writingDirection }]}>{label}</Text>
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
        style={[
          styles.input,
          multiline ? styles.textarea : null,
          invalid ? styles.inputInvalid : null,
          { writingDirection },
        ]}
      />
      <Text
        style={[
          styles.helper,
          invalid ? styles.helperInvalid : null,
          { textAlign: rtl ? "right" : "left", writingDirection },
        ]}
      >
        {helper}
      </Text>
    </View>
  );
}

function profileCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "ملفك الخاص",
      title: "عرّف عن نفسك",
      body: "ملف خاص يظهر فقط داخل تعارف مؤهل ووفق إعداداتك.",
      steps: ["عنك", "تفاصيل إضافية", "المراجعة"],
      stageTitles: ["كيف تفضّل أن تتعرّف؟", "أضف ما ترغب بمشاركته", "راجع ملفك الخاص"],
      stageBodies: [
        "الاسم والنبذة هما أساس الملف. اكتب بطريقتك وبوضوح.",
        "العمل والتعليم اختياريان، ويمكنك التحكم في ظهورهما لاحقاً.",
        "شاهد ملخصاً قريباً مما قد يظهر داخل تعارف مصرح به.",
      ],
      loading: "جارٍ تحميل ملفك الخاص",
      back: "رجوع",
      next: "متابعة",
      retry: "إعادة المحاولة",
      member: "عضو ميثاق",
      optionalHidden: "التفاصيل الإضافية غير مضافة",
      bioMissing: "أضف نبذة تساعد الطرف الآخر على فهم شخصيتك وقيمك.",
      loadErrorTitle: "تعذر تحميل ملفك",
      loadErrorBody: "لم نغيّر أي بيانات. تحقق من اتصالك ثم حاول مرة أخرى.",
      unavailableTitle: "تعديل الملف متوقف",
      unavailableBody: "طلب حذف حسابك قيد المعالجة، لذلك لن نقبل بيانات شخصية جديدة.",
      registrationRequired: "أكمل تسجيلك أولاً قبل حفظ ملف التعارف الخاص.",
      privateTitle: "خاص افتراضياً",
      privateBody:
        "لا يوجد دليل عام للأعضاء. لا يظهر هذا الملف لشخص آخر إلا داخل تعارف مصرح به وبعد تطبيق ضوابط الخصوصية.",
      optionalNote: "هذه التفاصيل اختيارية. إعدادات الظهور تحدد لاحقاً ما إذا كانت تُشارك داخل التعارف.",
      draft: "الملف ما زال مسودة",
      ready: "البيانات الأساسية جاهزة",
      reviewPendingTitle: "بانتظار المراجعة الخاصة",
      reviewPendingBody: "اكتمال الملف لا ينشره تلقائياً. يجب أن يجتاز مراجعة ميثاق قبل أي تعارف.",
      reviewApprovedTitle: "تمت الموافقة على الملف",
      reviewApprovedBody: "الملف معتمد، مع استمرار تطبيق قواعد السلامة والمطابقة على كل تعارف.",
      reviewChangesTitle: "الملف يحتاج تعديلاً",
      reviewChangesBody: "عدّل بياناتك واحفظها لإعادتها للمراجعة.",
      reviewRejectedTitle: "الملف غير معتمد حالياً",
      reviewRejectedBody: "لن ينشئ ميثاق تعارفاً جديداً بهذا الملف ما لم تتغير حالة المراجعة.",
      reviewAfter: "موعد المراجعة التالي",
      nameLabel: "الاسم الذي تفضله",
      nameHelper: "اسمك الأول أو الاسم الذي ترتاح أن يظهر في التعارف.",
      nameInvalid: "اكتب حرفين على الأقل، أو اترك الاسم فارغاً لحفظ المسودة.",
      bioLabel: "نبذة عنك",
      bioHelper: "اكتب 40 حرفاً على الأقل عن شخصيتك وقيمك وما تبحث عنه في الزواج",
      occupationLabel: "العمل",
      educationLabel: "التعليم",
      optional: "اختياري",
      save: "حفظ الملف",
      saveChanges: "حفظ التعديلات",
      preview: "فتح المعاينة الكاملة",
      visibility: "إعدادات ظهور التفاصيل",
      savedComplete: "تم حفظ ملفك، والبيانات الأساسية مكتملة.",
      savedDraft: "تم حفظ المسودة. أكمل الاسم والنبذة عندما تكون جاهزاً.",
      networkError: "تعذر الاتصال لحفظ ملفك. تحقق من الشبكة ثم حاول مرة أخرى.",
      saveError: "تعذر حفظ ملفك الآن. حاول مرة أخرى.",
    };
  }

  return {
    eyebrow: "Your private profile",
    title: "Introduce yourself",
    body: "A private profile shown only inside an eligible introduction under your settings.",
    steps: ["About you", "Optional details", "Review"],
    stageTitles: ["How would you like to be introduced?", "Add what you want to share", "Review your private profile"],
    stageBodies: [
      "Your preferred name and introduction form the core of the profile.",
      "Work and education are optional, and you can control their visibility later.",
      "See a summary close to what may appear in an authorized introduction.",
    ],
    loading: "Loading your private profile",
    back: "Back",
    next: "Continue",
    retry: "Try again",
    member: "Mithaq member",
    optionalHidden: "No additional details added",
    bioMissing: "Add an introduction that helps the other person understand your character and values.",
    loadErrorTitle: "We couldn’t load your profile",
    loadErrorBody: "No data was changed. Check your connection and try again.",
    unavailableTitle: "Profile editing is paused",
    unavailableBody: "Your account deletion request is being processed, so we won’t accept new personal data.",
    registrationRequired: "Complete registration before saving a private introduction profile.",
    privateTitle: "Private by default",
    privateBody:
      "There is no public member directory. This profile appears only inside an authorized introduction after privacy controls are applied.",
    optionalNote:
      "These details are optional. Visibility settings later determine whether they are shared inside an introduction.",
    draft: "Profile is still a draft",
    ready: "Core profile details are ready",
    reviewPendingTitle: "Awaiting private review",
    reviewPendingBody: "Completing the profile does not publish it. It must pass Mithaq review before an introduction.",
    reviewApprovedTitle: "Profile approved",
    reviewApprovedBody: "The profile is approved, while safety and matching rules still apply to every introduction.",
    reviewChangesTitle: "Profile needs changes",
    reviewChangesBody: "Edit and save the profile to return it for review.",
    reviewRejectedTitle: "Profile not currently approved",
    reviewRejectedBody: "Mithaq will not create a new introduction with this profile unless its review state changes.",
    reviewAfter: "Next review date",
    nameLabel: "Preferred name",
    nameHelper: "Your first name or the name you are comfortable showing in an introduction.",
    nameInvalid: "Use at least two characters, or leave the name empty to save a draft.",
    bioLabel: "About you",
    bioHelper: "Write at least 40 characters about your character, values, and what you want from marriage",
    occupationLabel: "Work",
    educationLabel: "Education",
    optional: "Optional",
    save: "Save profile",
    saveChanges: "Save changes",
    preview: "Open full preview",
    visibility: "Detail visibility settings",
    savedComplete: "Your profile is saved and the core details are complete.",
    savedDraft: "Your private draft is saved. Complete the name and introduction when you are ready.",
    networkError: "We could not connect to save your profile. Check your network and try again.",
    saveError: "We couldn’t save your profile. Please try again.",
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingState: { minHeight: 240, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 22 },
  section: { width: "100%", gap: 18 },
  field: { width: "100%" },
  progress: { width: "100%" },
  progressTop: { alignItems: "center", justifyContent: "space-between", gap: 12 },
  progressLabel: { flex: 1, color: colors.foreground, fontSize: 12, lineHeight: 20, fontWeight: "800" },
  progressCount: { color: colors.muted, fontSize: 11, lineHeight: 18, fontWeight: "800" },
  progressSegments: { width: "100%", gap: 5, marginTop: 9 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressSegmentComplete: { backgroundColor: colors.primarySoft },
  progressSegmentActive: { backgroundColor: colors.primary },
  label: { color: colors.foreground, fontSize: 13, lineHeight: 21, fontWeight: "800", marginBottom: 9 },
  input: {
    minHeight: 57,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 15,
    color: colors.foreground,
    backgroundColor: colors.surfaceRaised,
    fontSize: 15,
    lineHeight: 23,
  },
  inputInvalid: { borderColor: colors.danger },
  textarea: { minHeight: 170, paddingTop: 14, paddingBottom: 14 },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 7 },
  helperInvalid: { color: colors.danger, fontWeight: "700" },
  readiness: { width: "100%", paddingTop: 4 },
  readinessTop: { alignItems: "center", justifyContent: "space-between", gap: 12 },
  readinessLabel: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 20, fontWeight: "700" },
  readinessValue: { color: colors.primary, fontSize: 12, lineHeight: 20, fontWeight: "900" },
  readinessTrack: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: "hidden",
    marginTop: 8,
  },
  readinessFill: { height: "100%", borderRadius: 2, backgroundColor: colors.primary },
  privacyNote: {
    width: "100%",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryWash,
    padding: 16,
  },
  privacyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
  },
  privacyText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 21 },
  previewCard: {
    width: "100%",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 19,
  },
  previewIdentity: { width: "100%", alignItems: "center", gap: 13 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  avatarText: { color: colors.white, fontSize: 23, lineHeight: 31, fontWeight: "800" },
  previewName: { width: "100%", color: colors.foreground, fontSize: 21, lineHeight: 32, fontWeight: "800" },
  previewMeta: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 2 },
  previewAbout: {
    width: "100%",
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 26,
    marginTop: 17,
    paddingTop: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  privateSummary: {
    width: "100%",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryWash,
    padding: 16,
  },
  privateIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
  },
  privateTitle: { width: "100%", color: colors.foreground, fontSize: 13, lineHeight: 21, fontWeight: "800" },
  privateBody: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 21, marginTop: 3 },
  reviewState: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 16,
  },
  reviewApproved: { borderColor: colors.primarySoft, backgroundColor: colors.primaryWash },
  reviewChanges: { borderColor: colors.goldSoft },
  reviewRejected: { borderColor: "rgba(180,35,63,0.18)", backgroundColor: "#FBF4F3" },
  reviewTitle: { width: "100%", color: colors.foreground, fontSize: 15, lineHeight: 24, fontWeight: "800" },
  reviewBody: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 21, marginTop: 5 },
  reviewDate: {
    width: "100%",
    color: colors.foreground,
    fontSize: 11,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 8,
  },
  message: { width: "100%", color: colors.muted, fontSize: 13, lineHeight: 21, fontWeight: "700" },
  messageSuccess: { color: colors.primary },
  messageError: { color: colors.danger },
  secondaryActions: { width: "100%", gap: 10 },
});
