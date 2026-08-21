import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  isFriendshipDiscoveryUnavailable,
  listMyFriendshipChats,
  type FriendshipChat,
} from "@/lib/friendship";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

export default function FriendshipChatsScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => chatsCopy(locale), [locale]);
  const writingDirection = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [featurePending, setFeaturePending] = useState(false);
  const [chats, setChats] = useState<FriendshipChat[]>([]);

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
      setChats(await listMyFriendshipChats());
    } catch (error) {
      if (__DEV__ && isFriendshipDiscoveryUnavailable(error)) {
        setFeaturePending(true);
        setChats([]);
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

  return (
    <ScreenShell eyebrow={copy.eyebrow} title={copy.title} body={copy.body} rtl={rtl}>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.accent} /></View>
      ) : loadError ? (
        <StateCard rtl={rtl} tone="error" title={copy.errorTitle} body={copy.errorBody} actionLabel={copy.retry} onAction={() => void load()} />
      ) : featurePending ? (
        <StateCard rtl={rtl} title={copy.previewTitle} body={copy.previewBody} />
      ) : chats.length === 0 ? (
        <StateCard
          rtl={rtl}
          title={copy.emptyTitle}
          body={copy.emptyBody}
          actionLabel={copy.connections}
          onAction={() => router.push({ pathname: "/friendship-connections", params: { locale } })}
        />
      ) : (
        <View style={styles.list}>
          {chats.map((chat) => (
            <Pressable
              key={chat.connectionId}
              accessibilityRole="button"
              accessibilityLabel={copy.openChat(chat.displayName)}
              onPress={() => router.push({ pathname: "/friendship-conversation", params: { locale, connectionId: chat.connectionId, name: chat.displayName } })}
              style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
            >
              <View style={[styles.row, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{chat.displayName.trim().charAt(0).toUpperCase()}</Text></View>
                <View style={[styles.copy, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
                  <View style={[styles.nameRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                    <Text numberOfLines={1} style={[styles.name, { textAlign, writingDirection }]}>{chat.displayName}</Text>
                    {chat.unreadCount > 0 ? (
                      <View style={styles.unreadBadge}><Text style={styles.unreadText}>{chat.unreadCount > 99 ? "99+" : chat.unreadCount}</Text></View>
                    ) : null}
                  </View>
                  <Text style={[styles.city, { textAlign, writingDirection }]}>{chat.city}</Text>
                  <Text numberOfLines={2} style={[styles.preview, chat.unreadCount > 0 ? styles.previewUnread : null, { textAlign, writingDirection }]}>
                    {chat.lastMessageBody ?? copy.noMessages}
                  </Text>
                </View>
                <Text style={styles.chevron}>{rtl ? "‹" : "›"}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScreenShell>
  );
}

function chatsCopy(locale: MobileLocale) {
  if (locale === "ar") return {
    eyebrow: "الأصدقاء · المحادثات",
    title: "محادثات الأصدقاء",
    body: "محادثاتك مع اتصالات الأصدقاء فقط. محادثات الزواج تبقى منفصلة تماماً.",
    noMessages: "ابدأ المحادثة عندما تكون جاهزاً.",
    emptyTitle: "لا توجد محادثات بعد",
    emptyBody: "ابدأ محادثة من اتصال أصدقاء مقبول، وستظهر هنا بشكل واضح.",
    connections: "عرض الاتصالات",
    retry: "إعادة المحاولة",
    errorTitle: "تعذر تحميل المحادثات",
    errorBody: "تحقق من الاتصال ثم حاول مرة أخرى.",
    previewTitle: "المحادثات بانتظار تحديث الاستضافة",
    previewBody: "طبّق ترحيل صندوق محادثات الأصدقاء على Supabase المرحلي لتفعيل هذه الشاشة.",
    openChat: (name: string) => `فتح محادثة ${name}`,
  };
  return {
    eyebrow: "FRIENDS · CHATS",
    title: "Friends chats",
    body: "Conversations with Friends connections only. Marriage conversations remain completely separate.",
    noMessages: "Start the conversation when you’re ready.",
    emptyTitle: "No chats yet",
    emptyBody: "Start a chat from an accepted Friends connection and it will appear here.",
    connections: "View connections",
    retry: "Try again",
    errorTitle: "We couldn’t load chats",
    errorBody: "Check your connection and try again.",
    previewTitle: "Chats need the staging update",
    previewBody: "Deploy the Friends chat inbox migration to hosted staging to activate this screen.",
    openChat: (name: string) => `Open chat with ${name}`,
  };
}

const styles = StyleSheet.create({
  loading: { minHeight: 340, alignItems: "center", justifyContent: "center" },
  list: { width: "100%", gap: 10 },
  card: { width: "100%", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 14, ...shadows.card },
  row: { width: "100%", alignItems: "center", gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentWash, borderWidth: 1, borderColor: colors.accentSoft },
  avatarText: { color: colors.accent, fontSize: 19, fontWeight: "900" },
  copy: { flex: 1, minWidth: 0 },
  nameRow: { width: "100%", alignItems: "center", gap: 8 },
  name: { flexShrink: 1, color: colors.foreground, fontSize: 16, lineHeight: 23, fontWeight: "900" },
  city: { width: "100%", color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 1 },
  preview: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  previewUnread: { color: colors.foreground, fontWeight: "800" },
  unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent },
  unreadText: { color: colors.surfaceRaised, fontSize: 9, fontWeight: "900" },
  chevron: { color: colors.mutedSoft, fontSize: 24, lineHeight: 26 },
  pressed: { opacity: 0.62, transform: [{ scale: 0.99 }] },
});
