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

type RegistrationState = { questionnaireComplete: boolean; submitted: boolean; profileComplete: boolean; deletionPending: boolean };
type NextStep = { number: number; title: string; body: string; action: string; pathname: "/questionnaire" | "/consent" | "/profile" | "/introductions" | "/privacy" };

export default function StatusScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [registration, setRegistration] = useState<RegistrationState>({ questionnaireComplete: false, submitted: false, profileComplete: false, deletionPending: false });

  const load = useCallback(async () => {
    setLoading(true); setLoadError(false);
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) { setLoadError(true); setLoading(false); return; }
    if (!data.session) { router.replace({ pathname: "/auth", params: { locale } }); return; }
    const [userResult, applicationResult, profileResult] = await Promise.all([
      supabase.from("users").select("account_status").eq("id", data.session.user.id).maybeSingle(),
      supabase.from("waitlist_applications").select("status, questionnaire_completed_at").eq("user_id", data.session.user.id).maybeSingle(),
      supabase.from("member_profiles").select("profile_completed_at").eq("user_id", data.session.user.id).maybeSingle(),
    ]);
    if (userResult.error || applicationResult.error || profileResult.error) { setLoadError(true); setLoading(false); return; }
    const application = applicationResult.data;
    setRegistration({ questionnaireComplete: Boolean(application?.questionnaire_completed_at), submitted: application?.status === "submitted", profileComplete: Boolean(profileResult.data?.profile_completed_at), deletionPending: userResult.data?.account_status === "deletion_pending" });
    setLoading(false);
  }, [locale]);

  useEffect(() => { void load(); }, [load]);

  const completedSteps = 1 + Number(registration.questionnaireComplete) + Number(registration.submitted) + Number(registration.profileComplete);
  const ready = registration.submitted && registration.profileComplete && !registration.deletionPending;
  const nextStep: NextStep = registration.deletionPending
    ? { number: 4, title: rtl ? "راجع طلب حذف حسابك" : "Review your deletion request", body: rtl ? "مشاركتك متوقفة الآن. يمكنك متابعة حالة الطلب وخصوصيتك من مركز الخصوصية." : "Your participation is paused. Review the request and privacy status in the Privacy Center.", action: rtl ? "فتح مركز الخصوصية" : "Open Privacy Center", pathname: "/privacy" }
    : !registration.questionnaireComplete
      ? { number: 2, title: rtl ? "أكمل تفضيلاتك أولاً" : "Complete your preferences first", body: rtl ? "سنستخدم إجاباتك لفهم التوافق والحدود المهمة لك. لن تُعرض إجاباتك كملف عام." : "Your answers help Mithaq understand compatibility and important boundaries. They are not a public profile.", action: rtl ? "بدء الاستبيان" : "Start questionnaire", pathname: "/questionnaire" }
      : !registration.submitted
        ? { number: 3, title: rtl ? "راجع موافقتك وأرسل طلبك" : "Review consent and submit", body: rtl ? "أنت قريب من الانتهاء. راجع كيف نستخدم بياناتك ثم أكّد مشاركتك." : "You are almost there. Review how your data is used, then confirm participation.", action: rtl ? "المتابعة للموافقة" : "Continue to consent", pathname: "/consent" }
        : !registration.profileComplete
          ? { number: 4, title: rtl ? "أكمل ملفك الخاص" : "Complete your private profile", body: rtl ? "هذا هو الملف الذي سيكشف ميثاق أجزاءً محددة منه فقط عند وجود تعارف مناسب." : "Mithaq selectively reveals this profile only when there is a suitable introduction.", action: rtl ? "إكمال الملف" : "Complete profile", pathname: "/profile" }
          : { number: 4, title: rtl ? "أنت جاهز للتعارف" : "You’re ready for introductions", body: rtl ? "لا تحتاج إلى التصفح أو السحب. عندما نجد توافقاً مناسباً، سيظهر كتعارف خاص وواضح." : "There is nothing to browse or swipe. When Mithaq finds a suitable fit, it appears as a clear private introduction.", action: rtl ? "عرض التعارفات" : "View introductions", pathname: "/introductions" };

  return (
    <ScreenShell eyebrow={rtl ? "مساحتك الخاصة" : "YOUR PRIVATE SPACE"} title={rtl ? "خطوتك التالية واضحة" : "Your next step, clearly"} body={rtl ? "ميثاق يوجّهك خطوة بخطوة. ركّز فقط على ما تحتاج إليه الآن." : "Mithaq guides you one step at a time. Focus only on what matters now."} rtl={rtl}>
      {loading ? <View style={styles.loadingState}><ActivityIndicator color={colors.primary} size="large" /></View> : loadError ? (
        <StateCard rtl={rtl} tone="error" title={rtl ? "تعذر تحميل حسابك" : "We couldn’t load your account"} body={rtl ? "تحقق من اتصالك وحاول مرة أخرى." : "Check your connection and try again."} actionLabel={rtl ? "إعادة المحاولة" : "Try again"} onAction={() => void load()} />
      ) : (
        <View style={styles.page}>
          <View style={[styles.progressHeader, { direction: rtl ? "rtl" : "ltr" }]}><Text style={[styles.progressLabel, { textAlign, writingDirection }]}>{rtl ? "إعداد العضوية" : "Membership setup"}</Text><Text style={styles.progressValue}>{Math.round((completedSteps / 4) * 100)}%</Text></View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(completedSteps / 4) * 100}%` }]} /></View>
          <View style={[styles.nextCard, { direction: rtl ? "rtl" : "ltr" }]}>
            <View style={[styles.stepLine, { flexDirection: rtl ? "row-reverse" : "row" }]}><View style={styles.stepBadge}><Text style={styles.stepBadgeText}>{nextStep.number}</Text></View><Text style={[styles.stepLabel, { textAlign, writingDirection }]}>{ready ? (rtl ? "الآن" : "NOW") : (rtl ? "الخطوة التالية" : "NEXT STEP")}</Text></View>
            <Text style={[styles.nextTitle, { textAlign, writingDirection }]}>{nextStep.title}</Text>
            <Text style={[styles.nextBody, { textAlign, writingDirection }]}>{nextStep.body}</Text>
            <View style={styles.primaryAction}><PrimaryButton onPress={() => router.push({ pathname: nextStep.pathname, params: { locale } })}>{nextStep.action}</PrimaryButton></View>
          </View>
          <View style={[styles.explainer, { direction: rtl ? "rtl" : "ltr" }]}>
            <Text style={[styles.explainerEyebrow, { textAlign, writingDirection }]}>{rtl ? "كيف يحدث التعارف؟" : "HOW MATCHING WORKS"}</Text>
            <Text style={[styles.explainerTitle, { textAlign, writingDirection }]}>{rtl ? "لا سحب. لا دليل عام. لا رسائل عشوائية." : "No swiping. No public directory. No random DMs."}</Text>
            <Text style={[styles.explainerBody, { textAlign, writingDirection }]}>{rtl ? "نقارن تفضيلات الطرفين وحدودهما، ثم نقدّم تعارفاً خاصاً. لا تُفتح المحادثة إلا بعد قبول الطرفين." : "Mithaq compares both members’ preferences and boundaries, then creates a private introduction. Conversation opens only after mutual acceptance."}</Text>
          </View>
        </View>
      )}
      <MemberTabBar locale={locale} active="home" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  loadingState: { minHeight: 240, alignItems: "center", justifyContent: "center" },
  page: { gap: 24 },
  progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressLabel: { color: colors.muted, fontSize: 12, lineHeight: 20, fontWeight: "700" },
  progressValue: { color: colors.primary, fontSize: 12, fontWeight: "900" },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: colors.border, overflow: "hidden", marginTop: -16 },
  progressFill: { height: "100%", borderRadius: 2, backgroundColor: colors.primary },
  nextCard: { borderRadius: radius.lg, backgroundColor: colors.primary, padding: 22 },
  stepLine: { alignItems: "center", gap: 9 },
  stepBadge: { width: 27, height: 27, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
  stepBadgeText: { color: colors.white, fontSize: 12, fontWeight: "900" },
  stepLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10, lineHeight: 17, fontWeight: "800" },
  nextTitle: { color: colors.white, fontSize: 25, lineHeight: 37, fontWeight: "800", marginTop: 22 },
  nextBody: { color: "rgba(255,255,255,0.76)", fontSize: 14, lineHeight: 24, marginTop: 9 },
  primaryAction: { marginTop: 22 },
  explainer: { paddingTop: 6 },
  explainerEyebrow: { color: colors.gold, fontSize: 11, lineHeight: 19, fontWeight: "800" },
  explainerTitle: { color: colors.foreground, fontSize: 22, lineHeight: 34, fontWeight: "800", marginTop: 8 },
  explainerBody: { color: colors.muted, fontSize: 14, lineHeight: 25, marginTop: 10 },
});
