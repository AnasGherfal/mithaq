import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { colors, radius } from "@/theme";

export default function NotFoundScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.mark}>
        <Text style={styles.markText}>م</Text>
      </View>
      <Text style={styles.eyebrow}>MITHAQ · ميثاق</Text>
      <Text style={styles.titleArabic}>هذه الصفحة غير متاحة</Text>
      <Text style={styles.title}>This page is not available</Text>
      <Text style={styles.body}>
        قد يكون الرابط قديماً أو غير مكتمل. ارجع إلى ميثاق وسنستعيد حسابك أو تسجيلك بشكل آمن.
      </Text>
      <Text style={styles.bodyEnglish}>
        This link may be old or incomplete. Return to Mithaq and we will safely restore your account or registration
        state.
      </Text>
      <View style={styles.action}>
        <PrimaryButton onPress={() => router.replace("/")}>العودة إلى ميثاق · Return to Mithaq</PrimaryButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  mark: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  markText: { color: colors.primary, fontSize: 25, fontWeight: "900" },
  eyebrow: { color: colors.gold, fontSize: 10, lineHeight: 15, letterSpacing: 1.6, fontWeight: "800" },
  titleArabic: {
    color: colors.primary,
    fontSize: 29,
    lineHeight: 40,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 12,
  },
  title: { color: colors.foreground, fontSize: 22, lineHeight: 30, fontWeight: "800", marginTop: 2 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 24, textAlign: "right", marginTop: 16 },
  bodyEnglish: { color: colors.muted, fontSize: 13, lineHeight: 22, marginTop: 8 },
  action: { marginTop: 28 },
});
