import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  getPushNotificationSettings,
  type NotificationPreviewMode,
  type PushNotificationSettings,
} from "@/lib/notification-privacy";
import {
  disableDiscreetPushNotifications,
  enableDiscreetPushNotifications,
  remotePushRuntimeStatus,
  saveNotificationPreviewMode,
} from "@/lib/push-notifications";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

export default function NotificationPrivacyScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const copy = useMemo(() => notificationCopy(locale), [locale]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [settings, setSettings] = useState<PushNotificationSettings | null>(null);
  const [previewMode, setPreviewMode] = useState<NotificationPreviewMode>("neutral");
  const [savingMode, setSavingMode] = useState(false);
  const [changingEnabled, setChangingEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const runtimeStatus = remotePushRuntimeStatus();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }

      const next = await getPushNotificationSettings();
      setSettings(next);
      setPreviewMode(next.previewMode);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function selectPreviewMode(mode: NotificationPreviewMode) {
    if (mode === previewMode || savingMode || changingEnabled) return;
    setSavingMode(true);
    setMessage(null);
    try {
      const next = await saveNotificationPreviewMode(mode);
      setSettings(next);
      setPreviewMode(next.previewMode);
      setMessage(copy.previewSaved);
    } catch {
      setMessage(copy.saveError);
    } finally {
      setSavingMode(false);
    }
  }

  async function enablePush() {
    if (changingEnabled) return;
    setChangingEnabled(true);
    setMessage(null);

    const result = await enableDiscreetPushNotifications(previewMode);
    if (!result.ok) {
      setChangingEnabled(false);
      setMessage(copy.enableError(result.reason));
      return;
    }

    try {
      const next = await getPushNotificationSettings();
      setSettings(next);
      setPreviewMode(next.previewMode);
      setMessage(copy.enabledMessage);
    } catch {
      setMessage(copy.saveError);
    } finally {
      setChangingEnabled(false);
    }
  }

  async function disablePush() {
    if (changingEnabled) return;
    setChangingEnabled(true);
    setMessage(null);
    try {
      const next = await disableDiscreetPushNotifications(previewMode);
      setSettings(next);
      setPreviewMode(next.previewMode);
      setMessage(copy.disabledMessage);
    } catch {
      setMessage(copy.saveError);
    } finally {
      setChangingEnabled(false);
    }
  }

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
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loadError || !settings ? (
        <StateCard
          rtl={rtl}
          tone="error"
          title={copy.loadErrorTitle}
          body={copy.loadErrorBody}
          actionLabel={copy.retry}
          onAction={() => void load()}
        />
      ) : (
        <View style={styles.stack}>
          <View style={styles.statusCard}>
            <View style={[styles.statusTop, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <View
                style={[
                  styles.statusDot,
                  settings.pushEnabled ? styles.statusDotOn : styles.statusDotOff,
                ]}
              />
              <View style={styles.flex}>
                <Text style={[styles.statusTitle, { textAlign, writingDirection }]}>
                  {settings.pushEnabled ? copy.on : copy.off}
                </Text>
                <Text style={[styles.statusBody, { textAlign, writingDirection }]}>
                  {settings.pushEnabled ? copy.onBody : copy.offBody}
                </Text>
              </View>
            </View>

            {settings.pushEnabled ? (
              <View style={styles.statusAction}>
                <PrimaryButton
                  tone="quiet"
                  loading={changingEnabled}
                  onPress={() => void disablePush()}
                >
                  {copy.turnOff}
                </PrimaryButton>
              </View>
            ) : (
              <View style={styles.statusAction}>
                <PrimaryButton loading={changingEnabled} onPress={() => void enablePush()}>
                  {copy.turnOn}
                </PrimaryButton>
              </View>
            )}

            {__DEV__ && runtimeStatus !== "available" ? (
              <Text style={[styles.devNote, { textAlign, writingDirection }]}>
                {copy.devRuntime(runtimeStatus)}
              </Text>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionEyebrow, { textAlign, writingDirection }]}>
              {copy.previewEyebrow}
            </Text>
            <Text style={[styles.sectionTitle, { textAlign, writingDirection }]}>
              {copy.previewTitle}
            </Text>
            <Text style={[styles.sectionBody, { textAlign, writingDirection }]}>
              {copy.previewBody}
            </Text>

            <View style={styles.choiceStack}>
              <PreviewChoice
                selected={previewMode === "neutral"}
                disabled={savingMode || changingEnabled}
                rtl={rtl}
                title={copy.neutralTitle}
                badge={copy.recommended}
                body={copy.neutralBody}
                onPress={() => void selectPreviewMode("neutral")}
              >
                <LockScreenPreview
                  rtl={rtl}
                  title={copy.appTitle}
                  body={copy.neutralPreview}
                />
              </PreviewChoice>

              <PreviewChoice
                selected={previewMode === "detailed"}
                disabled={savingMode || changingEnabled}
                rtl={rtl}
                title={copy.detailedTitle}
                body={copy.detailedBody}
                warning={copy.detailedWarning}
                onPress={() => void selectPreviewMode("detailed")}
              >
                <LockScreenPreview
                  rtl={rtl}
                  title={copy.appTitle}
                  body={copy.detailedPreview}
                />
              </PreviewChoice>
            </View>
          </View>

          <View style={styles.alwaysPrivateCard}>
            <Text style={[styles.alwaysPrivateTitle, { textAlign, writingDirection }]}>
              {copy.alwaysPrivateTitle}
            </Text>
            <Text style={[styles.alwaysPrivateBody, { textAlign, writingDirection }]}>
              {copy.alwaysPrivateBody}
            </Text>
          </View>

          {settings.registeredDeviceCount > 0 ? (
            <Text style={[styles.deviceNote, { textAlign, writingDirection }]}>
              {copy.deviceCount(settings.registeredDeviceCount)}
            </Text>
          ) : null}

          {message ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.message, { textAlign, writingDirection }]}
            >
              {message}
            </Text>
          ) : null}
        </View>
      )}
    </ScreenShell>
  );
}

