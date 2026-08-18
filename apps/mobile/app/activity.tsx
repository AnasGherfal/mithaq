import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

type NotificationRow = {
  notification_id: string;
  notification_kind: "introduction_offered" | "introduction_mutually_accepted" | "message_received";
  introduction_id: string;
  created_at: string;
  is_read: boolean;
};

const PAGE_SIZE = 50;

export default function ActivityScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => activityCopy(locale), [locale]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);

  const markVisibleRead = useCallback(async (rows: NotificationRow[]) => {
    const newest = rows[0];
    if (!newest) return;
    await supabase.rpc("mark_my_notifications_read_v2", {
      p_through_created_at: newest.created_at,
      p_through_notification_id: newest.notification_id,
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setOlderError(null);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    if (!sessionData.session) {
      router.replace({ pathname: "/auth", params: { locale } });
      return;
    }

    const { data, error } = await supabase.rpc("list_my_notifications_v2", {
      p_before_created_at: null,
      p_before_notification_id: null,
      p_limit: PAGE_SIZE,
    });
    if (error) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as NotificationRow[];
    setItems(rows);
    setHasOlder(rows.length === PAGE_SIZE);
    setLoading(false);
    void markVisibleRead(rows);
  }, [locale, markVisibleRead]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadOlder() {
    if (!hasOlder || loadingOlder || items.length === 0) return;
    const oldest = items[items.length - 1];
    if (!oldest) return;

    setLoadingOlder(true);
    setOlderError(null);
    const { data, error } = await supabase.rpc("list_my_notifications_v2", {
      p_before_created_at: oldest.created_at,
      p_before_notification_id: oldest.notification_id,
      p_limit: PAGE_SIZE,
    });
    setLoadingOlder(false);

    if (error) {
      setOlderError(copy.olderError);
      return;
    }

    const rows = (data ?? []) as NotificationRow[];
    setItems((current) => {
      const existing = new Set(current.map((item) => item.notification_id));
      return [...current, ...rows.filter((item) => !existing.has(item.notification_id))];
    });
    setHasOlder(rows.length === PAGE_SIZE);
    void markVisibleRead(rows);
  }

  function openItem(item: NotificationRow) {
    if (item.notification_kind === "message_received" || item.notification_kind === "introduction_mutually_accepted") {
      router.push({
        pathname: "/conversation",
        params: { locale, introductionId: item.introduction_id },
      });
      return;
    }

    router.push({ pathname: "/introductions", params: { locale } });
  }

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={
        <PrimaryButton tone="quiet" onPress={() => router.replace({ pathname: "/status", params: { locale } })}>
          {copy.back}
        </PrimaryButton>
      }
    >
      {loading ? (
        <View style={styles.loadingState} accessibilityLabel={copy.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loadError ? (
        <StateCard
          rtl={rtl}
          tone="error"
          title={copy.errorTitle}
          body={copy.errorBody}
          actionLabel={copy.retry}
          onAction={() => void load()}
        />
      ) : items.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyMark}>
            <Text style={styles.emptyMarkText}>✦</Text>
          </View>
          <Text style={[styles.emptyTitle, { textAlign: "center" }]}>{copy.emptyTitle}</Text>
          <Text style={[styles.emptyBody, { textAlign: "center" }]}>{copy.emptyBody}</Text>
        </View>
      ) : (
        <View style={styles.stack}>
          <View style={styles.privacyCard}>
            <Text style={[styles.privacyTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.privacyTitle}</Text>
            <Text style={[styles.privacyBody, { textAlign: rtl ? "right" : "left" }]}>{copy.privacyBody}</Text>
          </View>

          <View style={styles.list}>
            {items.map((item) => {
              const isMessage = item.notification_kind === "message_received";
              const isMutual = item.notification_kind === "introduction_mutually_accepted";
              const date = new Date(item.created_at).toLocaleString(locale === "ar" ? "ar-LY" : "en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              });
              const title = isMessage ? copy.messageTitle : isMutual ? copy.mutualTitle : copy.introductionTitle;
              const body = isMessage ? copy.messageBody : isMutual ? copy.mutualBody : copy.introductionBody;

              return (
                <Pressable
                  key={item.notification_id}
                  accessibilityRole="button"
                  onPress={() => openItem(item)}
                  style={({ pressed }) => [
                    styles.itemCard,
                    !item.is_read ? styles.itemUnread : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <View style={[styles.itemTop, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                    <View
                      style={[
                        styles.itemMark,
                        isMessage ? styles.messageMark : null,
                        isMutual ? styles.mutualMark : null,
                      ]}
                    >
                      <Text style={styles.itemMarkText}>{isMessage ? "•" : isMutual ? "✓" : "✦"}</Text>
                    </View>
                    <View style={styles.itemCopy}>
                      <Text style={[styles.itemTitle, { textAlign: rtl ? "right" : "left" }]}>{title}</Text>
                      <Text style={[styles.itemBody, { textAlign: rtl ? "right" : "left" }]}>{body}</Text>
                      <Text style={[styles.itemDate, { textAlign: rtl ? "right" : "left" }]}>{date}</Text>
                    </View>
                    {!item.is_read ? <View style={styles.unreadDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {hasOlder ? (
            <PrimaryButton tone="quiet" loading={loadingOlder} onPress={() => void loadOlder()}>
              {copy.loadEarlier}
            </PrimaryButton>
          ) : null}
          {olderError ? (
            <Text accessibilityRole="alert" style={[styles.error, { textAlign: rtl ? "right" : "left" }]}>
              {olderError}
            </Text>
          ) : null}
        </View>
      )}
    </ScreenShell>
  );
}

function activityCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "نشاطك الخاص",
      title: "مركز النشاط",
      body: "مكان واحد للتنبيهات المهمة داخل ميثاق، من دون عرض محتوى الرسائل أو أي بيانات تعريفية حساسة في قائمة النشاط.",
      loading: "جارٍ تحميل مركز النشاط",
      errorTitle: "تعذر تحميل النشاط",
      errorBody: "لم نغيّر أي بيانات. تحقق من اتصالك وحاول مرة أخرى.",
      retry: "إعادة المحاولة",
      back: "العودة إلى الحساب",
      emptyTitle: "لا يوجد نشاط جديد",
      emptyBody: "عندما ينشئ ميثاق تعارفاً خاصاً لك أو تصلك رسالة داخل تعارف مقبول، ستظهر الإشارة هنا.",
      privacyTitle: "إشعارات مصممة للخصوصية",
      privacyBody:
        "قائمة النشاط لا تعرض نص الرسالة ولا رقم الهاتف ولا معرف الطرف الآخر. افتح التعارف نفسه لرؤية ما يسمح به ميثاق فقط.",
      introductionTitle: "تعارف خاص جديد",
      introductionBody: "أنشأ ميثاق تعارفاً خاصاً لك. افتح التعارف لمراجعة الملف المسموح به واتخاذ قرارك.",
      mutualTitle: "تم قبول التعارف من الطرفين",
      mutualBody: "أصبح التواصل الخاص لهذا التعارف متاحاً الآن. افتحه عندما تكون جاهزاً.",
      messageTitle: "رسالة جديدة",
      messageBody: "وصلت رسالة داخل تعارف تم قبوله من الطرفين.",
      loadEarlier: "عرض نشاط أقدم",
      olderError: "تعذر تحميل النشاط الأقدم. حاول مرة أخرى.",
    };
  }

  return {
    eyebrow: "Private activity",
    title: "Activity Center",
    body: "One place for important Mithaq activity without exposing message content or sensitive identifying data in the notification list.",
    loading: "Loading Activity Center",
    errorTitle: "We couldn’t load activity",
    errorBody: "No data was changed. Check your connection and try again.",
    retry: "Try again",
    back: "Back to account",
    emptyTitle: "No new activity",
    emptyBody:
      "When Mithaq creates a private introduction for you or a message arrives in a mutually accepted introduction, it will appear here.",
    privacyTitle: "Privacy-minimal notifications",
    privacyBody:
      "Activity never shows message text, phone numbers, or the other member’s identifier. Open the introduction to see only what Mithaq permits.",
    introductionTitle: "New private introduction",
    introductionBody:
      "Mithaq created a private introduction for you. Open it to review the permitted profile and make your decision.",
    mutualTitle: "Introduction accepted by both sides",
    mutualBody: "Private communication for this introduction is now available. Open it when you are ready.",
    messageTitle: "New message",
    messageBody: "A message arrived inside a mutually accepted introduction.",
    loadEarlier: "Show earlier activity",
    olderError: "We couldn’t load earlier activity. Try again.",
  };
}

const styles = StyleSheet.create({
  loadingState: { minHeight: 220, alignItems: "center", justifyContent: "center" },
  stack: { gap: 14 },
  list: { gap: 10 },
  privacyCard: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryWash,
    padding: 17,
  },
  privacyTitle: { color: colors.primary, fontSize: 15, fontWeight: "800" },
  privacyBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 6 },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    padding: 15,
  },
  itemUnread: { borderColor: colors.borderStrong, backgroundColor: colors.primaryWash },
  itemTop: { alignItems: "flex-start", gap: 12 },
  itemMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  messageMark: { backgroundColor: colors.foreground },
  mutualMark: { backgroundColor: colors.gold },
  itemMarkText: { color: colors.white, fontSize: 17, fontWeight: "900" },
  itemCopy: { flex: 1 },
  itemTitle: { color: colors.foreground, fontSize: 15, fontWeight: "800" },
  itemBody: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 5 },
  itemDate: { color: colors.mutedSoft, fontSize: 11, marginTop: 8 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginTop: 4 },
  emptyCard: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    padding: 24,
  },
  emptyMark: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
    marginBottom: 14,
  },
  emptyMarkText: { color: colors.primary, fontSize: 24, fontWeight: "900" },
  emptyTitle: { color: colors.foreground, fontSize: 17, fontWeight: "800" },
  emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 7, maxWidth: 320 },
  pressed: { opacity: 0.72 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 19 },
});
