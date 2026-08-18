import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

type ConsentEvent = {
  id: string;
  consent_type: string;
  event_type: "granted" | "withdrawn";
  document_version: string;
  locale: string;
  recorded_at: string;
};

type DeletionRequest = {
  id: string;
  status: string;
  requested_at: string;
  due_at: string | null;
};

export default function PrivacyScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = privacyCopy(locale);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [consents, setConsents] = useState<ConsentEvent[]>([]);
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      setLoadError(false);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setLoadError(true);
        setLoading(false);
        return false;
      }

      if (!sessionData.session) {
        router.replace({ pathname: "/auth", params: { locale } });
        return false;
      }

      const [consentResult, deletionResult] = await Promise.all([
        supabase
          .from("waitlist_consents")
          .select("id, consent_type, event_type, document_version, locale, recorded_at")
          .order("recorded_at", { ascending: false }),
        supabase
          .from("deletion_requests")
          .select("id, status, requested_at, due_at")
          .eq("request_scope", "entire_account")
          .order("requested_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (consentResult.error || deletionResult.error) {
        setLoadError(true);
        setLoading(false);
        return false;
      }

      const latest = new Map<string, ConsentEvent>();
      for (const event of (consentResult.data ?? []) as ConsentEvent[]) {
        if (!latest.has(event.consent_type)) latest.set(event.consent_type, event);
      }

      setConsents(Array.from(latest.values()));
      setDeletionRequest((deletionResult.data as DeletionRequest | null) ?? null);
      setLoading(false);
      return true;
    },
    [locale],
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  const communicationsEnabled = useMemo(
    () => consents.find((event) => event.consent_type === "communications")?.event_type === "granted",
    [consents],
  );

  async function updateCommunications(enabled: boolean) {
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.rpc("set_communications_consent", {
      p_enabled: enabled,
      p_locale: locale,
    });

    if (error) {
      setSaving(false);
      setMessage(copy.genericError);
      return;
    }

    const refreshed = await load(false);
    setSaving(false);
    if (refreshed) setMessage(enabled ? copy.updatesEnabled : copy.updatesDisabled);
  }

  async function requestDeletion() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setMessage(null);
      return;
    }

    setSaving(true);
    setMessage(null);
    const { error } = await supabase.rpc("request_account_deletion", { p_locale: locale });

    if (error) {
      setSaving(false);
      setMessage(copy.genericError);
      return;
    }

    setConfirmDelete(false);
    const refreshed = await load(false);
    setSaving(false);
    if (refreshed) setMessage(copy.deletionRecorded);
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
        <View
          style={styles.loadingState}
          accessibilityLabel={rtl ? "جارٍ تحميل إعدادات الخصوصية" : "Loading privacy settings"}
        >
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : loadError ? (
        <StateCard
          rtl={rtl}
          tone="error"
          title={rtl ? "تعذر تحميل بيانات الخصوصية" : "We couldn’t load your privacy data"}
          body={
            rtl
              ? "لن نعرض حالة غير مؤكدة لموافقاتك أو طلب الحذف. تحقق من اتصالك ثم أعد المحاولة."
              : "We won’t guess at your consent or deletion status. Check your connection and try again."
          }
          actionLabel={rtl ? "إعادة المحاولة" : "Try again"}
          onAction={() => void load(true)}
        />
      ) : (
        <View style={styles.stack}>
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.consentTitle}</Text>
            <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left" }]}>{copy.consentBody}</Text>
            <View style={styles.consentList}>
              {consents
                .filter((event) => event.consent_type !== "communications")
                .map((event) => (
                  <ConsentRow key={event.consent_type} event={event} locale={locale} rtl={rtl} />
                ))}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.updatesTitle}</Text>
            <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left" }]}>{copy.updatesBody}</Text>
            <View style={[styles.preferenceRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <View style={styles.preferenceCopy}>
                <Text style={[styles.preferenceLabel, { textAlign: rtl ? "right" : "left" }]}>
                  {communicationsEnabled ? copy.updatesOn : copy.updatesOff}
                </Text>
                <Text style={[styles.preferenceMeta, { textAlign: rtl ? "right" : "left" }]}>{copy.updatesMeta}</Text>
              </View>
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel={copy.updatesTitle}
                accessibilityState={{ checked: communicationsEnabled, disabled: saving || Boolean(deletionRequest) }}
                disabled={saving || Boolean(deletionRequest)}
                onPress={() => void updateCommunications(!communicationsEnabled)}
                style={[
                  styles.switchTrack,
                  communicationsEnabled ? styles.switchTrackEnabled : null,
                  saving || deletionRequest ? styles.disabled : null,
                ]}
              >
                <View style={[styles.switchThumb, communicationsEnabled ? styles.switchThumbEnabled : null]} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.deletionCard, deletionRequest ? styles.deletionPending : null]}>
            <Text style={[styles.deletionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.deleteTitle}</Text>
            <Text style={[styles.deletionBody, { textAlign: rtl ? "right" : "left" }]}>
              {deletionRequest ? copy.deletePendingBody : copy.deleteBody}
            </Text>

            {deletionRequest ? (
              <View style={styles.pendingMeta}>
                <Text style={[styles.pendingLabel, { textAlign: rtl ? "right" : "left" }]}>
                  {copy.requestedOn}: {formatDate(deletionRequest.requested_at, locale)}
                </Text>
                {deletionRequest.due_at ? (
                  <Text style={[styles.pendingLabel, { textAlign: rtl ? "right" : "left" }]}>
                    {copy.processingBy}: {formatDate(deletionRequest.due_at, locale)}
                  </Text>
                ) : null}
              </View>
            ) : confirmDelete ? (
              <View style={styles.confirmationBox}>
                <Text style={[styles.confirmationText, { textAlign: rtl ? "right" : "left" }]}>
                  {copy.confirmDelete}
                </Text>
                <PrimaryButton loading={saving} onPress={() => void requestDeletion()}>
                  {copy.confirmDeleteButton}
                </PrimaryButton>
                <PrimaryButton tone="quiet" disabled={saving} onPress={() => setConfirmDelete(false)}>
                  {copy.cancel}
                </PrimaryButton>
              </View>
            ) : (
              <PrimaryButton tone="quiet" onPress={() => void requestDeletion()}>
                {copy.deleteButton}
              </PrimaryButton>
            )}
          </View>

          {message ? (
            <Text accessibilityLiveRegion="polite" style={[styles.message, { textAlign: rtl ? "right" : "left" }]}>
              {message}
            </Text>
          ) : null}
        </View>
      )}
    </ScreenShell>
  );
}

