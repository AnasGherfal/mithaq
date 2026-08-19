import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

type NotificationKind =
  | "introduction_offered"
  | "introduction_mutually_accepted"
  | "message_received";

type NotificationRow = {
  notification_id: string;
  notification_kind: NotificationKind;
  introduction_id: string;
  created_at: string;
  is_read: boolean;
};

const PAGE_SIZE = 50;

export default function ActivityScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
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
    if (
      item.notification_kind === "message_received" ||
      item.notification_kind === "introduction_mutually_accepted"
    ) {
      router.push({
        pathname: "/conversation",
        params: { locale, introductionId: item.introduction_id },
      });
      return;
    }

    router.push({ pathname: "/introductions", params: { locale } });
  }

  return (
    <ScreenShell title={copy.title} body={copy.body} rtl={rtl}>
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
        <View style={[styles.emptyState, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
          <View style={styles.emptyIcon}>
            <AppIcon name="activity" active size={27} />
          </View>
          <Text style={[styles.emptyTitle, { textAlign, writingDirection }]}>{copy.emptyTitle}</Text>
          <Text style={[styles.emptyBody, { textAlign, writingDirection }]}>{copy.emptyBody}</Text>
        </View>
      ) : (
        <View style={styles.page}>
          <View
            style={[
              styles.privacyNote,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            <View style={styles.privacyIcon}>
              <AppIcon name="privacy" active size={18} />
            </View>
            <Text style={[styles.privacyText, { textAlign, writingDirection }]}>
              {copy.privacyBody}
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { textAlign, writingDirection }]}>{copy.recent}</Text>

          <View style={styles.inbox}>
            {items.map((item, index) => (
              <ActivityRow
                key={item.notification_id}
                item={item}
                rtl={rtl}
                copy={copy}
                last={index === items.length - 1}
                onPress={() => openItem(item)}
              />
            ))}
          </View>

          {hasOlder ? (
            <PrimaryButton tone="quiet" loading={loadingOlder} onPress={() => void loadOlder()}>
              {copy.loadEarlier}
            </PrimaryButton>
          ) : null}

          {olderError ? (
            <Text accessibilityRole="alert" style={[styles.error, { textAlign, writingDirection }]}>
              {olderError}
            </Text>
          ) : null}
        </View>
      )}
    </ScreenShell>
  );
}

