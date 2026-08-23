import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { GuidedActionBar } from "@/components/guided-action-bar";
import { ScreenShell } from "@/components/screen-shell";
import type { MobileLocale } from "@/i18n";
import { colors, radius, shadows } from "@/theme";

export default function SuccessScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const copy =
    locale === "ar"
      ? {
          eyebrow: "تم الحفظ",
          title: "أنت جاهز للخطوة التالية",
          body: "تم حفظ موافقتك وتفضيلاتك الخاصة. الآن أكمل الملف الذي قد يظهر داخل تعارف مؤهل.",
          completeTitle: "اكتمل إعداد التفضيلات",
          completeBody: "يمكنك تعديلها لاحقاً من حسابك. لا يوجد ملف عام أو تصفح للأعضاء.",
          private: "إجاباتك خاصة",
          controlled: "الظهور داخل تعارف مصرح به فقط",
          next: "الخطوة التالية: ملفك الخاص",
          nextBody: "أضف الاسم والنبذة التي تساعد الطرف الآخر على فهم شخصيتك وقيمك.",
          profileButton: "إكمال الملف الخاص",
          homeButton: "الرئيسية",
        }
      : {
          eyebrow: "Saved",
          title: "You’re ready for the next step",
          body: "Your consent and private preferences are saved. Now complete the profile that may appear inside an eligible introduction.",
          completeTitle: "Preference setup complete",
          completeBody: "You can change it later from Account. There is no public profile or member browsing.",
          private: "Your answers stay private",
          controlled: "Shown only inside an authorized introduction",
          next: "Next: your private profile",
          nextBody: "Add the preferred name and introduction that help someone understand your character and values.",
          profileButton: "Complete private profile",
          homeButton: "Home",
        };

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      scrollEnabled={false}
      bottomBar={
        <GuidedActionBar
          rtl={rtl}
          backLabel={copy.homeButton}
          primaryLabel={copy.profileButton}
          secondaryIcon="home"
          onBack={() => router.replace({ pathname: "/status", params: { locale } })}
          onPrimary={() => router.replace({ pathname: "/profile", params: { locale } })}
        />
      }
    >
      <View style={styles.page}>
        <View style={styles.confirmation}>
          <View style={styles.confirmationIcon}>
            <AppIcon name="shield" active size={28} />
          </View>
          <Text style={[styles.confirmationTitle, { textAlign, writingDirection }]}>{copy.completeTitle}</Text>
          <Text style={[styles.confirmationBody, { textAlign, writingDirection }]}>{copy.completeBody}</Text>

          <View style={styles.assurances}>
            <Assurance rtl={rtl} text={copy.private} />
            <Assurance rtl={rtl} text={copy.controlled} />
          </View>
        </View>

        <View style={[styles.nextSection, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
          <Text style={[styles.nextTitle, { textAlign, writingDirection }]}>{copy.next}</Text>
          <Text style={[styles.nextBody, { textAlign, writingDirection }]}>{copy.nextBody}</Text>
        </View>
      </View>
    </ScreenShell>
  );
}

function Assurance({ rtl, text }: { rtl: boolean; text: string }) {
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";

  return (
    <View style={[styles.assurance, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <View style={styles.assuranceMark}>
        <Text style={styles.assuranceMarkText}>✓</Text>
      </View>
      <Text style={[styles.assuranceText, { textAlign, writingDirection }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, width: "100%" },
  confirmation: {
    width: "100%",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 20,
    paddingVertical: 22,
    ...shadows.card,
  },
  confirmationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
  },
  confirmationTitle: {
    width: "100%",
    color: colors.foreground,
    fontSize: 20,
    lineHeight: 31,
    fontWeight: "800",
    marginTop: 17,
  },
  confirmationBody: {
    width: "100%",
    color: colors.muted,
    fontSize: 13,
    lineHeight: 22,
    marginTop: 6,
  },
  assurances: {
    width: "100%",
    gap: 9,
    marginTop: 17,
    paddingTop: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  assurance: { width: "100%", alignItems: "center", gap: 10 },
  assuranceMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
  },
  assuranceMarkText: { color: colors.primary, fontSize: 11, lineHeight: 14, fontWeight: "900" },
  assuranceText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 20, fontWeight: "700" },
  nextSection: { width: "100%", marginTop: 22 },
  nextTitle: { width: "100%", color: colors.foreground, fontSize: 17, lineHeight: 28, fontWeight: "800" },
  nextBody: { width: "100%", color: colors.muted, fontSize: 13, lineHeight: 22, marginTop: 5 },
});
