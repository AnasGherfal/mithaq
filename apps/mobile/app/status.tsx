import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import { type MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { setBiometricLockEnabled } from "@/security/biometric";
import { colors, radius } from "@/theme";

type RegistrationState = {
  questionnaireComplete: boolean;
  submitted: boolean;
  profileComplete: boolean;
  deletionPending: boolean;
};

type NextStep = {
  number: number;
  title: string;
  body: string;
  action: string;
  pathname: "/questionnaire" | "/consent" | "/profile" | "/introductions" | "/privacy";
};

export default function StatusScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [registration, setRegistration] = useState<RegistrationState>({
    questionnaireComplete: false,
    submitted: false,
    profileComplete: false,
    deletionPending: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);

    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    if (!data.session) {
      router.replace({ pathname: "/auth", params: { locale } });
      return;
    }

    const [userResult, applicationResult, profileResult] = await Promise.all([
      supabase
        .from("users")
        .select("account_status")
        .eq("id", data.session.user.id)
        .maybeSingle(),
      supabase
        .from("waitlist_applications")
        .select("status, questionnaire_completed_at")
        .eq("user_id", data.session.user.id)
        .maybeSingle(),
      supabase
        .from("member_profiles")
        .select("profile_completed_at")
        .eq("user_id", data.session.user.id)
        .maybeSingle(),
    ]);

    if (userResult.error || applicationResult.error || profileResult.error) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    const application = applicationResult.data;
    setRegistration({
      questionnaireComplete: Boolean(application?.questionnaire_completed_at),
      submitted: application?.status === "submitted",
      profileComplete: Boolean(profileResult.data?.profile_completed_at),
      deletionPending: userResult.data?.account_status === "deletion_pending",
    });
    setLoading(false);
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function signOut() {
    await setBiometricLockEnabled(false);
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/");
  }

  const completedSteps =
    1 +
    Number(registration.questionnaireComplete) +
    Number(registration.submitted) +
    Number(registration.profileComplete);

  const ready =
    registration.submitted && registration.profileComplete && !registration.deletionPending;

  const nextStep: NextStep = registration.deletionPending
    ? {
        number: 4,
        title: rtl ? "راجع طلب حذف حسابك" : "Review your deletion request",
        body: rtl
          ? "مشاركتك متوقفة الآن. يمكنك متابعة حالة الطلب وخصوصيتك من مركز الخصوصية."
          : "Your participation is paused. You can review the request and your privacy status in the Privacy Center.",
        action: rtl ? "فتح مركز الخصوصية" : "Open Privacy Center",
        pathname: "/privacy",
      }
    : !registration.questionnaireComplete
      ? {
          number: 2,
          title: rtl ? "أكمل تفضيلاتك أولاً" : "Complete your preferences first",
          body: rtl
            ? "سنستخدم إجاباتك لفهم التوافق والحدود المهمة لك. لن تُعرض إجاباتك كملف عام."
            : "Your answers help Mithaq understand compatibility and important boundaries. They are not published as a public profile.",
          action: rtl ? "بدء الاستبيان" : "Start questionnaire",
          pathname: "/questionnaire",
        }
      : !registration.submitted
        ? {
            number: 3,
            title: rtl ? "راجع موافقتك وأرسل طلبك" : "Review consent and submit",
            body: rtl
              ? "أنت قريب من الانتهاء. راجع كيف نستخدم بياناتك ثم أكّد مشاركتك."
              : "You are almost there. Review how your data is used, then confirm your participation.",
            action: rtl ? "المتابعة للموافقة" : "Continue to consent",
            pathname: "/consent",
          }
        : !registration.profileComplete
          ? {
              number: 4,
              title: rtl ? "أكمل ملفك الخاص" : "Complete your private profile",
              body: rtl
                ? "هذا هو الملف الذي سيكشف ميثاق أجزاءً محددة منه فقط عند وجود تعارف مناسب."
                : "This is the profile Mithaq will selectively reveal only when there is a suitable introduction.",
              action: rtl ? "إكمال الملف" : "Complete profile",
              pathname: "/profile",
            }
          : {
              number: 4,
              title: rtl ? "أنت جاهز للتعارف" : "You’re ready for introductions",
              body: rtl
                ? "لا تحتاج إلى التصفح أو السحب. عندما نجد توافقاً مناسباً، سيظهر لك هنا كتعارف خاص واحد وواضح."
                : "There is nothing to browse or swipe. When Mithaq finds a suitable fit, it appears here as one clear private introduction.",
              action: rtl ? "عرض التعارفات" : "View introductions",
              pathname: "/introductions",
            };

  return (
    <ScreenShell
      eyebrow={rtl ? "مساحتك الخاصة" : "YOUR PRIVATE SPACE"}
      title={rtl ? "خطوتك التالية واضحة" : "Your next step, clearly"}
      body={
        rtl
          ? "ميثاق يوجّهك خطوة بخطوة. لا تحتاج إلى البحث عن ما يجب فعله أو فتح كل الأقسام."
          : "Mithaq guides you one step at a time. You should never need to hunt through the app to know what to do next."
      }
      rtl={rtl}
      footer={
        <PrimaryButton tone="quiet" onPress={signOut}>
          {rtl ? "تسجيل الخروج" : "Sign out"}
        </PrimaryButton>
      }
    >
      {loading ? (
        <View
          style={styles.loadingState}
          accessibilityLabel={rtl ? "جارٍ تحميل خطوتك التالية" : "Loading your next step"}
        >
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : loadError ? (
        <StateCard
          rtl={rtl}
          tone="error"
          title={rtl ? "تعذر تحميل حسابك" : "We couldn’t load your account"}
          body={
            rtl
              ? "لم نغيّر أي بيانات. تحقق من اتصالك وحاول مرة أخرى."
              : "No data was changed. Check your connection and try again."
          }
          actionLabel={rtl ? "إعادة المحاولة" : "Try again"}
          onAction={() => void load()}
        />
      ) : (
        <View style={styles.page}>
          <View style={[styles.progressHeader, { direction: rtl ? "rtl" : "ltr" }]}>
            <Text style={[styles.progressLabel, { textAlign, writingDirection }]}>
              {rtl ? "إعداد العضوية" : "Membership setup"}
            </Text>
            <Text style={styles.progressValue}>{Math.round((completedSteps / 4) * 100)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(completedSteps / 4) * 100}%` }]} />
          </View>

          <View style={[styles.nextCard, { direction: rtl ? "rtl" : "ltr" }]}>
            <View style={[styles.stepLine, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{nextStep.number}</Text>
              </View>
              <Text style={[styles.stepLabel, { textAlign, writingDirection }]}>
                {ready
                  ? rtl
                    ? "الآن"
                    : "NOW"
                  : rtl
                    ? "الخطوة التالية"
                    : "NEXT STEP"}
              </Text>
            </View>
            <Text style={[styles.nextTitle, { textAlign, writingDirection }]}>
              {nextStep.title}
            </Text>
            <Text style={[styles.nextBody, { textAlign, writingDirection }]}>
              {nextStep.body}
            </Text>
            <View style={styles.primaryAction}>
              <PrimaryButton
                onPress={() =>
                  router.push({ pathname: nextStep.pathname, params: { locale } })
                }
              >
                {nextStep.action}
              </PrimaryButton>
            </View>
          </View>

          <View style={[styles.explainer, { direction: rtl ? "rtl" : "ltr" }]}>
            <Text style={[styles.explainerEyebrow, { textAlign, writingDirection }]}>
              {rtl ? "كيف يحدث التعارف؟" : "HOW MATCHING WORKS"}
            </Text>
            <Text style={[styles.explainerTitle, { textAlign, writingDirection }]}>
              {rtl ? "لا سحب. لا دليل عام. لا رسائل عشوائية." : "No swiping. No public directory. No random DMs."}
            </Text>
            <View style={styles.matchFlow}>
              <MatchStep
                rtl={rtl}
                number="1"
                title={rtl ? "نفهم التوافق" : "Mithaq evaluates fit"}
                body={
                  rtl
                    ? "نستخدم تفضيلات الطرفين والحدود الأساسية وحالة الأمان لاختيار مرشحين مؤهلين."
                    : "We use both members’ preferences, hard boundaries, and safety eligibility to identify suitable candidates."
                }
              />
              <MatchStep
                rtl={rtl}
                number="2"
                title={rtl ? "تعارف خاص واحد" : "One private introduction"}
                body={
                  rtl
                    ? "يظهر لكل طرف فقط ما وافق الطرف الآخر على كشفه. لا أحد يتصفح ملفات الناس."
                    : "Each person sees only the details the other has allowed Mithaq to reveal. Nobody browses a catalogue of people."
                }
              />
              <MatchStep
                rtl={rtl}
                number="3"
                title={rtl ? "قراران خاصان" : "Two private decisions"}
                body={
                  rtl
                    ? "كل طرف يقبل أو يرفض بشكل مستقل. لا نكشف قبول الطرف الآخر إلا إذا أصبح القبول متبادلاً."
                    : "Each person accepts or declines independently. The other person’s acceptance stays private unless it becomes mutual."
                }
              />
              <MatchStep
                rtl={rtl}
                number="4"
                title={rtl ? "المحادثة بعد القبول فقط" : "Conversation only after mutual acceptance"}
                body={
                  rtl
                    ? "عند القبول المتبادل فقط تُفتح محادثة خاصة ومحمية بينكما."
                    : "Only mutual acceptance opens a private protected conversation between the two of you."
                }
                last
              />
            </View>
          </View>

          <View style={styles.secondarySection}>
            <Text style={[styles.secondaryTitle, { textAlign, writingDirection }]}>
              {rtl ? "إدارة حسابك" : "Manage your account"}
            </Text>
            <View style={styles.secondaryActions}>
              {registration.submitted ? (
                <SecondaryAction
                  rtl={rtl}
                  title={rtl ? "ملفي الخاص" : "Private profile"}
                  onPress={() => router.push({ pathname: "/profile", params: { locale } })}
                />
              ) : null}
              {ready ? (
                <SecondaryAction
                  rtl={rtl}
                  title={rtl ? "النشاط" : "Activity"}
                  onPress={() => router.push({ pathname: "/activity", params: { locale } })}
                />
              ) : null}
              <SecondaryAction
                rtl={rtl}
                title={rtl ? "الأمان والخصوصية" : "Security & privacy"}
                onPress={() => router.push({ pathname: "/security", params: { locale } })}
              />
            </View>
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

function MatchStep({
  rtl,
  number,
  title,
  body,
  last = false,
}: {
  rtl: boolean;
  number: string;
  title: string;
  body: string;
  last?: boolean;
}) {
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  return (
    <View style={[styles.matchStep, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <View style={styles.matchRail}>
        <View style={styles.matchNumber}>
          <Text style={styles.matchNumberText}>{number}</Text>
        </View>
        {!last ? <View style={styles.matchConnector} /> : null}
      </View>
      <View style={styles.matchCopy}>
        <Text style={[styles.matchTitle, { textAlign, writingDirection }]}>{title}</Text>
        <Text style={[styles.matchBody, { textAlign, writingDirection }]}>{body}</Text>
      </View>
    </View>
  );
}

function SecondaryAction({
  rtl,
  title,
  onPress,
}: {
  rtl: boolean;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryAction,
        { flexDirection: rtl ? "row-reverse" : "row" },
        pressed ? styles.secondaryActionPressed : null,
      ]}
    >
      <Text
        style={[
          styles.secondaryActionText,
          { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" },
        ]}
      >
        {title}
      </Text>
      <Text style={[styles.chevron, rtl ? styles.chevronRtl : null]}>{rtl ? "‹" : "›"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  page: {
    gap: 30,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  progressLabel: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: 0,
  },
  progressValue: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: "hidden",
    marginTop: -22,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  nextCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  stepLine: {
    alignItems: "center",
    gap: 9,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  stepBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "900",
  },
  stepLabel: {
    flex: 1,
    color: "rgba(255,255,255,0.66)",
    fontSize: 10,
    lineHeight: 17,
    fontWeight: "800",
    letterSpacing: 0,
  },
  nextTitle: {
    color: colors.white,
    fontSize: 24,
    lineHeight: 37,
    fontWeight: "800",
    letterSpacing: 0,
    marginTop: 18,
  },
  nextBody: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 14,
    lineHeight: 25,
    letterSpacing: 0,
    marginTop: 8,
  },
  primaryAction: {
    marginTop: 20,
  },
  explainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 28,
  },
  explainerEyebrow: {
    color: colors.gold,
    fontSize: 10,
    lineHeight: 18,
    fontWeight: "900",
    letterSpacing: 0,
  },
  explainerTitle: {
    color: colors.foreground,
    fontSize: 22,
    lineHeight: 35,
    fontWeight: "800",
    letterSpacing: 0,
    marginTop: 7,
  },
  matchFlow: {
    marginTop: 22,
  },
  matchStep: {
    gap: 14,
    minHeight: 92,
  },
  matchRail: {
    width: 30,
    alignItems: "center",
  },
  matchNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  matchNumberText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  matchConnector: {
    width: 1,
    flex: 1,
    minHeight: 42,
    backgroundColor: colors.border,
    marginVertical: 5,
  },
  matchCopy: {
    flex: 1,
    paddingBottom: 22,
  },
  matchTitle: {
    color: colors.foreground,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: 0,
  },
  matchBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 23,
    letterSpacing: 0,
    marginTop: 4,
  },
  secondarySection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 24,
  },
  secondaryTitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: 0,
    marginBottom: 6,
  },
  secondaryActions: {
    gap: 0,
  },
  secondaryAction: {
    minHeight: 54,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  secondaryActionPressed: {
    opacity: 0.55,
  },
  secondaryActionText: {
    flex: 1,
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: 0,
  },
  chevron: {
    color: colors.muted,
    fontSize: 25,
    fontWeight: "300",
  },
  chevronRtl: {
    textAlign: "left",
  },
});
