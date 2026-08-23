import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { MobileLocale } from "@/i18n";
import {
  isConnectionSpaceFeatureUnavailable,
  listMyConnectionSpaces,
  setMyCurrentConnectionSpace,
  type ConnectionSpace,
  type ConnectionSpaceState,
} from "@/lib/connection-spaces";
import { colors, radius } from "@/theme";

type Props = {
  locale: MobileLocale;
  fallbackSpace?: ConnectionSpace;
};

export function ConnectionSpaceSwitcher({ locale, fallbackSpace = "marriage" }: Props) {
  const rtl = locale === "ar";
  const [current, setCurrent] = useState<ConnectionSpace>(fallbackSpace);
  const [spaces, setSpaces] = useState<ConnectionSpaceState[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<ConnectionSpace | null>(null);

  const load = useCallback(async () => {
    try {
      const values = await listMyConnectionSpaces();
      setSpaces(values);
      setCurrent(values.find((item) => item.isCurrent)?.space ?? fallbackSpace);
    } catch (error) {
      if (!(__DEV__ && isConnectionSpaceFeatureUnavailable(error))) {
        // Keep navigation usable when the optional lookup is temporarily unavailable.
      }
      setSpaces([]);
      setCurrent(fallbackSpace);
    } finally {
      setLoading(false);
    }
  }, [fallbackSpace]);

  useEffect(() => {
    void load();
  }, [load]);

  async function switchSpace(space: ConnectionSpace) {
    if (switching || current === space) return;

    const membership = spaces.find((item) => item.space === space);
    if (membership && membership.membershipState !== "active") {
      router.push({ pathname: "/spaces", params: { locale } });
      return;
    }

    setSwitching(space);
    try {
      if (membership?.membershipState === "active") {
        await setMyCurrentConnectionSpace(space);
      }
      setCurrent(space);
      router.replace({
        pathname: space === "friendship" ? "/friendship" : "/status",
        params: { locale },
      });
    } catch {
      router.push({ pathname: "/spaces", params: { locale } });
    } finally {
      setSwitching(null);
    }
  }

  const marriageLabel = rtl ? "الزواج" : "Marriage";
  const friendsLabel = rtl ? "الأصدقاء" : "Friends";
  const contextLabel = rtl ? "المساحة الحالية" : "Current space";

  return (
    <View style={[styles.wrapper, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
      <Text style={[styles.context, { writingDirection: rtl ? "rtl" : "ltr" }]}>{contextLabel}</Text>
      <View style={[styles.segmented, { flexDirection: rtl ? "row-reverse" : "row" }]} accessibilityRole="tablist">
        <SpaceOption
          label={marriageLabel}
          selected={current === "marriage"}
          tone="marriage"
          busy={loading || switching === "marriage"}
          disabled={Boolean(switching) || current === "marriage"}
          onPress={() => void switchSpace("marriage")}
        />
        <SpaceOption
          label={friendsLabel}
          selected={current === "friendship"}
          tone="friendship"
          busy={loading || switching === "friendship"}
          disabled={Boolean(switching) || current === "friendship"}
          onPress={() => void switchSpace("friendship")}
        />
      </View>
    </View>
  );
}

function SpaceOption({
  label,
  selected,
  tone,
  busy,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  tone: "marriage" | "friendship";
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected ? (tone === "friendship" ? styles.optionFriendshipSelected : styles.optionMarriageSelected) : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      {busy && !selected ? (
        <ActivityIndicator color={tone === "friendship" ? colors.accent : colors.primary} size="small" />
      ) : (
        <View
          style={[
            styles.dot,
            tone === "friendship" ? styles.dotFriendship : styles.dotMarriage,
            !selected ? styles.dotMuted : null,
          ]}
        />
      )}
      <Text
        style={[
          styles.label,
          selected ? (tone === "friendship" ? styles.labelFriendshipSelected : styles.labelMarriageSelected) : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  context: { color: colors.muted, fontSize: 8, lineHeight: 11, fontWeight: "700" },
  segmented: {
    minHeight: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 3,
    gap: 3,
  },
  option: {
    minWidth: 76,
    minHeight: 34,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  optionMarriageSelected: { backgroundColor: colors.primaryWash },
  optionFriendshipSelected: { backgroundColor: colors.accentWash },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotMarriage: { backgroundColor: colors.primary },
  dotFriendship: { backgroundColor: colors.accent },
  dotMuted: { opacity: 0.35 },
  label: { color: colors.muted, fontSize: 11, lineHeight: 16, fontWeight: "700" },
  labelMarriageSelected: { color: colors.primary, fontWeight: "900" },
  labelFriendshipSelected: { color: colors.accent, fontWeight: "900" },
  pressed: { opacity: 0.62, transform: [{ scale: 0.985 }] },
});
