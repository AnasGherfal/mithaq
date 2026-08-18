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
        <TextInput
          accessibilityLabel={copy.phoneLabel}
          accessibilityHint={
            rtl
              ? "أدخل رقم الهاتف بالصيغة الدولية، مثل +218910000000"
              : "Enter your phone number in international format, such as +218910000000"
          }
          autoComplete="tel"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={(value) => {
            setPhone(value);
            if (error) setError(null);
          }}
          onSubmitEditing={() => {
            if (valid) void sendCode();
          }}
          returnKeyType="done"
          placeholder={copy.phonePlaceholder}
          placeholderTextColor={colors.mutedSoft}
          selectionColor={colors.primary}
          textAlign="left"
          style={styles.input}
        />
        <Text style={[styles.hint, { textAlign: rtl ? "right" : "left" }]}>
          {rtl
            ? "استخدم الصيغة الدولية التي تبدأ بعلامة +. مثال ليبيا: +218910000000."
            : "Use international format beginning with +. Libya example: +218910000000."}
        </Text>
      </View>

      <View style={[styles.privacyNote, { direction: rtl ? "rtl" : "ltr" }]}>
        <View style={styles.privacyIcon}>
          <View style={styles.privacyIconCore} />
        </View>
        <Text style={[styles.privacyText, { textAlign: rtl ? "right" : "left" }]}>
          {rtl
            ? "يُستخدم رقمك للتحقق والدخول الآمن فقط، ويمكن أن يكون رقماً ليبياً أو دولياً."
            : "Your number is used for verification and secure access only, and can be Libyan or international."}
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
  label: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 9,
  },
  input: {
    minHeight: 62,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
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
