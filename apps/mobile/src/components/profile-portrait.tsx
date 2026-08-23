import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { getIntroductionPhotoUrl } from "@/lib/introduction-photos";
import { colors, radius } from "@/theme";

type ProfilePortraitProps = {
  uri?: string | null;
  initials: string;
  privacyLabel: string;
  height?: number;
  rtl?: boolean;
};

type IntroductionPhotoReference = {
  introductionId: string;
  photoId: string;
};

const introductionPhotoPattern = /^mithaq-introduction-photo:\/\/([0-9a-f-]{36})\/([0-9a-f-]{36})$/i;

export function ProfilePortrait({ uri, initials, privacyLabel, height = 260, rtl = false }: ProfilePortraitProps) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    let active = true;
    const reference = parseIntroductionPhotoReference(uri);

    if (!uri) {
      setResolvedUri(null);
      setResolving(false);
      return () => {
        active = false;
      };
    }

    if (!reference) {
      setResolvedUri(uri);
      setResolving(false);
      return () => {
        active = false;
      };
    }

    setResolvedUri(null);
    setResolving(true);

    void getIntroductionPhotoUrl(reference.introductionId, reference.photoId)
      .then((result) => {
        if (active) setResolvedUri(result.signedUrl);
      })
      .catch(() => {
        if (active) setResolvedUri(null);
      })
      .finally(() => {
        if (active) setResolving(false);
      });

    return () => {
      active = false;
    };
  }, [uri]);

  return (
    <View style={[styles.frame, { height }]}>
      {resolvedUri ? (
        <Image
          accessibilityLabel={privacyLabel}
          resizeMode="cover"
          source={{ uri: resolvedUri }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <View style={styles.fallback}>
          <View style={styles.orbitLarge} />
          <View style={styles.orbitSmall} />
          <View style={styles.warmHalo} />
          <View style={styles.monogram}>
            {resolving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.monogramText}>{initials || "م"}</Text>
            )}
          </View>
          <Text style={[styles.fallbackTitle, { writingDirection: rtl ? "rtl" : "ltr" }]}>
            {resolving
              ? rtl
                ? "جارٍ فتح الصورة الخاصة"
                : "Opening private portrait"
              : rtl
                ? "صورة خاصة"
                : "Private portrait"}
          </Text>
          <Text style={[styles.fallbackBody, { writingDirection: rtl ? "rtl" : "ltr" }]}>
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
        <View style={styles.lockIcon}>
          <View style={styles.lockShackle} />
          <View style={styles.lockBody} />
        </View>
        <Text style={styles.privacyLabel}>{privacyLabel}</Text>
      </View>
    </View>
  );
}

function parseIntroductionPhotoReference(uri?: string | null): IntroductionPhotoReference | null {
  if (!uri) return null;
  const match = introductionPhotoPattern.exec(uri);
  if (!match?.[1] || !match[2]) return null;

  return {
    introductionId: match[1],
    photoId: match[2],
  };
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    borderRadius: radius.xl,
    backgroundColor: colors.brandNavy,
    overflow: "hidden",
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: colors.brandNavy,
  },
  orbitLarge: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderColor: "rgba(4,144,155,0.34)",
  },
  orbitSmall: {
    position: "absolute",
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1,
    borderColor: "rgba(208,156,81,0.32)",
  },
  warmHalo: {
    position: "absolute",
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: "rgba(169,86,97,0.16)",
  },
  monogram: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    backgroundColor: "rgba(255,255,255,0.11)",
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
    textAlign: "center",
  },
  fallbackBody: {
    maxWidth: 260,
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
    lineHeight: 19,
    marginTop: 4,
    textAlign: "center",
  },
  privacyBadge: {
    position: "absolute",
    top: 14,
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(23,36,59,0.76)",
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
  lockIcon: { width: 12, height: 12, position: "relative" },
  lockShackle: {
    position: "absolute",
    top: 0,
    left: 2.5,
    width: 7,
    height: 6,
    borderWidth: 1.4,
    borderColor: colors.white,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  lockBody: {
    position: "absolute",
    bottom: 0,
    left: 1,
    width: 10,
    height: 7,
    borderRadius: 2,
    backgroundColor: colors.white,
  },
});
