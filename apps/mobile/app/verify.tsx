import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, TextInput } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { mobileCopy, type MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

const pendingPhoneKey = "mithaq.pending.phone";
const pendingLocaleKey = "mithaq.pending.locale";

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const copy = mobileCopy[locale];
  const rtl = locale === "ar";
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(pendingPhoneKey).then((value) => {
      if (!value) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }
      setPhone(value);
    });
  }, [locale]);

  async function verifyCode() {
    if (!phone || !/^\d{6}$/.test(code)) {
      setError(copy.invalidCode);
      return;
    }

    setLoading(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: "sms",
    });

    if (verifyError) {
      setError(copy.genericError);
      setLoading(false);
      return;
    }

    await Promise.all([
      SecureStore.deleteItemAsync(pendingPhoneKey),
      SecureStore.deleteItemAsync(pendingLocaleKey),
    ]);
    setLoading(false);
    router.replace({ pathname: "/status", params: { locale } });
  }

  return (
    <ScreenShell
      eyebrow={copy.privateByDesign}
      title={copy.verifyTitle}
      body={copy.verifyBody}
      rtl={rtl}
      footer={
        <PrimaryButton tone="quiet" onPress={() => router.back()}>
          {copy.back}
        </PrimaryButton>
      }
    >
      <Text style={[styles.label, { textAlign: rtl ? "right" : "left" }]}>
        {copy.codeLabel}
      </Text>
      <TextInput
        accessibilityLabel={copy.codeLabel}
        autoComplete="one-time-code"
        keyboardType="number-pad"
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
        maxLength={6}
        textAlign="center"
        style={styles.codeInput}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        disabled={!phone || code.length !== 6}
        loading={loading}
        onPress={verifyCode}
      >
        {loading ? copy.verifying : copy.verify}
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
  codeInput: {
    minHeight: 66,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.foreground,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 12,
    paddingLeft: 12,
    paddingHorizontal: 16,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginVertical: 14,
  },
});
