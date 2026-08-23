import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import type { MobileLocale } from "@/i18n";
import { colors, radius } from "@/theme";

export function RecognizedPersonAction({
  locale,
  confirming,
  loading,
  onBegin,
  onCancel,
  onConfirm,
}: {
  locale: MobileLocale;
  confirming: boolean;
  loading: boolean;
  onBegin: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const rtl = locale === "ar";
  const copy = rtl
    ? {
        title: "هل تعرف هذا الشخص؟",
        body: "إذا كان شخصاً تعرفه وتفضّل ألا تتقاطعا داخل ميثاق، يمكنك إخفاءكما عن بعضكما بشكل خاص.",
        begin: "أعرف هذا الشخص",
        confirmTitle: "عدم إظهاركما لبعضكما؟",
        confirmBody:
          "لن يظهر أي منكما للآخر مرة أخرى في ميثاق، وسيُغلق أي تعارف قائم بينكما. لن نخبر الشخص الآخر أنك اخترت ذلك.",
        confirm: "نعم، لا تُظهرنا لبعضنا",
        cancel: "إلغاء",
      }
    : {
        title: "Do you know this person?",
        body: "If you recognize them and would rather not cross paths on Mithaq, you can privately hide the pair.",
        begin: "I know this person",
        confirmTitle: "Don’t show you to each other?",
        confirmBody:
          "Neither of you will be shown to the other again on Mithaq, and any active introduction between you will close. Mithaq will not tell the other person you chose this.",
        confirm: "Yes, don’t show us to each other",
        cancel: "Cancel",
      };
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";

  return (
    <View style={styles.card}>
      <View style={[styles.header, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <View style={styles.icon}>
          <AppIcon name="privacy" active size={18} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { textAlign, writingDirection }]}>
            {confirming ? copy.confirmTitle : copy.title}
          </Text>
          <Text style={[styles.body, { textAlign, writingDirection }]}>
            {confirming ? copy.confirmBody : copy.body}
          </Text>
        </View>
      </View>

      {confirming ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: loading, disabled: loading }}
            disabled={loading}
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.confirmButton,
              pressed && !loading ? styles.pressed : null,
              loading ? styles.disabled : null,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryStrong} size="small" />
            ) : (
              <Text style={[styles.confirmText, { writingDirection }]}>{copy.confirm}</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={onCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && !loading ? styles.pressed : null,
              loading ? styles.disabled : null,
            ]}
          >
            <Text style={[styles.cancelText, { writingDirection }]}>{copy.cancel}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={onBegin}
          style={({ pressed }) => [
            styles.beginButton,
            pressed && !loading ? styles.pressed : null,
            loading ? styles.disabled : null,
          ]}
        >
          <Text style={[styles.beginText, { writingDirection }]}>{copy.begin}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 14,
  },
  header: { width: "100%", alignItems: "flex-start", gap: 10 },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
  },
  copy: { flex: 1 },
  title: { width: "100%", color: colors.foreground, fontSize: 12, lineHeight: 19, fontWeight: "900" },
  body: { width: "100%", color: colors.muted, fontSize: 10, lineHeight: 17, marginTop: 3 },
  actions: { width: "100%", gap: 8 },
  beginButton: {
    minHeight: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
  },
  beginText: { color: colors.primaryStrong, fontSize: 11, lineHeight: 17, fontWeight: "800" },
  confirmButton: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 12,
  },
  confirmText: { color: colors.primaryStrong, fontSize: 11, lineHeight: 17, fontWeight: "900", textAlign: "center" },
  cancelButton: { minHeight: 40, alignItems: "center", justifyContent: "center" },
  cancelText: { color: colors.muted, fontSize: 10, lineHeight: 16, fontWeight: "800" },
  pressed: { opacity: 0.62 },
  disabled: { opacity: 0.5 },
});
