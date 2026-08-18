import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

type SafetyReport = {
  id: string;
  category:
    | "fake_identity"
    | "harassment"
    | "inappropriate_content"
    | "fraud_or_money"
    | "safety_concern"
    | "other";
  status: "submitted" | "triaged" | "investigating" | "actioned" | "dismissed" | "closed";
  reported_at: string;
};

const categoryCopy: Record<SafetyReport["category"], { ar: string; en: string }> = {
  fake_identity: { ar: "هوية أو معلومات غير حقيقية", en: "Fake identity or information" },
  harassment: { ar: "مضايقة أو سلوك غير محترم", en: "Harassment or disrespectful behavior" },
  inappropriate_content: { ar: "محتوى غير مناسب", en: "Inappropriate content" },
  fraud_or_money: { ar: "احتيال أو طلبات مالية", en: "Fraud or money requests" },
  safety_concern: { ar: "مخاوف تتعلق بالسلامة", en: "Safety concern" },
  other: { ar: "سبب آخر", en: "Other" },
};

const statusCopy: Record<SafetyReport["status"], { ar: string; en: string }> = {
  submitted: { ar: "تم الاستلام", en: "Received" },
  triaged: { ar: "تمت المراجعة الأولية", en: "Triaged" },
  investigating: { ar: "قيد المراجعة", en: "Under review" },
  actioned: { ar: "تم اتخاذ إجراء", en: "Action taken" },
  dismissed: { ar: "أُغلقت دون إجراء", en: "Closed without action" },
  closed: { ar: "مغلق", en: "Closed" },
};

export default function SafetyScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [blockedCount, setBlockedCount] = useState(0);

  const copy = useMemo(
    () =>
      rtl
        ? {
            eyebrow: "السلامة والثقة",
            title: "مركز السلامة",
            body: "ميثاق يبني التعارف على الخصوصية والاختيار. البلاغ والحظر مصممان ليوقفا التواصل والتعارف بين الطرفين دون كشف بياناتك للطرف الآخر.",
            controlsTitle: "حمايتك أثناء أي تعارف",
            controlsBody:
              "عند تفعيل التعارف الخاص ستظهر خيارات البلاغ والحظر مباشرة على التعارف والمحادثة. البلاغ يحظر الطرف الآخر افتراضياً، ويمكن لفريق المراجعة متابعة البلاغ دون أن يرى الطرف الآخر من أرسله.",
            reportsTitle: "بلاغاتك",
            noReportsTitle: "لا توجد بلاغات",
            noReportsBody: "هذا جيد. إذا احتجت لاحقاً، ستجد خيار البلاغ داخل التعارف الخاص نفسه.",
            blockedTitle: "الأعضاء المحظورون",
            blockedBody: "الحظر يمنع النظام من إنشاء تعارف بينك وبين الطرف المحظور في أي اتجاه.",
            immediateTitle: "إذا شعرت بخطر مباشر",
            immediateBody:
              "لا تعتمد على التطبيق وحده. غادر الموقف، تواصل مع شخص تثق به، واتصل بخدمات الطوارئ المحلية عند الحاجة.",
            privateTitle: "سجل خاص",
            privateBody:
              "يمكنك فقط رؤية البلاغات التي أرسلتها أنت. سجلات المراجعة الداخلية ليست متاحة للأعضاء وتُدار بصلاحيات خادم منفصلة.",
            retry: "إعادة المحاولة",
            back: "العودة إلى الأمان والخصوصية",
            loading: "جارٍ تحميل مركز السلامة",
            blockedUnit: "محظور",
          }
        : {
            eyebrow: "Trust & safety",
            title: "Safety Center",
            body: "Mithaq is built around private, controlled introductions. Reporting and blocking are designed to stop contact and future pairing without exposing your action to the other member.",
            controlsTitle: "Protection during every introduction",
            controlsBody:
              "When private introductions launch, report and block controls will appear directly on the introduction and conversation. Reports block the other member by default, while review stays private from the reported member.",
            reportsTitle: "Your reports",
            noReportsTitle: "No reports submitted",
            noReportsBody: "That is a good thing. If you ever need it, reporting will be available from the private introduction itself.",
            blockedTitle: "Blocked members",
            blockedBody: "Blocking prevents Mithaq from creating an introduction between you and the blocked member in either direction.",
            immediateTitle: "If you feel in immediate danger",
            immediateBody:
              "Do not rely on the app alone. Leave the situation, contact someone you trust, and use local emergency services when needed.",
            privateTitle: "Private record",
            privateBody:
              "You can only read reports you submitted yourself. Internal moderation history is not member-readable and uses separate server permissions.",
            retry: "Try again",
            back: "Back to security & privacy",
            loading: "Loading Safety Center",
            blockedUnit: "blocked",
          },
    [rtl],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);

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

    const [reportResult, blockResult] = await Promise.all([
      supabase
        .from("safety_reports")
        .select("id, category, status, reported_at")
        .order("reported_at", { ascending: false })
        .limit(20),
      supabase.from("member_blocks").select("blocked_user_id", { count: "exact", head: true }),
    ]);

    if (reportResult.error || blockResult.error) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    setReports((reportResult.data ?? []) as SafetyReport[]);
    setBlockedCount(blockResult.count ?? 0);
    setLoading(false);
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

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
        <View style={styles.loadingState} accessibilityLabel={copy.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loadError ? (
        <StateCard
          rtl={rtl}
          tone="error"
          title={rtl ? "تعذر تحميل مركز السلامة" : "We couldn’t load the Safety Center"}
          body={
            rtl
              ? "لم نغيّر أي بيانات. تحقق من اتصالك وحاول مرة أخرى."
              : "No data was changed. Check your connection and try again."
          }
          actionLabel={copy.retry}
          onAction={() => void load()}
        />
      ) : (
        <View style={styles.stack}>
          <View style={styles.heroCard}>
            <View style={styles.heroMark}>
              <Text style={styles.heroMarkText}>✓</Text>
            </View>
            <Text style={[styles.heroTitle, { textAlign: rtl ? "right" : "left" }]}>
              {copy.controlsTitle}
            </Text>
            <Text style={[styles.heroBody, { textAlign: rtl ? "right" : "left" }]}>
              {copy.controlsBody}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <View style={styles.metricCopy}>
                <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>
                  {copy.blockedTitle}
                </Text>
                <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left" }]}>
                  {copy.blockedBody}
                </Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricNumber}>{blockedCount}</Text>
                <Text style={styles.metricLabel}>{copy.blockedUnit}</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>
              {copy.reportsTitle}
            </Text>
            {reports.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { textAlign: rtl ? "right" : "left" }]}>
                  {copy.noReportsTitle}
                </Text>
                <Text style={[styles.emptyBody, { textAlign: rtl ? "right" : "left" }]}>
                  {copy.noReportsBody}
                </Text>
              </View>
            ) : (
              <View style={styles.reportList}>
                {reports.map((report) => (
                  <ReportRow key={report.id} report={report} locale={locale} rtl={rtl} />
                ))}
              </View>
            )}
          </View>

          <View style={styles.privateCard}>
            <Text style={[styles.privateTitle, { textAlign: rtl ? "right" : "left" }]}>
              {copy.privateTitle}
            </Text>
            <Text style={[styles.privateBody, { textAlign: rtl ? "right" : "left" }]}>
              {copy.privateBody}
            </Text>
          </View>

          <View style={styles.emergencyCard}>
            <Text style={[styles.emergencyTitle, { textAlign: rtl ? "right" : "left" }]}>
              {copy.immediateTitle}
            </Text>
            <Text style={[styles.emergencyBody, { textAlign: rtl ? "right" : "left" }]}>
              {copy.immediateBody}
            </Text>
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

