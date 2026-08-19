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

export function ScreenShell({
  eyebrow,
  title,
  body,
  footer,
  bottomBar,
  rtl = false,
  scrollEnabled = true,
  children,
}: ScreenShellProps) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const compact = width < 370;
  const direction = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const locale = rtl ? "ar" : "en";

  const activeTab =
    pathname === "/status"
      ? "home"
      : pathname === "/introductions"
        ? "introductions"
        : pathname === "/activity"
          ? "activity"
          : pathname === "/security"
            ? "account"
            : null;
  const resolvedBottomBar = bottomBar ?? (activeTab ? <MemberTabBar locale={locale} active={activeTab} /> : null);

  const content = (
    <>
      <View style={[styles.navRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <View style={[styles.brandLockup, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <View style={styles.brandGlyph}>
            <View style={styles.logoRing} />
            <Text style={styles.brandGlyphText}>م</Text>
          </View>
          <View style={styles.wordmarkStack}>
            <Text style={[styles.brandArabic, { textAlign, writingDirection, letterSpacing: 0 }]}>ميثاق</Text>
            <Text style={[styles.brandWordmark, { textAlign }]}>Mithaq</Text>
          </View>
        </View>
        <View style={styles.statusDot} />
      </View>

      <View style={[styles.hero, resolvedBottomBar ? styles.heroMember : null, { direction }]}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, rtl ? styles.eyebrowArabic : null, { textAlign, writingDirection }]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text
          accessibilityRole="header"
          style={[
            styles.title,
            compact ? styles.titleCompact : null,
            rtl ? styles.titleArabic : null,
            compact && rtl ? styles.titleArabicCompact : null,
            { textAlign, writingDirection },
          ]}
        >
          {title}
        </Text>
        {body ? (
          <Text style={[styles.body, rtl ? styles.bodyArabic : null, { textAlign, writingDirection }]}>{body}</Text>
        ) : null}
      </View>

      <View style={[styles.content, resolvedBottomBar ? styles.contentMember : null, { direction }]}>{children}</View>
      {footer ? <View style={[styles.footer, { direction }]}>{footer}</View> : null}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {scrollEnabled ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              compact ? styles.scrollContentCompact : null,
              resolvedBottomBar ? styles.scrollContentWithBar : null,
              { direction },
            ]}
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        ) : (
          <View
            style={[
              styles.fixedContent,
              compact ? styles.scrollContentCompact : null,
              resolvedBottomBar ? styles.fixedContentWithBar : null,
              { direction },
            ]}
          >
            {content}
          </View>
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
  scrollContentWithBar: { paddingBottom: 18 },
  fixedContent: { flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 14 },
  fixedContentWithBar: { paddingBottom: 10 },
  scrollContentCompact: { paddingHorizontal: 18 },
  navRow: { minHeight: 52, alignItems: "center", justifyContent: "space-between" },
  brandLockup: { alignItems: "center", gap: 10 },
  brandGlyph: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logoRing: { position: "absolute", width: 23, height: 23, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.34)" },
  brandGlyphText: { color: colors.background, fontSize: 17, lineHeight: 24, fontWeight: "900", letterSpacing: 0 },
  wordmarkStack: { justifyContent: "center" },
  brandArabic: { color: colors.foreground, fontSize: 14, lineHeight: 19, fontWeight: "800" },
  brandWordmark: { color: colors.muted, fontSize: 9, lineHeight: 12, fontWeight: "700", letterSpacing: 0.3 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold },
  hero: { flexGrow: 0, paddingTop: 44, maxWidth: 560 },
  heroMember: { paddingTop: 18 },
  eyebrow: { color: colors.primary, fontSize: 12, lineHeight: 18, fontWeight: "800", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 14 },
  eyebrowArabic: { fontSize: 13, lineHeight: 22, letterSpacing: 0, textTransform: "none" },
  title: { color: colors.foreground, fontSize: 42, lineHeight: 50, fontWeight: "800", letterSpacing: -1.5 },
  titleCompact: { fontSize: 36, lineHeight: 43, letterSpacing: -1 },
  titleArabic: { fontSize: 39, lineHeight: 59, letterSpacing: 0, fontWeight: "800" },
  titleArabicCompact: { fontSize: 34, lineHeight: 53, letterSpacing: 0 },
  body: { color: colors.muted, fontSize: 16, lineHeight: 27, marginTop: 16, maxWidth: 520 },
  bodyArabic: { fontSize: 16, lineHeight: 30, letterSpacing: 0 },
  content: { marginTop: 36 },
  contentMember: { marginTop: 22, flexShrink: 1 },
  footer: { marginTop: "auto", paddingTop: spacing.xl },
  bottomBar: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surfaceRaised },
});
