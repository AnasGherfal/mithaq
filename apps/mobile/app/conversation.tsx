import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

type MessageRow = {
  message_id: string;
  sender_is_me: boolean;
  body: string;
  sent_at: string;
};

const PAGE_SIZE = 50;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mergeMessages(current: MessageRow[], incoming: MessageRow[]) {
  const byId = new Map<string, MessageRow>();
  for (const message of current) byId.set(message.message_id, message);
  for (const message of incoming) byId.set(message.message_id, message);

  return Array.from(byId.values()).sort((a, b) => {
    const timeDifference = new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime();
    return timeDifference !== 0 ? timeDifference : a.message_id.localeCompare(b.message_id);
  });
}

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ locale?: string; introductionId?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const introductionId = params.introductionId ?? "";
  const validIntroduction = uuidPattern.test(introductionId);
  const copy = useMemo(() => conversationCopy(locale), [locale]);
  const [loading, setLoading] = useState(validIntroduction);
  const [loadError, setLoadError] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const refreshingRef = useRef(false);

  const loadMessages = useCallback(
    async (showLoading: boolean) => {
      if (!validIntroduction || refreshingRef.current) return;
      refreshingRef.current = true;
      if (showLoading) {
        setLoading(true);
        setLoadError(false);
        setOlderError(null);
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        refreshingRef.current = false;
        if (showLoading) {
          setLoadError(true);
          setLoading(false);
        }
        return;
      }
      if (!sessionData.session) {
        refreshingRef.current = false;
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }

      const { error: openError } = await supabase.rpc("open_my_conversation", {
        p_introduction_id: introductionId,
      });
      if (openError) {
        refreshingRef.current = false;
        setLoadError(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("list_my_conversation_messages", {
        p_introduction_id: introductionId,
        p_before: null,
        p_limit: PAGE_SIZE,
      });

      refreshingRef.current = false;
      if (error) {
        if (showLoading) {
          setLoadError(true);
          setLoading(false);
        }
        return;
      }

      const rows = (data ?? []) as MessageRow[];
      setMessages((current) => (showLoading ? rows : mergeMessages(current, rows)));
      if (showLoading) setHasOlder(rows.length === PAGE_SIZE);
      setLoadError(false);
      setLoading(false);
    },
    [introductionId, locale, validIntroduction],
  );

  useEffect(() => {
    void loadMessages(true);
  }, [loadMessages]);

  useEffect(() => {
    if (!validIntroduction || loadError) return;
    const timer = setInterval(() => {
      void loadMessages(false);
    }, 8000);
    return () => clearInterval(timer);
  }, [loadError, loadMessages, validIntroduction]);

  async function loadOlderMessages() {
    if (!hasOlder || loadingOlder || messages.length === 0 || refreshingRef.current) return;

    const oldestMessage = messages[0];
    setLoadingOlder(true);
    setOlderError(null);
    refreshingRef.current = true;

    const { data, error } = await supabase.rpc("list_my_conversation_messages", {
      p_introduction_id: introductionId,
      p_before: oldestMessage.sent_at,
      p_limit: PAGE_SIZE,
    });

    refreshingRef.current = false;
    setLoadingOlder(false);
    if (error) {
      setOlderError(copy.olderError);
      return;
    }

    const rows = (data ?? []) as MessageRow[];
    setMessages((current) => mergeMessages(current, rows));
    setHasOlder(rows.length === PAGE_SIZE);
  }

  async function sendMessage() {
    const body = draft.trim();
    if (!body || sending || ending) return;

    setSending(true);
    setSendError(null);
    const { error } = await supabase.rpc("send_conversation_message", {
      p_introduction_id: introductionId,
      p_body: body,
    });

    if (error) {
      const message = error.message.toLowerCase();
      setSendError(message.includes("rate limit") ? copy.rateLimit : copy.sendError);
      setSending(false);
      return;
    }

    setDraft("");
    setSending(false);
    await loadMessages(false);
  }

  async function endConversation() {
    if (ending) return;
    if (!confirmEnd) {
      setConfirmEnd(true);
      return;
    }

    setEnding(true);
    const { error } = await supabase.rpc("end_my_conversation", {
      p_introduction_id: introductionId,
    });
    setEnding(false);

    if (error) {
      setSendError(copy.endError);
      return;
    }

    router.replace({ pathname: "/introductions", params: { locale } });
  }

  if (!validIntroduction) {
    return (
      <ScreenShell eyebrow={copy.eyebrow} title={copy.title} body={copy.body} rtl={rtl}>
        <StateCard rtl={rtl} tone="error" title={copy.unavailableTitle} body={copy.unavailableBody} />
        <View style={styles.singleAction}>
          <PrimaryButton
            tone="quiet"
            onPress={() => router.replace({ pathname: "/introductions", params: { locale } })}
          >
            {copy.back}
          </PrimaryButton>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={
        <PrimaryButton tone="quiet" onPress={() => router.replace({ pathname: "/introductions", params: { locale } })}>
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
          title={copy.unavailableTitle}
          body={copy.unavailableBody}
          actionLabel={copy.retry}
          onAction={() => void loadMessages(true)}
        />
      ) : (
        <View style={styles.stack}>
          <View style={styles.boundaryCard}>
            <Text style={[styles.boundaryTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.boundaryTitle}</Text>
            <Text style={[styles.boundaryBody, { textAlign: rtl ? "right" : "left" }]}>{copy.boundaryBody}</Text>
          </View>

          {messages.length > 0 ? (
            <View style={styles.historyControls}>
              {hasOlder ? (
                <PrimaryButton tone="quiet" loading={loadingOlder} onPress={() => void loadOlderMessages()}>
                  {copy.loadEarlier}
                </PrimaryButton>
              ) : (
                <Text style={[styles.historyEnd, { textAlign: "center" }]}>{copy.historyStart}</Text>
              )}
              {olderError ? (
                <Text accessibilityRole="alert" style={[styles.error, { textAlign: rtl ? "right" : "left" }]}>
                  {olderError}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.messagesCard} accessibilityLiveRegion="polite">
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyMark}>
                  <Text style={styles.emptyMarkText}>✦</Text>
                </View>
                <Text style={[styles.emptyTitle, { textAlign: "center" }]}>{copy.emptyTitle}</Text>
                <Text style={[styles.emptyBody, { textAlign: "center" }]}>{copy.emptyBody}</Text>
              </View>
            ) : (
              <View style={styles.messageList}>
                {messages.map((message) => (
                  <MessageBubble key={message.message_id} message={message} locale={locale} />
                ))}
              </View>
            )}
          </View>

          <View style={styles.composerCard}>
            <TextInput
              accessibilityLabel={copy.composerLabel}
              multiline
              maxLength={2000}
              editable={!sending && !ending}
              value={draft}
              onChangeText={(value) => {
                setDraft(value);
                setSendError(null);
              }}
              placeholder={copy.placeholder}
              placeholderTextColor={colors.mutedSoft}
              textAlign={rtl ? "right" : "left"}
              style={[styles.input, { writingDirection: rtl ? "rtl" : "ltr" }]}
            />
            <View style={[styles.composerMeta, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <Text style={styles.counter}>{draft.length}/2000</Text>
              <Pressable
                accessibilityRole="button"
                disabled={sending || ending}
                onPress={() => void loadMessages(false)}
                style={({ pressed }) => [styles.refreshButton, pressed ? styles.pressed : null]}
              >
                <Text style={styles.refreshText}>{copy.refresh}</Text>
              </Pressable>
            </View>
            <PrimaryButton loading={sending} disabled={!draft.trim() || ending} onPress={() => void sendMessage()}>
              {copy.send}
            </PrimaryButton>
          </View>

          {sendError ? (
            <Text accessibilityRole="alert" style={[styles.error, { textAlign: rtl ? "right" : "left" }]}>
              {sendError}
            </Text>
          ) : null}

          <View style={styles.safetyCard}>
            <Text style={[styles.safetyTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.safetyTitle}</Text>
            <Text style={[styles.safetyBody, { textAlign: rtl ? "right" : "left" }]}>{copy.safetyBody}</Text>
            <PrimaryButton
              tone="quiet"
              onPress={() =>
                router.push({
                  pathname: "/introduction-safety",
                  params: { locale, introductionId },
                })
              }
            >
              {copy.safetyButton}
            </PrimaryButton>
          </View>

          <View style={styles.endCard}>
            <Text style={[styles.endTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.endTitle}</Text>
            <Text style={[styles.endBody, { textAlign: rtl ? "right" : "left" }]}>
              {confirmEnd ? copy.endConfirmBody : copy.endBody}
            </Text>
            <View style={styles.endActions}>
              <PrimaryButton tone="quiet" loading={ending} disabled={sending} onPress={() => void endConversation()}>
                {confirmEnd ? copy.endConfirm : copy.endButton}
              </PrimaryButton>
              {confirmEnd ? (
                <PrimaryButton tone="quiet" disabled={ending} onPress={() => setConfirmEnd(false)}>
                  {copy.cancelEnd}
                </PrimaryButton>
              ) : null}
            </View>
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

function MessageBubble({ message, locale }: { message: MessageRow; locale: MobileLocale }) {
  const time = new Date(message.sent_at).toLocaleTimeString(locale === "ar" ? "ar-LY" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <View style={[styles.messageRow, message.sender_is_me ? styles.messageRowMine : styles.messageRowTheirs]}>
      <View style={[styles.bubble, message.sender_is_me ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.messageBody, message.sender_is_me ? styles.messageBodyMine : null]}>{message.body}</Text>
        <Text style={[styles.messageTime, message.sender_is_me ? styles.messageTimeMine : null]}>{time}</Text>
      </View>
    </View>
  );
}

function conversationCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "محادثة خاصة",
      title: "التواصل داخل التعارف",
      body: "هذه المحادثة موجودة فقط لأن القبول أصبح متبادلاً. لا يمكن لأي عضو خارج هذا التعارف الوصول إليها.",
      loading: "جارٍ فتح المحادثة الخاصة",
      unavailableTitle: "المحادثة غير متاحة",
      unavailableBody: "قد يكون التعارف غير متبادل بعد، أو أُغلق، أو توقف بسبب الحظر أو حالة السلامة.",
      retry: "إعادة المحاولة",
      back: "العودة إلى التعارفات",
      boundaryTitle: "تواصل مقيد بهذا التعارف",
      boundaryBody: "لا نعرض معرف الطرف الآخر أو رقم هاتفه. الرسائل تمر عبر صلاحيات الخادم وتُغلق إذا توقف التعارف.",
      loadEarlier: "تحميل الرسائل الأقدم",
      historyStart: "هذه بداية المحادثة",
      olderError: "تعذر تحميل الرسائل الأقدم. حاول مرة أخرى.",
      emptyTitle: "ابدأ بهدوء ووضوح",
      emptyBody: "لا توجد رسائل بعد. ابدأ بتحية محترمة وتذكر أن الهدف من ميثاق هو تعارف جاد وآمن.",
      composerLabel: "اكتب رسالة",
      placeholder: "اكتب رسالتك...",
      refresh: "تحديث",
      send: "إرسال الرسالة",
      rateLimit: "أرسلت رسائل كثيرة بسرعة. انتظر قليلاً قبل إرسال رسالة أخرى.",
      sendError: "تعذر إرسال الرسالة الآن. لم يتم حفظها.",
      safetyTitle: "الأمان متاح دائماً",
      safetyBody: "يمكنك الإبلاغ أو الحظر من نفس التعارف. الحظر يوقف التواصل من جهة الخادم.",
      safetyButton: "الأمان والإبلاغ",
      endTitle: "إنهاء التواصل",
      endBody: "يمكنك إنهاء هذا التعارف من دون حظر الطرف الآخر. سيُغلق مسار التواصل الحالي.",
      endConfirmBody: "سيتم إغلاق التعارف والمحادثة الحالية. هل تريد المتابعة؟",
      endButton: "إنهاء هذا التواصل",
      endConfirm: "تأكيد الإنهاء",
      cancelEnd: "إلغاء",
      endError: "تعذر إنهاء التواصل الآن. حاول مرة أخرى.",
    };
  }

  return {
    eyebrow: "Private conversation",
    title: "Communication inside the introduction",
    body: "This conversation exists only because acceptance became mutual. No member outside this introduction can access it.",
    loading: "Opening private conversation",
    unavailableTitle: "Conversation unavailable",
    unavailableBody:
      "The introduction may not be mutually accepted, may have closed, or may have stopped because of blocking or safety status.",
    retry: "Try again",
    back: "Back to introductions",
    boundaryTitle: "Communication is scoped to this introduction",
    boundaryBody:
      "We do not expose the other member’s identifier or phone number. Messages pass through guarded server permissions and stop when the introduction closes.",
    loadEarlier: "Load earlier messages",
    historyStart: "This is the beginning of the conversation",
    olderError: "We couldn’t load earlier messages. Try again.",
    emptyTitle: "Start with clarity and respect",
    emptyBody:
      "There are no messages yet. Begin with a respectful greeting and remember that Mithaq is designed for serious, safe introductions.",
    composerLabel: "Write a message",
    placeholder: "Write your message...",
    refresh: "Refresh",
    send: "Send message",
    rateLimit: "You are sending too quickly. Wait briefly before sending another message.",
    sendError: "We couldn’t send that message. It was not saved.",
    safetyTitle: "Safety stays available",
    safetyBody: "Report or block from the same introduction. Blocking stops communication server-side.",
    safetyButton: "Safety & report",
    endTitle: "End communication",
    endBody:
      "You can end this introduction without blocking the other member. The current communication path will close.",
    endConfirmBody: "This will close the current introduction and conversation. Continue?",
    endButton: "End this communication",
    endConfirm: "Confirm ending",
    cancelEnd: "Cancel",
    endError: "We couldn’t end the conversation right now. Try again.",
  };
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  singleAction: { marginTop: 14 },
  loadingState: { minHeight: 240, alignItems: "center", justifyContent: "center" },
  boundaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    backgroundColor: colors.primaryWash,
    padding: 16,
  },
  boundaryTitle: { color: colors.primary, fontSize: 15, fontWeight: "800" },
  boundaryBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 5 },
  historyControls: { gap: 8 },
  historyEnd: { color: colors.mutedSoft, fontSize: 11 },
  messagesCard: {
    minHeight: 260,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 14,
  },
  emptyState: { minHeight: 230, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  emptyMark: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
    marginBottom: 12,
  },
  emptyMarkText: { color: colors.gold, fontSize: 20, fontWeight: "900" },
  emptyTitle: { color: colors.foreground, fontSize: 16, fontWeight: "800" },
  emptyBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 6 },
  messageList: { gap: 9 },
  messageRow: { width: "100%" },
  messageRowMine: { alignItems: "flex-end" },
  messageRowTheirs: { alignItems: "flex-start" },
  bubble: { maxWidth: "84%", borderRadius: radius.lg, paddingHorizontal: 13, paddingVertical: 10 },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleTheirs: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  messageBody: { color: colors.foreground, fontSize: 14, lineHeight: 21 },
  messageBodyMine: { color: colors.white },
  messageTime: { color: colors.mutedSoft, fontSize: 10, marginTop: 5 },
  messageTimeMine: { color: "rgba(255,255,255,0.68)" },
  composerCard: {
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 14,
  },
  input: {
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 13,
    paddingVertical: 11,
    textAlignVertical: "top",
  },
  composerMeta: { alignItems: "center", justifyContent: "space-between" },
  counter: { color: colors.mutedSoft, fontSize: 10 },
  refreshButton: { paddingHorizontal: 9, paddingVertical: 6 },
  refreshText: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  pressed: { opacity: 0.72 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 20, fontWeight: "700" },
  safetyCard: {
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryWash,
    padding: 16,
  },
  safetyTitle: { color: colors.primary, fontSize: 15, fontWeight: "800" },
  safetyBody: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  endCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(163, 60, 63, 0.25)",
    backgroundColor: "#FBF4F2",
    padding: 16,
  },
  endTitle: { color: colors.danger, fontSize: 15, fontWeight: "800" },
  endBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 5 },
  endActions: { gap: 9, marginTop: 13 },
});