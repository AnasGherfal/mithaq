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
  "fake_identity" | "harassment" | "inappropriate_content" | "fraud_or_money" | "safety_concern" | "other";

const categories: Array<{ value: ReportCategory; ar: string; en: string }> = [
  { value: "fake_identity", ar: "هوية أو معلومات غير حقيقية", en: "Fake identity or information" },
  { value: "harassment", ar: "مضايقة أو سلوك غير محترم", en: "Harassment or disrespectful behavior" },
  { value: "inappropriate_content", ar: "محتوى غير مناسب", en: "Inappropriate content" },
  { value: "fraud_or_money", ar: "احتيال أو طلبات مالية", en: "Fraud or money requests" },
  { value: "safety_concern", ar: "مخاوف تتعلق بالسلامة", en: "Safety concern" },
  { value: "other", ar: "سبب آخر", en: "Other" },
];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function ReportMemberScreen() {
  const params = useLocalSearchParams<{ locale?: string; targetUserId?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const targetUserId = params.targetUserId ?? "";
  const targetValid = uuidPattern.test(targetUserId);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [details, setDetails] = useState("");
  const [blockTarget, setBlockTarget] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const copy = useMemo(
    () =>
      rtl
        ? {
            eyebrow: "بلاغ خاص",
            title: "أخبرنا بما حدث",
            body: "البلاغ لا يظهر للطرف الآخر. نطلب أقل قدر ممكن من التفاصيل ونحفظ سجل المراجعة بصلاحيات داخلية منفصلة.",
            reason: "اختر السبب",
            details: "تفاصيل إضافية",
            detailsHint: "اكتب ما يساعد فريق المراجعة فقط. لا تضف معلومات حساسة لا نحتاجها.",
            placeholder: "ما الذي حدث؟",
            blockTitle: "حظر هذا العضو أيضاً",
            blockBody: "مفعّل افتراضياً. الحظر يمنع أي تعارف مستقبلي بينكما في الاتجاهين.",
            submit: "إرسال البلاغ",
            back: "إلغاء والعودة",
            invalidTitle: "هذا البلاغ غير متاح",
            invalidBody: "يجب فتح البلاغ من تعارف خاص صالح داخل ميثاق.",
            successTitle: "تم استلام البلاغ",
            successBodyBlocked: "تم حفظ البلاغ وحظر العضو. لن ينشئ ميثاق تعارفاً جديداً بينكما.",
            successBody: "تم حفظ البلاغ للمراجعة.",
            successButton: "العودة إلى مركز السلامة",
            required: "اختر سبب البلاغ أولاً.",
            tooLong: "التفاصيل يجب ألا تتجاوز 1200 حرف.",
            duplicate: "تم إرسال بلاغ مشابه مؤخراً. البلاغ السابق محفوظ لدينا.",
            rateLimit: "وصلت إلى حد البلاغات المؤقت. إذا كان هناك خطر مباشر، استخدم خدمات الطوارئ المحلية.",
            unavailable: "تعذر إرسال البلاغ الآن. تحقق من اتصالك وحاول مرة أخرى.",
            counter: "حرف",
          }
        : {
            eyebrow: "Private report",
            title: "Tell us what happened",
            body: "The other member cannot see your report. We ask for the minimum useful detail and keep moderation history behind separate internal permissions.",
            reason: "Choose a reason",
            details: "Additional details",
            detailsHint: "Include only what helps review the situation. Avoid sensitive information we do not need.",
            placeholder: "What happened?",
            blockTitle: "Block this member too",
            blockBody: "On by default. Blocking prevents any future Mithaq pairing between both of you.",
            submit: "Submit report",
            back: "Cancel and go back",
            invalidTitle: "This report is unavailable",
            invalidBody: "Reports must be opened from a valid private introduction inside Mithaq.",
            successTitle: "Report received",
            successBodyBlocked:
              "Your report is saved and the member is blocked. Mithaq will not create another introduction between you.",
            successBody: "Your report has been saved for review.",
            successButton: "Back to Safety Center",
            required: "Choose a report reason first.",
            tooLong: "Details must be 1,200 characters or fewer.",
            duplicate: "A similar report was submitted recently. Your earlier report is already saved.",
            rateLimit:
              "You have reached the temporary reporting limit. If there is immediate danger, use local emergency services.",
            unavailable: "We could not submit the report right now. Check your connection and try again.",
            counter: "characters",
          },
    [rtl],
  );

  async function submit() {
    if (!targetValid || saving) return;
    if (!category) {
      setError(copy.required);
      return;
    }
    if (details.length > 1200) {
      setError(copy.tooLong);
      return;
    }

    setSaving(true);
    setError(null);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      setSaving(false);
      router.replace({ pathname: "/auth", params: { locale } });
      return;
    }

    try {
      const { error: reportError } = await supabase.rpc("submit_safety_report", {
        p_target_user_id: targetUserId,
        p_category: category,
        p_details: details.trim() || null,
        p_block_target: blockTarget,
      });

      if (reportError) {
        const message = reportError.message.toLowerCase();
        if (message.includes("recently submitted")) {
          setError(copy.duplicate);
        } else if (message.includes("rate limit")) {
          setError(copy.rateLimit);
        } else {
          setError(copy.unavailable);
        }
        setSaving(false);
        return;
      }
    } catch {
      setError(copy.unavailable);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSubmitted(true);
  }

  if (!targetValid) {
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

  if (submitted) {
    return (
      <ScreenShell eyebrow={copy.eyebrow} title={copy.title} body={copy.body} rtl={rtl}>
        <StateCard
          rtl={rtl}
          title={copy.successTitle}
          body={blockTarget ? copy.successBodyBlocked : copy.successBody}
          actionLabel={copy.successButton}
          onAction={() => router.replace({ pathname: "/safety", params: { locale } })}
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
        <PrimaryButton tone="quiet" disabled={saving} onPress={() => router.back()}>
          {copy.back}
        </PrimaryButton>
      }
    >
      <View style={styles.stack}>
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.reason}</Text>
          <View style={styles.categoryList}>
            {categories.map((item) => {
              const selected = item.value === category;
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
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.details}</Text>
          <Text style={[styles.sectionHint, { textAlign: rtl ? "right" : "left" }]}>{copy.detailsHint}</Text>
          <TextInput
            accessibilityLabel={copy.details}
            multiline
            maxLength={1200}
            value={details}
            onChangeText={(value) => {
              setDetails(value);
              setError(null);
            }}
            placeholder={copy.placeholder}
            placeholderTextColor={colors.mutedSoft}
            textAlign={rtl ? "right" : "left"}
            style={[styles.input, { writingDirection: rtl ? "rtl" : "ltr" }]}
          />
          <Text style={[styles.counter, { textAlign: rtl ? "left" : "right" }]}>
            {details.length}/1200 {copy.counter}
          </Text>
        </View>

        <View style={styles.blockCard}>
          <View style={[styles.blockRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <View style={styles.blockCopy}>
              <Text style={[styles.blockTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.blockTitle}</Text>
              <Text style={[styles.blockBody, { textAlign: rtl ? "right" : "left" }]}>{copy.blockBody}</Text>
            </View>
            <Switch value={blockTarget} disabled={saving} onValueChange={setBlockTarget} />
          </View>
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={[styles.error, { textAlign: rtl ? "right" : "left" }]}>
            {error}
          </Text>
        ) : null}

        <PrimaryButton loading={saving} onPress={() => void submit()}>
          {copy.submit}
        </PrimaryButton>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  singleAction: { marginTop: 14 },
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
    minHeight: 132,
    marginTop: 12,
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
  blockCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    backgroundColor: colors.surfaceMuted,
    padding: 17,
  },
  blockRow: { alignItems: "center", gap: 14 },
  blockCopy: { flex: 1 },
  blockTitle: { color: colors.foreground, fontSize: 16, fontWeight: "800" },
  blockBody: { color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 5 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 20, fontWeight: "700" },
});
