import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  isFriendshipDiscoveryUnavailable,
  listMyFriendshipRequests,
  respondToFriendshipRequest,
  withdrawFriendshipRequest,
  type FriendshipRequest,
} from "@/lib/friendship";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

export default function FriendshipRequestsScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => requestCopy(locale), [locale]);
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [featurePending, setFeaturePending] = useState(false);
  const [requests, setRequests] = useState<FriendshipRequest[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setFeaturePending(false);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }
      setRequests(await listMyFriendshipRequests());
    } catch (error) {
      if (__DEV__ && isFriendshipDiscoveryUnavailable(error)) {
        setFeaturePending(true);
        setRequests([]);
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function respond(request: FriendshipRequest, accept: boolean) {
    if (actionId) return;
    setActionId(request.requestId);
    setMessage(null);
    try {
      await respondToFriendshipRequest(request.requestId, accept);
      await load();
      setMessage(accept ? copy.accepted : copy.declined);
    } catch {
      setMessage(copy.actionError);
    } finally {
      setActionId(null);
    }
  }

  async function withdraw(request: FriendshipRequest) {
    if (actionId) return;
    setActionId(request.requestId);
    setMessage(null);
    try {
      await withdrawFriendshipRequest(request.requestId);
      await load();
      setMessage(copy.withdrawn);
    } catch {
      setMessage(copy.actionError);
    } finally {
      setActionId(null);
    }
  }

  const incoming = requests.filter((item) => item.direction === "incoming" && item.status === "pending");
  const outgoing = requests.filter((item) => item.direction === "outgoing" && item.status === "pending");
  const connected = requests.filter((item) => item.status === "accepted");

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace({ pathname: "/friendship", params: { locale } })}
          style={({ pressed }) => [styles.back, pressed ? styles.pressed : null]}
        >
          <AppIcon name="back" rtl={rtl} size={17} />
          <Text style={[styles.backText, { writingDirection }]}>{copy.home}</Text>
        </Pressable>
      }
    >
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : loadError ? (
        <StateCard
          rtl={rtl}
          tone="error"
          title={copy.loadErrorTitle}
          body={copy.loadErrorBody}
          actionLabel={copy.retry}
          onAction={() => void load()}
        />
      ) : featurePending ? (
        <StateCard rtl={rtl} title={copy.previewTitle} body={copy.previewBody} />
      ) : requests.length === 0 ? (
        <StateCard
          rtl={rtl}
          title={copy.emptyTitle}
          body={copy.emptyBody}
          actionLabel={copy.discover}
          onAction={() => router.push({ pathname: "/friendship-discover", params: { locale } })}
        />
      ) : (
        <View style={styles.page}>
          {incoming.length > 0 ? (
            <RequestSection title={copy.incoming} rtl={rtl}>
              {incoming.map((request) => (
                <RequestCard key={request.requestId} request={request} rtl={rtl} copy={copy}>
                  <View style={[styles.actions, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                    <PrimaryButton
                      style={styles.actionButton}
                      loading={actionId === request.requestId}
                      disabled={Boolean(actionId && actionId !== request.requestId)}
                      onPress={() => void respond(request, true)}
                    >
                      {copy.accept}
                    </PrimaryButton>
                    <PrimaryButton
                      tone="quiet"
                      style={styles.actionButton}
                      disabled={Boolean(actionId)}
                      onPress={() => void respond(request, false)}
                    >
                      {copy.decline}
                    </PrimaryButton>
                  </View>
                </RequestCard>
              ))}
            </RequestSection>
          ) : null}

          {outgoing.length > 0 ? (
            <RequestSection title={copy.outgoing} rtl={rtl}>
              {outgoing.map((request) => (
                <RequestCard key={request.requestId} request={request} rtl={rtl} copy={copy}>
                  <PrimaryButton
                    tone="quiet"
                    loading={actionId === request.requestId}
                    disabled={Boolean(actionId && actionId !== request.requestId)}
                    onPress={() => void withdraw(request)}
                  >
                    {copy.withdraw}
                  </PrimaryButton>
                </RequestCard>
              ))}
            </RequestSection>
          ) : null}

          {connected.length > 0 ? (
            <RequestSection title={copy.connected} rtl={rtl}>
              {connected.map((request) => (
                <RequestCard key={request.requestId} request={request} rtl={rtl} copy={copy}>
                  <View style={[styles.connectedPill, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                    <View style={styles.connectedDot} />
                    <Text style={[styles.connectedText, { writingDirection }]}>{copy.connectedLabel}</Text>
                  </View>
                </RequestCard>
              ))}
            </RequestSection>
          ) : null}

          {message ? (
            <Text accessibilityLiveRegion="polite" style={[styles.message, { textAlign, writingDirection }]}>
              {message}
            </Text>
          ) : null}
        </View>
      )}
    </ScreenShell>
  );
}

function RequestSection({ title, rtl, children }: { title: string; rtl: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }]}>
        {title}
      </Text>
      <View style={styles.sectionList}>{children}</View>
    </View>
  );
}

