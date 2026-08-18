import type { PropsWithChildren } from "react";
import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { colors, radius, shadows } from "@/theme";

type PrimaryButtonProps = PropsWithChildren<
  PressableProps & {
    loading?: boolean;
    tone?: "primary" | "quiet";
  }
>;

export function PrimaryButton({
  children,
  loading = false,
  tone = "primary",
  disabled,
  style,
  accessibilityLabel,
  accessibilityState,
  onPress,
  ...props
}: PrimaryButtonProps) {
  const inactive = disabled || loading;
  const derivedAccessibilityLabel = accessibilityLabel ?? (typeof children === "string" ? children : undefined);
  const handlePress: PressableProps["onPress"] = (event) => {
    void Haptics.selectionAsync().catch(() => undefined);
    onPress?.(event);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={derivedAccessibilityLabel}
      accessibilityState={{ ...accessibilityState, disabled: Boolean(inactive), busy: loading }}
      disabled={inactive}
      onPress={handlePress}
      style={(state) => [
        styles.base,
        tone === "primary" ? styles.primary : styles.quiet,
        state.pressed && !inactive ? styles.pressed : null,
        inactive ? styles.disabled : null,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={tone === "primary" ? colors.white : colors.primary} />
      ) : (
        <Text style={tone === "primary" ? styles.primaryText : styles.quietText}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 60,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryStrong,
    ...shadows.button,
  },
  quiet: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  pressed: {
    transform: [{ scale: 0.985 }, { translateY: 1 }],
    opacity: 0.95,
  },
  disabled: {
    opacity: 0.45,
  },
  primaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  quietText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "800",
  },
});
