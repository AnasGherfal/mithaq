import { StyleSheet, Text, View } from "react-native";
import type { MobileLocale } from "@/i18n";
import { colors, radius } from "@/theme";

export type VisibleTrustBadges = {
  realPersonVerified: boolean;
  age18PlusVerified: boolean;
  identityVerified: boolean;
};

type Props = VisibleTrustBadges & {
  locale: MobileLocale;
  compact?: boolean;
};

export function TrustBadges({
  locale,
  realPersonVerified,
  age18PlusVerified,
  identityVerified,
  compact = false,
}: Props) {
  const rtl = locale === "ar";
  const badges = [
    realPersonVerified ? { key: "person", label: rtl ? "شخص حقيقي موثّق" : "Real person verified" } : null,
    age18PlusVerified ? { key: "age", label: rtl ? "العمر 18+ موثّق" : "18+ verified" } : null,
    identityVerified ? { key: "identity", label: rtl ? "الهوية موثّقة" : "Identity verified" } : null,
  ].filter((badge): badge is { key: string; label: string } => badge !== null);

  if (badges.length === 0) return null;

  return (
    <View
      accessibilityLabel={badges.map((badge) => badge.label).join(", ")}
      style={[styles.wrap, compact ? styles.wrapCompact : null, { flexDirection: rtl ? "row-reverse" : "row" }]}
    >
      {badges.map((badge) => (
        <View key={badge.key} style={[styles.badge, compact ? styles.badgeCompact : null]}>
          <View style={[styles.check, compact ? styles.checkCompact : null]}>
            <Text style={[styles.checkText, compact ? styles.checkTextCompact : null]}>✓</Text>
          </View>
          <Text style={[styles.label, compact ? styles.labelCompact : null, { writingDirection: rtl ? "rtl" : "ltr" }]}>
            {badge.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", flexWrap: "wrap", gap: 7 },
  wrapCompact: { gap: 5 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  badgeCompact: { gap: 4, paddingHorizontal: 7, paddingVertical: 5 },
  check: {
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  checkCompact: { width: 14, height: 14, borderRadius: 7 },
  checkText: { color: colors.white, fontSize: 10, lineHeight: 13, fontWeight: "900" },
  checkTextCompact: { fontSize: 8, lineHeight: 10 },
  label: { color: colors.primaryStrong, fontSize: 10, lineHeight: 15, fontWeight: "800" },
  labelCompact: { fontSize: 8, lineHeight: 12 },
});
