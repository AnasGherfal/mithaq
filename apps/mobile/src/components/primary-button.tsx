import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { colors, radius, shadows } from "@/theme";

type ButtonTone = "primary" | "quiet" | "warm";

type PrimaryButtonProps = PropsWithChildren<
  PressableProps & {
    loading?: boolean;
    tone?: ButtonTone;
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
  ...props
}: PrimaryButtonProps) {
  const inactive = disabled || loading;
  const derivedAccessibilityLabel = accessibilityLabel ?? (typeof children === "string" ? children : undefined);
  const filled = tone !== "quiet";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={derivedAccessibilityLabel}
      accessibilityState={{
        ...accessibilityState,
        disabled: Boolean(inactive),
        busy: loading,
      }}
      disabled={inactive}
      style={(state) => [
        styles.base,
        tone === "primary" ? styles.primary : tone === "warm" ? styles.warm : styles.quiet,
        state.pressed && !inactive ? styles.pressed : null,
        inactive ? styles.disabled : null,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={filled ? colors.white : colors.primary} />
      ) : (
        <Text style={tone === "primary" ? styles.primaryText : tone === "warm" ? styles.warmText : styles.quietText}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 58,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
    ...shadows.button,
  },
  warm: {
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.13,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  quiet: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  pressed: {
    transform: [{ scale: 0.985 }, { translateY: 1 }],
    opacity: 0.94,
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
  warmText: {
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
