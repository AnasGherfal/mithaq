import { useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { mobileCopy, type MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme";

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
    if (loading) return;
    if (!valid) {
      setError(copy.invalidPhone);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: {
          shouldCreateUser: true,
          data: { preferred_locale: locale },
        },
      });

      if (otpError) {
        setError(
          otpError.status === 429
            ? rtl
              ? "تم طلب رموز كثيرة خلال وقت قصير. انتظر قليلاً ثم حاول مرة أخرى."
              : "Too many codes were requested in a short time. Wait a moment and try again."
            : rtl
              ? "تعذر إرسال رمز التحقق الآن. تحقق من الاتصال وحاول مرة أخرى."
              : "We could not send the verification code right now. Check your connection and try again.",
        );
        return;
      }

      try {
        await Promise.all([
          SecureStore.setItemAsync(pendingPhoneKey, normalizedPhone),
          SecureStore.setItemAsync(pendingLocaleKey, locale),
        ]);
      } catch {
        setError(
          rtl
            ? "تم إرسال الرمز، لكن تعذر حفظ جلسة التحقق بأمان على جهازك. ابدأ من جديد لطلب رمز جديد."
            : "The code was sent, but we could not securely save the verification session on your device. Start again to request a new code.",
        );
        return;
      }

      router.push({ pathname: "/verify", params: { locale } });
    } catch {
      setError(
        rtl
          ? "تعذر الاتصال لإرسال رمز التحقق. تحقق من الشبكة وحاول مرة أخرى."
          : "We could not connect to send the verification code. Check your network and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell
      eyebrow={rtl ? "الدخول الخاص" : "Private access"}
      title={copy.phoneTitle}
      body={rtl ? "رقمك هو مفتاح حسابك. لن يظهر للأعضاء الآخرين." : "Your number is your account key. It is never shown to other members."}
      rtl={rtl}
      footer={
        <PrimaryButton tone="quiet" onPress={() => router.back()}>
          {copy.back}
        </PrimaryButton>
      }
    >
      <View style={[styles.fieldGroup, { direction: rtl ? "rtl" : "ltr" }]}>
        <Text style={[styles.label, { textAlign: rtl ? "right" : "left" }]}>
          {copy.phoneLabel}
        </Text>
        <View style={styles.phoneField}>
          <Text style={styles.plus}>+</Text>
          <TextInput
            accessibilityLabel={copy.phoneLabel}
            autoComplete="tel"
            keyboardType="phone-pad"
            value={phone.startsWith("+") ? phone.slice(1) : phone}
            onChangeText={(value) => {
              setPhone(`+${value.replace(/^\+/, "")}`);
              if (error) setError(null);
            }}
            onSubmitEditing={() => {
              if (valid) void sendCode();
            }}
            returnKeyType="done"
            placeholder="218 91 000 0000"
            placeholderTextColor={colors.mutedSoft}
            selectionColor={colors.primary}
            textAlign="left"
            style={styles.input}
          />
        </View>
        <Text style={[styles.hint, { textAlign: rtl ? "right" : "left" }]}>
          {rtl ? "استخدم رمز الدولة، مثل 218 لليبيا." : "Use your country code, for example 218 for Libya."}
        </Text>
      </View>

      <View style={styles.trustRow}>
        <View style={styles.trustDot} />
        <Text style={[styles.trustText, { textAlign: rtl ? "right" : "left" }]}>
          {rtl ? "خصوصية رقمك مفعّلة افتراضياً" : "Your number stays private by default"}
        </Text>
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={[styles.error, { textAlign: rtl ? "right" : "left" }]}>
          {error}
        </Text>
      ) : null}

      <PrimaryButton disabled={!valid} loading={loading} onPress={() => void sendCode()}>
        {loading ? copy.sending : copy.sendCode}
      </PrimaryButton>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 10,
  },
  label: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "800",
  },
  phoneField: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  plus: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "700",
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0.3,
    paddingVertical: 14,
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 26,
    marginBottom: 28,
  },
  trustDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  trustText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
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
