import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import type { MobileLocale } from "@/i18n";
import {
  authenticateWithBiometrics,
  getBiometricAvailability,
  getBiometricLockEnabled,
  setBiometricLockEnabled,
} from "@/security/biometric";
import { colors, radius } from "@/theme";

export default function SecurityScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([getBiometricLockEnabled(), getBiometricAvailability()]).then(
      ([currentEnabled, availability]) => {
        if (!active) return;
        setEnabled(currentEnabled);
        setAvailable(availability.available);
        setLoading(false);
      },
    );

    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    setSaving(true);
    setMessage(null);
    const result = await authenticateWithBiometrics();

    if (!result.success) {
      setSaving(false);
      setMessage(
        rtl
          ? "لم يتم تفعيل القفل. يمكنك المحاولة مرة أخرى عندما تكون جاهزاً."
          : "Biometric lock was not enabled. You can try again when you are ready.",
      );
      return;
    }

    await setBiometricLockEnabled(true);
    setEnabled(true);
    setSaving(false);
    setMessage(rtl ? "تم تفعيل حماية ميثاق على هذا الجهاز." : "Mithaq is now protected on this device.");
  }

  async function disable() {
    setSaving(true);
    await setBiometricLockEnabled(false);
    setEnabled(false);
    setSaving(false);
    setMessage(rtl ? "تم إيقاف القفل البيومتري." : "Biometric lock has been turned off.");
  }

  const copy = rtl
    ? {
        eyebrow: "الأمان والخصوصية",
        title: "احمِ حسابك الخاص",
        body: "يمكنك طلب بصمة الوجه أو الإصبع عند العودة إلى ميثاق على هذا الجهاز.",
        cardTitle: "القفل البيومتري",
        enabled: "مفعّل على هذا الجهاز",
        disabled: "غير مفعّل",
        unavailable: "لا توجد بصمة وجه أو إصبع مسجلة على هذا الجهاز حالياً.",
        note: "بيانات بصمتك لا تصل إلى ميثاق. نظام التشغيل يتحقق منها محلياً ويعيد لنا نتيجة النجاح أو الفشل فقط.",
        enable: "تفعيل الحماية البيومترية",
        disable: "إيقاف الحماية البيومترية",
        back: "العودة إلى الحساب",
      }
    : {
        eyebrow: "Security & privacy",
        title: "Protect your private account",
        body: "Require Face ID, Touch ID, or fingerprint when returning to Mithaq on this device.",
        cardTitle: "Biometric lock",
        enabled: "Enabled on this device",
        disabled: "Not enabled",
        unavailable: "No enrolled face or fingerprint is available on this device yet.",
        note: "Mithaq never receives your biometric data. Your operating system verifies it locally and only returns whether authentication succeeded.",
        enable: "Enable biometric protection",
        disable: "Turn off biometric protection",
        back: "Back to account",
      };

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={
        <PrimaryButton tone="quiet" onPress={() => router.back()}>
          {copy.back}
        </PrimaryButton>
      }
    >
      <View style={styles.stack}>
        <View style={[styles.securityCard, { direction: rtl ? "rtl" : "ltr" }]}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>◎</Text>
          </View>
          <Text style={[styles.cardTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.cardTitle}</Text>
          <Text
            style={[
              styles.status,
              enabled ? styles.statusEnabled : null,
              { textAlign: rtl ? "right" : "left" },
            ]}
          >
            {enabled ? copy.enabled : copy.disabled}
          </Text>
        </View>

        {!loading && !available ? (
          <View style={styles.notice}>
            <Text style={[styles.noticeText, { textAlign: rtl ? "right" : "left" }]}>{copy.unavailable}</Text>
          </View>
        ) : null}

        <View style={styles.privacyNote}>
          <Text style={[styles.noteText, { textAlign: rtl ? "right" : "left" }]}>{copy.note}</Text>
        </View>

        {message ? <Text style={[styles.message, { textAlign: rtl ? "right" : "left" }]}>{message}</Text> : null}

        {enabled ? (
          <PrimaryButton tone="quiet" loading={saving} onPress={() => void disable()}>
            {copy.disable}
          </PrimaryButton>
        ) : (
          <PrimaryButton disabled={loading || !available} loading={saving} onPress={() => void enable()}>
            {copy.enable}
          </PrimaryButton>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  securityCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryWash,
    padding: 18,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    marginBottom: 16,
  },
  icon: { color: colors.white, fontSize: 26, fontWeight: "800" },
  cardTitle: { color: colors.foreground, fontSize: 18, fontWeight: "800" },
  status: { color: colors.muted, fontSize: 13, fontWeight: "700", marginTop: 5 },
  statusEnabled: { color: colors.primary },
  notice: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 15,
  },
  noticeText: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  privacyNote: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 15,
  },
  noteText: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  message: { color: colors.primary, fontSize: 13, lineHeight: 20, fontWeight: "700" },
});
