import { useEffect, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BrandLogo } from "@/components/brand-logo";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { mobileCopy, type MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme";

export default function WelcomeScreen() {
  const [locale, setLocale] = useState<MobileLocale>("ar");
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState(false);
  const [bootAttempt, setBootAttempt] = useState(0);
  const copy = mobileCopy[locale];
  const rtl = locale === "ar";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const values = rtl ? ["زواج جاد", "خصوصية", "اختيارك"] : ["SERIOUS MARRIAGE", "PRIVATE", "YOUR CHOICE"];

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
        <BrandLogo variant="mark" width={72} />
        <ActivityIndicator accessibilityLabel="Loading Mithaq securely" color={colors.primary} />
        <Text style={styles.loadingArabic}>جارٍ فتح ميثاق بأمان</Text>
        <Text style={styles.loadingEnglish}>Opening Mithaq securely</Text>
      </View>
    );
  }

  if (bootError) {
    return (
      <View style={styles.recoveryState} accessibilityRole="alert">
        <BrandLogo variant="mark" width={62} />
        <Text style={styles.recoveryEyebrow}>PRIVATE SESSION · جلسة خاصة</Text>
        <Text style={styles.recoveryArabic}>تعذر استعادة جلستك بأمان</Text>
        <Text style={styles.recoveryTitle}>We could not restore your session safely</Text>
        <Text style={styles.recoveryBodyArabic}>
          تحقق من الاتصال ثم حاول مرة أخرى. لن نبدأ تسجيلًا جديدًا قبل التأكد من جلستك الحالية.
        </Text>
        <Text style={styles.recoveryBody}>
          Check your connection and retry. We will not start a new registration until your current session is resolved.
        </Text>
        <View style={styles.recoveryAction}>
          <PrimaryButton onPress={() => setBootAttempt((value) => value + 1)}>إعادة المحاولة · Try again</PrimaryButton>
        </View>
      </View>
    );
  }

  return (
    <ScreenShell
      brandVariant="full"
      eyebrow={rtl ? "زواج جاد · بخصوصية" : "SERIOUS MARRIAGE · PRIVATE BY DESIGN"}
      title={rtl ? "اختيارك للزواج\nيبقى لك." : "Your marriage search.\nOn your terms."}
      body={
        rtl
          ? "ميثاق يساعدك على اكتشاف توافق جاد بدون ملف عام، وبدون أن يعرف الآخرون أنك تستخدم التطبيق."
          : "Mithaq helps you explore serious marriage compatibility without a public profile or announcing that you use the app."
      }
      rtl={rtl}
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={() => setLocale(rtl ? "en" : "ar")}
          hitSlop={12}
          style={({ pressed }) => [styles.languageButton, pressed ? styles.pressed : null]}
        >
          <Text style={styles.languageText}>{copy.switchLanguage}</Text>
        </Pressable>
      }
    >
      <View style={styles.statementBlock}>
        <View style={[styles.statementRule, { alignSelf: rtl ? "flex-end" : "flex-start" }]} />
        <Text style={[styles.statement, { textAlign, writingDirection }]}>
          {rtl
            ? "ابدأ بتوافق مجهول. لا اسم ولا صورة في الاكتشاف الأول، وأنت تحدد متى يُكشف المزيد."
            : "Start with anonymous compatibility. No name or photo in first-stage Discover, and you control when more is revealed."}
        </Text>
      </View>

      <View style={[styles.valuesRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        {values.map((value, index) => (
          <View key={value} style={[styles.valueGroup, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <Text style={[styles.value, rtl ? styles.valueArabic : null, { writingDirection }]}>{value}</Text>
            {index < values.length - 1 ? <View style={styles.valueDot} /> : null}
          </View>
        ))}
      </View>

      <View style={styles.primaryAction}>
        <PrimaryButton onPress={() => router.push({ pathname: "/auth", params: { locale } })}>
          {copy.continue}
        </PrimaryButton>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    backgroundColor: colors.background,
    paddingHorizontal: 28,
  },
  loadingArabic: { color: colors.primary, fontSize: 15, lineHeight: 23, fontWeight: "800", marginTop: 2 },
  loadingEnglish: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: -14 },
  recoveryState: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  recoveryEyebrow: {
    color: colors.gold,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 1.4,
    fontWeight: "800",
    marginTop: 24,
  },
  recoveryArabic: {
    color: colors.primary,
    fontSize: 28,
    lineHeight: 39,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 12,
  },
  recoveryTitle: { color: colors.foreground, fontSize: 21, lineHeight: 29, fontWeight: "800", marginTop: 3 },
  recoveryBodyArabic: { color: colors.muted, fontSize: 14, lineHeight: 24, textAlign: "right", marginTop: 16 },
  recoveryBody: { color: colors.muted, fontSize: 13, lineHeight: 22, marginTop: 7 },
  recoveryAction: { marginTop: 28 },
  statementBlock: { gap: 15 },
  statementRule: { width: 44, height: 2, borderRadius: 1, backgroundColor: colors.accent },
  statement: { color: colors.foreground, fontSize: 19, lineHeight: 30, fontWeight: "700" },
  valuesRow: { alignItems: "center", flexWrap: "wrap", gap: 9, marginTop: 34 },
  valueGroup: { alignItems: "center", gap: 9 },
  value: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  valueArabic: { fontSize: 12, lineHeight: 19, letterSpacing: 0 },
  valueDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.gold },
  primaryAction: { marginTop: 44 },
  languageButton: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  languageText: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.55 },
});