function RequestCard({ request, rtl, copy, children }: { request: FriendshipRequest; rtl: boolean; copy: ReturnType<typeof requestCopy>; children: React.ReactNode }) {
  const writingDirection = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";
  return (
    <View style={styles.card}>
      <View style={[styles.identityRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{request.displayName.trim().charAt(0).toUpperCase()}</Text>
        </View>
        <View style={[styles.identityCopy, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
          <Text style={[styles.name, { textAlign, writingDirection }]}>{request.displayName}</Text>
          <Text style={[styles.city, { textAlign, writingDirection }]}>{request.city}</Text>
        </View>
      </View>
      <View style={[styles.chips, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        {request.interests.slice(0, 5).map((interest) => (
          <View key={interest} style={styles.chip}>
            <Text style={[styles.chipText, { writingDirection }]}>{interest}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.meta, { textAlign, writingDirection }]}>{copy.requestMeta(request)}</Text>
      {children}
    </View>
  );
}

function requestCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  return {
    eyebrow: ar ? "الأصدقاء · الطلبات" : "FRIENDS · REQUESTS",
    title: ar ? "طلبات واتصالات الأصدقاء" : "Friend requests and connections",
    body: ar ? "الطلبات والاتصالات هنا للأصدقاء فقط ولا تظهر في مساحة الزواج." : "Everything here belongs only to Friends and never appears in Marriage.",
    home: ar ? "الأصدقاء" : "Friends home",
    incoming: ar ? "طلبات وصلت إليك" : "Requests for you",
    outgoing: ar ? "طلبات أرسلتها" : "Requests you sent",
    connected: ar ? "اتصالات مقبولة" : "Accepted connections",
    accept: ar ? "قبول" : "Accept",
    decline: ar ? "رفض" : "Decline",
    withdraw: ar ? "سحب الطلب" : "Withdraw request",
    connectedLabel: ar ? "صداقة مقبولة" : "Friend connection",
    accepted: ar ? "تم قبول طلب الصداقة." : "Friend request accepted.",
    declined: ar ? "تم رفض الطلب بشكل خاص." : "The request was declined privately.",
    withdrawn: ar ? "تم سحب طلب الصداقة." : "The friend request was withdrawn.",
    actionError: ar ? "تعذر حفظ التغيير الآن. حاول مرة أخرى." : "We couldn’t save that change. Try again.",
    emptyTitle: ar ? "لا توجد طلبات بعد" : "No friend requests yet",
    emptyBody: ar ? "اكتشف أشخاصاً من اهتمامات مشتركة وأرسل أول طلب خاص." : "Discover people through shared interests and send your first private request.",
    discover: ar ? "اكتشاف الأصدقاء" : "Discover friends",
    previewTitle: ar ? "طلبات الأصدقاء بانتظار ترحيل الاستضافة" : "Friend requests need the staging migration",
    previewBody: ar ? "طبّق ترحيل اكتشاف الأصدقاء والطلبات على Supabase المرحلي لتفعيل هذه الشاشة." : "Deploy the Friends discovery/request migration to hosted staging to activate this screen.",
    retry: ar ? "إعادة المحاولة" : "Try again",
    loadErrorTitle: ar ? "تعذر تحميل طلبات الأصدقاء" : "We couldn’t load friend requests",
    loadErrorBody: ar ? "تحقق من الاتصال ثم حاول مرة أخرى." : "Check your connection and try again.",
    requestMeta: (request: FriendshipRequest) => {
      if (request.status === "accepted") return ar ? "تم قبول الاتصال" : "Connection accepted";
      return request.direction === "incoming"
        ? ar ? "طلب صداقة خاص وصل إليك" : "A private friend request for you"
        : ar ? "طلب صداقة خاص أرسلته" : "Your private friend request";
    },
  };
}

const styles = StyleSheet.create({
  loading: { minHeight: 360, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 22 },
  section: { width: "100%" },
  sectionTitle: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 19, fontWeight: "800", marginBottom: 9 },
  sectionList: { width: "100%", gap: 11 },
  card: { width: "100%", gap: 12, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 16, ...shadows.card },
  identityRow: { width: "100%", alignItems: "center", gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentWash, borderWidth: 1, borderColor: colors.accentSoft },
  avatarText: { color: colors.accent, fontSize: 20, lineHeight: 27, fontWeight: "900" },
  identityCopy: { flex: 1 },
  name: { width: "100%", color: colors.foreground, fontSize: 17, lineHeight: 25, fontWeight: "900" },
  city: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 1 },
  chips: { width: "100%", flexWrap: "wrap", gap: 6 },
  chip: { borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 9, paddingVertical: 6 },
  chipText: { color: colors.muted, fontSize: 9, lineHeight: 14, fontWeight: "700" },
  meta: { width: "100%", color: colors.primary, fontSize: 10, lineHeight: 17, fontWeight: "800" },
  actions: { width: "100%", gap: 9 },
  actionButton: { flex: 1 },
  connectedPill: { alignSelf: "flex-start", alignItems: "center", gap: 6, borderRadius: radius.pill, backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 7 },
  connectedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  connectedText: { color: colors.primaryStrong, fontSize: 10, fontWeight: "800" },
  message: { width: "100%", color: colors.primary, fontSize: 12, lineHeight: 19, fontWeight: "800" },
  back: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  backText: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.55 },
});