function ReportRow({
  report,
  locale,
  rtl,
}: {
  report: SafetyReport;
  locale: MobileLocale;
  rtl: boolean;
}) {
  const language = locale === "ar" ? "ar" : "en";
  const date = new Date(report.reported_at).toLocaleDateString(locale === "ar" ? "ar-LY" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <View style={styles.reportRow}>
      <View style={[styles.reportTop, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <Text style={[styles.reportCategory, { textAlign: rtl ? "right" : "left" }]}>
          {categoryCopy[report.category][language]}
        </Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{statusCopy[report.status][language]}</Text>
        </View>
      </View>
      <Text style={[styles.reportDate, { textAlign: rtl ? "right" : "left" }]}>{date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingState: { minHeight: 220, alignItems: "center", justifyContent: "center" },
  stack: { gap: 14 },
  heroCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primary,
    padding: 18,
  },
  heroMark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    marginBottom: 14,
  },
  heroMarkText: { color: colors.white, fontSize: 21, fontWeight: "900" },
  heroTitle: { color: colors.white, fontSize: 18, fontWeight: "800" },
  heroBody: { color: "rgba(255,255,255,0.76)", fontSize: 13, lineHeight: 21, marginTop: 7 },
  metricCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 17,
  },
  metricRow: { alignItems: "center", gap: 14 },
  metricCopy: { flex: 1 },
  metricPill: {
    minWidth: 76,
    alignItems: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metricNumber: { color: colors.primary, fontSize: 22, fontWeight: "900" },
  metricLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", marginTop: 2 },
  sectionCard: {
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 17,
  },
  sectionTitle: { color: colors.foreground, fontSize: 17, fontWeight: "800" },
  sectionBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 5 },
  emptyState: { borderRadius: radius.md, backgroundColor: colors.surfaceMuted, padding: 14 },
  emptyTitle: { color: colors.foreground, fontSize: 14, fontWeight: "800" },
  emptyBody: { color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 5 },
  reportList: { gap: 9 },
  reportRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 13,
  },
  reportTop: { alignItems: "center", justifyContent: "space-between", gap: 10 },
  reportCategory: { flex: 1, color: colors.foreground, fontSize: 13, fontWeight: "800" },
  reportDate: { color: colors.mutedSoft, fontSize: 11, marginTop: 7 },
  statusPill: {
    borderRadius: radius.pill,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusPillText: { color: colors.primary, fontSize: 10, fontWeight: "800" },
  privateCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    backgroundColor: colors.surfaceMuted,
    padding: 17,
  },
  privateTitle: { color: colors.foreground, fontSize: 16, fontWeight: "800" },
  privateBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 6 },
  emergencyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(163,60,63,0.22)",
    backgroundColor: "#FBF4F2",
    padding: 17,
  },
  emergencyTitle: { color: colors.danger, fontSize: 16, fontWeight: "800" },
  emergencyBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 6 },
});
