import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/theme";

type ProfilePortraitProps = {
  uri?: string | null;
  initials: string;
  privacyLabel: string;
  height?: number;
  rtl?: boolean;
};

export function ProfilePortrait({
  uri,
  initials,
  privacyLabel,
  height = 260,
  rtl = false,
}: ProfilePortraitProps) {
  return (
    <View style={[styles.frame, { height }]}>
      {uri ? (
        <Image
          accessibilityLabel={privacyLabel}
          resizeMode="cover"
          source={{ uri }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <View style={styles.fallback}>
          <View style={styles.orbitLarge} />
          <View style={styles.orbitSmall} />
          <View style={styles.monogram}>
            <Text style={styles.monogramText}>{initials || "م"}</Text>
          </View>
          <Text
            style={[
              styles.fallbackTitle,
              { textAlign: "center", writingDirection: rtl ? "rtl" : "ltr" },
            ]}
          >
            {rtl ? "صورة خاصة" : "Private portrait"}
          </Text>
          <Text
            style={[
              styles.fallbackBody,
              { textAlign: "center", writingDirection: rtl ? "rtl" : "ltr" },
            ]}
          >
            {rtl
              ? "تظهر الصور هنا فقط عندما يسمح بها ملف التعارف."
              : "Photos appear here only when the introduction permits them."}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.privacyBadge,
          rtl ? styles.privacyBadgeRtl : styles.privacyBadgeLtr,
          { flexDirection: rtl ? "row-reverse" : "row" },
        ]}
      >
        <Ionicons name="lock-closed" size={12} color={colors.white} />
        <Text style={styles.privacyLabel}>{privacyLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    borderRadius: radius.xl,
    backgroundColor: colors.primaryStrong,
    overflow: "hidden",
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: colors.primaryStrong,
  },
  orbitLarge: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  orbitSmall: {
    position: "absolute",
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  monogram: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  monogramText: {
    color: colors.white,
    fontSize: 34,
    lineHeight: 45,
    fontWeight: "800",
    letterSpacing: 0,
  },
  fallbackTitle: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "800",
    marginTop: 18,
  },
  fallbackBody: {
    maxWidth: 260,
    color: "rgba(255,255,255,0.64)",
    fontSize: 11,
    lineHeight: 19,
    marginTop: 4,
  },
  privacyBadge: {
    position: "absolute",
    top: 14,
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(17,26,23,0.72)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  privacyBadgeLtr: { left: 14 },
  privacyBadgeRtl: { right: 14 },
  privacyLabel: {
    color: colors.white,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 0,
  },
});
