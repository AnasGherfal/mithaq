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
const previewTestPhones = new Set(["+218910000001", "+218910000002"]);
const previewTestCode = "123456";

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
    let active = true;

    async function loadPendingPhone() {
      try {
        const value = await SecureStore.getItemAsync(pendingPhoneKey);
        if (!active) return;

        if (!value) {
          router.replace({ pathname: "/auth", params: { locale } });
          return;
        }

        setPhone(value);
        if (__DEV__ && previewTestPhones.has(value)) setCode(previewTestCode);
      } catch {
        if (active) router.replace({ pathname: "/auth", params: { locale } });
      }
    }

    void loadPendingPhone();
    return () => {
      active = false;
    };
  }, [locale]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function verifyCode() {
    if (loading) return;

    if (!phone || !/^\d{6}$/.test(code)) {
      setError(copy.invalidCode);
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: "sms",
      });

      if (verifyError) {
        setError(
          verifyError.status === 400
            ? copy.invalidCode
            : verifyError.status === 429
              ? rtl
                ? "تمت محاولات كثيرة خلال وقت قصير. انتظر قليلاً ثم حاول مرة أخرى."
                : "Too many attempts were made in a short time. Wait a moment and try again."
              : copy.genericError,
        );
        return;
      }

      if (verifyData.user) {
        await supabase
          .from("users")
          .update({ preferred_locale: locale, updated_at: new Date().toISOString() })
          .eq("id", verifyData.user.id);
      }

      await Promise.all([
        SecureStore.deleteItemAsync(pendingPhoneKey),
        SecureStore.deleteItemAsync(pendingLocaleKey),
      ]);
      router.replace({ pathname: "/spaces", params: { locale } });
    } catch {
      setError(copy.genericError);
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (!phone || resendIn > 0 || resending || loading) return;

    setResending(true);
    setError(null);
    setNotice(null);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "sms",
        phone,
      });

      if (resendError) {
        setError(
          resendError.status === 429
            ? rtl
              ? "طلبت رموزاً كثيرة خلال وقت قصير. انتظر قليلاً قبل المحاولة من جديد."
              : "Too many codes were requested in a short time. Wait before trying again."
            : rtl
              ? "تعذر إرسال رمز جديد الآن. تحقق من الاتصال ثم حاول مرة أخرى."
              : "We could not send a new code right now. Check your connection and try again.",
        );
        return;
      }

      setCode(__DEV__ && previewTestPhones.has(phone) ? previewTestCode : "");
      setResendIn(resendCooldownSeconds);
      setNotice(rtl ? "تم تجهيز رمز الاختبار من جديد." : "The preview test code is ready again.");
    } catch {
      setError(
        rtl
          ? "تعذر الاتصال لإرسال رمز جديد. تحقق من الشبكة وحاول مرة أخرى."
          : "We could not connect to send a new code. Check your network and try again.",
      );
    } finally {
      setResending(false);
    }
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
            {__DEV__ && phone && previewTestPhones.has(phone)
              ? rtl
                ? "رمز المعاينة جاهز"
                : "Preview code ready"
              : rtl
                ? "تم إرسال رمز خاص بك"
                : "Your private code is on its way"}
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
          accessibilityHint={
            rtl
              ? "أدخل رمز التحقق المكوّن من ستة أرقام"
              : "Enter the six-digit verification code"
          }
          autoComplete="one-time-code"
          keyboardType="number-pad"
          value={code}
          onChangeText={(value) => {
            setCode(value.replace(/\D/g, "").slice(0, 6));
            if (error) setError(null);
          }}
          onSubmitEditing={() => {
            if (code.length === 6) void verifyCode();
          }}
          returnKeyType="done"
          maxLength={6}
          textAlign="center"
          selectionColor={colors.primary}
          style={styles.codeInput}
        />
        {__DEV__ && phone && previewTestPhones.has(phone) ? (
          <Text style={[styles.previewHint, { textAlign: rtl ? "right" : "left" }]}>
            {rtl
              ? "هذا رمز محلي ثابت للمعاينة فقط؛ لا تُرسل رسالة SMS."
              : "This is a local fixed preview code; no SMS is sent."}
          </Text>
        ) : null}
      </View>

      {error ? (
        <Text
          accessibilityRole="alert"
          style={[styles.error, { textAlign: rtl ? "right" : "left" }]}
        >
          {error}
        </Text>
      ) : null}
      {notice ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.notice, { textAlign: rtl ? "right" : "left" }]}
        >
          {notice}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton
          disabled={!phone || code.length !== 6}
          loading={loading}
          onPress={() => void verifyCode()}
        >
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
  previewHint: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 9,
    fontWeight: "700",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 14,
  },
  notice: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 14,
  },
  actions: { gap: 10 },
});
