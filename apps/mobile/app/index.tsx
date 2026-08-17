import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { mobileCopy, type MobileLocale } from "@/i18n";
import { colors, radius } from "@/theme";

export default function WelcomeScreen() {
  const [locale, setLocale] = useState<MobileLocale>("ar");
  const copy = mobileCopy[locale];
  const rtl = locale === "ar";

  return (
    <ScreenShell
      eyebrow={copy.welcomeEyebrow}
      title={copy.welcomeTitle}
      body={copy.welcomeBody}
      rtl={rtl}
      footer={
        <PrimaryButton
          tone="quiet"
          onPress={() => setLocale(rtl ? "en" : "ar")}
        >
          {copy.switchLanguage}
        </PrimaryButton>
      }
    >
      <View style={[styles.trustRow, { direction: rtl ? "rtl" : "ltr" }]}>
        <View style={styles.trustDot} />
        <View style={styles.trustCopy}>
          <Text style={[styles.trustTitle, { textAlign: rtl ? "right" : "left" }]}>
            {copy.privateByDesign}
          </Text>
          <Text style={[styles.brand, { textAlign: rtl ? "right" : "left" }]}>
            {copy.brand} · {copy.brandLatin}
          </Text>
        </View>
      </View>

      <PrimaryButton
        onPress={() =>
          router.push({ pathname: "/auth", params: { locale } })
        }
      >
        {copy.continue}
      </PrimaryButton>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    padding: 14,
    marginBottom: 18,
  },
  trustDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  trustCopy: {
    flex: 1,
  },
  trustTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  brand: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
});
