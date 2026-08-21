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
  listMyFriendshipConnections,
  type FriendshipConnection,
} from "@/lib/friendship";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

export default function FriendshipConnectionsScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => connectionsCopy(locale), [locale]);
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [featurePending, setFeaturePending] = useState(false);
  const [connections, setConnections] = useState<FriendshipConnection[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setFeaturePending(false);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }
      setConnections(await listMyFriendshipConnections());
    } catch (error) {
      if (__DEV__ && isFriendshipDiscoveryUnavailable(error)) {
        setFeaturePending(true);
        setConnections([]);
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => { void load(); }, [load]);

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={
        <View style={styles.footer}>
          <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: "/friendship", params: { locale } })} style={({ pressed }) => [styles.footerLink, pressed ? styles.pressed : null]}>
            <AppIcon name="back" rtl={rtl} size={17} />
            <Text style={[styles.footerText, { writingDirection }]}>{copy.home}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/friendship-requests", params: { locale } })} style={({ pressed }) => [styles.footerLink, pressed ? styles.pressed : null]}>
            <Text style={[styles.footerText, { writingDirection }]}>{copy.requests}</Text>
          </Pressable>
        </View>
      }
    >
      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : loadError ? (
        <StateCard rtl={rtl} tone="error" title={copy.loadErrorTitle} body={copy.loadErrorBody} actionLabel={copy.retry} onAction={() => void load()} />
      ) : featurePending ? (
        <StateCard rtl={rtl} title={copy.previewTitle} body={copy.previewBody} />
      ) : connections.length === 0 ? (
        <StateCard rtl={rtl} title={copy.emptyTitle} body={copy.emptyBody} actionLabel={copy.discover} onAction={() => router.push({ pathname: "/friendship-discover", params: { locale } })} />
      ) : (
        <View style={styles.page}>
          <View style={[styles.summaryCard, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
            <Text style={[styles.summaryValue, { writingDirection }]}>{connections.length}</Text>
            <Text style={[styles.summaryLabel, { textAlign, writingDirection }]}>{copy.summary}</Text>
          </View>

          <View style={styles.list}>
            {connections.map((connection) => (
              <View key={connection.connectionId} style={styles.card}>
                <View style={[styles.identityRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{connection.displayName.trim().charAt(0).toUpperCase()}</Text></View>
                  <View style={[styles.identityCopy, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
                    <Text style={[styles.name, { textAlign, writingDirection }]}>{connection.displayName}</Text>
                    <Text style={[styles.city, { textAlign, writingDirection }]}>{connection.city}</Text>
                  </View>
                </View>

                <View style={[styles.chips, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                  {connection.interests.slice(0, 5).map((interest) => (
                    <View key={interest} style={styles.chip}><Text style={[styles.chipText, { writingDirection }]}>{interest}</Text></View>
                  ))}
                </View>

                <View style={[styles.connectedPill, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                  <View style={styles.connectedDot} />
                  <Text style={[styles.connectedText, { writingDirection }]}>{copy.connected}</Text>
                </View>

                <PrimaryButton
                  onPress={() => router.push({
                    pathname: "/friendship-conversation",
                    params: { locale, connectionId: connection.connectionId, name: connection.displayName },
                  })}
                >
                  {copy.chat}
                </PrimaryButton>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

function connectionsCopy(locale: MobileLocale) {
  if (locale === "ar") return {
    eyebrow: "الأصدقاء · الاتصالات",
    title: "اتصالاتك في مساحة الأصدقاء",
    body: "هذه صداقات مقبولة فعلياً. يمكنك بدء محادثة خاصة هنا، ولن تظهر في مساحة الزواج.",
    home: "الأصدقاء",
    requests: "الطلبات",
    summary: "اتصالات أصدقاء مقبولة",
    connected: "اتصال أصدقاء",
    chat: "بدء محادثة",
    emptyTitle: "لا توجد اتصالات بعد",
    emptyBody: "عندما يقبل شخص طلب صداقة خاصاً، سيظهر هنا كاتصال أصدقاء مستقل.",
    discover: "اكتشاف الأصدقاء",
    previewTitle: "الاتصالات بانتظار ترحيل الاستضافة",
    previewBody: "طبّق ترحيلات Friends على Supabase المرحلي لتفعيل هذه القائمة.",
    loadErrorTitle: "تعذر تحميل اتصالات الأصدقاء",
    loadErrorBody: "تحقق من الاتصال ثم حاول مرة أخرى.",
    retry: "إعادة المحاولة",
  };
  return {
    eyebrow: "FRIENDS · CONNECTIONS",
    title: "Your Friends connections",
    body: "These are accepted friendships. You can start a private chat here, and it never appears in Marriage.",
    home: "Friends home",
    requests: "Requests",
    summary: "accepted friend connections",
    connected: "Friends connection",
    chat: "Start chat",
    emptyTitle: "No connections yet",
    emptyBody: "When someone accepts a private friend request, the durable Friends connection will appear here.",
    discover: "Discover friends",
    previewTitle: "Connections need the staging migration",
    previewBody: "Deploy the Friends migrations to hosted staging to activate this list.",
    loadErrorTitle: "We couldn’t load Friends connections",
    loadErrorBody: "Check your connection and try again.",
    retry: "Try again",
  };
}

const styles = StyleSheet.create({
  loading: { minHeight: 360, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 14 },
  summaryCard: { width: "100%", borderRadius: radius.xl, backgroundColor: colors.accentWash, borderWidth: 1, borderColor: colors.accentSoft, padding: 16 },
  summaryValue: { color: colors.accent, fontSize: 28, lineHeight: 34, fontWeight: "900" },
  summaryLabel: { width: "100%", color: colors.accent, fontSize: 12, lineHeight: 19, fontWeight: "800" },
  list: { width: "100%", gap: 11 },
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
  connectedPill: { alignSelf: "flex-start", alignItems: "center", gap: 6, borderRadius: radius.pill, backgroundColor: colors.accentWash, paddingHorizontal: 10, paddingVertical: 7 },
  connectedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  connectedText: { color: colors.accent, fontSize: 10, fontWeight: "800" },
  footer: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerLink: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  footerText: { color: colors.accent, fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.55 },
});