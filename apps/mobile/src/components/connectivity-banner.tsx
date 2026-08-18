import { useNetworkState } from "expo-network";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/theme";

export function ConnectivityBanner({ rtl = false }: { rtl?: boolean }) {
  const network = useNetworkState();
  const offline = network.isConnected === false || network.isInternetReachable === false;

  if (!offline) return null;

  const title = rtl ? "أنت غير متصل الآن" : "You’re offline";
  const body = rtl
    ? "يمكنك مراجعة الشاشة الحالية، لكن الحفظ والتحقق يحتاجان اتصالاً بالإنترنت."
    : "You can review the current screen, but saving and verification need an internet connection.";

  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { flexDirection: rtl ? "row-reverse" : "row" }]}
    >
      <View style={styles.dot} />
      <View style={styles.copy}>
        <Text style={[styles.title, { textAlign: rtl ? "right" : "left" }]}>{title}</Text>
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.body, { textAlign: rtl ? "right" : "left" }]}
        >
          {body}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "flex-start",
    gap: 11,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.gold,
    marginTop: 5,
  },
  copy: { flex: 1 },
  title: { color: colors.foreground, fontSize: 13, fontWeight: "800" },
  body: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
});
