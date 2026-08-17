import type { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, shadows, spacing } from "@/theme";

type ScreenShellProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  body?: string;
  footer?: ReactNode;
  rtl?: boolean;
}>;

export function ScreenShell({ eyebrow, title, body, footer, rtl = false, children }: ScreenShellProps) {
  const direction = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.orbTop} pointerEvents="none" />
      <View style={styles.orbBottom} pointerEvents="none" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <View style={styles.brandMark} accessibilityElementsHidden>
              <View style={styles.brandArch} />
              <View style={styles.brandDot} />
            </View>
            <View style={styles.brandRule} />
          </View>

          <View style={[styles.hero, { direction }]}>
            {eyebrow ? (
              <View style={[styles.eyebrowPill, rtl ? styles.alignEnd : styles.alignStart]}>
                <Text style={[styles.eyebrow, { textAlign }]}>{eyebrow}</Text>
              </View>
            ) : null}
            <Text style={[styles.title, { textAlign }]}>{title}</Text>
            {body ? <Text style={[styles.body, { textAlign }]}>{body}</Text> : null}
          </View>

          <View style={styles.panel}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  orbTop: {
    position: "absolute",
    top: -130,
    right: -90,
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundColor: colors.primarySoft,
    opacity: 0.65,
  },
  orbBottom: {
    position: "absolute",
    bottom: -170,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: colors.goldSoft,
    opacity: 0.48,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  brandMark: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  brandArch: {
    width: 21,
    height: 24,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.primary,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },
  brandDot: {
    position: "absolute",
    bottom: 13,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  brandRule: {
    width: 54,
    height: 1,
    backgroundColor: colors.borderStrong,
  },
  hero: {
    maxWidth: 560,
  },
  eyebrowPill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
  },
  alignStart: { alignSelf: "flex-start" },
  alignEnd: { alignSelf: "flex-end" },
  eyebrow: {
    color: colors.gold,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  title: {
    color: colors.foreground,
    fontSize: 36,
    lineHeight: 44,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 27,
    marginTop: 14,
    maxWidth: 520,
  },
  panel: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  footer: {
    marginTop: spacing.md,
  },
});