function ConsentRow({ event, locale, rtl }: { event: ConsentEvent; locale: MobileLocale; rtl: boolean }) {
  const label = consentLabel(event.consent_type, locale);
  return (
    <View style={[styles.consentRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <View style={styles.consentMark}>
        <Text style={styles.consentMarkText}>✓</Text>
      </View>
      <View style={styles.consentCopy}>
        <Text style={[styles.consentLabel, { textAlign: rtl ? "right" : "left" }]}>{label}</Text>
        <Text style={[styles.consentMeta, { textAlign: rtl ? "right" : "left" }]}>
          {formatDate(event.recorded_at, locale)} · {event.document_version}
        </Text>
      </View>
    </View>
  );
}

function consentLabel(type: string, locale: MobileLocale) {
  const labels: Record<string, { ar: string; en: string }> = {
    age_18_plus: { ar: "تأكيد العمر 18+", en: "Age 18+ confirmation" },
    terms: { ar: "شروط الاستخدام", en: "Terms of Use" },
    privacy: { ar: "سياسة الخصوصية", en: "Privacy Policy" },
    waitlist_processing: { ar: "معالجة بيانات قائمة الانتظار", en: "Waitlist data processing" },
  };
  return labels[type]?.[locale] ?? type;
}

function formatDate(value: string, locale: MobileLocale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-LY" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function privacyCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "الخصوصية والموافقة",
      title: "بياناتك تحت سيطرتك",
      body: "راجع موافقاتك، تحكم في التحديثات الاختيارية، واطلب حذف حسابك من مكان واحد.",
      consentTitle: "سجل الموافقات",
      consentBody: "نحتفظ بنسخة مؤرخة من الموافقات المهمة حتى تبقى شروط استخدام بياناتك واضحة.",
      updatesTitle: "تحديثات ميثاق",
      updatesBody: "هذه الرسائل اختيارية ولا تؤثر على أهليتك أو مكانك في قائمة الانتظار.",
      updatesOn: "التحديثات مفعّلة",
      updatesOff: "التحديثات متوقفة",
      updatesMeta: "يمكنك تغيير هذا الاختيار في أي وقت.",
      updatesEnabled: "تم تفعيل تحديثات ميثاق.",
      updatesDisabled: "تم إيقاف تحديثات ميثاق.",
      deleteTitle: "حذف الحساب",
      deleteBody:
        "طلب الحذف يوقف مشاركتك في قائمة الانتظار والتحديثات الاختيارية فوراً، ثم ينتقل الحساب لمعالجة الحذف.",
      deletePendingBody:
        "طلب حذف حسابك مسجل. مشاركتك في قائمة الانتظار والتحديثات الاختيارية متوقفة أثناء معالجة الطلب.",
      deleteButton: "طلب حذف حسابي",
      confirmDelete: "هل أنت متأكد؟ ستُسحب مشاركتك من قائمة الانتظار فور تأكيد هذا الطلب.",
      confirmDeleteButton: "نعم، اطلب حذف الحساب",
      cancel: "إلغاء",
      requestedOn: "تاريخ الطلب",
      processingBy: "موعد المعالجة المستهدف",
      deletionRecorded: "تم تسجيل طلب حذف الحساب وإيقاف مشاركتك في قائمة الانتظار.",
      genericError: "تعذر حفظ التغيير الآن. حاول مرة أخرى.",
      back: "العودة إلى الأمان",
    };
  }

  return {
    eyebrow: "Privacy & consent",
    title: "Your data stays under your control",
    body: "Review consent history, control optional updates, and request account deletion in one place.",
    consentTitle: "Consent record",
    consentBody: "Mithaq keeps a dated record of important consents so the terms governing your data stay explicit.",
    updatesTitle: "Mithaq updates",
    updatesBody: "These messages are optional and never affect your eligibility or waitlist position.",
    updatesOn: "Updates enabled",
    updatesOff: "Updates off",
    updatesMeta: "You can change this preference at any time.",
    updatesEnabled: "Mithaq updates are enabled.",
    updatesDisabled: "Mithaq updates are turned off.",
    deleteTitle: "Delete account",
    deleteBody:
      "A deletion request immediately stops your waitlist participation and optional updates, then moves the account into deletion processing.",
    deletePendingBody:
      "Your deletion request is recorded. Waitlist participation and optional updates are stopped while the request is processed.",
    deleteButton: "Request account deletion",
    confirmDelete: "Are you sure? Your waitlist participation will be withdrawn as soon as you confirm this request.",
    confirmDeleteButton: "Yes, request account deletion",
    cancel: "Cancel",
    requestedOn: "Requested",
    processingBy: "Target processing date",
    deletionRecorded: "Your deletion request is recorded and your waitlist participation has stopped.",
    genericError: "We could not save that change right now. Try again.",
    back: "Back to security",
  };
}

