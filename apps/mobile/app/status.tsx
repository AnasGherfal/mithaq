import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { MemberTabBar } from "@/components/member-tab-bar";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import { type MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

type RegistrationState = {
  questionnaireComplete: boolean;
  submitted: boolean;
  profileComplete: boolean;
  deletionPending: boolean;
};

type NextStep = {
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
      supabase.from("users").select("account_status").eq("id", data.session.user.id).maybeSingle(),
      supabase
        .from("waitlist_applications")
        .select("status, questionnaire_completed_at")
        .eq("user_id", data.session.user.id)
        .maybeSingle(),
      supabase.from("member_profiles").select("profile_completed_at").eq("user_id", data.session.user.id).maybeSingle(),
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

  const completedSteps =
    1 +
    Number(registration.questionnaireComplete) +
    Number(registration.submitted) +
    Number(registration.profileComplete);

  const nextStep: NextStep = registration.deletionPending
    ? {
        title: rtl ? "راجع طلب حذف حسابك" : "Review your deletion request",
        body: rtl ? "مشاركتك متوقفة حالياً ويمكنك متابعة الطلب من مركز الخصوصية." : "Your participation is paused while the deletion request is processed.",
        action: rtl ? "مركز الخصوصية" : "Privacy Center",
        pathname: "/privacy",
      }
    : !registration.questionnaireComplete
      ? {
          title: rtl ? "أخبرنا ما الذي يناسبك" : "Tell us what fits you",
          body: rtl ? "ابدأ بتفضيلاتك وحدودك الأساسية. هذه الخطوة تساعد ميثاق على اختيار تعارف مناسب." : "Start with your preferences and boundaries so Mithaq can identify suitable introductions.",
          action: rtl ? "ابدأ الاستبيان" : "Start questionnaire",
          pathname: "/questionnaire",
        }
      : !registration.submitted
        ? {
            title: rtl ? "راجع موافقتك" : "Review your consent",
            body: rtl ? "راجع استخدام بياناتك ثم أكّد مشاركتك." : "Review how your data is used, then confirm participation.",
            action: rtl ? "متابعة" : "Continue",
            pathname: "/consent",
          }
        : !registration.profileComplete
          ? {
              title: rtl ? "أكمل ملفك الخاص" : "Complete your private profile",
              body: rtl ? "أضف التفاصيل التي نكشفها فقط عند وجود تعارف مناسب." : "Add the details Mithaq reveals only when there is a suitable introduction.",
              action: rtl ? "إكمال الملف" : "Complete profile",
              pathname: "/profile",
            }
          : {
              title: rtl ? "أنت جاهز للتعارف" : "You’re ready for introductions",
              body: rtl ? "لا تحتاج إلى التصفح أو السحب. سنعرض تعارفاً خاصاً عندما نجد توافقاً مناسباً." : "No browsing or swiping. A private introduction appears when Mithaq finds a suitable fit.",
              action: rtl ? "عرض التعارفات" : "View introductions",
              pathname: "/introductions",
            };

  return (
    <ScreenShell
      title={rtl ? "الرئيسية" : "Home"}
      rtl={rtl}
      scrollEnabled={false}
      bottomBar={<MemberTabBar locale={locale} active="home" />}
    >
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
          <View style={[styles.progressRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <Text style={[styles.progressLabel, { textAlign, writingDirection }]}>{rtl ? "جاهزية الملف" : "Profile readiness"}</Text>
            <Text style={styles.progressValue}>{Math.round((completedSteps / 4) * 100)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(completedSteps / 4) * 100}%` }]} />
          </View>

          <View style={[styles.nextCard, { direction: rtl ? "rtl" : "ltr" }]}>
            <Text style={[styles.kicker, { textAlign, writingDirection }]}>{rtl ? "خطوتك الآن" : "YOUR NEXT STEP"}</Text>
            <Text style={[styles.nextTitle, { textAlign, writingDirection }]}>{nextStep.title}</Text>
            <Text style={[styles.nextBody, { textAlign, writingDirection }]}>{nextStep.body}</Text>
            <View style={styles.action}>
              <PrimaryButton onPress={() => router.push({ pathname: nextStep.pathname, params: { locale } })}>
                {nextStep.action}
              </PrimaryButton>
            </View>
          </View>

          <View style={[styles.howItWorks, { direction: rtl ? "rtl" : "ltr" }]}>
            <Text style={[styles.howTitle, { textAlign, writingDirection }]}>{rtl ? "كيف يعمل ميثاق؟" : "How Mithaq works"}</Text>
            <View style={[styles.flow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <FlowStep number="1" label={rtl ? "توافق" : "Fit"} />
              <View style={styles.flowLine} />
              <FlowStep number="2" label={rtl ? "تعارف" : "Intro"} />
              <View style={styles.flowLine} />
              <FlowStep number="3" label={rtl ? "قبول متبادل" : "Mutual"} />
            </View>
            <Text style={[styles.howBody, { textAlign, writingDirection }]}>
              {rtl ? "نختار تعارفاً مناسباً، ثم يقرر الطرفان بشكل خاص. المحادثة تبدأ فقط بعد القبول المتبادل." : "Mithaq selects a suitable introduction. Both decide privately. Chat opens only after mutual acceptance."}
            </Text>
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

function FlowStep({ number, label }: { number: string; label: string }) {
  return (
    <View style={styles.flowStep}>
      <View style={styles.flowNumber}>
        <Text style={styles.flowNumberText}>{number}</Text>
      </View>
      <Text style={styles.flowLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center" },
  page: { flex: 1 },
  progressRow: { alignItems: "center", justifyContent: "space-between" },
  progressLabel: { color: colors.muted, fontSize: 12, lineHeight: 19, fontWeight: "700" },
  progressValue: { color: colors.primary, fontSize: 12, fontWeight: "900" },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: colors.border, overflow: "hidden", marginTop: 8 },
  progressFill: { height: "100%", borderRadius: 2, backgroundColor: colors.primary },
  nextCard: { borderRadius: radius.lg, backgroundColor: colors.primary, padding: 18, marginTop: 18 },
  kicker: { color: "rgba(255,255,255,0.66)", fontSize: 10, lineHeight: 17, fontWeight: "800" },
  nextTitle: { color: colors.white, fontSize: 23, lineHeight: 34, fontWeight: "800", marginTop: 9 },
  nextBody: { color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 22, marginTop: 6 },
  action: { marginTop: 16 },
  howItWorks: { marginTop: 20 },
  howTitle: { color: colors.foreground, fontSize: 16, lineHeight: 26, fontWeight: "800" },
  flow: { alignItems: "flex-start", marginTop: 13 },
  flowStep: { width: 72, alignItems: "center" },
  flowNumber: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryWash },
  flowNumberText: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  flowLabel: { color: colors.muted, fontSize: 10, lineHeight: 15, fontWeight: "700", marginTop: 5, textAlign: "center" },
  flowLine: { flex: 1, height: 1, backgroundColor: colors.borderStrong, marginTop: 14 },
  howBody: { color: colors.muted, fontSize: 12, lineHeight: 21, marginTop: 10 },
});
