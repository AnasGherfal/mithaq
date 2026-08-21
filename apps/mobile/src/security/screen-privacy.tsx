import { useEffect } from "react";
import * as ScreenCapture from "expo-screen-capture";
import { usePathname } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";
import type { MobileLocale } from "@/i18n";
import { colors, radius } from "@/theme";

const APP_SWITCHER_BLUR_INTENSITY = 0.96;
const PRIVATE_MEMBER_SCREEN_KEY = "mithaq-private-member-content";

/**
 * Keeps Mithaq's content out of iOS background/app-switcher snapshots.
 * Android sensitive screens are blanked in Recents by FLAG_SECURE while
 * useSensitiveScreenProtection is active. The existing React privacy cover
 * remains a second layer for ordinary background transitions.
 */
export function useAppSwitcherPrivacy() {
  useEffect(() => {
    if (Platform.OS !== "ios") return;

    let disposed = false;
    const activation = ScreenCapture.enableAppSwitcherProtectionAsync(
      APP_SWITCHER_BLUR_INTENSITY,
    ).catch(() => undefined);

    return () => {
      disposed = true;
      void activation.finally(() => {
        if (disposed) {
          void ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => undefined);
        }
      });
    };
  }, []);
}

/**
 * Blocks screenshots and screen recording while a screen containing another
 * member's revealed identity, private conversation, or photo is mounted.
 *
 * On Android this uses FLAG_SECURE, which also blanks the screen in Recents.
 * On supported iOS versions Expo prevents capture at the native view layer.
 */
export function useSensitiveScreenProtection(key: string, enabled = true) {
  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;

    let disposed = false;
    const activation = (async () => {
      const available = await ScreenCapture.isAvailableAsync();
      if (!available || disposed) return;
      await ScreenCapture.preventScreenCaptureAsync(key);
    })().catch(() => undefined);

    return () => {
      disposed = true;
      void activation.finally(() => {
        void ScreenCapture.allowScreenCaptureAsync(key).catch(() => undefined);
      });
    };
  }, [enabled, key]);
}

/**
 * Central route guard so future private-profile screens cannot accidentally
 * forget capture protection. Discovery stays screenshot-able because it is
 * anonymous-first and contains no name or photo.
 */
export function PrivateMemberCaptureGuard() {
  const pathname = usePathname();
  const protectedRoute =
    pathname === "/introductions" ||
    pathname === "/introduction-handoff" ||
    pathname === "/conversation";

  useSensitiveScreenProtection(PRIVATE_MEMBER_SCREEN_KEY, protectedRoute);
  return null;
}

export function ScreenPrivacyNotice({ locale }: { locale: MobileLocale }) {
  const rtl = locale === "ar";

  return (
    <View
      accessibilityRole="text"
      style={[styles.notice, { flexDirection: rtl ? "row-reverse" : "row" }]}
    >
      <View style={styles.shield}>
        <Text style={styles.shieldMark}>◌</Text>
      </View>
      <View style={styles.copy}>
        <Text
          style={[
            styles.title,
            { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" },
          ]}
        >
          {rtl ? "هذه الشاشة محمية" : "This screen is protected"}
        </Text>
        <Text
          style={[
            styles.body,
            { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" },
          ]}
        >
          {rtl
            ? "يمنع ميثاق لقطات الشاشة وتسجيلها هنا لحماية صور ومحادثات الطرف الآخر."
            : "Mithaq blocks screenshots and screen recording here to protect the other person's photos and conversation."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    width: "100%",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primaryWash,
    padding: 12,
  },
  shield: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
  },
  shieldMark: { color: colors.primary, fontSize: 18, fontWeight: "900" },
  copy: { flex: 1 },
  title: { color: colors.primaryStrong, fontSize: 12, lineHeight: 18, fontWeight: "900" },
  body: { color: colors.muted, fontSize: 10, lineHeight: 17, marginTop: 2 },
});
