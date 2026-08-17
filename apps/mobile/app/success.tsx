import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import type { MobileLocale } from "@/i18n";
import { colors, radius } from "@/theme";

export default function SuccessScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = locale === "ar"
    ? {
        eyebrow: "تم التسجيل بنجاح",
        title: "مكانك محفوظ على قائمة انتظار ميثاق",
        body: "رقم هاتفك مؤكد واستبيانك مكتمل. هذا لا يعني أن هويتك موثقة ولا يضمن تعارفاً.",
        privateTitle: "تسجيل خاص",
        privateBody: "إجاباتك لا تظهر كملف عام ولا يمكن للأعضاء تصفحها.",
        nextTitle: "ما التالي؟",
        nextBody: "نقيس الطلب الجاد والثقة وتوازن الشبكة قبل إطلاق التعارف الخاص.",
        button: "عرض حالة التسجيل",
      }
    : {
        eyebrow: "Registration complete",
        title: "Your place on the Mithaq waitlist is secured",
        body: "Your phone is confirmed and your questionnaire is complete. This does not mean your identity is verified and it does not guarantee an introduction.",
        privateTitle: "Stored privately",
        privateBody: "Your answers are not a public profile and cannot be browsed by other members.",
        nextTitle: "What happens next?",
        nextBody: "We measure serious demand, trust and network balance before private introductions launch.",
        button: "View registration status",
      };

  return (
    <ScreenShell eyebrow={copy.eyebrow} title={copy.title} body={copy.body} rtl={rtl}>
      <View style={styles.stack}>
        <View style={styles.confirmation}>
          <Text style={styles.check}>✓</Text>
          <View style={styles.copy}>
            <Text style={[styles.heading, { textAlign: rtl ? "right" : "left" }]}>{copy.privateTitle}</Text>
            <Text style={[styles.body, { textAlign: rtl ? "right" : "left" }]}>{copy.privateBody}</Text>
          </View>
        </View>
        <View style={styles.next}>
          <Text style={[styles.heading, { textAlign: rtl ? "right" : "left" }]}>{copy.nextTitle}</Text>
          <Text style={[styles.body, { textAlign: rtl ? "right" : "left" }]}>{copy.nextBody}</Text>
        </View>
        <PrimaryButton onPress={() => router.replace({ pathname: "/status", params: { locale } })}>
          {copy.button}
        </PrimaryButton>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  confirmation: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    padding: 16,
  },
  check: {
    width: 42,
    height: 42,
    borderRadius: 21,
    textAlign: "center",
    textAlignVertical: "center",
    color: colors.white,
    backgroundColor: colors.primary,
    fontSize: 24,
    fontWeight: "800",
  },
  copy: { flex: 1 },
  next: { borderRadius: radius.md, backgroundColor: colors.primarySoft, padding: 16 },
  heading: { color: colors.foreground, fontSize: 15, fontWeight: "800" },
  body: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 5 },
});
