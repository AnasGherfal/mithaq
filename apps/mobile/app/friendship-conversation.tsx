import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  isFriendshipChatUnavailable,
  listFriendshipMessages,
  markFriendshipConversationRead,
  openFriendshipConversation,
  sendFriendshipMessage,
  type FriendshipMessage,
} from "@/lib/friendship-chat";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function FriendshipConversationScreen() {
  const params = useLocalSearchParams<{ locale?: string; connectionId?: string; name?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const connectionId = params.connectionId ?? "";
  const validConnection = uuidPattern.test(connectionId);
  const name = params.name?.trim() || (rtl ? "صديقك" : "your friend");
  const copy = useMemo(() => chatCopy(locale, name), [locale, name]);
  const writingDirection = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";

  const [loading, setLoading] = useState(validConnection);
  const [loadError, setLoadError] = useState(!validConnection);
  const [featurePending, setFeaturePending] = useState(false);
  const [messages, setMessages] = useState<FriendshipMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const nonceRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!validConnection) return;
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
      await openFriendshipConversation(connectionId);
      const next = await listFriendshipMessages(connectionId);
      setMessages(next);
      const latest = next[next.length - 1];
      if (latest) void markFriendshipConversationRead(connectionId, latest.sentAt);
    } catch (error) {
      if (__DEV__ && isFriendshipChatUnavailable(error)) {
        setFeaturePending(true);
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [connectionId, locale, validConnection]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);
    const nonce = nonceRef.current ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
    nonceRef.current = nonce;
    try {
      await sendFriendshipMessage(connectionId, body, nonce);
      nonceRef.current = null;
      setDraft("");
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      setSendError(message.includes("rate limit") ? copy.rateLimit : copy.sendError);
    } finally {
      setSending(false);
    }
  }

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace({ pathname: "/friendship-connections", params: { locale } })}
          style={({ pressed }) => [styles.back, pressed ? styles.pressed : null]}
        >
          <AppIcon name="back" rtl={rtl} size={17} />
          <Text style={[styles.backText, { writingDirection }]}>{copy.back}</Text>
        </Pressable>
      }
    >
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.accent} /></View>
      ) : featurePending ? (
        <StateCard rtl={rtl} title={copy.previewTitle} body={copy.previewBody} />
      ) : loadError ? (
        <StateCard rtl={rtl} tone="error" title={copy.errorTitle} body={copy.errorBody} actionLabel={copy.retry} onAction={() => void load()} />
      ) : (
        <View style={styles.page}>
          <View style={[styles.spaceBanner, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <View style={styles.spaceDot} />
            <View style={styles.bannerCopy}>
              <Text style={[styles.bannerTitle, { textAlign, writingDirection }]}>{copy.spaceTitle}</Text>
              <Text style={[styles.bannerBody, { textAlign, writingDirection }]}>{copy.spaceBody}</Text>
            </View>
          </View>

          <View style={styles.messages} accessibilityLiveRegion="polite">
            {messages.length === 0 ? (
              <View style={styles.empty}>
                <Text style={[styles.emptyTitle, { textAlign: "center", writingDirection }]}>{copy.emptyTitle}</Text>
                <Text style={[styles.emptyBody, { textAlign: "center", writingDirection }]}>{copy.emptyBody}</Text>
              </View>
            ) : messages.map((message) => (
              <View key={message.messageId} style={[styles.messageRow, message.senderIsMe ? styles.mineRow : styles.theirsRow]}>
                <View style={[styles.bubble, message.senderIsMe ? styles.mineBubble : styles.theirsBubble]}>
                  <Text style={[styles.messageBody, message.senderIsMe ? styles.mineText : null, { writingDirection }]}>{message.body}</Text>
                  <Text style={[styles.time, message.senderIsMe ? styles.mineTime : null]}>
                    {new Date(message.sentAt).toLocaleTimeString(locale === "ar" ? "ar-LY" : "en-US", { hour: "numeric", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={(value) => { setDraft(value); nonceRef.current = null; setSendError(null); }}
              editable={!sending}
              multiline
              maxLength={2000}
              placeholder={copy.placeholder}
              placeholderTextColor={colors.mutedSoft}
              textAlign={textAlign}
              style={[styles.input, { writingDirection }]}
            />
            <View style={[styles.composerMeta, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <Text style={styles.counter}>{draft.length}/2000</Text>
              <Text style={[styles.privateNote, { writingDirection }]}>{copy.privateNote}</Text>
            </View>
            <PrimaryButton loading={sending} disabled={!draft.trim()} onPress={() => void send()}>{copy.send}</PrimaryButton>
            {sendError ? <Text accessibilityRole="alert" style={[styles.error, { textAlign, writingDirection }]}>{sendError}</Text> : null}
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

function chatCopy(locale: MobileLocale, name: string) {
  if (locale === "ar") return {
    eyebrow: "الأصدقاء · محادثة",
    title: `محادثتك مع ${name}`,
    body: "هذه المحادثة تخص مساحة الأصدقاء فقط.",
    back: "العودة إلى الاتصالات",
    spaceTitle: "أنت في مساحة الأصدقاء",
    spaceBody: "لن تظهر هذه الرسائل في الزواج أو نشاط الزواج.",
    emptyTitle: "ابدأ المحادثة ببساطة",
    emptyBody: "تحدث عن اهتمام مشترك أو نشاط تحبان تجربته معاً.",
    placeholder: "اكتب رسالة ودية…",
    privateNote: "محادثة خاصة بينكما",
    send: "إرسال",
    rateLimit: "أرسلت رسائل كثيرة بسرعة. حاول بعد قليل.",
    sendError: "تعذر إرسال الرسالة الآن. حاول مرة أخرى.",
    errorTitle: "تعذر فتح محادثة الأصدقاء",
    errorBody: "قد يكون الاتصال غير متاح أو تم حظر أحد الطرفين.",
    retry: "إعادة المحاولة",
    previewTitle: "المحادثة بانتظار ترحيل الاستضافة",
    previewBody: "طبّق ترحيل محادثات Friends على Supabase المرحلي لتفعيل الرسائل الحقيقية.",
  };
  return {
    eyebrow: "FRIENDS · CHAT",
    title: `Chat with ${name}`,
    body: "This conversation belongs only to Friends.",
    back: "Back to connections",
    spaceTitle: "You are in Friends",
    spaceBody: "These messages never appear in Marriage or Marriage activity.",
    emptyTitle: "Start with something simple",
    emptyBody: "Talk about a shared interest or something you would both enjoy doing.",
    placeholder: "Write a friendly message…",
    privateNote: "Private between this connection",
    send: "Send",
    rateLimit: "You’re sending messages too quickly. Try again shortly.",
    sendError: "We couldn’t send that message. Try again.",
    errorTitle: "We couldn’t open this Friends chat",
    errorBody: "The connection may no longer be available or one member may be blocked.",
    retry: "Try again",
    previewTitle: "Chat needs the staging migration",
    previewBody: "Deploy the Friends conversation migration to hosted staging to enable real messaging.",
  };
}

const styles = StyleSheet.create({
  loading: { minHeight: 360, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 12 },
  spaceBanner: { width: "100%", alignItems: "center", gap: 10, borderRadius: radius.xl, backgroundColor: colors.accentWash, borderWidth: 1, borderColor: colors.accentSoft, padding: 14 },
  spaceDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.accent },
  bannerCopy: { flex: 1 },
  bannerTitle: { color: colors.accent, fontSize: 12, lineHeight: 18, fontWeight: "900" },
  bannerBody: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 2 },
  messages: { width: "100%", minHeight: 260, borderRadius: radius.xl, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8, ...shadows.card },
  empty: { minHeight: 220, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  emptyTitle: { color: colors.foreground, fontSize: 18, lineHeight: 26, fontWeight: "900" },
  emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 6 },
  messageRow: { width: "100%", flexDirection: "row" },
  mineRow: { justifyContent: "flex-end" },
  theirsRow: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9 },
  mineBubble: { backgroundColor: colors.accent },
  theirsBubble: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  messageBody: { color: colors.foreground, fontSize: 14, lineHeight: 21 },
  mineText: { color: colors.surfaceRaised },
  time: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 4 },
  mineTime: { color: colors.surfaceRaised, opacity: 0.8 },
  composer: { width: "100%", gap: 10, borderRadius: radius.xl, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: 14 },
  input: { minHeight: 92, maxHeight: 180, color: colors.foreground, fontSize: 15, lineHeight: 23, textAlignVertical: "top" },
  composerMeta: { justifyContent: "space-between", alignItems: "center" },
  counter: { color: colors.mutedSoft, fontSize: 9 },
  privateNote: { color: colors.accent, fontSize: 10, fontWeight: "800" },
  error: { color: colors.danger, fontSize: 11, lineHeight: 18 },
  back: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  backText: { color: colors.accent, fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.55 },
});