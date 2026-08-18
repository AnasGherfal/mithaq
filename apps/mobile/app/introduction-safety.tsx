import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

type ReportCategory =
  | "fake_identity"
  | "harassment"
  | "inappropriate_content"
  | "fraud_or_money"
  | "safety_concern"
  | "other";

const categories: Array<{ value: ReportCategory; ar: string; en: string }> = [
  { value: "fake_identity", ar: "هوية أو معلومات غير حقيقية", en: "Fake identity or information" },
  { value: "harassment", ar: "مضايقة أو سلوك غير محترم", en: "Harassment or disrespectful behavior" },
  { value: "inappropriate_content", ar: "محتوى غير مناسب", en: "Inappropriate content" },
  { value: "fraud_or_money", ar: "احتيال أو طلبات مالية", en: "Fraud or money requests" },
  { value: "safety_concern", ar: "مخاوف تتعلق بالسلامة", en: "Safety concern" },
  { value: "other", ar: "سبب آخر", en: "Other" },
];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function IntroductionSafetyScreen() {
  const params = useLocalSearchParams<{ locale?: string; introductionId?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const introductionId = params.introductionId ?? "";
  const validIntroduction = uuidPattern.test(introductionId);
  const copy = useMemo(() => safetyCopy(locale), [locale]);

  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [details, setDetails] = useState("");
  const [blockWithReport, setBlockWithReport] = useState(true);
  const [savingReport, setSavingReport] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<"reported" | "blocked" | null>(null);

  async function ensureSession() {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setError(copy.unavailable);
      return false;
    }
    if (!data.session) {
      router.replace({ pathname: "/auth", params: { locale } });
      return false;
    }
    return true;
  }

  async function submitReport() {
    if (!validIntroduction || savingReport || blocking) return;
    if (!category) {
      setError(copy.reasonRequired);
      return;
    }

    setSavingReport(true);
    setError(null);
    if (!(await ensureSession())) {
      setSavingReport(false);
      return;
    }

    const { error: reportError } = await supabase.rpc("submit_introduction_safety_report", {
      p_introduction_id: introductionId,
      p_category: category,
      p_details: details.trim() || null,
      p_block_target: blockWithReport,
    });

    setSavingReport(false);
    if (reportError) {
      const message = reportError.message.toLowerCase();
      setError(
        message.includes("recently submitted")
          ? copy.duplicate
          : message.includes("rate limit")
            ? copy.rateLimit
            : copy.unavailable,
      );
      return;
    }

    setResult("reported");
  }

  async function blockMember() {
    if (!validIntroduction || blocking || savingReport) return;
    if (!confirmBlock) {
      setConfirmBlock(true);
      setError(null);
      return;
    }

    setBlocking(true);
    setError(null);
    if (!(await ensureSession())) {
      setBlocking(false);
      return;
    }

    const { error: blockError } = await supabase.rpc("block_introduction_member", {
      p_introduction_id: introductionId,
    });

    setBlocking(false);
    if (blockError) {
      setError(copy.unavailable);
      return;
    }

    setResult("blocked");
  }

  if (!validIntroduction) {
    return (
      <ScreenShell eyebrow={copy.eyebrow} title={copy.title} body={copy.body} rtl={rtl}>
        <StateCard rtl={rtl} tone="error" title={copy.invalidTitle} body={copy.invalidBody} />
        <View style={styles.singleAction}>
          <PrimaryButton tone="quiet" onPress={() => router.back()}>
            {copy.back}
          </PrimaryButton>
        </View>
      </ScreenShell>
    );
  }

  if (result) {
    return (
      <ScreenShell eyebrow={copy.eyebrow} title={copy.title} body={copy.body} rtl={rtl}>
        <StateCard
          rtl={rtl}
          tone="success"
          title={result === "reported" ? copy.reportSuccessTitle : copy.blockSuccessTitle}
          body={
            result === "reported"
              ? blockWithReport
                ? copy.reportSuccessBlockedBody
                : copy.reportSuccessBody
              : copy.blockSuccessBody
          }
          actionLabel={copy.backToIntroductions}
          onAction={() => router.replace({ pathname: "/introductions", params: { locale } })}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={
        <PrimaryButton tone="quiet" disabled={savingReport || blocking} onPress={() => router.back()}>
          {copy.back}
        </PrimaryButton>
      }
    >
      <View style={styles.stack}>
        <View style={styles.privacyCard}>
          <Text style={[styles.privacyTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.privacyTitle}</Text>
          <Text style={[styles.privacyBody, { textAlign: rtl ? "right" : "left" }]}>{copy.privacyBody}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.reportTitle}</Text>
          <Text style={[styles.sectionHint, { textAlign: rtl ? "right" : "left" }]}>{copy.reportBody}</Text>

          <View style={styles.categoryList}>
            {categories.map((item) => {
              const selected = category === item.value;
              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => {
                    setCategory(item.value);
                    setError(null);
                  }}
                  style={({ pressed }) => [
                    styles.categoryRow,
                    selected ? styles.categoryRowSelected : null,
                    pressed ? styles.pressed : null,
                    { flexDirection: rtl ? "row-reverse" : "row" },
                  ]}
                >
                  <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                    {selected ? <View style={styles.radioCore} /> : null}
                  </View>
                  <Text
                    style={[
                      styles.categoryText,
                      selected ? styles.categoryTextSelected : null,
                      { textAlign: rtl ? "right" : "left" },
                    ]}
                  >
                    {rtl ? item.ar : item.en}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            accessibilityLabel={copy.detailsLabel}
            multiline
            maxLength={1200}
            value={details}
            onChangeText={(value) => {
              setDetails(value);
              setError(null);
            }}
            placeholder={copy.detailsPlaceholder}
            placeholderTextColor={colors.mutedSoft}
            textAlign={rtl ? "right" : "left"}
            style={[styles.input, { writingDirection: rtl ? "rtl" : "ltr" }]}
          />
          <Text style={[styles.counter, { textAlign: rtl ? "left" : "right" }]}>
            {details.length}/1200
          </Text>

          <View style={[styles.switchRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <View style={styles.switchCopy}>
              <Text style={[styles.switchTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.blockWithReportTitle}</Text>
              <Text style={[styles.switchBody, { textAlign: rtl ? "right" : "left" }]}>{copy.blockWithReportBody}</Text>
            </View>
            <Switch value={blockWithReport} disabled={savingReport} onValueChange={setBlockWithReport} />
          </View>

          <View style={styles.sectionAction}>
            <PrimaryButton loading={savingReport} disabled={blocking} onPress={() => void submitReport()}>
              {copy.submitReport}
            </PrimaryButton>
          </View>
        </View>

        <View style={styles.blockCard}>
          <Text style={[styles.blockTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.blockTitle}</Text>
          <Text style={[styles.blockBody, { textAlign: rtl ? "right" : "left" }]}>
            {confirmBlock ? copy.blockConfirmBody : copy.blockBody}
          </Text>
          <View style={styles.blockActions}>
            <PrimaryButton tone="quiet" loading={blocking} disabled={savingReport} onPress={() => void blockMember()}>
              {confirmBlock ? copy.blockConfirm : copy.blockButton}
            </PrimaryButton>
            {confirmBlock ? (
              <PrimaryButton tone="quiet" disabled={blocking} onPress={() => setConfirmBlock(false)}>
                {copy.cancelBlock}
              </PrimaryButton>
            ) : null}
          </View>
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={[styles.error, { textAlign: rtl ? "right" : "left" }]}>
            {error}
          </Text>
        ) : null}
      </View>
    </ScreenShell>
  );
}

function safetyCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "أمان التعارف",
      title: "أنت المتحكم دائماً",
      body: "يمكنك الإبلاغ أو الحظر من هذا التعارف من دون كشف معرف الطرف الآخر داخل التطبيق.",
      privacyTitle: "إجراء خاص",
      privacyBody: "البلاغ لا يظهر للطرف الآخر، والحظر يوقف أي تعارف نشط بينكما من جهة الخادم.",
      reportTitle: "الإبلاغ عن مشكلة",
      reportBody: "اختر السبب وأضف فقط المعلومات التي يحتاجها فريق المراجعة.",
      detailsLabel: "تفاصيل إضافية",
      detailsPlaceholder: "ما الذي حدث؟",
      blockWithReportTitle: "حظر العضو مع البلاغ",
      blockWithReportBody: "مفعّل افتراضياً حتى لا يتم إنشاء تعارف جديد بينكما.",
      submitReport: "إرسال البلاغ",
      blockTitle: "الحظر فقط",
      blockBody: "استخدم الحظر إذا كنت لا تريد أي تعارف مستقبلي مع هذا العضو حتى من دون إرسال بلاغ.",
      blockConfirmBody: "سيتم إيقاف هذا التعارف ومنع أي تعارف جديد بينكما. هل تريد المتابعة؟",
      blockButton: "حظر هذا العضو",
      blockConfirm: "تأكيد الحظر",
      cancelBlock: "إلغاء",
      reasonRequired: "اختر سبب البلاغ أولاً.",
      duplicate: "تم إرسال بلاغ مشابه مؤخراً. البلاغ السابق محفوظ لدينا.",
      rateLimit: "وصلت إلى حد البلاغات المؤقت. إذا كان هناك خطر مباشر، استخدم خدمات الطوارئ المحلية.",
      unavailable: "تعذر تنفيذ الإجراء الآن. تحقق من اتصالك وحاول مرة أخرى.",
      invalidTitle: "إجراء الأمان غير متاح",
      invalidBody: "يجب فتح هذه الصفحة من تعارف صالح داخل ميثاق.",
      reportSuccessTitle: "تم استلام البلاغ",
      reportSuccessBody: "تم حفظ البلاغ للمراجعة.",
      reportSuccessBlockedBody: "تم حفظ البلاغ وحظر العضو وإيقاف التعارف بينكما.",
      blockSuccessTitle: "تم حظر العضو",
      blockSuccessBody: "تم إيقاف التعارف ولن ينشئ ميثاق تعارفاً جديداً بينكما.",
      backToIntroductions: "العودة إلى التعارفات",
      back: "العودة",
    };
  }

  return {
    eyebrow: "Introduction safety",
    title: "You stay in control",
    body: "Report or block from this introduction without exposing the other member’s identifier in the app.",
    privacyTitle: "Private action",
    privacyBody: "Reports are never shown to the other member, and blocking stops any active introduction server-side.",
    reportTitle: "Report a concern",
    reportBody: "Choose a reason and include only the information needed for review.",
    detailsLabel: "Additional details",
    detailsPlaceholder: "What happened?",
    blockWithReportTitle: "Block with this report",
    blockWithReportBody: "On by default so Mithaq will not create another introduction between you.",
    submitReport: "Submit report",
    blockTitle: "Block only",
    blockBody: "Use blocking when you do not want any future introduction with this member even without submitting a report.",
    blockConfirmBody: "This will stop the introduction and prevent future introductions between you. Continue?",
    blockButton: "Block this member",
    blockConfirm: "Confirm block",
    cancelBlock: "Cancel",
    reasonRequired: "Choose a report reason first.",
    duplicate: "A similar report was submitted recently. Your earlier report is already saved.",
    rateLimit: "You have reached the temporary reporting limit. If there is immediate danger, use local emergency services.",
    unavailable: "We couldn’t complete that action right now. Check your connection and try again.",
    invalidTitle: "Safety action unavailable",
    invalidBody: "Open this page from a valid Mithaq introduction.",
    reportSuccessTitle: "Report received",
    reportSuccessBody: "Your report has been saved for review.",
    reportSuccessBlockedBody: "Your report is saved, the member is blocked, and your introduction has been stopped.",
    blockSuccessTitle: "Member blocked",
    blockSuccessBody: "The introduction is stopped and Mithaq will not create another introduction between you.",
    backToIntroductions: "Back to introductions",
    back: "Back",
  };
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  singleAction: { marginTop: 14 },
  privacyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primaryWash,
    padding: 17,
  },
  privacyTitle: { color: colors.primary, fontSize: 16, fontWeight: "800" },
  privacyBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 5 },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 17,
  },
  sectionTitle: { color: colors.foreground, fontSize: 17, fontWeight: "800" },
  sectionHint: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 5 },
  categoryList: { gap: 8, marginTop: 13 },
  categoryRow: {
    minHeight: 52,
    alignItems: "center",
    gap: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  categoryRowSelected: { borderColor: colors.primary, backgroundColor: colors.primaryWash },
  categoryText: { flex: 1, color: colors.foreground, fontSize: 13, lineHeight: 20, fontWeight: "700" },
  categoryTextSelected: { color: colors.primary, fontWeight: "800" },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
  },
  radioSelected: { borderColor: colors.primary },
  radioCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  pressed: { opacity: 0.82 },
  input: {
    minHeight: 126,
    marginTop: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingVertical: 13,
    textAlignVertical: "top",
  },
  counter: { color: colors.mutedSoft, fontSize: 11, marginTop: 7 },
  switchRow: {
    alignItems: "center",
    gap: 13,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  switchCopy: { flex: 1 },
  switchTitle: { color: colors.foreground, fontSize: 14, fontWeight: "800" },
  switchBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 4 },
  sectionAction: { marginTop: 14 },
  blockCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(163, 60, 63, 0.25)",
    backgroundColor: "#FBF4F2",
    padding: 17,
  },
  blockTitle: { color: colors.danger, fontSize: 16, fontWeight: "800" },
  blockBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 5 },
  blockActions: { gap: 9, marginTop: 14 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 20, fontWeight: "700" },
});