function ActivityRow({
  item,
  rtl,
  copy,
  last,
  onPress,
}: {
  item: NotificationRow;
  rtl: boolean;
  copy: ReturnType<typeof activityCopy>;
  last: boolean;
  onPress: () => void;
}) {
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const presentation = activityPresentation(item.notification_kind, copy);
  const date = new Date(item.created_at).toLocaleString(rtl ? "ar-LY" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last ? styles.rowDivider : null,
        !item.is_read ? styles.rowUnread : null,
        { flexDirection: rtl ? "row-reverse" : "row" },
        pressed ? styles.rowPressed : null,
      ]}
    >
      <View style={[styles.rowIcon, presentation.emphasis ? styles.rowIconEmphasis : null]}>
        <AppIcon name={presentation.icon} active size={20} />
      </View>

      <View style={[styles.rowCopy, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
        <View
          style={[
            styles.rowTitleLine,
            { flexDirection: rtl ? "row-reverse" : "row" },
          ]}
        >
          <Text style={[styles.rowTitle, { textAlign, writingDirection }]}>{presentation.title}</Text>
          {!item.is_read ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={[styles.rowBody, { textAlign, writingDirection }]}>{presentation.body}</Text>
        <Text style={[styles.rowDate, { textAlign, writingDirection }]}>{date}</Text>
      </View>

      <AppIcon name="chevron" size={15} rtl={rtl} />
    </Pressable>
  );
}

function activityPresentation(kind: NotificationKind, copy: ReturnType<typeof activityCopy>) {
  if (kind === "message_received") {
    return {
      icon: "chat" as AppIconName,
      title: copy.messageTitle,
      body: copy.messageBody,
      emphasis: false,
    };
  }

  if (kind === "introduction_mutually_accepted") {
    return {
      icon: "introductions" as AppIconName,
      title: copy.mutualTitle,
      body: copy.mutualBody,
      emphasis: true,
    };
  }

  return {
    icon: "introductions" as AppIconName,
    title: copy.introductionTitle,
    body: copy.introductionBody,
    emphasis: false,
  };
}

function activityCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      title: "النشاط",
      body: "التعارفات والقبول المتبادل والرسائل المهمة، من دون كشف محتوى حساس في القائمة.",
      loading: "جارٍ تحميل النشاط",
      errorTitle: "تعذر تحميل النشاط",
      errorBody: "لم نغيّر أي بيانات. تحقق من اتصالك وحاول مرة أخرى.",
      retry: "إعادة المحاولة",
      emptyTitle: "لا يوجد نشاط جديد",
      emptyBody: "يظهر هنا التعارف الجديد والقبول المتبادل ووصول رسالة خاصة.",
      privacyBody: "لا نعرض نص الرسالة أو رقم الهاتف أو هوية الطرف الآخر في قائمة النشاط.",
      recent: "الأحدث",
      introductionTitle: "تعارف خاص جديد",
      introductionBody: "راجع التعارف والمعلومات التي سُمح بمشاركتها معك.",
      mutualTitle: "الاهتمام متبادل",
      mutualBody: "أصبح الانتقال إلى التواصل الخاص متاحاً لهذا التعارف.",
      messageTitle: "رسالة جديدة",
      messageBody: "وصلت رسالة داخل تعارف تم قبوله من الطرفين.",
      loadEarlier: "عرض نشاط أقدم",
      olderError: "تعذر تحميل النشاط الأقدم. حاول مرة أخرى.",
    };
  }

  return {
    title: "Activity",
    body: "Important introductions, mutual interest, and messages without exposing sensitive content in the list.",
    loading: "Loading activity",
    errorTitle: "We couldn’t load activity",
    errorBody: "No data was changed. Check your connection and try again.",
    retry: "Try again",
    emptyTitle: "No new activity",
    emptyBody: "New introductions, mutual interest, and private messages will appear here.",
    privacyBody: "Activity never displays message text, phone numbers, or the other person’s identity.",
    recent: "Recent",
    introductionTitle: "New private introduction",
    introductionBody: "Review the introduction and the details permitted for you.",
    mutualTitle: "Interest is mutual",
    mutualBody: "The protected communication handoff is now available for this introduction.",
    messageTitle: "New message",
    messageBody: "A message arrived inside a mutually accepted introduction.",
    loadEarlier: "Show earlier activity",
    olderError: "We couldn’t load earlier activity. Try again.",
  };
}

const styles = StyleSheet.create({
  loadingState: { minHeight: 320, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 16 },
  privacyNote: {
    width: "100%",
    alignItems: "center",
    gap: 11,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  privacyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
  },
  privacyText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 19 },
  sectionTitle: {
    width: "100%",
    color: colors.muted,
    fontSize: 12,
    lineHeight: 20,
    fontWeight: "800",
    paddingHorizontal: 4,
  },
  inbox: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    overflow: "hidden",
  },
  row: {
    width: "100%",
    minHeight: 96,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowUnread: { backgroundColor: colors.primaryWash },
  rowPressed: { opacity: 0.62 },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  rowIconEmphasis: { backgroundColor: colors.goldSoft },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitleLine: { width: "100%", alignItems: "center", gap: 8 },
  rowTitle: {
    flex: 1,
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "800",
  },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  rowBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 2 },
  rowDate: { width: "100%", color: colors.mutedSoft, fontSize: 10, lineHeight: 16, marginTop: 5 },
  emptyState: {
    width: "100%",
    minHeight: 340,
    justifyContent: "center",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
  },
  emptyTitle: {
    width: "100%",
    color: colors.foreground,
    fontSize: 22,
    lineHeight: 35,
    fontWeight: "800",
    marginTop: 18,
  },
  emptyBody: { width: "100%", color: colors.muted, fontSize: 14, lineHeight: 25, marginTop: 7 },
  error: { width: "100%", color: colors.danger, fontSize: 12, lineHeight: 19 },
});
