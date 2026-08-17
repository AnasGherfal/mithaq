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
const resendCooldownSeconds = 60;

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const copy = mobileCopy[locale];
  const rtl = locale === "ar";
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(resendCooldownSeconds);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(pendingPhoneKey).then((value) => {
      if (!value) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }
      setPhone(value);
    });
  }, [locale]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function verifyCode() {
    if (!phone || !/^\d{6}$/.test(code)) {
      setError(copy.invalidCode);
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);
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

  async function resendCode() {
    if (!phone || resendIn > 0 || resending) return;

    setResending(true);
    setError(null);
    setNotice(null);
    const { error: resendError } = await supabase.auth.resend({
      type: "sms",
      phone,
    });
    setResending(false);

    if (resendError) {
      setError(
        rtl
          ? "تعذر إرسال رمز جديد الآن. انتظر قليلاً ثم حاول مرة أخرى."
          : "We could not send a new code right now. Wait a moment and try again.",
      );
      return;
    }

    setCode("");
    setResendIn(resendCooldownSeconds);
    setNotice(rtl ? "تم إرسال رمز جديد إلى رقمك." : "A new code has been sent to your phone.");
  }

  const resendLabel =
    resendIn > 0
      ? rtl
        ? `إعادة الإرسال بعد ${resendIn} ثانية`
        : `Resend in ${resendIn}s`
      : rtl
        ? "إرسال رمز جديد"
        : "Send a new code";

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

      {error ? <Text style={[styles.error, { textAlign: rtl ? "right" : "left" }]}>{error}</Text> : null}
      {notice ? <Text style={[styles.notice, { textAlign: rtl ? "right" : "left" }]}>{notice}</Text> : null}

      <View style={styles.actions}>
        <PrimaryButton disabled={!phone || code.length !== 6} loading={loading} onPress={verifyCode}>
          {loading ? copy.verifying : copy.verify}
        </PrimaryButton>
        <PrimaryButton
          tone="quiet"
          disabled={!phone || resendIn > 0 || loading}
          loading={resending}
          onPress={() => void resendCode()}
        >
          {resendLabel}
        </PrimaryButton>
      </View>

      <Text style={[styles.resendHint, { textAlign: rtl ? "right" : "left" }]}>
        {rtl
          ? "نحد من إعادة الإرسال لحماية رقمك ومنع إساءة استخدام الرسائل."
          : "Resends are throttled to protect your number and prevent SMS abuse."}
      </Text>
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
  notice: { color: colors.primary, fontSize: 13, fontWeight: "700", lineHeight: 20, marginBottom: 14 },
  actions: { gap: 10 },
  resendHint: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 10 },
});
