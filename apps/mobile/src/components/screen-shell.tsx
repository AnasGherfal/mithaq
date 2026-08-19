import type { PropsWithChildren, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme";

type ScreenShellProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  body?: string;
  footer?: ReactNode;
  rtl?: boolean;
}>;

export function ScreenShell({
  eyebrow,
  title,
  body,
  footer,
  rtl = false,
  children,
}: ScreenShellProps) {
  const { width } = useWindowDimensions();
  const compact = width < 370;
  const direction = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            compact ? styles.scrollContentCompact : null,
          ]}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.navRow}>
            <View style={styles.brandLockup}>
              <View style={styles.brandGlyph}>
                <Text style={styles.brandGlyphText}>م</Text>
              </View>
              <Text style={styles.brandWordmark}>Mithaq</Text>
            </View>
            <View style={styles.statusDot} />
          </View>

          <View style={[styles.hero, { direction }]}>
            {eyebrow ? (
              <Text style={[styles.eyebrow, { textAlign }]}>{eyebrow}</Text>
            ) : null}
            <Text
              accessibilityRole="header"
              style={[
                styles.title,
                compact ? styles.titleCompact : null,
                { textAlign },
              ]}
            >
              {title}
            </Text>
            {body ? <Text style={[styles.body, { textAlign }]}>{body}</Text> : null}
          </View>

          <View style={styles.content}>{children}</View>
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  scrollContentCompact: {
    paddingHorizontal: 18,
  },
  navRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandLockup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandGlyph: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandGlyphText: {
    color: colors.background,
    fontSize: 17,
    fontWeight: "900",
  },
  brandWordmark: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  hero: {
    flexGrow: 0,
    paddingTop: 52,
    maxWidth: 560,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  title: {
    color: colors.foreground,
    fontSize: 42,
    lineHeight: 50,
    fontWeight: "800",
    letterSpacing: -1.5,
  },
  titleCompact: {
    fontSize: 36,
    lineHeight: 43,
    letterSpacing: -1,
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 26,
    marginTop: 16,
    maxWidth: 520,
  },
  content: {
    marginTop: 42,
  },
  footer: {
    marginTop: "auto",
    paddingTop: spacing.xl,
  },
});
