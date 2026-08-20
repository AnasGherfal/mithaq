import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { MobileLocale } from "@/i18n";
import {
  isConnectionSpaceFeatureUnavailable,
  listMyConnectionSpaces,
  type ConnectionSpace,
} from "@/lib/connection-spaces";
import { colors, radius } from "@/theme";

type Props = {
  locale: MobileLocale;
  fallbackSpace?: ConnectionSpace;
};

export function ConnectionSpaceSwitcher({ locale, fallbackSpace = "marriage" }: Props) {
  const rtl = locale === "ar";
  const [current, setCurrent] = useState<ConnectionSpace>(fallbackSpace);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const spaces = await listMyConnectionSpaces();
      setCurrent(spaces.find((item) => item.isCurrent)?.space ?? fallbackSpace);
    } catch (error) {
      if (!(__DEV__ && isConnectionSpaceFeatureUnavailable(error))) {
        // The space selector is navigation chrome, so keep the screen usable if
        // the optional space lookup fails. /spaces still performs authoritative checks.
      }
      setCurrent(fallbackSpace);
    } finally {
      setLoading(false);
    }
  }, [fallbackSpace]);

  useEffect(() => {
    void load();
  }, [load]);

  const friendship = current === "friendship";
  const label = friendship
    ? rtl
      ? "الأصدقاء"
      : "Friends"
    : rtl
      ? "الزواج"
      : "Marriage";
  const context = friendship
    ? rtl
      ? "مساحة الأصدقاء"
      : "Friends space"
    : rtl
      ? "مساحة الزواج"
      : "Marriage space";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rtl ? `تبديل المساحة، الحالية ${label}` : `Switch space, currently ${label}`}
      onPress={() => router.push({ pathname: "/spaces", params: { locale } })}
      style={({ pressed }) => [
        styles.button,
        friendship ? styles.buttonFriendship : styles.buttonMarriage,
        { flexDirection: rtl ? "row-reverse" : "row" },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.mark, friendship ? styles.markFriendship : styles.markMarriage]}>
        {friendship ? (
          <>
            <View style={[styles.friendHead, styles.friendHeadOne]} />
            <View style={[styles.friendHead, styles.friendHeadTwo]} />
          </>
        ) : (
          <>
            <View style={[styles.ring, styles.ringOne]} />
            <View style={[styles.ring, styles.ringTwo]} />
          </>
        )}
      </View>
      <View style={[styles.copy, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
        <Text style={[styles.context, { writingDirection: rtl ? "rtl" : "ltr" }]}>{context}</Text>
        <Text style={[styles.label, { writingDirection: rtl ? "rtl" : "ltr" }]}>{label}</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={friendship ? colors.accent : colors.primary} size="small" />
      ) : (
        <Text style={styles.chevron}>⌄</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: "center",
    gap: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  buttonMarriage: {
    backgroundColor: colors.primaryWash,
    borderColor: colors.primarySoft,
  },
  buttonFriendship: {
    backgroundColor: colors.accentWash,
    borderColor: colors.accentSoft,
  },
  mark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  markMarriage: { backgroundColor: colors.surfaceRaised },
  markFriendship: { backgroundColor: colors.surfaceRaised },
  ring: {
    position: "absolute",
    width: 10,
    height: 14,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ringOne: { left: 7, transform: [{ rotate: "-20deg" }] },
  ringTwo: { right: 7, transform: [{ rotate: "20deg" }] },
  friendHead: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  friendHeadOne: { left: 7, top: 8 },
  friendHeadTwo: { right: 7, top: 8 },
  copy: { minWidth: 74 },
  context: { color: colors.muted, fontSize: 8, lineHeight: 11, fontWeight: "700" },
  label: { color: colors.foreground, fontSize: 12, lineHeight: 17, fontWeight: "900" },
  chevron: { color: colors.muted, fontSize: 17, lineHeight: 18, marginTop: -3 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.985 }] },
});
