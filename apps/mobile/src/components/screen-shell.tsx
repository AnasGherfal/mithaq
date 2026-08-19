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
  const rowDirection = rtl ? "row-reverse" : "row";
  const horizontalAlignment = rtl ? "flex-end" : "flex-start";
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

  const resolvedBottomBar =
    bottomBar ??
    (activeTab ? <MemberTabBar locale={locale} active={activeTab} /> : null);
  const memberMode = Boolean(resolvedBottomBar);

  const content = (
    <View style={[styles.pageColumn, { direction, alignItems: horizontalAlignment }]}>
      <View
        style={[
          styles.navRow,
          { flexDirection: rowDirection, justifyContent: "flex-start" },
        ]}
      >
        <View style={[styles.brandLockup, { flexDirection: rowDirection }]}>
          <View style={styles.brandMark} accessibilityElementsHidden>
            <View style={[styles.linkRing, styles.linkRingStart]} />
            <View style={[styles.linkRing, styles.linkRingEnd]} />
            <View style={styles.linkJoint} />
          </View>
          <View
            style={[
              styles.wordmarkStack,
              { alignItems: horizontalAlignment },
            ]}
          >
            <Text
              style={[
                styles.brandArabic,
                { textAlign, writingDirection, letterSpacing: 0 },
              ]}
            >
              ميثاق
            </Text>
            <Text style={[styles.brandWordmark, { textAlign }]}>MITHAQ</Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.hero,
          memberMode ? styles.heroMember : null,
          { direction, alignItems: horizontalAlignment },
        ]}
      >
        {eyebrow ? (
          <Text
            style={[
              styles.eyebrow,
              rtl ? styles.eyebrowArabic : null,
              { textAlign, writingDirection },
            ]}
          >
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
            memberMode ? styles.titleMember : null,
            memberMode && rtl ? styles.titleMemberArabic : null,
            { textAlign, writingDirection },
          ]}
        >
          {title}
        </Text>
        {body ? (
          <Text
            style={[
              styles.body,
              rtl ? styles.bodyArabic : null,
              memberMode ? styles.bodyMember : null,
              { textAlign, writingDirection },
            ]}
          >
            {body}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.content,
          memberMode ? styles.contentMember : null,
          { direction, alignItems: "stretch" },
        ]}
      >
        {children}
      </View>
      {footer ? (
        <View style={[styles.footer, { direction, alignSelf: "stretch" }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {scrollEnabled ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              compact ? styles.scrollContentCompact : null,
              memberMode ? styles.scrollContentWithBar : null,
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
              memberMode ? styles.fixedContentWithBar : null,
              { direction },
            ]}
          >
            {content}
          </View>
        )}
      </KeyboardAvoidingView>
      {resolvedBottomBar ? (
        <View style={styles.bottomBar}>{resolvedBottomBar}</View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  pageColumn: {
    width: "100%",
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  scrollContentWithBar: { paddingBottom: 16 },
  fixedContent: {
    flex: 1,
    alignItems: "stretch",
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 8,
  },
  fixedContentWithBar: { paddingBottom: 8 },
  scrollContentCompact: { paddingHorizontal: 18 },
  navRow: {
    width: "100%",
    minHeight: 48,
    alignItems: "center",
  },
  brandLockup: {
    alignItems: "center",
    gap: 11,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.foreground,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  linkRing: {
    position: "absolute",
    width: 16,
    height: 22,
    borderRadius: 9,
    borderWidth: 1.4,
    borderColor: colors.white,
    transform: [{ rotate: "18deg" }],
  },
  linkRingStart: { left: 8 },
  linkRingEnd: { right: 8, transform: [{ rotate: "-18deg" }] },
  linkJoint: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  wordmarkStack: { justifyContent: "center" },
  brandArabic: {
    color: colors.foreground,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
  },
  brandWordmark: {
    color: colors.muted,
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "700",
    letterSpacing: 1.7,
  },
  hero: {
    flexGrow: 0,
    paddingTop: 38,
    width: "100%",
    maxWidth: 560,
  },
  heroMember: { paddingTop: 12 },
  eyebrow: {
    width: "100%",
    color: colors.primary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  eyebrowArabic: {
    fontSize: 14,
    lineHeight: 23,
    letterSpacing: 0,
    textTransform: "none",
  },
  title: {
    width: "100%",
    color: colors.foreground,
    fontSize: 42,
    lineHeight: 50,
    fontWeight: "800",
    letterSpacing: -1.5,
  },
  titleCompact: { fontSize: 36, lineHeight: 43, letterSpacing: -1 },
  titleArabic: {
    fontSize: 39,
    lineHeight: 59,
    letterSpacing: 0,
    fontWeight: "700",
  },
  titleArabicCompact: { fontSize: 34, lineHeight: 53, letterSpacing: 0 },
  titleMember: { fontSize: 28, lineHeight: 35, letterSpacing: -0.35 },
  titleMemberArabic: {
    fontSize: 30,
    lineHeight: 45,
    letterSpacing: 0,
    fontWeight: "700",
  },
  body: {
    width: "100%",
    color: colors.muted,
    fontSize: 16,
    lineHeight: 27,
    marginTop: 14,
    maxWidth: 520,
  },
  bodyArabic: { fontSize: 17, lineHeight: 31, letterSpacing: 0 },
  bodyMember: { fontSize: 14, lineHeight: 23, marginTop: 8 },
  content: { marginTop: 32, width: "100%", alignSelf: "stretch" },
  contentMember: { marginTop: 14, flex: 1, minHeight: 0 },
  footer: { marginTop: "auto", paddingTop: spacing.xl },
  bottomBar: { backgroundColor: colors.surfaceRaised },
});
