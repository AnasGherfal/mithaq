import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/app-icon";
import type { MobileLocale } from "@/i18n";
import { colors, shadows } from "@/theme";

type FriendshipTab = "home" | "discover" | "connections" | "account";
type Props = { locale: MobileLocale; active: FriendshipTab };

type TabDefinition = {
  key: FriendshipTab;
  ar: string;
  en: string;
  path: "/friendship" | "/friendship-discover" | "/friendship-connections" | "/account";
  icon: "home" | "introductions" | "activity" | "account";
};

const tabs: TabDefinition[] = [
  { key: "home", ar: "الرئيسية", en: "Home", path: "/friendship", icon: "home" },
  { key: "discover", ar: "اكتشاف", en: "Discover", path: "/friendship-discover", icon: "introductions" },
  { key: "connections", ar: "الأصدقاء", en: "Connections", path: "/friendship-connections", icon: "activity" },
  { key: "account", ar: "حسابي", en: "Account", path: "/account", icon: "account" },
];

export function FriendshipTabBar({ locale, active }: Props) {
  const rtl = locale === "ar";

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <View
        style={[styles.bar, { flexDirection: rtl ? "row-reverse" : "row" }]}
        accessibilityRole="tablist"
      >
        {tabs.map((tab) => {
          const selected = tab.key === active;
          const label = rtl ? tab.ar : tab.en;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected, disabled: selected }}
              accessibilityLabel={label}
              disabled={selected}
              onPress={() =>
                router.replace({
                  pathname: tab.path,
                  params: tab.key === "account" ? { locale, space: "friendship" } : { locale },
                })
              }
              style={({ pressed }) => [
                styles.tab,
                selected ? styles.tabSelected : null,
                pressed && !selected ? styles.pressed : null,
              ]}
            >
              <View style={[styles.iconWrap, selected ? styles.iconWrapSelected : null]}>
                <AppIcon name={tab.icon} active={selected} size={21} />
              </View>
              <Text
                style={[
                  styles.label,
                  rtl ? styles.labelArabic : null,
                  selected ? styles.labelSelected : null,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surfaceRaised,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadows.navigation,
  },
  bar: {
    minHeight: 66,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 5,
    backgroundColor: colors.surfaceRaised,
  },
  tab: {
    flex: 1,
    minHeight: 55,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 19,
  },
  tabSelected: { backgroundColor: colors.accentWash },
  iconWrap: {
    minWidth: 40,
    height: 29,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapSelected: { backgroundColor: colors.accentSoft },
  label: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  labelArabic: {
    fontSize: 11,
    lineHeight: 17,
    writingDirection: "rtl",
  },
  labelSelected: { color: colors.accent, fontWeight: "900" },
  pressed: { opacity: 0.52, transform: [{ scale: 0.97 }] },
});
