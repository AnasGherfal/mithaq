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
import { BrandLogo } from "@/components/brand-logo";
import { ConnectionSpaceSwitcher } from "@/components/connection-space-switcher";
import { MemberTabBar } from "@/components/member-tab-bar";
import { colors, spacing } from "@/theme";

type BrandVariant = "compact" | "full" | "none";

type ScreenShellProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  body?: string;
  footer?: ReactNode;
  bottomBar?: ReactNode;
  rtl?: boolean;
  scrollEnabled?: boolean;
  brandVariant?: BrandVariant;
}>;

export function ScreenShell({
  eyebrow,
  title,
  body,
  footer,
  bottomBar,
  rtl = false,
  scrollEnabled = true,
  brandVariant = "compact",
  children,
}: ScreenShellProps) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const compact = width < 370;
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const horizontalAlignment = rtl ? "flex-end" : "flex-start";
  const locale = rtl ? "ar" : "en";

  const activeTab =
    pathname === "/status"
      ? "home"
      : pathname === "/introductions"
        ? "introductions"
        : pathname === "/activity"
          ? "activity"
          : pathname === "/account"
            ? "account"
            : null;

  const resolvedBottomBar =
    bottomBar ??
    (activeTab ? <MemberTabBar locale={locale} active={activeTab} /> : null);
  const memberMode = Boolean(resolvedBottomBar);
  const showSpaceSwitcher =
    brandVariant === "compact" && (memberMode || pathname === "/friendship");
  const fallbackSpace = pathname === "/friendship" ? "friendship" : "marriage";

  const content = (
    <View style={[styles.pageColumn, { alignItems: horizontalAlignment }]}>
      {brandVariant !== "none" ? (
        <View
          style={[
            styles.navRow,
            brandVariant === "full" ? styles.navRowFull : null,
            showSpaceSwitcher ? styles.navRowWithSpace : null,
            showSpaceSwitcher
              ? { flexDirection: rtl ? "row-reverse" : "row" }
              : {
                  alignItems:
                    brandVariant === "full" ? "center" : horizontalAlignment,
                },
          ]}
        >
          <View
            style={{
              alignSelf:
                brandVariant === "full"
                  ? "center"
                  : showSpaceSwitcher
                    ? "auto"
                    : rtl
                      ? "flex-end"
                      : "flex-start",
            }}
          >
            <BrandLogo
              rtl={rtl}
              variant={brandVariant}
              width={brandVariant === "full" ? Math.min(width - 60, 270) : undefined}
            />
          </View>
          {showSpaceSwitcher ? (
            <ConnectionSpaceSwitcher locale={locale} fallbackSpace={fallbackSpace} />
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.hero,
          memberMode ? styles.heroMember : null,
          brandVariant === "full" ? styles.heroAfterFullBrand : null,
          { alignItems: horizontalAlignment, alignSelf: "stretch" },
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
          { alignItems: "stretch", alignSelf: "stretch" },
        ]}
      >
        {children}
      </View>
      {footer ? (
        <View style={[styles.footer, { alignSelf: "stretch" }]}>{footer}</View>
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
  pageColumn: { width: "100%", flex: 1 },
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
  navRow: { width: "100%", minHeight: 50, justifyContent: "center" },
  navRowWithSpace: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  navRowFull: { minHeight: 152, paddingTop: 8 },
  hero: { flexGrow: 0, paddingTop: 38, width: "100%", maxWidth: 560 },
  heroMember: { paddingTop: 12 },
  heroAfterFullBrand: { paddingTop: 22 },
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
    lineHeight: 24,
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
    lineHeight: 60,
    letterSpacing: 0,
    fontWeight: "700",
  },
  titleArabicCompact: { fontSize: 34, lineHeight: 54, letterSpacing: 0 },
  titleMember: { fontSize: 28, lineHeight: 35, letterSpacing: -0.35 },
  titleMemberArabic: {
    fontSize: 30,
    lineHeight: 46,
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
  bodyArabic: { fontSize: 17, lineHeight: 32, letterSpacing: 0 },
  bodyMember: { fontSize: 14, lineHeight: 23, marginTop: 8 },
  content: { marginTop: 32, width: "100%", alignSelf: "stretch" },
  contentMember: { marginTop: 14, flex: 1, minHeight: 0 },
  footer: { marginTop: "auto", paddingTop: spacing.xl },
  bottomBar: { backgroundColor: colors.surfaceRaised },
});
