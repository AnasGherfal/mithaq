import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/app-icon";
import type { MobileLocale } from "@/i18n";
import { colors, shadows } from "@/theme";

type MemberTab = "home" | "introductions" | "activity" | "account";
type Props = { locale: MobileLocale; active: MemberTab };

type TabDefinition = {
  key: MemberTab;
  ar: string;
  en: string;
  path: "/status" | "/introductions" | "/activity" | "/security";
};

const tabs: TabDefinition[] = [
  { key: "home", ar: "الرئيسية", en: "Home", path: "/status" },
  { key: "introductions", ar: "التعارف", en: "Introductions", path: "/introductions" },
  { key: "activity", ar: "النشاط", en: "Activity", path: "/activity" },
  { key: "account", ar: "حسابي", en: "Account", path: "/security" },
];

export function MemberTabBar({ locale, active }: Props) {
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
              onPress={() => router.replace({ pathname: tab.path, params: { locale } })}
              style={({ pressed }) => [
                styles.tab,
                selected ? styles.tabSelected : null,
                pressed && !selected ? styles.pressed : null,
              ]}
            >
              <View style={[styles.iconWrap, selected ? styles.iconWrapSelected : null]}>
                <AppIcon name={tab.key} active={selected} size={21} />
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
    minHeight: 64,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 5,
    backgroundColor: colors.surfaceRaised,
  },
  tab: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 18,
  },
  tabSelected: { opacity: 1 },
  iconWrap: {
    minWidth: 40,
    height: 29,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapSelected: { backgroundColor: colors.primarySoft },
  label: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
    letterSpacing: 0,
    textAlign: "center",
  },
  labelArabic: {
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "600",
    writingDirection: "rtl",
    letterSpacing: 0,
  },
  labelSelected: { color: colors.primary, fontWeight: "800" },
  pressed: { opacity: 0.52, transform: [{ scale: 0.97 }] },
});
