import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { mobileCopy, type MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

type RegistrationState = {
  questionnaireComplete: boolean;
  submitted: boolean;
};

export default function StatusScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const copy = mobileCopy[locale];
  const rtl = locale === "ar";
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<RegistrationState>({
    questionnaireComplete: false,
    submitted: false,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }

      const { data: application } = await supabase
        .from("waitlist_applications")
        .select("status, questionnaire_completed_at")
        .eq("user_id", data.session.user.id)
        .maybeSingle();

      if (active) {
        setRegistration({
          questionnaireComplete: Boolean(application?.questionnaire_completed_at),
          submitted: application?.status === "submitted",
        });
        setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [locale]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  const questionnaireLabel = registration.questionnaireComplete
    ? rtl
      ? "تعديل إجابات الاستبيان"
      : "Edit questionnaire answers"
    : rtl
      ? "إكمال الاستبيان"
      : "Complete questionnaire";

  const completedSteps = 1 + Number(registration.questionnaireComplete) + Number(registration.submitted);

  return (
    <ScreenShell
      eyebrow={copy.statusEyebrow}
      title={copy.statusTitle}
      body={copy.statusBody}
      rtl={rtl}
      footer={
        <PrimaryButton tone="quiet" onPress={signOut}>
          {copy.signOut}
        </PrimaryButton>
      }
    >
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <View style={styles.list}>
          <View style={[styles.overview, { direction: rtl ? "rtl" : "ltr" }]}>
            <View style={styles.overviewTop}>
              <View>
                <Text style={[styles.overviewEyebrow, { textAlign: rtl ? "right" : "left" }]}>
                  {rtl ? "تقدم عضويتك" : "Your membership progress"}
                </Text>
                <Text style={[styles.overviewTitle, { textAlign: rtl ? "right" : "left" }]}>
                  {completedSteps}/3
                </Text>
              </View>
              <View style={styles.overviewSeal}>
                <Text style={styles.overviewSealText}>{Math.round((completedSteps / 3) * 100)}%</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${(completedSteps / 3) * 100}%` }]} />
            </View>
          </View>

          <StatusRow
            rtl={rtl}
            label={copy.phoneVerified}
            value={rtl ? "مكتمل" : "Complete"}
            complete
          />
          <StatusRow
            rtl={rtl}
            label={rtl ? "الاستبيان" : "Questionnaire"}
            value={
              registration.questionnaireComplete
                ? rtl
                  ? "مكتمل"
                  : "Complete"
                : rtl
                  ? "قيد الانتظار"
                  : "Pending"
            }
            complete={registration.questionnaireComplete}
          />
          <StatusRow
            rtl={rtl}
            label={rtl ? "قائمة الانتظار" : "Waitlist"}
            value={
              registration.submitted
                ? rtl
                  ? "مكتمل"
                  : "Complete"
                : rtl
                  ? "قيد الانتظار"
                  : "Pending"
            }
            complete={registration.submitted}
          />
          <StatusRow
            rtl={rtl}
            label={copy.identityNotVerified}
            value={rtl ? "غير متاح بعد" : "Not available yet"}
            complete={false}
            future
          />

          <View style={styles.action}>
            <PrimaryButton
              onPress={() => router.push({ pathname: "/questionnaire", params: { locale } })}
            >
              {questionnaireLabel}
            </PrimaryButton>
            {!registration.submitted && registration.questionnaireComplete ? (
              <PrimaryButton
                tone="quiet"
                onPress={() => router.push({ pathname: "/consent", params: { locale } })}
              >
                {rtl ? "متابعة إلى الموافقة" : "Continue to consent"}
              </PrimaryButton>
            ) : null}
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

function StatusRow({
  rtl,
  label,
  value,
  complete,
  future = false,
}: {
  rtl: boolean;
  label: string;
  value: string;
  complete: boolean;
  future?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        complete ? styles.rowComplete : null,
        future ? styles.rowFuture : null,
        { flexDirection: rtl ? "row-reverse" : "row" },
      ]}
    >
      <View style={[styles.dot, complete ? styles.dotComplete : null]}>
        {complete ? <View style={styles.dotCore} /> : null}
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, { textAlign: rtl ? "right" : "left" }]}>{label}</Text>
        <Text style={[styles.rowValue, { textAlign: rtl ? "right" : "left" }]}>{value}</Text>
      </View>
      <View style={[styles.badge, complete ? styles.badgeComplete : null]}>
        <Text style={[styles.badgeText, complete ? styles.badgeTextComplete : null]}>
          {complete ? "✓" : "•"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingState: { minHeight: 180, alignItems: "center", justifyContent: "center" },
  list: { gap: 11 },
  action: { gap: 11, marginTop: 10 },
  overview: {
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    padding: 18,
    marginBottom: 3,
  },
  overviewTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  overviewEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
  },
  overviewTitle: {
    color: colors.white,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    marginTop: 3,
  },
  overviewSeal: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  overviewSealText: { color: colors.white, fontSize: 13, fontWeight: "800" },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
    marginTop: 16,
  },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: colors.goldSoft },
  row: {
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 15,
    backgroundColor: colors.surfaceMuted,
  },
  rowComplete: { backgroundColor: colors.primaryWash, borderColor: colors.borderStrong },
  rowFuture: { opacity: 0.68 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
  },
  dotComplete: { borderColor: colors.primary },
  dotCore: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  rowCopy: { flex: 1 },
  rowLabel: { color: colors.foreground, fontSize: 14, fontWeight: "800" },
  rowValue: { color: colors.muted, fontSize: 12, marginTop: 4 },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeComplete: { backgroundColor: colors.primary, borderColor: colors.primary },
  badgeText: { color: colors.muted, fontWeight: "900" },
  badgeTextComplete: { color: colors.white },
});