function PreviewChoice({
  selected,
  disabled,
  rtl,
  title,
  badge,
  body,
  warning,
  onPress,
  children,
}: {
  selected: boolean;
  disabled: boolean;
  rtl: boolean;
  title: string;
  badge?: string;
  body: string;
  warning?: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected ? styles.choiceSelected : null,
        pressed && !disabled ? styles.choicePressed : null,
        disabled ? styles.choiceDisabled : null,
      ]}
    >
      <View style={[styles.choiceHeading, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <View style={[styles.radio, selected ? styles.radioSelected : null]}>
          {selected ? <View style={styles.radioInner} /> : null}
        </View>
        <View style={styles.flex}>
          <View style={[styles.titleLine, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <Text style={[styles.choiceTitle, { textAlign, writingDirection }]}>{title}</Text>
            {badge ? (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>{badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.choiceBody, { textAlign, writingDirection }]}>{body}</Text>
        </View>
      </View>

      {children}

      {warning ? (
        <Text style={[styles.warning, { textAlign, writingDirection }]}>{warning}</Text>
      ) : null}
    </Pressable>
  );
}

function LockScreenPreview({ rtl, title, body }: { rtl: boolean; title: string; body: string }) {
  return (
    <View style={styles.previewShell}>
      <View style={[styles.previewTop, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <View style={styles.previewMark}>
          <Text style={styles.previewMarkText}>م</Text>
        </View>
        <Text style={styles.previewApp}>{title}</Text>
        <Text style={styles.previewTime}>{rtl ? "الآن" : "now"}</Text>
      </View>
      <Text
        style={[
          styles.previewBody,
          { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" },
        ]}
      >
        {body}
      </Text>
    </View>
  );
}

function notificationCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "الخصوصية خارج التطبيق",
      title: "الإشعارات",
      body: "اختر إن كنت تريد تنبيهات على الجهاز، وما مقدار ما يمكن أن يظهر منها على شاشة القفل.",
      back: "رجوع",
      retry: "إعادة المحاولة",
      loadErrorTitle: "تعذر تحميل إعدادات الإشعارات",
      loadErrorBody: "لم يتم تغيير أي اختيار. تحقق من اتصالك وحاول مرة أخرى.",
      on: "الإشعارات مفعّلة",
      onBody: "سيصل إلى هذا الجهاز تنبيه هادئ عند وجود تحديث مهم وفق مستوى الخصوصية الذي اخترته.",
      off: "الإشعارات متوقفة",
      offBody: "لن يرسل ميثاق تحديثات إلى شاشة القفل. يبقى النشاط داخل التطبيق متاحاً.",
      turnOn: "تفعيل الإشعارات على هذا الجهاز",
      turnOff: "إيقاف الإشعارات",
      previewEyebrow: "ما الذي يظهر؟",
      previewTitle: "اختر مستوى التفاصيل",
      previewBody: "هذا الاختيار يخص معاينة شاشة القفل فقط. يمكنك تغييره في أي وقت.",
      neutralTitle: "محايد",
      recommended: "موصى به",
      neutralBody: "لا يوضح نوع الحدث. مناسب إذا كنت لا تريد أن يعرف من يرى شاشة هاتفك سبب استخدامك لميثاق.",
      neutralPreview: "لديك تحديث جديد.",
      detailedTitle: "أكثر تفصيلاً",
      detailedBody: "يمكن أن يذكر وجود رسالة خاصة أو تعارف خاص، لكن لا يكشف الشخص أو المحتوى.",
      detailedPreview: "لديك رسالة خاصة جديدة.",
      detailedWarning: "قد يعرف من يرى شاشة القفل أن لديك رسالة أو تعارفاً خاصاً في ميثاق.",
      alwaysPrivateTitle: "يبقى هذا مخفياً دائماً",
      alwaysPrivateBody: "حتى في الوضع الأكثر تفصيلاً لا نعرض اسم الطرف الآخر أو نص الرسالة أو صورته أو رقم هاتفه أو تفاصيل ملفه على شاشة القفل.",
      appTitle: "ميثاق",
      previewSaved: "تم حفظ مستوى الخصوصية.",
      enabledMessage: "تم تفعيل الإشعارات لهذا الجهاز.",
      disabledMessage: "تم إيقاف الإشعارات لهذا الجهاز.",
      saveError: "تعذر حفظ هذا الاختيار الآن. حاول مرة أخرى.",
      deviceCount: (count: number) => `الأجهزة المسجلة للتنبيهات: ${count}`,
      devRuntime: (status: string) =>
        status === "development_build_required"
          ? "للتطوير: التنبيهات البعيدة تحتاج نسخة تطبيق مثبّتة للاختبار. يمكنك الآن مراجعة وحفظ شكل المعاينة."
          : status === "project_not_configured"
            ? "للتطوير: ستتوفر التنبيهات البعيدة بعد تجهيز نسخة الاختبار المثبّتة."
            : "للتطوير: التنبيهات البعيدة غير متاحة على هذه المنصة.",
      enableError: (reason: string) =>
        reason === "permission_denied"
          ? "لم يسمح الجهاز بالإشعارات. يمكنك إبقاؤها متوقفة أو تغيير الإذن لاحقاً من إعدادات الجهاز."
          : reason === "development_build_required" || reason === "project_not_configured"
            ? "ستتوفر الإشعارات البعيدة في نسخة التطبيق المثبّتة للاختبار. بقي اختيار الخصوصية محفوظاً."
            : "تعذر تفعيل الإشعارات على هذا الجهاز الآن.",
    };
  }

  return {
    eyebrow: "PRIVACY OUTSIDE THE APP",
    title: "Notifications",
    body: "Choose whether this device receives alerts and how much a lock-screen preview is allowed to reveal.",
    back: "Back",
    retry: "Try again",
    loadErrorTitle: "We couldn’t load notification settings",
    loadErrorBody: "No choice was changed. Check your connection and try again.",
    on: "Notifications are on",
    onBody: "This device can receive a quiet alert for important updates using the privacy level you chose.",
    off: "Notifications are off",
    offBody: "Mithaq will not send updates to your lock screen. Activity inside the app remains available.",
    turnOn: "Turn on notifications on this device",
    turnOff: "Turn off notifications",
    previewEyebrow: "WHAT CAN APPEAR?",
    previewTitle: "Choose the amount of detail",
    previewBody: "This choice only controls the lock-screen preview. You can change it at any time.",
    neutralTitle: "Neutral",
    recommended: "Recommended",
    neutralBody: "Does not reveal what happened. Best if you do not want someone looking at your phone to infer why you use Mithaq.",
    neutralPreview: "You have a new update.",
    detailedTitle: "More detail",
    detailedBody: "May say that a private message or private introduction exists, but never identifies the person or content.",
    detailedPreview: "You have a new private message.",
    detailedWarning: "Someone looking at your lock screen may learn that you have a private message or introduction in Mithaq.",
    alwaysPrivateTitle: "Always kept out of lock-screen previews",
    alwaysPrivateBody: "Even in More detail, Mithaq never shows the other person’s name, message text, photo, phone number, or profile facts on the lock screen.",
    appTitle: "Mithaq",
    previewSaved: "Privacy level saved.",
    enabledMessage: "Notifications are enabled for this device.",
    disabledMessage: "Notifications are off for this device.",
    saveError: "We couldn’t save that choice right now. Try again.",
    deviceCount: (count: number) => `Devices registered for alerts: ${count}`,
    devRuntime: (status: string) =>
      status === "development_build_required"
        ? "Development: remote alerts need an installed test build. You can still review and save the preview style now."
        : status === "project_not_configured"
          ? "Development: remote alerts will become available once the installed test build is configured."
          : "Development: remote alerts are not available on this platform.",
    enableError: (reason: string) =>
      reason === "permission_denied"
        ? "This device did not allow notifications. You can keep them off or change the permission later in device settings."
        : reason === "development_build_required" || reason === "project_not_configured"
          ? "Remote alerts will be available in the installed test build. Your privacy choice remains saved."
          : "We couldn’t enable notifications on this device right now.",
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingState: { minHeight: 320, alignItems: "center", justifyContent: "center" },
  stack: { width: "100%", gap: 16 },
  statusCard: {
    width: "100%",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 17,
    ...shadows.card,
  },
  statusTop: { width: "100%", alignItems: "flex-start", gap: 11 },
  statusDot: { width: 11, height: 11, borderRadius: 6, marginTop: 5 },
  statusDotOn: { backgroundColor: colors.primary },
  statusDotOff: { backgroundColor: colors.mutedSoft },
  statusTitle: { width: "100%", color: colors.foreground, fontSize: 17, lineHeight: 25, fontWeight: "900" },
  statusBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 19, marginTop: 3 },
  statusAction: { width: "100%", marginTop: 14 },
  devNote: { width: "100%", color: colors.gold, fontSize: 9, lineHeight: 16, marginTop: 10 },
  section: {
    width: "100%",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 16,
  },
  sectionEyebrow: { width: "100%", color: colors.gold, fontSize: 9, lineHeight: 14, fontWeight: "900" },
  sectionTitle: { width: "100%", color: colors.foreground, fontSize: 18, lineHeight: 27, fontWeight: "900", marginTop: 4 },
  sectionBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 19, marginTop: 4 },
  choiceStack: { width: "100%", gap: 11, marginTop: 15 },
  choice: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 13,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primaryWash },
  choicePressed: { transform: [{ scale: 0.994 }], opacity: 0.92 },
  choiceDisabled: { opacity: 0.7 },
  choiceHeading: { width: "100%", gap: 10, alignItems: "flex-start" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", marginTop: 1 },
  radioSelected: { borderColor: colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  titleLine: { width: "100%", alignItems: "center", gap: 8, flexWrap: "wrap" },
  choiceTitle: { color: colors.foreground, fontSize: 14, lineHeight: 21, fontWeight: "900" },
  recommendedBadge: { borderRadius: radius.pill, backgroundColor: colors.goldSoft, paddingHorizontal: 8, paddingVertical: 4 },
  recommendedText: { color: colors.gold, fontSize: 8, lineHeight: 12, fontWeight: "900" },
  choiceBody: { width: "100%", color: colors.muted, fontSize: 10, lineHeight: 17, marginTop: 3 },
  previewShell: { width: "100%", borderRadius: radius.md, backgroundColor: "#EEF0F3", paddingHorizontal: 12, paddingVertical: 11, marginTop: 12 },
  previewTop: { width: "100%", alignItems: "center", gap: 7 },
  previewMark: { width: 24, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandNavy },
  previewMarkText: { color: colors.white, fontSize: 11, lineHeight: 15, fontWeight: "900" },
  previewApp: { flex: 1, color: colors.foreground, fontSize: 10, lineHeight: 15, fontWeight: "800" },
  previewTime: { color: colors.mutedSoft, fontSize: 9, lineHeight: 14 },
  previewBody: { width: "100%", color: colors.foreground, fontSize: 12, lineHeight: 19, fontWeight: "700", marginTop: 7 },
  warning: { width: "100%", color: colors.danger, fontSize: 9, lineHeight: 16, marginTop: 9 },
  alwaysPrivateCard: { width: "100%", borderRadius: radius.lg, backgroundColor: colors.primaryWash, padding: 14 },
  alwaysPrivateTitle: { width: "100%", color: colors.primaryStrong, fontSize: 12, lineHeight: 19, fontWeight: "900" },
  alwaysPrivateBody: { width: "100%", color: colors.muted, fontSize: 10, lineHeight: 18, marginTop: 3 },
  deviceNote: { width: "100%", color: colors.mutedSoft, fontSize: 9, lineHeight: 15 },
  message: { width: "100%", color: colors.primary, fontSize: 11, lineHeight: 18, fontWeight: "700" },
});
