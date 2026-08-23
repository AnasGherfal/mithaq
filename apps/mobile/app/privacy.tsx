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
          <View style={styles.promiseCard}>
            <Text style={[styles.promiseTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.promiseTitle}</Text>
            <Text style={[styles.promiseBody, { textAlign: rtl ? "right" : "left" }]}>{copy.promiseBody}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.controlTitle}</Text>
            <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left" }]}>{copy.controlBody}</Text>
            <View style={styles.pointList}>
              {copy.controlPoints.map((point) => (
                <PrivacyPoint key={point.title} rtl={rtl} title={point.title} body={point.body} />
              ))}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.dataTitle}</Text>
            <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left" }]}>{copy.dataBody}</Text>
            <View style={styles.pointList}>
              {copy.dataPoints.map((point) => (
                <PrivacyPoint key={point.title} rtl={rtl} title={point.title} body={point.body} />
              ))}
            </View>
          </View>

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
            <Text style={[styles.retentionNote, { textAlign: rtl ? "right" : "left" }]}>{copy.deleteRetention}</Text>

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

function PrivacyPoint({ rtl, title, body }: { rtl: boolean; title: string; body: string }) {
  return (
    <View style={[styles.pointRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <View style={styles.pointMark}>
        <Text style={styles.pointMarkText}>✓</Text>
      </View>
      <View style={styles.pointCopy}>
        <Text style={[styles.pointTitle, { textAlign: rtl ? "right" : "left" }]}>{title}</Text>
        <Text style={[styles.pointBody, { textAlign: rtl ? "right" : "left" }]}>{body}</Text>
      </View>
    </View>
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
    waitlist_processing: { ar: "معالجة بيانات التسجيل المبكر", en: "Early-access data processing" },
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
      title: "أنت تختار من يعرف، ماذا يعرف، ومتى",
      body: "راجع موافقاتك، افهم ما يظهر للآخرين، وتحكم في التحديثات وحذف الحساب من مكان واحد.",
      promiseTitle: "وجودك في ميثاق خاص",
      promiseBody:
        "لا يوجد دليل أعضاء أو بحث بالهاتف أو ملف عام أو متابعون أو حالة اتصال. اهتمامك وقراراتك الفردية لا تُكشف للطرف الآخر.",
      controlTitle: "ما الذي تتحكم فيه",
      controlBody: "الخصوصية ليست إعداداً واحداً. ميثاق يفصل بين الظهور، التعارف، الصورة، ودائرة الثقة.",
      controlPoints: [
        {
          title: "خصوصية أولاً",
          body: "يمكن أن يظهر العمر التقريبي والمدينة والحالة الاجتماعية والأطفال وفئات توافق آمنة، بينما يبقى الاسم والصورة والنبذة والعمل والتعليم والأصل مخفياً في الاكتشاف.",
        },
        {
          title: "ملف مفتوح باختيارك",
          body: "إذا اخترت الظهور من البداية، يمكن عرض الاسم الظاهر والصورة المعتمدة إن وجدت والنبذة والعمل والتعليم والأصل، إضافة إلى معلومات التوافق الأساسية.",
        },
        {
          title: "اهتمام خاص وإخفاء متبادل",
          body: "الاهتمام من طرف واحد لا يرسل إشعاراً. درع العائلة أو خيار «أعرف هذا الشخص» يمنع ظهوركما لبعضكما دون إخبار الطرف الآخر بالسبب.",
        },
        {
          title: "دائرة الثقة بموافقة صريحة",
          body: "لا تُشارك جهة اتصال موثوقة إلا بعد قبول متبادل وباختيارك. المشاركة تحفظ نسخة مرتبطة بذلك التعارف؛ تعديل جهة الاتصال لاحقاً لا يغيّر النسخة التي سبق مشاركتها.",
        },
      ],
      dataTitle: "ما لا نعرضه وكيف نتعامل مع السجلات",
      dataBody: "ميثاق يقلل البيانات المكشوفة للأعضاء ويحتفظ ببعض السجلات فقط بقدر ما يلزم لتشغيل الخدمة والسلامة.",
      dataPoints: [
        {
          title: "لا نعرض البيانات الحساسة للأعضاء",
          body: "رقم الهاتف والاسم القانوني والعنوان الدقيق ووثائق الهوية وصور التحقق وبيانات السلامة الداخلية لا تظهر في ملفات الأعضاء.",
        },
        {
          title: "الإشعارات محايدة افتراضياً",
          body: "عنوان الإشعار على جهازك يُستخدم لإيصال تنبيهات الحساب الخاصة فقط. يمكن إلغاء تسجيل الجهاز عند إيقاف الإشعارات أو تسجيل الخروج.",
        },
        {
          title: "سجلات السلامة لها معاملة مختلفة",
          body: "البلاغات خاصة. عند حذف الحساب تُمحى النصوص الحرة المرتبطة به وتُفصل روابط الهوية، وقد يبقى حد أدنى من السجل المنظم للمحافظة على نزاهة المراجعة ومنع إساءة الاستخدام.",
        },
        {
          title: "رسائل المحادثات المغلقة ليست دائمة بلا سبب",
          body: "الرسائل في المحادثات المغلقة تخضع لتنظيف الاحتفاظ. إذا كان هناك بلاغ سلامة مفتوح بين الطرفين، يؤجل ميثاق حذف رسائل تلك المحادثة حتى لا تضيع أدلة المراجعة.",
        },
      ],
      consentTitle: "سجل الموافقات",
      consentBody: "نحتفظ بنسخة مؤرخة من الموافقات المهمة حتى تبقى شروط استخدام بياناتك واضحة.",
      updatesTitle: "تحديثات ميثاق",
      updatesBody: "هذه الرسائل اختيارية ولا تؤثر على أهليتك للزواج أو ترتيب ظهورك.",
      updatesOn: "التحديثات مفعّلة",
      updatesOff: "التحديثات متوقفة",
      updatesMeta: "يمكنك تغيير هذا الاختيار في أي وقت.",
      updatesEnabled: "تم تفعيل تحديثات ميثاق.",
      updatesDisabled: "تم إيقاف تحديثات ميثاق.",
      deleteTitle: "حذف الحساب",
      deleteBody:
        "طلب الحذف يوقف ظهور حسابك ومشاركتك الجديدة والتحديثات الاختيارية، ثم يدخل الحساب معالجة الحذف.",
      deletePendingBody:
        "طلب حذف حسابك مسجل. حسابك متوقف عن الظهور والمشاركة الجديدة أثناء معالجة الطلب.",
      deleteRetention:
        "الحذف لا يعني محو كل أثر سلامة فوراً: قد يبقى حد أدنى من سجل المراجعة المنظم بعد فصل الهوية، بينما تُمحى النصوص الحرة المرتبطة بالحساب. يظهر أدناه موعد المعالجة المستهدف عندما يكون متاحاً.",
      deleteButton: "طلب حذف حسابي",
      confirmDelete:
        "هل أنت متأكد؟ سيتوقف حسابك عن الظهور والمشاركة الجديدة فور تسجيل الطلب، وستبدأ معالجة حذف الحساب.",
      confirmDeleteButton: "نعم، اطلب حذف الحساب",
      cancel: "إلغاء",
      requestedOn: "تاريخ الطلب",
      processingBy: "موعد المعالجة المستهدف",
      deletionRecorded: "تم تسجيل طلب حذف الحساب وإيقاف ظهوره ومشاركته الجديدة.",
      genericError: "تعذر حفظ التغيير الآن. حاول مرة أخرى.",
      back: "العودة إلى الأمان والخصوصية",
    };
  }

  return {
    eyebrow: "Privacy & consent",
    title: "You choose who knows, what they know, and when",
    body: "Review consent history, understand what others can see, and control optional updates and account deletion.",
    promiseTitle: "Your presence on Mithaq is private",
    promiseBody:
      "There is no member directory, find-by-phone, public profile URL, follower count, or presence status. One-sided interest and decisions are not exposed to the other person.",
    controlTitle: "What you control",
    controlBody: "Privacy is not one switch. Mithaq separates discovery visibility, introductions, photos, and Trusted Circle sharing.",
    controlPoints: [
      {
        title: "Private first",
        body: "Discover may show a broad age band, city, marital status, children, and safe alignment categories while keeping name, photo, bio, work, education, and origin hidden.",
      },
      {
        title: "Open profile by your choice",
        body: "If you choose to be visible from the start, Discover may show your display name, an approved photo if you have one, bio, work, education, origin, and core compatibility context.",
      },
      {
        title: "Private interest and reciprocal hiding",
        body: "A one-sided interest sends no notification. Family Shield or “I know this person” keeps the pair from appearing to each other without telling the other person why.",
      },
      {
        title: "Trusted Circle only with explicit sharing",
        body: "A trusted contact is shared only after mutual acceptance and only when you choose it. Sharing creates an introduction-specific snapshot; later edits to the saved contact do not rewrite what was already shared.",
      },
    ],
    dataTitle: "What we do not expose and how records are handled",
    dataBody: "Mithaq minimizes member-visible data and keeps operational records only as needed to run the service and protect safety.",
    dataPoints: [
      {
        title: "Sensitive data is not shown to members",
        body: "Phone number, legal identity, exact address, identity documents, verification selfies, and internal safety data do not appear in member profiles.",
      },
      {
        title: "Notifications are neutral by default",
        body: "Your device notification address is used only to route private account alerts. The device can be unregistered when notifications are turned off or you sign out.",
      },
      {
        title: "Safety records are handled differently",
        body: "Reports stay private. When an account is deleted, free-text tied to it is erased and identity links are detached; a minimal structured moderation record may remain to preserve review integrity and prevent abuse.",
      },
      {
        title: "Closed-chat messages are not kept forever without reason",
        body: "Messages in closed conversations are subject to retention cleanup. If an open safety case exists between the two members, Mithaq delays purging that conversation so review evidence is not destroyed.",
      },
    ],
    consentTitle: "Consent record",
    consentBody: "Mithaq keeps a dated record of important consents so the terms governing your data stay explicit.",
    updatesTitle: "Mithaq updates",
    updatesBody: "These messages are optional and never affect Marriage eligibility or discovery ordering.",
    updatesOn: "Updates enabled",
    updatesOff: "Updates off",
    updatesMeta: "You can change this preference at any time.",
    updatesEnabled: "Mithaq updates are enabled.",
    updatesDisabled: "Mithaq updates are turned off.",
    deleteTitle: "Delete account",
    deleteBody:
      "A deletion request stops your account from appearing or taking part in new activity and turns off optional updates, then moves the account into deletion processing.",
    deletePendingBody:
      "Your deletion request is recorded. Your account is no longer appearing or taking part in new activity while the request is processed.",
    deleteRetention:
      "Deletion does not mean every safety trace disappears immediately: a minimal structured review record may remain after identity is detached, while free-text tied to the account is erased. Your target processing date appears below when available.",
    deleteButton: "Request account deletion",
    confirmDelete:
      "Are you sure? Your account will stop appearing and taking part in new activity as soon as the request is recorded, and deletion processing will begin.",
    confirmDeleteButton: "Yes, request account deletion",
    cancel: "Cancel",
    requestedOn: "Requested",
    processingBy: "Target processing date",
    deletionRecorded: "Your deletion request is recorded and your account has stopped appearing and taking part in new activity.",
    genericError: "We could not save that change right now. Try again.",
    back: "Back to security & privacy",
  };
}

const styles = StyleSheet.create({
  loadingState: { minHeight: 220, alignItems: "center", justifyContent: "center" },
  stack: { gap: 14 },
  promiseCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primaryWash,
    padding: 17,
  },
  promiseTitle: { color: colors.primaryStrong, fontSize: 18, lineHeight: 27, fontWeight: "900" },
  promiseBody: { color: colors.foreground, fontSize: 13, lineHeight: 22, marginTop: 7 },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 17,
  },
  sectionTitle: { color: colors.foreground, fontSize: 17, fontWeight: "800" },
  sectionBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 6 },
  pointList: { gap: 14, marginTop: 16 },
  pointRow: { alignItems: "flex-start", gap: 11 },
  pointMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
    marginTop: 1,
  },
  pointMarkText: { color: colors.primary, fontSize: 12, fontWeight: "900" },
  pointCopy: { flex: 1 },
  pointTitle: { color: colors.foreground, fontSize: 13, lineHeight: 20, fontWeight: "800" },
  pointBody: { color: colors.muted, fontSize: 11, lineHeight: 19, marginTop: 3 },
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
  retentionNote: { color: colors.muted, fontSize: 11, lineHeight: 19 },
  pendingMeta: { gap: 5 },
  pendingLabel: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  confirmationBox: { gap: 10 },
  confirmationText: { color: colors.foreground, fontSize: 13, lineHeight: 21, fontWeight: "700" },
  message: { color: colors.primary, fontSize: 13, lineHeight: 20, fontWeight: "700" },
});