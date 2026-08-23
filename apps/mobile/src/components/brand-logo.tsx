import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme";

const markUri =
  "data:image/png;base64,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";

type BrandLogoProps = {
  variant?: "mark" | "compact" | "full";
  rtl?: boolean;
  width?: number;
};

export function BrandLogo({ variant = "compact", rtl = false, width }: BrandLogoProps) {
  if (variant === "mark") {
    const markWidth = width ?? 48;
    return (
      <Image
        accessibilityLabel={rtl ? "شعار ميثاق" : "Mithaq logo"}
        resizeMode="contain"
        source={{ uri: markUri }}
        style={{ width: markWidth, height: markWidth * 0.75 }}
      />
    );
  }

  if (variant === "full") {
    const fullWidth = width ?? 248;
    const markWidth = Math.min(146, fullWidth * 0.56);

    return (
      <View style={[styles.full, { width: fullWidth }]}>
        <BrandLogo variant="mark" rtl={rtl} width={markWidth} />
        <View style={styles.fullWordmark}>
          <Text style={styles.fullName}>Mithaq</Text>
          <Text style={styles.fullSuffix}>Prof Matches</Text>
        </View>
        <View style={styles.fullRule}>
          <View style={[styles.ruleLine, styles.ruleNavy]} />
          <View style={styles.ruleDot} />
          <View style={[styles.ruleLine, styles.ruleTeal]} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.compact, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <BrandLogo variant="mark" rtl={rtl} width={42} />
      <View style={[styles.compactWords, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
        <Text style={[styles.compactArabic, { writingDirection: "rtl" }]}>ميثاق</Text>
        <Text style={styles.compactEnglish}>MITHAQ</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { alignItems: "center", gap: 9 },
  compactWords: { justifyContent: "center" },
  compactArabic: {
    color: colors.foreground,
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "700",
    letterSpacing: 0,
  },
  compactEnglish: {
    color: colors.muted,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "800",
    letterSpacing: 1.55,
  },
  full: { alignItems: "center" },
  fullWordmark: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginTop: 2,
  },
  fullName: {
    color: "#003B73",
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "900",
    letterSpacing: -1.2,
  },
  fullSuffix: {
    color: "#122238",
    fontSize: 24,
    lineHeight: 34,
    fontWeight: "400",
    marginLeft: 8,
  },
  fullRule: {
    width: "72%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 5,
  },
  ruleLine: { flex: 1, height: 2, borderRadius: 1 },
  ruleNavy: { backgroundColor: "#003B73" },
  ruleTeal: { backgroundColor: "#079DA2" },
  ruleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#D39A38" },
});
