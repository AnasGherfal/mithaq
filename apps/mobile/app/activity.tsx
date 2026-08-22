import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import {
  MarriageActivityTimeline,
  type MarriageActivityItem,
  type MarriageActivityKind,
} from "@/features/marriage-activity";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

const PAGE_SIZE = 50;

const activityKinds: MarriageActivityKind[] = [
  "interest_saved",
  "introduction_offered",
  "my_choice_saved",
  "mutual_acceptance",
  "conversation_started",
  "message_received",
  "my_photo_shared",
  "photo_shared_with_me",
  "my_trusted_contact_shared",
  "trusted_contact_shared_with_me",
  "introduction_closed_by_me",
  "introduction_closed",
  "introduction_expired",
  "conversation_ended_by_me",
  "conversation_closed",
];

const introductionStatuses = [
  "offered",
  "mutually_accepted",
  "declined",
  "expired",
  "cancelled",
  "closed",
] as const;

export default function ActivityScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const copy = useMemo(() => activityCopy(locale), [locale]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [items, setItems] = useState<MarriageActivityItem[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);

  const markAlertsRead = useCallback(async () => {
    await supabase.rpc("mark_my_notifications_read", { p_through: null });
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

    const { data, error } = await supabase.rpc("list_my_marriage_activity", {
      p_before_occurred_at: null,
      p_before_activity_id: null,
      p_limit: PAGE_SIZE,
    });

    if (error) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    const rows = normalizeActivityRows(data);
    setItems(rows);
    setHasOlder(rows.length === PAGE_SIZE);
    setLoading(false);
    void markAlertsRead();
  }, [locale, markAlertsRead]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadOlder() {
    if (!hasOlder || loadingOlder || items.length === 0) return;
    const oldest = items[items.length - 1];
    if (!oldest) return;

    setLoadingOlder(true);
    setOlderError(null);

    const { data, error } = await supabase.rpc("list_my_marriage_activity", {
      p_before_occurred_at: oldest.occurredAt,
      p_before_activity_id: oldest.activityId,
      p_limit: PAGE_SIZE,
    });

    setLoadingOlder(false);

    if (error) {
      setOlderError(copy.olderError);
      return;
    }

    const rows = normalizeActivityRows(data);
    setItems((current) => {
      const existing = new Set(current.map((item) => item.activityId));
      return [...current, ...rows.filter((item) => !existing.has(item.activityId))];
    });
    setHasOlder(rows.length === PAGE_SIZE);
  }

  function openItem(item: MarriageActivityItem) {
    if (item.kind === "interest_saved") {
      router.push({ pathname: "/marriage-discover", params: { locale } });
      return;
    }

    if (!item.introductionId) {
      router.push({ pathname: "/introductions", params: { locale } });
      return;
    }

    if (
      item.kind === "my_trusted_contact_shared" ||
      item.kind === "trusted_contact_shared_with_me"
    ) {
      router.push({
        pathname: "/trusted-contacts",
        params: { locale, introductionId: item.introductionId },
      });
      return;
    }

    if (
      item.introductionStatus === "mutually_accepted" &&
      (item.kind === "mutual_acceptance" ||
        item.kind === "my_photo_shared" ||
        item.kind === "photo_shared_with_me")
    ) {
      router.push({
        pathname: "/introduction-handoff",
        params: { locale, introductionId: item.introductionId },
      });
      return;
    }

    if (
      item.introductionStatus === "mutually_accepted" &&
      (item.kind === "conversation_started" || item.kind === "message_received")
    ) {
      router.push({
        pathname: "/conversation",
        params: { locale, introductionId: item.introductionId },
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

          <MarriageActivityTimeline items={items} locale={locale} onOpen={openItem} />

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

function normalizeActivityRows(value: unknown): MarriageActivityItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): MarriageActivityItem[] => {
    if (!isRecord(entry)) return [];
    if (
      typeof entry.activity_id !== "string" ||
      !isActivityKind(entry.activity_kind) ||
      typeof entry.occurred_at !== "string"
    ) {
      return [];
    }

    const introductionId = typeof entry.introduction_id === "string" ? entry.introduction_id : null;
    const introductionStatus = isIntroductionStatus(entry.introduction_status)
      ? entry.introduction_status
      : null;

    return [
      {
        activityId: entry.activity_id,
        kind: entry.activity_kind,
        introductionId,
        introductionStatus,
        occurredAt: entry.occurred_at,
        isUnread: entry.is_unread === true,
      },
    ];
  });
}

function isActivityKind(value: unknown): value is MarriageActivityKind {
  return typeof value === "string" && activityKinds.includes(value as MarriageActivityKind);
}

function isIntroductionStatus(
  value: unknown,
): value is MarriageActivityItem["introductionStatus"] & string {
  return (
    typeof value === "string" &&
    introductionStatuses.includes(value as (typeof introductionStatuses)[number])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function activityCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      title: "النشاط",
      body: "رحلة تعارفك الخاصة مرتبة من الاهتمام الأول إلى التواصل ودائرة الثقة.",
      loading: "جارٍ تحميل النشاط",
      errorTitle: "تعذر تحميل رحلة النشاط",
      errorBody: "لم نغيّر أي بيانات. تحقق من اتصالك وحاول مرة أخرى.",
      retry: "إعادة المحاولة",
      emptyTitle: "رحلتك ستظهر هنا",
      emptyBody: "عندما تحفظ اهتماماً أو يبدأ تعارف خاص، سترى المراحل المهمة هنا بترتيب واضح.",
      privacyBody:
        "هذا سجل خاص بك. لا نعرض نص الرسائل أو أرقام الهواتف أو هوية الطرف الآخر هنا، ولا نكشف قراره الخاص قبل القبول المتبادل.",
      loadEarlier: "عرض مراحل أقدم",
      olderError: "تعذر تحميل النشاط الأقدم. حاول مرة أخرى.",
    };
  }

  return {
    title: "Activity",
    body: "Your private introduction journey, from first interest to conversation and Trusted Circle.",
    loading: "Loading activity",
    errorTitle: "We couldn’t load your activity journey",
    errorBody: "No data was changed. Check your connection and try again.",
    retry: "Try again",
    emptyTitle: "Your journey will appear here",
    emptyBody: "When you save interest or enter a private introduction, the important stages will appear here in order.",
    privacyBody:
      "This timeline is private to you. It never shows message text, phone numbers, the other person’s identity, or their private decision before mutual acceptance.",
    loadEarlier: "Show earlier stages",
    olderError: "We couldn’t load earlier activity. Try again.",
  };
}

const styles = StyleSheet.create({
  loadingState: { minHeight: 320, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 18 },
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
  emptyState: {
    width: "100%",
    minHeight: 350,
    justifyContent: "center",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 24,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
  },
  emptyTitle: { width: "100%", color: colors.foreground, fontSize: 20, lineHeight: 31, fontWeight: "800", marginTop: 16 },
  emptyBody: { width: "100%", color: colors.muted, fontSize: 14, lineHeight: 25, marginTop: 7 },
  error: { width: "100%", color: colors.danger, fontSize: 12, lineHeight: 19 },
});
