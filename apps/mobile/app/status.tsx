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
        <ActivityIndicator color={colors.primary} size="large" />
      ) : (
        <View style={styles.list}>
          <StatusRow rtl={rtl} label={copy.phoneVerified} value={rtl ? "مكتمل" : "Complete"} complete />
          <StatusRow
            rtl={rtl}
            label={rtl ? "الاستبيان" : "Questionnaire"}
            value={registration.questionnaireComplete ? (rtl ? "مكتمل" : "Complete") : rtl ? "قيد الانتظار" : "Pending"}
            complete={registration.questionnaireComplete}
          />
          <StatusRow
            rtl={rtl}
            label={rtl ? "قائمة الانتظار" : "Waitlist"}
            value={registration.submitted ? (rtl ? "مكتمل" : "Complete") : rtl ? "قيد الانتظار" : "Pending"}
            complete={registration.submitted}
          />
          <StatusRow
            rtl={rtl}
            label={copy.identityNotVerified}
            value={rtl ? "غير متاح بعد" : "Not available yet"}
            complete={false}
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

function StatusRow({ rtl, label, value, complete }: { rtl: boolean; label: string; value: string; complete: boolean }) {
  return (
    <View style={[styles.row, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <View style={[styles.dot, complete ? styles.dotComplete : null]} />
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, { textAlign: rtl ? "right" : "left" }]}>{label}</Text>
        <Text style={[styles.rowValue, { textAlign: rtl ? "right" : "left" }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  action: { gap: 10, marginTop: 8 },
  row: {
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    backgroundColor: colors.background,
  },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.muted },
  dotComplete: { borderColor: colors.primary, backgroundColor: colors.primary },
  rowCopy: { flex: 1 },
  rowLabel: { color: colors.foreground, fontSize: 14, fontWeight: "800" },
  rowValue: { color: colors.muted, fontSize: 12, marginTop: 3 },
});
