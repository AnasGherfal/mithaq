import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MobileLocale } from "@/i18n";
import { colors } from "@/theme";

type MemberTab = "home" | "introductions" | "activity" | "account";

type Props = {
  locale: MobileLocale;
  active: MemberTab;
};

const tabs: Array<{ key: MemberTab; glyph: string; ar: string; en: string; path: "/status" | "/introductions" | "/activity" | "/security" }> = [
  { key: "home", glyph: "⌂", ar: "الرئيسية", en: "Home", path: "/status" },
  { key: "introductions", glyph: "◇", ar: "التعارف", en: "Introductions", path: "/introductions" },
  { key: "activity", glyph: "◉", ar: "النشاط", en: "Activity", path: "/activity" },
  { key: "account", glyph: "○", ar: "حسابي", en: "Account", path: "/security" },
];

export function MemberTabBar({ locale, active }: Props) {
  const rtl = locale === "ar";
  const orderedTabs = rtl ? [...tabs].reverse() : tabs;

  return (
    <View style={styles.wrap}>
      <View style={[styles.bar, { flexDirection: "row" }]} accessibilityRole="tablist">
        {orderedTabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={rtl ? tab.ar : tab.en}
              onPress={() => router.replace({ pathname: tab.path, params: { locale } })}
              style={({ pressed }) => [styles.tab, pressed ? styles.pressed : null]}
            >
              <Text style={[styles.glyph, selected ? styles.glyphActive : null]}>{tab.glyph}</Text>
              <Text style={[styles.label, selected ? styles.labelActive : null]}>{rtl ? tab.ar : tab.en}</Text>
              {selected ? <View style={styles.activeMark} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 28,
    marginHorizontal: -24,
    marginBottom: -24,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  bar: {
    minHeight: 62,
    alignItems: "stretch",
  },
  tab: {
    flex: 1,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    position: "relative",
  },
  glyph: {
    color: colors.mutedSoft,
    fontSize: 20,
    lineHeight: 23,
  },
  glyphActive: {
    color: colors.primary,
  },
  label: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
  },
  labelActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  activeMark: {
    position: "absolute",
    top: 1,
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
  },
  pressed: { opacity: 0.6 },
});
