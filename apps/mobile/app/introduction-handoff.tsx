import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

type IntroductionRow = {
  introduction_id: string;
  status: "offered" | "mutually_accepted" | "declined" | "expired" | "cancelled" | "closed";
};

type PreviewRow = {
  display_name: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function IntroductionHandoffScreen() {
  const params = useLocalSearchParams<{ locale?: string; introductionId?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const introductionId = params.introductionId ?? "";
  const validIntroduction = uuidPattern.test(introductionId);
  const copy = useMemo(() => handoffCopy(locale), [locale]);
  const [loading, setLoading] = useState(validIntroduction);
  const [loadError, setLoadError] = useState(false);
  const [ready, setReady] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!validIntroduction) return;

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

    const { data: introductionData, error: introductionError } = await supabase.rpc("list_my_introductions");
    if (introductionError) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    const introduction = ((introductionData ?? []) as IntroductionRow[]).find(
      (item) => item.introduction_id === introductionId,
    );
    if (!introduction || introduction.status !== "mutually_accepted") {
      setReady(false);
      setLoading(false);
      return;
    }

    const { data: previewData, error: previewError } = await supabase.rpc("get_introduction_preview", {
      p_introduction_id: introductionId,
    });
    if (previewError) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    const preview = ((Array.isArray(previewData) ? previewData[0] : previewData) ?? null) as PreviewRow | null;
    setDisplayName(preview?.display_name ?? null);
    setReady(true);
    setLoading(false);
  }, [introductionId, locale, validIntroduction]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!validIntroduction) {
    return (
      <ScreenShell eyebrow={copy.eyebrow} title={copy.title} body={copy.body} rtl={rtl}>
        <StateCard rtl={rtl} tone="error" title={copy.unavailableTitle} body={copy.unavailableBody} />
        <View style={styles.action}>
          <PrimaryButton
            tone="quiet"
            onPress={() => router.replace({ pathname: "/introductions", params: { locale } })}
          >
            {copy.back}
          </PrimaryButton>
        </View>
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
        <PrimaryButton tone="quiet" onPress={() => router.replace({ pathname: "/introductions", params: { locale } })}>
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
          title={copy.errorTitle}
          body={copy.errorBody}
          actionLabel={copy.retry}
          onAction={() => void load()}
        />
      ) : !ready ? (
        <StateCard rtl={rtl} tone="neutral" title={copy.unavailableTitle} body={copy.unavailableBody} />
      ) : (
        <View style={styles.stack}>
          <View style={styles.mutualCard}>
            <View style={styles.mutualMark}>
              <Text style={styles.mutualMarkText}>✓</Text>
            </View>
            <Text style={[styles.mutualTitle, { textAlign: rtl ? "right" : "left" }]}>
              {displayName ? copy.mutualWithName(displayName) : copy.mutual}
            </Text>
            <Text style={[styles.mutualBody, { textAlign: rtl ? "right" : "left" }]}>{copy.mutualBody}</Text>
          </View>

          <View style={styles.ruleCard}>
            <Text style={[styles.ruleEyebrow, { textAlign: rtl ? "right" : "left" }]}>{copy.nextEyebrow}</Text>
            <Text style={[styles.ruleTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.nextTitle}</Text>
            <Text style={[styles.ruleBody, { textAlign: rtl ? "right" : "left" }]}>{copy.nextBody}</Text>
          </View>

          <View style={styles.boundaryCard}>
            <Boundary rtl={rtl} mark="1" title={copy.boundaryOneTitle} body={copy.boundaryOneBody} />
            <View style={styles.divider} />
            <Boundary rtl={rtl} mark="2" title={copy.boundaryTwoTitle} body={copy.boundaryTwoBody} />
            <View style={styles.divider} />
            <Boundary rtl={rtl} mark="3" title={copy.boundaryThreeTitle} body={copy.boundaryThreeBody} />
          </View>

          <View style={styles.safetyCard}>
            <Text style={[styles.safetyTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.safetyTitle}</Text>
            <Text style={[styles.safetyBody, { textAlign: rtl ? "right" : "left" }]}>{copy.safetyBody}</Text>
            <PrimaryButton
              tone="quiet"
              onPress={() =>
                router.push({
                  pathname: "/introduction-safety",
                  params: { locale, introductionId },
                })
              }
            >
              {copy.safetyButton}
            </PrimaryButton>
          </View>

          <StateCard rtl={rtl} tone="neutral" title={copy.communicationTitle} body={copy.communicationBody} />
        </View>
      )}
    </ScreenShell>
  );
}

