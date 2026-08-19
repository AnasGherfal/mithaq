import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MobileLocale } from "@/i18n";
import { colors } from "@/theme";

type MemberTab = "home" | "introductions" | "activity" | "account";
type Props = { locale: MobileLocale; active: MemberTab };

const tabs: Array<{
  key: MemberTab;
  glyph: string;
  ar: string;
  en: string;
  path: "/status" | "/introductions" | "/activity" | "/security";
}> = [
  { key: "home", glyph: "⌂", ar: "الرئيسية", en: "Home", path: "/status" },
  { key: "introductions", glyph: "◇", ar: "التعارف", en: "Introductions", path: "/introductions" },
  { key: "activity", glyph: "◉", ar: "النشاط", en: "Activity", path: "/activity" },
  { key: "account", glyph: "○", ar: "حسابي", en: "Account", path: "/security" },
];

export function MemberTabBar({ locale, active }: Props) {
  const rtl = locale === "ar";
  const orderedTabs = rtl ? [...tabs].reverse() : tabs;

  return (
    <View style={styles.bar} accessibilityRole="tablist">
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
            <View style={[styles.iconWrap, selected ? styles.iconWrapActive : null]}>
              <Text style={[styles.glyph, selected ? styles.glyphActive : null]}>{tab.glyph}</Text>
            </View>
            <Text style={[styles.label, selected ? styles.labelActive : null]}>{rtl ? tab.ar : tab.en}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: colors.surfaceRaised,
  },
  tab: {
    flex: 1,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  iconWrap: {
    minWidth: 34,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: colors.primaryWash },
  glyph: { color: colors.mutedSoft, fontSize: 19, lineHeight: 22 },
  glyphActive: { color: colors.primary },
  label: { color: colors.muted, fontSize: 10, lineHeight: 14, fontWeight: "600", letterSpacing: 0 },
  labelActive: { color: colors.primary, fontWeight: "800" },
  pressed: { opacity: 0.55 },
});
