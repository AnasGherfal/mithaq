import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
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
  const [sessionSaving, setSessionSaving] = useState(false);
  const [localeSaving, setLocaleSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([getBiometricLockEnabled(), getBiometricAvailability()]).then(([currentEnabled, availability]) => {
      if (!active) return;
      setEnabled(currentEnabled);
      setAvailable(availability.available);
      setLoading(false);
    });

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

  async function switchLanguage() {
    const nextLocale: MobileLocale = locale === "ar" ? "en" : "ar";
    setLocaleSaving(true);
    setMessage(null);

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setLocaleSaving(false);
      router.replace({ pathname: "/auth", params: { locale: nextLocale } });
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({ preferred_locale: nextLocale, updated_at: new Date().toISOString() })
      .eq("id", data.session.user.id);

    if (error) {
      setLocaleSaving(false);
      setMessage(rtl ? "تعذر حفظ اللغة الآن. حاول مرة أخرى." : "We could not save your language right now. Try again.");
      return;
    }

    setLocaleSaving(false);
    router.replace({ pathname: "/security", params: { locale: nextLocale } });
  }

  async function signOutOtherSessions() {
    setSessionSaving(true);
    setMessage(null);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setSessionSaving(false);

    if (error) {
      setMessage(
        rtl
          ? "تعذر تسجيل الخروج من الأجهزة الأخرى الآن. حاول مرة أخرى."
          : "We could not sign out your other devices right now. Try again.",
      );
      return;
    }

    setMessage(
      rtl
        ? "تم تسجيل الخروج من الجلسات الأخرى. سيبقى هذا الجهاز مسجلاً."
        : "Other sessions have been signed out. This device stays signed in.",
    );
  }

  const copy = rtl
    ? {
        eyebrow: "الأمان والخصوصية",
        title: "احمِ حسابك الخاص",
        body: "تحكم في حماية العودة إلى حسابك وفي كيفية استخدام بياناتك وموافقاتك.",
        cardTitle: "القفل البيومتري",
        enabled: "مفعّل على هذا الجهاز",
        disabled: "غير مفعّل",
        unavailable: "لا توجد بصمة وجه أو إصبع مسجلة على هذا الجهاز حالياً.",
        note: "بيانات بصمتك لا تصل إلى ميثاق. نظام التشغيل يتحقق منها محلياً ويعيد لنا نتيجة النجاح أو الفشل فقط.",
        enable: "تفعيل الحماية البيومترية",
        disable: "إيقاف الحماية البيومترية",
        languageTitle: "لغة الحساب",
        languageBody: "نحفظ اختيارك على حسابك حتى يعود ميثاق بنفس اللغة على أجهزتك.",
        languageValue: "العربية",
        languageButton: "استخدام English",
        sessionsTitle: "الجلسات الأخرى",
        sessionsBody:
          "إذا استخدمت ميثاق على جهاز آخر أو لم تعد تثق بجهاز قديم، يمكنك إنهاء كل الجلسات الأخرى مع إبقاء هذا الجهاز مسجلاً.",
        sessionsButton: "تسجيل الخروج من الأجهزة الأخرى",
        privacyTitle: "الخصوصية والموافقات",
        privacyBody: "راجع سجل موافقاتك، تحكم في التحديثات الاختيارية، واطلب حذف حسابك.",
        privacyButton: "إدارة الخصوصية والموافقات",
        safetyTitle: "السلامة والثقة",
        safetyBody: "راجع البلاغات التي أرسلتها وحالة الحظر، واعرف كيف يحمي ميثاق التعارف الخاص قبل إطلاقه.",
        safetyButton: "فتح مركز السلامة",
        back: "العودة إلى الحساب",
      }
    : {
        eyebrow: "Security & privacy",
        title: "Protect your private account",
        body: "Control secure re-entry to your account and how Mithaq handles your data and consent choices.",
        cardTitle: "Biometric lock",
        enabled: "Enabled on this device",
        disabled: "Not enabled",
        unavailable: "No enrolled face or fingerprint is available on this device yet.",
        note: "Mithaq never receives your biometric data. Your operating system verifies it locally and only returns whether authentication succeeded.",
        enable: "Enable biometric protection",
        disable: "Turn off biometric protection",
        languageTitle: "Account language",
        languageBody:
          "Your choice is saved to your account so Mithaq can return in the same language across your devices.",
        languageValue: "English",
        languageButton: "استخدام العربية",
        sessionsTitle: "Other sessions",
        sessionsBody:
          "If you used Mithaq on another device or no longer trust an old device, end every other session while keeping this device signed in.",
        sessionsButton: "Sign out other devices",
        privacyTitle: "Privacy & consent",
        privacyBody: "Review consent history, control optional updates, and request account deletion.",
        privacyButton: "Manage privacy and consent",
        safetyTitle: "Trust & safety",
        safetyBody:
          "Review reports you submitted, your block state, and how Mithaq protects private introductions before they launch.",
        safetyButton: "Open Safety Center",
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
          <Text style={[styles.status, enabled ? styles.statusEnabled : null, { textAlign: rtl ? "right" : "left" }]}>
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

        <View style={styles.divider} />

        <View style={styles.settingsCard}>
          <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.languageTitle}</Text>
          <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left" }]}>{copy.languageBody}</Text>
          <View style={[styles.valuePill, { alignSelf: rtl ? "flex-end" : "flex-start" }]}>
            <Text style={styles.valuePillText}>{copy.languageValue}</Text>
          </View>
          <PrimaryButton tone="quiet" loading={localeSaving} onPress={() => void switchLanguage()}>
            {copy.languageButton}
          </PrimaryButton>
        </View>

        <View style={styles.settingsCard}>
          <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.sessionsTitle}</Text>
          <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left" }]}>{copy.sessionsBody}</Text>
          <PrimaryButton tone="quiet" loading={sessionSaving} onPress={() => void signOutOtherSessions()}>
            {copy.sessionsButton}
          </PrimaryButton>
        </View>

        <View style={styles.privacyCard}>
          <Text style={[styles.privacyTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.privacyTitle}</Text>
          <Text style={[styles.privacyBody, { textAlign: rtl ? "right" : "left" }]}>{copy.privacyBody}</Text>
          <PrimaryButton tone="quiet" onPress={() => router.push({ pathname: "/privacy", params: { locale } })}>
            {copy.privacyButton}
          </PrimaryButton>
        </View>

        <View style={styles.safetyCard}>
          <View style={styles.safetyMark}>
            <Text style={styles.safetyMarkText}>✓</Text>
          </View>
          <Text style={[styles.privacyTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.safetyTitle}</Text>
          <Text style={[styles.privacyBody, { textAlign: rtl ? "right" : "left" }]}>{copy.safetyBody}</Text>
          <PrimaryButton tone="quiet" onPress={() => router.push({ pathname: "/safety", params: { locale } })}>
            {copy.safetyButton}
          </PrimaryButton>
        </View>
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
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  settingsCard: {
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 17,
  },
  sectionTitle: { color: colors.foreground, fontSize: 17, fontWeight: "800" },
  sectionBody: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  valuePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  valuePillText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  privacyCard: {
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 17,
  },
  safetyCard: {
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primaryWash,
    padding: 17,
  },
  safetyMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  safetyMarkText: { color: colors.white, fontSize: 18, fontWeight: "900" },
  privacyTitle: { color: colors.foreground, fontSize: 17, fontWeight: "800" },
  privacyBody: { color: colors.muted, fontSize: 13, lineHeight: 21 },
});
