import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

type ProfileReviewState = "pending" | "approved" | "needs_changes" | "rejected";

type RegistrationState = {
  questionnaireComplete: boolean;
  applicationStatus: string | null;
  profileComplete: boolean;
  profileReviewState: ProfileReviewState | null;
  deletionPending: boolean;
};

type NextStep = {
  title: string;
  body: string;
  action: string | null;
  pathname: "/questionnaire" | "/consent" | "/profile" | "/marriage-discover" | "/privacy" | null;
};

type FlowIcon = "sliders" | "introductions" | "chat";
type FlowTone = "teal" | "rose" | "gold";

export default function StatusScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const { height } = useWindowDimensions();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const compact = height < 760;
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [registration, setRegistration] = useState<RegistrationState>({
    questionnaireComplete: false,
    applicationStatus: null,
    profileComplete: false,
    profileReviewState: null,
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

    const [userResult, applicationResult, profileResult, reviewResult] = await Promise.all([
      supabase.from("users").select("account_status").eq("id", data.session.user.id).maybeSingle(),
      supabase
        .from("waitlist_applications")
        .select("status, questionnaire_completed_at")
        .eq("user_id", data.session.user.id)
        .maybeSingle(),
      supabase.from("member_profiles").select("profile_completed_at").eq("user_id", data.session.user.id).maybeSingle(),
      supabase.from("member_profile_reviews").select("state").eq("user_id", data.session.user.id).maybeSingle(),
    ]);

    if (userResult.error || applicationResult.error || profileResult.error || reviewResult.error) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    const application = applicationResult.data;
    const reviewState = reviewResult.data?.state;
    setRegistration({
      questionnaireComplete: Boolean(application?.questionnaire_completed_at),
      applicationStatus: application?.status ?? null,
      profileComplete: Boolean(profileResult.data?.profile_completed_at),
      profileReviewState:
        reviewState === "pending" ||
        reviewState === "approved" ||
        reviewState === "needs_changes" ||
        reviewState === "rejected"
          ? reviewState
          : null,
      deletionPending: userResult.data?.account_status === "deletion_pending",
    });
    setLoading(false);
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const applicationSubmitted = ["submitted", "qualified", "invited"].includes(registration.applicationStatus ?? "");
  const membershipInvited = registration.applicationStatus === "invited";
  const profileApproved = registration.profileReviewState === "approved";
  const completedSteps =
    1 +
    Number(registration.questionnaireComplete) +
    Number(applicationSubmitted) +
    Number(membershipInvited) +
    Number(registration.profileComplete) +
    Number(profileApproved);
  const readiness = Math.round((completedSteps / 6) * 100);
  const nextStep = resolveNextStep(registration, rtl);

  return (
    <ScreenShell title={rtl ? "الرئيسية" : "Home"} rtl={rtl} scrollEnabled={false}>
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : loadError ? (
        <StateCard
          rtl={rtl}
          tone="error"
          title={rtl ? "تعذر تحميل حسابك" : "We couldn’t load your account"}
          body={rtl ? "تحقق من اتصالك وحاول مرة أخرى." : "Check your connection and try again."}
          actionLabel={rtl ? "إعادة المحاولة" : "Try again"}
          onAction={() => void load()}
        />
      ) : (
        <View style={styles.page}>
          <View style={styles.progressBlock}>
            <View style={[styles.progressRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <Text style={[styles.progressLabel, { textAlign, writingDirection }]}>
                {rtl ? "جاهزية العضوية" : "Membership readiness"}
              </Text>
              <Text style={[styles.progressValue, { textAlign: rtl ? "left" : "right" }]}>{readiness}%</Text>
            </View>
            <View style={[styles.progressTrack, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
              <View style={[styles.progressFill, { width: `${readiness}%` }]} />
            </View>
          </View>

          <View
            style={[
              styles.nextCard,
              compact ? styles.nextCardCompact : null,
              rtl ? styles.nextCardRtl : styles.nextCardLtr,
              { alignItems: rtl ? "flex-end" : "flex-start" },
            ]}
          >
            <View pointerEvents="none" style={[styles.roseGlow, rtl ? styles.roseGlowRtl : styles.roseGlowLtr]} />
            <View pointerEvents="none" style={[styles.goldGlow, rtl ? styles.goldGlowRtl : styles.goldGlowLtr]} />

            <View style={[styles.kickerPill, { alignSelf: rtl ? "flex-end" : "flex-start" }]}>
              <Text style={[styles.kicker, rtl ? styles.kickerArabic : null, { textAlign, writingDirection }]}>
                {rtl ? "خطوتك الآن" : "YOUR NEXT STEP"}
              </Text>
            </View>
            <Text
              style={[
                styles.nextTitle,
                compact ? styles.nextTitleCompact : null,
                rtl ? styles.nextTitleArabic : null,
                { textAlign, writingDirection },
              ]}
            >
              {nextStep.title}
            </Text>
            <Text style={[styles.nextBody, rtl ? styles.nextBodyArabic : null, { textAlign, writingDirection }]}>
              {nextStep.body}
            </Text>
            {nextStep.pathname && nextStep.action ? (
              <View style={styles.action}>
                <PrimaryButton
                  onPress={() =>
                    router.push({
                      pathname: nextStep.pathname as Exclude<NextStep["pathname"], null>,
                      params: { locale },
                    })
                  }
                >
                  {nextStep.action}
                </PrimaryButton>
              </View>
            ) : null}
          </View>

          <View style={[styles.howItWorks, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
            <Text style={[styles.howTitle, { textAlign, writingDirection }]}>
              {rtl ? "رحلة التعارف" : "How introductions work"}
            </Text>
            <View style={[styles.flow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <FlowStep icon="sliders" label={rtl ? "توافق" : "Fit"} rtl={rtl} tone="teal" />
              <View style={styles.flowLine} />
              <FlowStep icon="introductions" label={rtl ? "اهتمام خاص" : "Private interest"} rtl={rtl} tone="rose" />
              <View style={styles.flowLine} />
              <FlowStep icon="chat" label={rtl ? "قبول متبادل" : "Mutual chat"} rtl={rtl} tone="gold" />
            </View>
            <Text style={[styles.howBody, { textAlign, writingDirection }]}>
              {rtl
                ? "راجع مجموعة صغيرة ومحدودة، واختر اهتمامك بشكل خاص، ولا تبدأ المحادثة إلا بعد القبول المتبادل."
                : "Review a small finite set, express interest privately, and chat only after mutual acceptance."}
            </Text>
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

function resolveNextStep(registration: RegistrationState, rtl: boolean): NextStep {
  if (registration.deletionPending) {
    return {
      title: rtl ? "راجع طلب حذف حسابك" : "Review your deletion request",
      body: rtl
        ? "مشاركتك متوقفة حالياً، ويمكنك متابعة الطلب من مركز الخصوصية."
        : "Your participation is paused while the deletion request is processed.",
      action: rtl ? "مركز الخصوصية" : "Privacy Center",
      pathname: "/privacy",
    };
  }

  if (!registration.questionnaireComplete) {
    return {
      title: rtl ? "أخبرنا ما الذي يناسبك" : "Tell us what fits you",
      body: rtl
        ? "ابدأ بتفضيلاتك وحدودك الأساسية لنتمكن من اختيار تعارف مناسب لك."
        : "Start with your preferences and boundaries so Mithaq can identify suitable introductions.",
      action: rtl ? "ابدأ الاستبيان" : "Start questionnaire",
      pathname: "/questionnaire",
    };
  }

  const applicationSubmitted = ["submitted", "qualified", "invited"].includes(registration.applicationStatus ?? "");
  if (!applicationSubmitted) {
    return {
      title: rtl ? "راجع موافقتك" : "Review your consent",
      body: rtl
        ? "راجع استخدام بياناتك، ثم أكّد إرسال طلب الانضمام."
        : "Review how your data is used, then confirm your membership application.",
      action: rtl ? "متابعة" : "Continue",
      pathname: "/consent",
    };
  }

  if (registration.applicationStatus !== "invited") {
    return {
      title:
        registration.applicationStatus === "qualified"
          ? rtl
            ? "طلبك مؤهل وبانتظار الدعوة"
            : "Your application is qualified"
          : rtl
            ? "طلبك قيد المراجعة"
            : "Your application is under review",
      body:
        registration.applicationStatus === "qualified"
          ? rtl
            ? "تمت مراجعة طلبك مبدئياً. تجهيز ملف العضوية يفتح فقط عندما يرسل فريق ميثاق دعوة للحساب."
            : "Your application passed the initial review. Member profile setup unlocks only after Mithaq sends an invitation."
          : rtl
            ? "وصل طلبك. لا تحتاج لإعادة التسجيل؛ سنظهر هنا عندما تنتقل إلى التأهيل أو الدعوة."
            : "Your application was received. You do not need to register again; this screen will update when it is qualified or invited.",
      action: null,
      pathname: null,
    };
  }

  if (!registration.profileComplete) {
    return {
      title: rtl ? "أكمل ملفك الخاص" : "Complete your private profile",
      body: rtl
        ? "وصلتك الدعوة. جهّز ملف الزواج ومعلوماته الخاصة؛ هذا لا يفتح الاكتشاف أو المحادثة بعد."
        : "You’re invited. Set up your private marriage profile; this does not open Discover or chat yet.",
      action: rtl ? "إكمال الملف" : "Complete profile",
      pathname: "/profile",
    };
  }

  if (registration.profileReviewState !== "approved") {
    if (registration.profileReviewState === "needs_changes" || registration.profileReviewState === "rejected") {
      return {
        title: rtl ? "ملفك يحتاج مراجعة منك" : "Your profile needs your attention",
        body: rtl
          ? "لن يظهر ملفك في الاكتشاف حتى تعدّل المطلوب ويُعتمد من فريق المراجعة."
          : "Your profile will not appear in Discover until you make the requested changes and it is approved.",
        action: rtl ? "فتح الملف" : "Open profile",
        pathname: "/profile",
      };
    }

    return {
      title: rtl ? "ملفك قيد المراجعة" : "Your profile is under review",
      body: rtl
        ? "اكتمل إعداد الملف، لكن الاكتشاف يبقى مقفلاً حتى اعتماد المراجعة. لا تحتاج لإعادة الإرسال."
        : "Profile setup is complete, but Discover remains locked until review is approved. You do not need to resubmit it.",
      action: rtl ? "عرض حالة الملف" : "View profile status",
      pathname: "/profile",
    };
  }

  return {
    title: rtl ? "ملفك معتمد للاكتشاف" : "Your profile is approved for Discover",
    body: rtl
      ? "يمكنك الآن فتح اكتشاف الزواج. لا توجد ملفات عامة ولا سحب لا نهائي، والمحادثة لا تفتح إلا بعد مقدمة وقبول متبادل."
      : "You can now open Marriage Discover. There are no public profiles or endless swipes, and chat opens only after an introduction and mutual acceptance.",
    action: rtl ? "فتح الاكتشاف" : "Open Discover",
    pathname: "/marriage-discover",
  };
}

function FlowStep({ icon, label, rtl, tone }: { icon: FlowIcon; label: string; rtl: boolean; tone: FlowTone }) {
  return (
    <View style={styles.flowStep}>
      <View
        style={[
          styles.flowIcon,
          tone === "rose" ? styles.flowIconRose : tone === "gold" ? styles.flowIconGold : styles.flowIconTeal,
        ]}
      >
        <AppIcon name={icon} active size={17} />
      </View>
      <Text style={[styles.flowLabel, rtl ? styles.flowLabelArabic : null, { writingDirection: rtl ? "rtl" : "ltr" }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  page: {
    flex: 1,
    width: "100%",
    alignItems: "stretch",
  },
  progressBlock: { width: "100%" },
  progressRow: {
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
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
    minWidth: 44,
    color: colors.primary,
    fontSize: 12,
    lineHeight: 20,
    fontWeight: "900",
  },
  progressTrack: {
    width: "100%",
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.brandTeal,
  },
  nextCard: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 20,
    paddingVertical: 19,
    marginTop: 18,
    overflow: "hidden",
    ...shadows.card,
  },
  nextCardCompact: {
    marginTop: 14,
    paddingVertical: 15,
  },
  nextCardRtl: {
    borderRightWidth: 4,
    borderRightColor: colors.accent,
  },
  nextCardLtr: {
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  roseGlow: {
    position: "absolute",
    top: -58,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.accentSoft,
    opacity: 0.56,
  },
  roseGlowLtr: { right: -46 },
  roseGlowRtl: { left: -46 },
  goldGlow: {
    position: "absolute",
    bottom: -34,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.goldSoft,
    opacity: 0.54,
  },
  goldGlowLtr: { left: 64 },
  goldGlowRtl: { right: 64 },
  kickerPill: {
    borderRadius: radius.pill,
    backgroundColor: colors.accentWash,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  kicker: {
    color: colors.accent,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  kickerArabic: {
    fontSize: 12,
    lineHeight: 19,
    letterSpacing: 0,
  },
  nextTitle: {
    width: "100%",
    color: colors.brandNavy,
    fontSize: 24,
    lineHeight: 33,
    fontWeight: "800",
    marginTop: 12,
    letterSpacing: -0.25,
  },
  nextTitleCompact: {
    fontSize: 21,
    lineHeight: 29,
    marginTop: 9,
  },
  nextTitleArabic: {
    fontSize: 25,
    lineHeight: 39,
    fontWeight: "700",
    letterSpacing: 0,
  },
  nextBody: {
    width: "100%",
    color: colors.muted,
    fontSize: 13,
    lineHeight: 22,
    marginTop: 6,
  },
  nextBodyArabic: {
    fontSize: 14,
    lineHeight: 25,
    letterSpacing: 0,
  },
  action: {
    width: "100%",
    marginTop: 15,
  },
  howItWorks: {
    width: "100%",
    marginTop: 18,
  },
  howTitle: {
    width: "100%",
    color: colors.brandNavy,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: 0,
  },
  flow: {
    width: "100%",
    alignItems: "flex-start",
    marginTop: 12,
  },
  flowStep: {
    width: 82,
    alignItems: "center",
  },
  flowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  flowIconTeal: {
    backgroundColor: colors.primaryWash,
    borderColor: colors.primarySoft,
  },
  flowIconRose: {
    backgroundColor: colors.accentWash,
    borderColor: colors.accentSoft,
  },
  flowIconGold: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.goldSoft,
  },
  flowLabel: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 5,
    textAlign: "center",
    letterSpacing: 0,
  },
  flowLabelArabic: {
    fontSize: 11,
    lineHeight: 18,
  },
  flowLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderStrong,
    marginTop: 18,
  },
  howBody: {
    width: "100%",
    color: colors.muted,
    fontSize: 11,
    lineHeight: 19,
    marginTop: 8,
    letterSpacing: 0,
  },
});
