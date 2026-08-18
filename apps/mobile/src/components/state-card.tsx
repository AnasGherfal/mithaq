import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { colors, radius } from "@/theme";

type StateCardProps = {
  title: string;
  body: string;
  rtl?: boolean;
  tone?: "neutral" | "error" | "success";
  actionLabel?: string;
  onAction?: () => void;
};

export function StateCard({ title, body, rtl = false, tone = "neutral", actionLabel, onAction }: StateCardProps) {
  const error = tone === "error";
  const success = tone === "success";

  return (
    <View
      style={[styles.card, error ? styles.errorCard : null, success ? styles.successCard : null]}
      accessibilityRole={error ? "alert" : undefined}
    >
      <View style={[styles.marker, error ? styles.errorMarker : null, success ? styles.successMarker : null]}>
        <Text
          style={[styles.markerText, error ? styles.errorMarkerText : null, success ? styles.successMarkerText : null]}
        >
          {error ? "!" : success ? "✓" : "•"}
        </Text>
      </View>
      <Text
        style={[
          styles.title,
          error ? styles.errorTitle : null,
          success ? styles.successTitle : null,
          { textAlign: rtl ? "right" : "left" },
        ]}
      >
        {title}
      </Text>
      <Text
        accessibilityLiveRegion={error || success ? "polite" : "none"}
        style={[styles.body, { textAlign: rtl ? "right" : "left" }]}
      >
        {body}
      </Text>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <PrimaryButton tone="quiet" onPress={onAction}>
            {actionLabel}
          </PrimaryButton>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    padding: 17,
  },
  errorCard: {
    borderColor: "rgba(163, 60, 63, 0.25)",
    backgroundColor: "#FBF4F2",
  },
  successCard: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.primaryWash,
  },
  marker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
    marginBottom: 12,
  },
  errorMarker: { backgroundColor: "#F4DFDD" },
  successMarker: { backgroundColor: colors.surfaceRaised },
  markerText: { color: colors.primary, fontSize: 18, fontWeight: "900" },
  errorMarkerText: { color: colors.danger },
  successMarkerText: { color: colors.primary },
  title: { color: colors.foreground, fontSize: 16, fontWeight: "800" },
  errorTitle: { color: colors.danger },
  successTitle: { color: colors.primary },
  body: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 6 },
  action: { marginTop: 14 },
});
