import type { PropsWithChildren, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "@/theme";

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
  const direction = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandMark} accessibilityElementsHidden>
            <View style={styles.brandArch} />
          </View>

          <View style={{ direction }}>
            {eyebrow ? (
              <Text style={[styles.eyebrow, { textAlign }]}>{eyebrow}</Text>
            ) : null}
            <Text style={[styles.title, { textAlign }]}>{title}</Text>
            {body ? (
              <Text style={[styles.body, { textAlign }]}>{body}</Text>
            ) : null}
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 28,
  },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    shadowColor: colors.foreground,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  brandArch: {
    width: 19,
    height: 22,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.primary,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
  },
  title: {
    color: colors.foreground,
    fontSize: 34,
    lineHeight: 43,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 27,
    marginTop: 14,
  },
  panel: {
    marginTop: 30,
    padding: 20,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: colors.foreground,
    shadowOpacity: 0.07,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 3,
  },
  footer: {
    marginTop: 18,
  },
});