function Boundary({ rtl, mark, title, body }: { rtl: boolean; mark: string; title: string; body: string }) {
  return (
    <View style={[styles.boundaryRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <View style={styles.boundaryMark}>
        <Text style={styles.boundaryMarkText}>{mark}</Text>
      </View>
      <View style={styles.boundaryCopy}>
        <Text style={[styles.boundaryTitle, { textAlign: rtl ? "right" : "left" }]}>{title}</Text>
        <Text style={[styles.boundaryBody, { textAlign: rtl ? "right" : "left" }]}>{body}</Text>
      </View>
    </View>
  );
}

function handoffCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "قبول متبادل",
      title: "الخطوة التالية تبدأ من هنا",
      body: "هذا الانتقال لا يفتح دليلاً عاماً ولا يكشف بيانات اتصال. هو امتداد خاص لنفس التعارف الذي وافقتما عليه.",
      loading: "جارٍ التحقق من التعارف",
      errorTitle: "تعذر التحقق من التعارف",
      errorBody: "لم يتم فتح أي تواصل أو تغيير أي قرار. تحقق من اتصالك وحاول مرة أخرى.",
      retry: "إعادة المحاولة",
      unavailableTitle: "الانتقال غير متاح",
      unavailableBody: "تتوفر هذه الخطوة فقط بعد قبول التعارف من الطرفين وبقاء التعارف مؤهلاً وغير محظور.",
      back: "العودة إلى التعارفات",
      mutual: "تم القبول من الطرفين",
      mutualWithName: (name: string) => `أنت و${name} اخترتما المتابعة`,
      mutualBody: "لا نعرض أي قبول من طرف واحد. ظهور هذه الصفحة يعني أن القرار أصبح متبادلاً فعلاً.",
      nextEyebrow: "حدود التواصل",
      nextTitle: "التواصل سيبقى مرتبطاً بهذا التعارف",
      nextBody:
        "لن ننشئ رسائل عامة أو إمكانية البحث عن أعضاء. أي محادثة لاحقة ستفتح فقط لهذا التعارف وبعد تحقق الخادم من الأهلية والحظر والسلامة.",
      boundaryOneTitle: "لا أرقام هاتف تلقائياً",
      boundaryOneBody: "لا يحتاج الطرفان إلى كشف رقم الهاتف أو بيانات الاتصال لبدء التواصل داخل ميثاق.",
      boundaryTwoTitle: "الحظر يوقف المسار",
      boundaryTwoBody: "إذا حظر أحد الطرفين الآخر، يتوقف التعارف ولا يفتح تواصل جديد بينهما.",
      boundaryThreeTitle: "السلامة متاحة دائماً",
      boundaryThreeBody: "الإبلاغ والحظر يبقيان متاحين من نفس التعارف قبل وأثناء أي تواصل لاحق.",
      safetyTitle: "هل تريد مراجعة خيارات السلامة؟",
      safetyBody: "يمكنك الإبلاغ أو الحظر من دون كشف معرف الطرف الآخر داخل التطبيق.",
      safetyButton: "الأمان والإبلاغ",
      communicationTitle: "بوابة المحادثة جاهزة للمرحلة التالية",
      communicationBody:
        "أنهينا انتقال القبول المتبادل وحدود الأمان. الخطوة التالية هي بناء المحادثة الخاصة على هذا التعارف فقط، بدلاً من نظام رسائل مفتوح.",
    };
  }

  return {
    eyebrow: "Mutual acceptance",
    title: "The next step starts here",
    body: "This handoff does not open a public directory or reveal contact details. It remains a private extension of the introduction you both accepted.",
    loading: "Verifying introduction",
    errorTitle: "We couldn’t verify the introduction",
    errorBody: "No communication was opened and no decision was changed. Check your connection and try again.",
    retry: "Try again",
    unavailableTitle: "Handoff unavailable",
    unavailableBody:
      "This step is available only after both members accept and the introduction remains eligible and unblocked.",
    back: "Back to introductions",
    mutual: "Both members accepted",
    mutualWithName: (name: string) => `You and ${name} chose to continue`,
    mutualBody: "Mithaq never exposes one-sided acceptance. Seeing this page means the decision is genuinely mutual.",
    nextEyebrow: "Communication boundaries",
    nextTitle: "Communication stays tied to this introduction",
    nextBody:
      "There will be no public messaging or member search. Any later conversation opens only for this introduction after server-side eligibility, blocking, and safety checks.",
    boundaryOneTitle: "No automatic phone-number sharing",
    boundaryOneBody:
      "Neither member needs to reveal a phone number or contact details to begin communicating inside Mithaq.",
    boundaryTwoTitle: "Blocking stops the path",
    boundaryTwoBody:
      "If either member blocks the other, the introduction stops and no new communication opens between them.",
    boundaryThreeTitle: "Safety stays available",
    boundaryThreeBody:
      "Reporting and blocking remain available from the same introduction before and during any later communication.",
    safetyTitle: "Want to review your safety options?",
    safetyBody: "Report or block without exposing the other member’s identifier in the app.",
    safetyButton: "Safety & report",
    communicationTitle: "The conversation gate is ready for the next milestone",
    communicationBody:
      "Mutual acceptance and its safety boundaries are now complete. The next step is a private conversation tied only to this introduction, not an open messaging system.",
  };
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  action: { marginTop: 14 },
  loadingState: { minHeight: 220, alignItems: "center", justifyContent: "center" },
  mutualCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    backgroundColor: colors.primary,
    padding: 20,
  },
  mutualMark: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
    marginBottom: 15,
  },
  mutualMarkText: { color: colors.primary, fontSize: 24, fontWeight: "900" },
  mutualTitle: { color: colors.white, fontSize: 19, fontWeight: "800" },
  mutualBody: { color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 21, marginTop: 7 },
  ruleCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primaryWash,
    padding: 17,
  },
  ruleEyebrow: { color: colors.gold, fontSize: 11, fontWeight: "800" },
  ruleTitle: { color: colors.primary, fontSize: 17, fontWeight: "800", marginTop: 5 },
  ruleBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 6 },
  boundaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 16,
  },
  boundaryRow: { gap: 12, alignItems: "flex-start" },
  boundaryMark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  boundaryMarkText: { color: colors.primary, fontSize: 12, fontWeight: "900" },
  boundaryCopy: { flex: 1 },
  boundaryTitle: { color: colors.foreground, fontSize: 14, fontWeight: "800" },
  boundaryBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  safetyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 17,
    gap: 10,
  },
  safetyTitle: { color: colors.foreground, fontSize: 15, fontWeight: "800" },
  safetyBody: { color: colors.muted, fontSize: 13, lineHeight: 20 },
});