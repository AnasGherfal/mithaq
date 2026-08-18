import { useEffect, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { mobileCopy, type MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

export default function WelcomeScreen() {
  const [locale, setLocale] = useState<MobileLocale>("ar");
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState(false);
  const [bootAttempt, setBootAttempt] = useState(0);
  const copy = mobileCopy[locale];
  const rtl = locale === "ar";
  const textAlign = rtl ? "right" : "left";

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      setBooting(true);
      setBootError(false);

      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!active) return;

        if (!data.session) {
          setBooting(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("preferred_locale")
          .eq("id", data.session.user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!active) return;

        const preferredLocale: MobileLocale = profile?.preferred_locale === "en" ? "en" : "ar";
        router.replace({ pathname: "/status", params: { locale: preferredLocale } });
      } catch {
        if (!active) return;
        setBootError(true);
        setBooting(false);
      }
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, [bootAttempt]);

  if (booting) {
    return (
      <View style={styles.loadingState} accessibilityLiveRegion="polite">
        <ActivityIndicator accessibilityLabel="Loading Mithaq securely" color={colors.primary} size="large" />
        <Text style={styles.loadingArabic}>جارٍ فتح ميثاق بأمان</Text>
        <Text style={styles.loadingEnglish}>Opening Mithaq securely</Text>
      </View>
    );
  }

  if (bootError) {
    return (
      <View style={styles.recoveryState} accessibilityRole="alert">
        <View style={styles.recoveryMark}>
          <Text style={styles.recoveryMarkText}>م</Text>
        </View>
        <Text style={styles.recoveryEyebrow}>PRIVATE SESSION · جلسة خاصة</Text>
        <Text style={styles.recoveryArabic}>تعذر استعادة جلستك بأمان</Text>
        <Text style={styles.recoveryTitle}>We could not restore your session safely</Text>
        <Text style={styles.recoveryBodyArabic}>
          لم نعتبرك مسجلاً للخروج ولم نرسلْك إلى تسجيل جديد. تحقق من الاتصال ثم حاول مرة أخرى.
        </Text>
        <Text style={styles.recoveryBody}>
          We did not treat you as signed out or start a new registration. Check your connection, then retry secure
          restoration.
        </Text>
        <View style={styles.recoveryAction}>
          <PrimaryButton onPress={() => setBootAttempt((value) => value + 1)}>إعادة المحاولة · Try again</PrimaryButton>
        </View>
      </View>
    );
  }

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
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 28,
  },
  loadingArabic: { color: colors.primary, fontSize: 16, lineHeight: 24, fontWeight: "800", marginTop: 16 },
  loadingEnglish: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 2 },
  recoveryState: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  recoveryMark: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  recoveryMarkText: { color: colors.primary, fontSize: 25, fontWeight: "900" },
  recoveryEyebrow: { color: colors.gold, fontSize: 10, lineHeight: 15, letterSpacing: 1.4, fontWeight: "800" },
  recoveryArabic: {
    color: colors.primary,
    fontSize: 27,
    lineHeight: 38,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 12,
  },
  recoveryTitle: { color: colors.foreground, fontSize: 21, lineHeight: 29, fontWeight: "800", marginTop: 3 },
  recoveryBodyArabic: { color: colors.muted, fontSize: 14, lineHeight: 24, textAlign: "right", marginTop: 16 },
  recoveryBody: { color: colors.muted, fontSize: 13, lineHeight: 22, marginTop: 7 },
  recoveryAction: { marginTop: 26 },
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
  goldRail: { width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: colors.gold },
  signatureCopy: { flex: 1 },
  signatureLabel: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  brand: { color: colors.muted, fontSize: 12, marginTop: 4 },
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
  sealInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.gold },
  promiseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  promiseItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  promiseDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  promiseText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  promiseDivider: { width: 1, height: 14, backgroundColor: colors.border },
});
