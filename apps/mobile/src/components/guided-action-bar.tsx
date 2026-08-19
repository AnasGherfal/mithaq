import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { colors, shadows } from "@/theme";

type GuidedActionBarProps = {
  rtl: boolean;
  backLabel: string;
  primaryLabel: string;
  onBack: () => void;
  onPrimary: () => void;
  loading?: boolean;
  primaryDisabled?: boolean;
};

export function GuidedActionBar({
  rtl,
  backLabel,
  primaryLabel,
  onBack,
  onPrimary,
  loading = false,
  primaryDisabled = false,
}: GuidedActionBarProps) {
  const writingDirection = rtl ? "rtl" : "ltr";

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={[styles.bar, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          disabled={loading}
          onPress={onBack}
          style={({ pressed }) => [
            styles.back,
            { flexDirection: rtl ? "row-reverse" : "row" },
            pressed && !loading ? styles.pressed : null,
            loading ? styles.disabled : null,
          ]}
        >
          <AppIcon name="back" rtl={rtl} size={18} />
          <Text style={[styles.backLabel, { writingDirection }]}>{backLabel}</Text>
        </Pressable>

        <PrimaryButton
          disabled={primaryDisabled}
          loading={loading}
          onPress={onPrimary}
          style={styles.primary}
        >
          {primaryLabel}
        </PrimaryButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surfaceRaised,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadows.navigation,
  },
  bar: {
    minHeight: 82,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
  },
  back: {
    minWidth: 92,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 10,
  },
  backLabel: {
    color: colors.foreground,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "800",
  },
  primary: { flex: 1, minHeight: 54 },
  pressed: { opacity: 0.55, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
});
