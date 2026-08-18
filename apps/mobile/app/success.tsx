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
  const copy =
    locale === "ar"
      ? {
          eyebrow: "تم التسجيل بنجاح",
          title: "مكانك محفوظ على قائمة انتظار ميثاق",
          body: "رقم هاتفك مؤكد واستبيانك مكتمل. هذا لا يعني أن هويتك موثقة ولا يضمن تعارفاً.",
          privateTitle: "تسجيل خاص",
          privateBody: "إجاباتك لا تظهر كملف عام ولا يمكن للأعضاء تصفحها.",
          nextTitle: "ما التالي؟",
          nextBody:
            "تقدر الآن تبدأ ملفك الخاص للتعارف. سيبقى غير قابل للتصفح العام، ولن يظهر لشخص آخر إلا ضمن تعارف مصرح به مستقبلاً.",
          statusTitle: "تم حفظ طلبك",
          statusBody: "ستجد حالة تسجيلك وأي خطوات مستقبلية داخل حسابك.",
          profileButton: "ابدأ ملفك الخاص",
          button: "عرض حالة التسجيل",
        }
      : {
          eyebrow: "Registration complete",
          title: "Your place on the Mithaq waitlist is secured",
          body: "Your phone is confirmed and your questionnaire is complete. This does not mean your identity is verified and it does not guarantee an introduction.",
          privateTitle: "Stored privately",
          privateBody: "Your answers are not a public profile and cannot be browsed by other members.",
          nextTitle: "What happens next?",
          nextBody:
            "You can now begin your private introduction profile. It will not be publicly browsable and will only be shown later through an authorized introduction.",
          statusTitle: "Your application is saved",
          statusBody: "Your account will show registration status and any future steps.",
          profileButton: "Start your private profile",
          button: "View registration status",
        };

  return (
    <ScreenShell eyebrow={copy.eyebrow} title={copy.title} body={copy.body} rtl={rtl}>
      <View style={styles.stack}>
        <View style={styles.heroConfirmation}>
          <View style={styles.checkRing}>
            <Text style={styles.check}>✓</Text>
          </View>
          <Text style={[styles.heroTitle, { textAlign: "center" }]}>{copy.statusTitle}</Text>
          <Text style={[styles.heroBody, { textAlign: "center" }]}>{copy.statusBody}</Text>
        </View>

        <View style={[styles.infoCard, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <View style={styles.infoMark}>
            <Text style={styles.infoMarkText}>✦</Text>
          </View>
          <View style={styles.copy}>
            <Text style={[styles.heading, { textAlign: rtl ? "right" : "left" }]}>{copy.privateTitle}</Text>
            <Text style={[styles.body, { textAlign: rtl ? "right" : "left" }]}>{copy.privateBody}</Text>
          </View>
        </View>

        <View style={styles.next}>
          <Text style={[styles.heading, { textAlign: rtl ? "right" : "left" }]}>{copy.nextTitle}</Text>
          <Text style={[styles.body, { textAlign: rtl ? "right" : "left" }]}>{copy.nextBody}</Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton onPress={() => router.push({ pathname: "/profile", params: { locale } })}>
            {copy.profileButton}
          </PrimaryButton>
          <PrimaryButton tone="quiet" onPress={() => router.replace({ pathname: "/status", params: { locale } })}>
            {copy.button}
          </PrimaryButton>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  actions: { gap: 11 },
  heroConfirmation: {
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  checkRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  check: {
    width: 48,
    height: 48,
    borderRadius: 24,
    textAlign: "center",
    textAlignVertical: "center",
    color: colors.white,
    backgroundColor: colors.primary,
    fontSize: 25,
    fontWeight: "900",
  },
  heroTitle: { color: colors.primary, fontSize: 17, fontWeight: "800" },
  heroBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 7 },
  infoCard: {
    gap: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    padding: 16,
  },
  infoMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.goldSoft,
  },
  infoMarkText: { color: colors.gold, fontSize: 18, fontWeight: "900" },
  copy: { flex: 1 },
  next: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 16,
  },
  heading: { color: colors.foreground, fontSize: 15, fontWeight: "800" },
  body: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 5 },
});
