import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
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
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: "sms",
    });

    if (verifyError) {
      setError(copy.genericError);
      setLoading(false);
      return;
    }

    if (verifyData.user) {
      await supabase
        .from("users")
        .update({ preferred_locale: locale, updated_at: new Date().toISOString() })
        .eq("id", verifyData.user.id);
    }

    await Promise.all([SecureStore.deleteItemAsync(pendingPhoneKey), SecureStore.deleteItemAsync(pendingLocaleKey)]);
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
      <View style={[styles.deliveryCard, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <View style={styles.deliveryIcon}>
          <Text style={styles.deliveryIconText}>✓</Text>
        </View>
        <View style={styles.deliveryCopy}>
          <Text style={[styles.deliveryTitle, { textAlign: rtl ? "right" : "left" }]}>
            {rtl ? "تم إرسال رمز خاص بك" : "Your private code is on its way"}
          </Text>
          <Text style={[styles.deliveryBody, { textAlign: rtl ? "right" : "left" }]}>
            {phone ?? (rtl ? "رقم هاتفك" : "Your phone number")}
          </Text>
        </View>
      </View>

      <View style={styles.codeSection}>
        <Text style={[styles.label, { textAlign: rtl ? "right" : "left" }]}>{copy.codeLabel}</Text>
        <TextInput
          accessibilityLabel={copy.codeLabel}
          autoComplete="one-time-code"
          keyboardType="number-pad"
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          textAlign="center"
          selectionColor={colors.primary}
          style={styles.codeInput}
        />
        <Text style={[styles.hint, { textAlign: rtl ? "right" : "left" }]}>
          {rtl ? "الرمز مكوّن من 6 أرقام ويُستخدم مرة واحدة فقط." : "The 6-digit code can only be used once."}
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton disabled={!phone || code.length !== 6} loading={loading} onPress={verifyCode}>
        {loading ? copy.verifying : copy.verify}
      </PrimaryButton>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  deliveryCard: {
    alignItems: "center",
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryWash,
    padding: 14,
    marginBottom: 22,
  },
  deliveryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  deliveryIconText: { color: colors.white, fontSize: 15, fontWeight: "900" },
  deliveryCopy: { flex: 1 },
  deliveryTitle: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  deliveryBody: { color: colors.muted, fontSize: 12, marginTop: 3 },
  codeSection: { marginBottom: 20 },
  label: { color: colors.foreground, fontSize: 13, fontWeight: "800", marginBottom: 10 },
  codeInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    color: colors.foreground,
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: 12,
    paddingLeft: 12,
    paddingHorizontal: 16,
  },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 9 },
  error: { color: colors.danger, fontSize: 13, fontWeight: "700", lineHeight: 20, marginBottom: 14 },
});
