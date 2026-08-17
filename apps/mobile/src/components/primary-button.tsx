import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from "react-native";
import { colors, radius } from "@/theme";

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
  ...props
}: PrimaryButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
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
        <ActivityIndicator
          color={tone === "primary" ? colors.white : colors.primary}
        />
      ) : (
        <Text
          style={tone === "primary" ? styles.primaryText : styles.quietText}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  quiet: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.94,
  },
  disabled: {
    opacity: 0.5,
  },
  primaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  quietText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },
});
