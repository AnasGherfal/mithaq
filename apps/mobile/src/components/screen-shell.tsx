import type { PropsWithChildren, ReactNode } from "react";
import { usePathname } from "expo-router";
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
import { MemberTabBar } from "@/components/member-tab-bar";
import { colors, spacing } from "@/theme";

type ScreenShellProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  body?: string;
  footer?: ReactNode;
  bottomBar?: ReactNode;
  rtl?: boolean;
  scrollEnabled?: boolean;
}>;

export function ScreenShell({ eyebrow, title, body, footer, bottomBar, rtl = false, scrollEnabled = true, children }: ScreenShellProps) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const compact = width < 370;
  const direction = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const locale = rtl ? "ar" : "en";
  const activeTab = pathname === "/status" ? "home" : pathname === "/introductions" ? "introductions" : pathname === "/activity" ? "activity" : pathname === "/security" ? "account" : null;
  const resolvedBottomBar = bottomBar ?? (activeTab ? <MemberTabBar locale={locale} active={activeTab} /> : null);
  const memberMode = Boolean(resolvedBottomBar);

  const content = (
    <>
      <View style={[styles.navRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <View style={[styles.brandLockup, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <View style={styles.brandGlyph}><View style={styles.logoRing} /><Text style={styles.brandGlyphText}>م</Text></View>
          <View style={[styles.wordmarkStack, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
            <Text style={[styles.brandArabic, { textAlign, writingDirection }]}>ميثاق</Text>
            <Text style={[styles.brandWordmark, { textAlign }]}>{rtl ? "" : "Mithaq"}</Text>
          </View>
        </View>
        <View style={styles.statusDot} />
      </View>

      <View style={[styles.hero, memberMode ? styles.heroMember : null, { direction, alignItems: rtl ? "flex-end" : "flex-start" }]}>
        {eyebrow ? <Text style={[styles.eyebrow, rtl ? styles.eyebrowArabic : null, { textAlign, writingDirection }]}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={[
          styles.title,
          compact ? styles.titleCompact : null,
          rtl ? styles.titleArabic : null,
          compact && rtl ? styles.titleArabicCompact : null,
          memberMode ? styles.titleMember : null,
          memberMode && rtl ? styles.titleMemberArabic : null,
          { textAlign, writingDirection },
        ]}>{title}</Text>
        {body ? <Text style={[styles.body, rtl ? styles.bodyArabic : null, memberMode ? styles.bodyMember : null, { textAlign, writingDirection }]}>{body}</Text> : null}
      </View>

      <View style={[styles.content, memberMode ? styles.contentMember : null, { direction, alignItems: "stretch" }]}>{children}</View>
      {footer ? <View style={[styles.footer, { direction }]}>{footer}</View> : null}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {scrollEnabled ? (
          <ScrollView style={styles.flex} contentContainerStyle={[styles.scrollContent, compact ? styles.scrollContentCompact : null, memberMode ? styles.scrollContentWithBar : null, { direction }]} keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{content}</ScrollView>
        ) : (
          <View style={[styles.fixedContent, compact ? styles.scrollContentCompact : null, memberMode ? styles.fixedContentWithBar : null, { direction }]}>{content}</View>
        )}
      </KeyboardAvoidingView>
      {resolvedBottomBar ? <View style={styles.bottomBar}>{resolvedBottomBar}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  scrollContentWithBar: { paddingBottom: 16 },
  fixedContent: { flex: 1, paddingHorizontal: 24, paddingTop: 6, paddingBottom: 8 },
  fixedContentWithBar: { paddingBottom: 8 },
  scrollContentCompact: { paddingHorizontal: 18 },
  navRow: { minHeight: 46, alignItems: "center", justifyContent: "space-between" },
  brandLockup: { alignItems: "center", gap: 9 },
  brandGlyph: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logoRing: { position: "absolute", width: 21, height: 21, borderRadius: 11, borderWidth: 1, borderColor: "rgba(255,255,255,0.34)" },
  brandGlyphText: { color: colors.background, fontSize: 16, lineHeight: 23, fontWeight: "900", letterSpacing: 0 },
  wordmarkStack: { justifyContent: "center" },
  brandArabic: { color: colors.foreground, fontSize: 14, lineHeight: 21, fontWeight: "800", letterSpacing: 0 },
  brandWordmark: { color: colors.muted, fontSize: 9, lineHeight: 11, fontWeight: "700", letterSpacing: 0.2 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold },
  hero: { flexGrow: 0, paddingTop: 40, width: "100%", maxWidth: 560 },
  heroMember: { paddingTop: 10 },
  eyebrow: { color: colors.primary, fontSize: 12, lineHeight: 18, fontWeight: "800", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 12 },
  eyebrowArabic: { fontSize: 13, lineHeight: 22, letterSpacing: 0, textTransform: "none" },
  title: { color: colors.foreground, fontSize: 42, lineHeight: 50, fontWeight: "800", letterSpacing: -1.5 },
  titleCompact: { fontSize: 36, lineHeight: 43, letterSpacing: -1 },
  titleArabic: { fontSize: 39, lineHeight: 59, letterSpacing: 0, fontWeight: "800" },
  titleArabicCompact: { fontSize: 34, lineHeight: 53, letterSpacing: 0 },
  titleMember: { fontSize: 27, lineHeight: 34, letterSpacing: -0.4 },
  titleMemberArabic: { fontSize: 27, lineHeight: 42, letterSpacing: 0 },
  body: { color: colors.muted, fontSize: 16, lineHeight: 27, marginTop: 14, maxWidth: 520 },
  bodyArabic: { fontSize: 16, lineHeight: 30, letterSpacing: 0 },
  bodyMember: { fontSize: 14, lineHeight: 22, marginTop: 8 },
  content: { marginTop: 32, width: "100%" },
  contentMember: { marginTop: 14, flex: 1, minHeight: 0 },
  footer: { marginTop: "auto", paddingTop: spacing.xl },
  bottomBar: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surfaceRaised },
});
