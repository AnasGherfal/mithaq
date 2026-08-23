import { useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { mobileCopy, type MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

const libyaDialCode = "+218";
const localPhonePattern = /^9\d{8}$/;
const pendingPhoneKey = "mithaq.pending.phone";
const pendingLocaleKey = "mithaq.pending.locale";
const previewTestLocalPhone = "910000001";

export default function AuthScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const copy = mobileCopy[locale];
  const rtl = locale === "ar";
  const [phone, setPhone] = useState(__DEV__ ? previewTestLocalPhone : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localPhone = useMemo(() => phone.replace(/\D/g, "").slice(0, 9), [phone]);
  const normalizedPhone = `${libyaDialCode}${localPhone}`;
  const valid = localPhonePattern.test(localPhone);

  async function sendCode() {
    if (loading) return;

    if (!valid) {
      setError(
        rtl
          ? "أدخل رقم هاتف ليبي صحيح يبدأ بالرقم 9 ويتكون من 9 أرقام."
          : "Enter a valid Libyan mobile number starting with 9 and containing 9 digits.",
      );
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
      body={
        rtl
          ? "أدخل رقمك الليبي. سنضيف رمز ليبيا تلقائياً ولن تحتاج إلى كتابة +218."
          : "Enter your Libyan mobile number. We add Libya's +218 code automatically."
      }
      rtl={rtl}
      footer={
        <PrimaryButton tone="quiet" onPress={() => router.back()}>
          {copy.back}
        </PrimaryButton>
      }
    >
      <View style={{ direction: rtl ? "rtl" : "ltr" }}>
        <Text style={[styles.label, { textAlign: rtl ? "right" : "left" }]}>
          {rtl ? "رقم الهاتف" : "Mobile number"}
        </Text>
        <View style={[styles.phoneField, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+218</Text>
            <Text style={styles.countryLabel}>{rtl ? "ليبيا" : "Libya"}</Text>
          </View>
          <View style={styles.phoneDivider} />
          <TextInput
            accessibilityLabel={rtl ? "رقم الهاتف الليبي" : "Libyan mobile number"}
            accessibilityHint={rtl ? "أدخل تسعة أرقام تبدأ بالرقم 9" : "Enter nine digits beginning with 9"}
            autoComplete="tel"
            keyboardType="number-pad"
            value={localPhone}
            onChangeText={(value) => {
              setPhone(value.replace(/\D/g, "").slice(0, 9));
              if (error) setError(null);
            }}
            onSubmitEditing={() => {
              if (valid) void sendCode();
            }}
            returnKeyType="done"
            maxLength={9}
            placeholder="9XXXXXXXX"
            placeholderTextColor={colors.mutedSoft}
            selectionColor={colors.primary}
            textAlign="left"
            style={styles.input}
          />
        </View>
        <View style={styles.fieldMeta}>
          <Text style={[styles.hint, { textAlign: rtl ? "right" : "left" }]}>
            {rtl ? "يبدأ الرقم بـ 9 · 9 أرقام" : "Starts with 9 · 9 digits"}
          </Text>
          {valid ? <Text style={styles.normalizedPreview}>{normalizedPhone}</Text> : null}
        </View>
        {__DEV__ ? (
          <Text style={[styles.previewHint, { textAlign: rtl ? "right" : "left" }]}>
            {rtl
              ? "معاينة: الرقم التجريبي جاهز. استخدم الرمز 123456."
              : "Preview: the test number is ready. Use code 123456."}
          </Text>
        ) : null}
      </View>

      <View style={[styles.privacyNote, { direction: rtl ? "rtl" : "ltr" }]}>
        <View style={styles.privacyDot} />
        <Text style={[styles.privacyText, { textAlign: rtl ? "right" : "left" }]}>
          {rtl
            ? "نستخدم رقمك للتحقق والدخول الآمن، ولا نعرضه للأعضاء الآخرين."
            : "We use your number for verification and secure access. It is not shown to other members."}
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
    marginBottom: 10,
  },
  phoneField: {
    minHeight: 68,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 14,
  },
  countryCode: {
    minWidth: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  countryCodeText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "800",
  },
  countryLabel: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2,
  },
  phoneDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  input: {
    flex: 1,
    minHeight: 64,
    color: colors.foreground,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 1.1,
    paddingHorizontal: 2,
  },
  fieldMeta: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  hint: {
    flex: 1,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  normalizedPreview: {
    color: colors.mutedSoft,
    fontSize: 10,
    fontWeight: "700",
  },
  previewHint: {
    marginTop: 10,
    color: colors.primary,
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 22,
    marginBottom: 20,
  },
  privacyDot: {
    width: 7,
    height: 7,
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
