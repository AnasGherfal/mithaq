import { useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { mobileCopy, type MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

const phonePattern = /^\+[1-9]\d{7,14}$/;
const pendingPhoneKey = "mithaq.pending.phone";
const pendingLocaleKey = "mithaq.pending.locale";

export default function AuthScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const copy = mobileCopy[locale];
  const rtl = locale === "ar";
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedPhone = useMemo(() => phone.replace(/[\s()-]/g, ""), [phone]);
  const valid = phonePattern.test(normalizedPhone);

  async function sendCode() {
    if (!valid) {
      setError(copy.invalidPhone);
      return;
    }

    setLoading(true);
    setError(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
      options: {
        shouldCreateUser: true,
        data: { preferred_locale: locale },
      },
    });

    if (otpError) {
      setError(copy.genericError);
      setLoading(false);
      return;
    }

    await Promise.all([
      SecureStore.setItemAsync(pendingPhoneKey, normalizedPhone),
      SecureStore.setItemAsync(pendingLocaleKey, locale),
    ]);
    setLoading(false);
    router.push({ pathname: "/verify", params: { locale } });
  }

  return (
    <ScreenShell
      eyebrow={copy.privateByDesign}
      title={copy.phoneTitle}
      body={copy.phoneBody}
      rtl={rtl}
      footer={
        <PrimaryButton tone="quiet" onPress={() => router.back()}>
          {copy.back}
        </PrimaryButton>
      }
    >
      <View style={{ direction: rtl ? "rtl" : "ltr" }}>
        <Text style={[styles.label, { textAlign: rtl ? "right" : "left" }]}>{copy.phoneLabel}</Text>
        <View style={styles.phoneFrame}>
          <View style={styles.countryBadge}>
            <Text style={styles.countryBadgeText}>+218</Text>
          </View>
          <TextInput
            accessibilityLabel={copy.phoneLabel}
            autoComplete="tel"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            placeholder={copy.phonePlaceholder}
            placeholderTextColor={colors.mutedSoft}
            selectionColor={colors.primary}
            textAlign="left"
            style={styles.input}
          />
        </View>
        <Text style={[styles.hint, { textAlign: rtl ? "right" : "left" }]}>
          {rtl ? "استخدم الصيغة الدولية، مثل +218." : "Use international format, for example +218."}
        </Text>
      </View>

      <View style={[styles.privacyNote, { direction: rtl ? "rtl" : "ltr" }]}>
        <View style={styles.privacyIcon}>
          <View style={styles.privacyIconCore} />
        </View>
        <Text style={[styles.privacyText, { textAlign: rtl ? "right" : "left" }]}>
          {rtl
            ? "يُستخدم رقمك للتحقق والدخول الآمن فقط."
            : "Your number is used for verification and secure access only."}
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton disabled={!valid} loading={loading} onPress={sendCode}>
        {loading ? copy.sending : copy.sendCode}
      </PrimaryButton>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 9,
  },
  phoneFrame: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 10,
  },
  countryBadge: {
    borderRadius: radius.sm,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  countryBadgeText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    flex: 1,
    minHeight: 58,
    color: colors.foreground,
    fontSize: 18,
    paddingHorizontal: 4,
  },
  hint: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
    marginBottom: 18,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: 13,
  },
  privacyIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.goldSoft,
  },
  privacyIconCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  privacyText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "600",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 14,
  },
});
