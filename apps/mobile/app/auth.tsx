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

  const normalizedPhone = useMemo(
    () => phone.replace(/[\s()-]/g, ""),
    [phone],
  );
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
        <Text style={[styles.label, { textAlign: rtl ? "right" : "left" }]}>
          {copy.phoneLabel}
        </Text>
        <TextInput
          accessibilityLabel={copy.phoneLabel}
          autoComplete="tel"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          placeholder={copy.phonePlaceholder}
          placeholderTextColor={colors.muted}
          textAlign="left"
          style={styles.input}
        />
        <Text style={[styles.hint, { textAlign: rtl ? "right" : "left" }]}>
          {rtl
            ? "استخدم الصيغة الدولية، مثل +218."
            : "Use international format, for example +218."}
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
    marginBottom: 8,
  },
  input: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.foreground,
    fontSize: 18,
    paddingHorizontal: 16,
  },
  hint: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginVertical: 14,
  },
});