const styles = StyleSheet.create({
  loadingState: { minHeight: 220, alignItems: "center", justifyContent: "center" },
  stack: { gap: 14 },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 17,
  },
  sectionTitle: { color: colors.foreground, fontSize: 17, fontWeight: "800" },
  sectionBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 6 },
  consentList: { gap: 10, marginTop: 15 },
  consentRow: { alignItems: "center", gap: 11 },
  consentMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
  },
  consentMarkText: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  consentCopy: { flex: 1 },
  consentLabel: { color: colors.foreground, fontSize: 13, fontWeight: "800" },
  consentMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  preferenceRow: { alignItems: "center", gap: 14, marginTop: 16 },
  preferenceCopy: { flex: 1 },
  preferenceLabel: { color: colors.foreground, fontSize: 14, fontWeight: "800" },
  preferenceMeta: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  switchTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 3,
    backgroundColor: colors.borderStrong,
    justifyContent: "center",
  },
  switchTrackEnabled: { backgroundColor: colors.primary },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white },
  switchThumbEnabled: { alignSelf: "flex-end" },
  disabled: { opacity: 0.5 },
  deletionCard: {
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 17,
  },
  deletionPending: { borderColor: colors.goldSoft, backgroundColor: colors.primaryWash },
  deletionTitle: { color: colors.foreground, fontSize: 17, fontWeight: "800" },
  deletionBody: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  pendingMeta: { gap: 5 },
  pendingLabel: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  confirmationBox: { gap: 10 },
  confirmationText: { color: colors.foreground, fontSize: 13, lineHeight: 21, fontWeight: "700" },
  message: { color: colors.primary, fontSize: 13, lineHeight: 20, fontWeight: "700" },
});
