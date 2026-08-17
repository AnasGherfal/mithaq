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
  const textAlign = rtl ? "right" : "left";

  return (
    <ScreenShell
      eyebrow={copy.welcomeEyebrow}
      title={copy.welcomeTitle}
      body={copy.welcomeBody}
      rtl={rtl}
      footer={
        <PrimaryButton tone="quiet" onPress={() => setLocale(rtl ? "en" : "ar")}>
          {copy.switchLanguage}
        </PrimaryButton>
      }
    >
      <View style={[styles.signatureCard, { direction: rtl ? "rtl" : "ltr" }]}>
        <View style={styles.goldRail} />
        <View style={styles.signatureCopy}>
          <Text style={[styles.signatureLabel, { textAlign }]}>{copy.privateByDesign}</Text>
          <Text style={[styles.brand, { textAlign }]}>
            {copy.brand} · {copy.brandLatin}
          </Text>
        </View>
        <View style={styles.seal}>
          <View style={styles.sealInner} />
        </View>
      </View>

      <View style={styles.promiseRow}>
        <View style={styles.promiseItem}>
          <View style={styles.promiseDot} />
          <Text style={styles.promiseText}>Private</Text>
        </View>
        <View style={styles.promiseDivider} />
        <View style={styles.promiseItem}>
          <View style={styles.promiseDot} />
          <Text style={styles.promiseText}>Intentional</Text>
        </View>
        <View style={styles.promiseDivider} />
        <View style={styles.promiseItem}>
          <View style={styles.promiseDot} />
          <Text style={styles.promiseText}>Respectful</Text>
        </View>
      </View>

      <PrimaryButton onPress={() => router.push({ pathname: "/auth", params: { locale } })}>
        {copy.continue}
      </PrimaryButton>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  signatureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryWash,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 18,
  },
  goldRail: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
    backgroundColor: colors.gold,
  },
  signatureCopy: {
    flex: 1,
  },
  signatureLabel: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  brand: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  seal: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.goldSoft,
  },
  sealInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.gold,
  },
  promiseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  promiseItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  promiseDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  promiseText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  promiseDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
  },
});
