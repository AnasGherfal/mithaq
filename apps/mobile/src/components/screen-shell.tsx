import type { PropsWithChildren, ReactNode } from "react";
import { router, usePathname } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandLogo } from "@/components/brand-logo";
import { MemberTabBar } from "@/components/member-tab-bar";
import { ScreenPrivacyNotice } from "@/security/screen-privacy";
import { colors, radius, spacing } from "@/theme";

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
  const privateCaptureRoute =
    pathname === "/introductions" ||
    pathname === "/introduction-handoff" ||
    pathname === "/conversation";

  const marriageActiveTab =
    pathname === "/status"
      ? "home"
      : pathname === "/marriage-discover"
        ? "discover"
        : pathname === "/introductions"
          ? "introductions"
          : pathname === "/activity"
            ? "activity"
            : pathname === "/account"
              ? "account"
              : null;

  const resolvedBottomBar =
    bottomBar ??
    (marriageActiveTab ? (
      <MemberTabBar locale={locale} active={marriageActiveTab} />
    ) : null);
  const memberMode = Boolean(resolvedBottomBar);

  const content = (
    <View style={[styles.pageColumn, { alignItems: horizontalAlignment }]}>
      {brandVariant !== "none" ? (
        <View
          style={[
            styles.navRow,
            brandVariant === "full" ? styles.navRowFull : null,
            { alignItems: brandVariant === "full" ? "center" : horizontalAlignment },
          ]}
        >
          <View
            style={{
              alignSelf:
                brandVariant === "full" ? "center" : rtl ? "flex-end" : "flex-start",
            }}
          >
            <BrandLogo
              rtl={rtl}
              variant={brandVariant}
              width={brandVariant === "full" ? Math.min(width - 60, 270) : undefined}
            />
          </View>
        </View>
      ) : null}

      {__DEV__ && pathname !== "/dev-test" ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/dev-test", params: { locale } })}
          style={({ pressed }) => [
            styles.devPill,
            { alignSelf: rtl ? "flex-end" : "flex-start" },
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.devPillText, { writingDirection }]}>
            {rtl ? "مختبر التجربة" : "Test Lab"}
          </Text>
        </Pressable>
      ) : null}

      <View
        style={[
          styles.hero,
          memberMode ? styles.heroMember : null,
          brandVariant === "full" ? styles.heroAfterFullBrand : null,
          {
            alignItems: horizontalAlignment,
            alignSelf: "stretch",
          },
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

      {privateCaptureRoute ? (
        <View style={styles.privacyProtection}>
          <ScreenPrivacyNotice locale={locale} />
        </View>
      ) : null}

      <View
        style={[
          styles.content,
          memberMode ? styles.contentMember : null,
          privateCaptureRoute ? styles.contentAfterPrivacyProtection : null,
          { alignItems: "stretch", alignSelf: "stretch" },
        ]}
      >
        {children}
      </View>
      {footer ? <View style={[styles.footer, { alignSelf: "stretch" }]}>{footer}</View> : null}
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
      {resolvedBottomBar ? <View style={styles.bottomBar}>{resolvedBottomBar}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  pageColumn: { width: "100%", flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  scrollContentWithBar: { paddingBottom: 16 },
  fixedContent: { flex: 1, alignItems: "stretch", paddingHorizontal: 24, paddingTop: 6, paddingBottom: 8 },
  fixedContentWithBar: { paddingBottom: 8 },
  scrollContentCompact: { paddingHorizontal: 18 },
  navRow: { width: "100%", minHeight: 50, justifyContent: "center" },
  navRowFull: { minHeight: 152, paddingTop: 8 },
  devPill: { marginTop: 6, borderRadius: radius.pill, backgroundColor: colors.goldSoft, paddingHorizontal: 10, paddingVertical: 6 },
  devPillText: { color: colors.gold, fontSize: 9, lineHeight: 13, fontWeight: "900" },
  hero: { flexGrow: 0, paddingTop: 38, width: "100%", maxWidth: 560 },
  heroMember: { paddingTop: 12 },
  heroAfterFullBrand: { paddingTop: 22 },
  eyebrow: { width: "100%", color: colors.primary, fontSize: 12, lineHeight: 18, fontWeight: "800", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 12 },
  eyebrowArabic: { fontSize: 14, lineHeight: 24, letterSpacing: 0, textTransform: "none" },
  title: { width: "100%", color: colors.foreground, fontSize: 42, lineHeight: 50, fontWeight: "800", letterSpacing: -1.5 },
  titleCompact: { fontSize: 36, lineHeight: 43, letterSpacing: -1 },
  titleArabic: { fontSize: 39, lineHeight: 60, letterSpacing: 0, fontWeight: "700" },
  titleArabicCompact: { fontSize: 34, lineHeight: 54, letterSpacing: 0 },
  titleMember: { fontSize: 28, lineHeight: 35, letterSpacing: -0.35 },
  titleMemberArabic: { fontSize: 30, lineHeight: 46, letterSpacing: 0, fontWeight: "700" },
  body: { width: "100%", color: colors.muted, fontSize: 16, lineHeight: 27, marginTop: 14, maxWidth: 520 },
  bodyArabic: { fontSize: 17, lineHeight: 32, letterSpacing: 0 },
  bodyMember: { fontSize: 14, lineHeight: 23, marginTop: 8 },
  privacyProtection: { width: "100%", marginTop: 12 },
  content: { marginTop: 32, width: "100%", alignSelf: "stretch" },
  contentMember: { marginTop: 14, flex: 1, minHeight: 0 },
  contentAfterPrivacyProtection: { marginTop: 12 },
  footer: { marginTop: "auto", paddingTop: spacing.xl },
  bottomBar: { backgroundColor: colors.surfaceRaised },
  pressed: { opacity: 0.6 },
});
