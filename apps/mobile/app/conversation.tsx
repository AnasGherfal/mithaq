import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ProfilePortrait } from "@/components/profile-portrait";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import { TrustBadges } from "@/components/trust-badges";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

type MessageRow = {
  message_id: string;
  sender_is_me: boolean;
  body: string;
  sent_at: string;
};

type PendingSend = {
  body: string;
  nonce: string;
};

type ConversationPreview = {
  display_name: string | null;
  age_band_label: string | null;
  city: string | null;
  marital_status: "never_married" | "married" | "divorced" | "widowed" | null;
  has_children: boolean | null;
  primary_photo_url: string | null;
  presentation_mode: "open_profile" | "controlled_reveal" | null;
  real_person_verified: boolean | null;
  age_18_plus_verified: boolean | null;
  identity_verified: boolean | null;
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

function createClientNonce() {
  const first = Math.random().toString(36).slice(2).padEnd(10, "0").slice(0, 10);
  const second = Math.random().toString(36).slice(2).padEnd(10, "0").slice(0, 10);
  return `${Date.now().toString(36)}-${first}-${second}`;
}

function dayKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ locale?: string; introductionId?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const introductionId = params.introductionId ?? "";
  const validIntroduction = uuidPattern.test(introductionId);
  const copy = useMemo(() => conversationCopy(locale), [locale]);
  const [loading, setLoading] = useState(validIntroduction);
  const [loadError, setLoadError] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [preview, setPreview] = useState<ConversationPreview | null>(null);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const refreshingRef = useRef(false);
  const pendingSendRef = useRef<PendingSend | null>(null);

  const markVisibleMessagesRead = useCallback(
    async (rows: MessageRow[]) => {
      if (AppState.currentState !== "active") return;
      const latestMessage = rows[rows.length - 1];
      if (!latestMessage) return;

      await supabase.rpc("mark_my_conversation_read", {
        p_introduction_id: introductionId,
        p_through: latestMessage.sent_at,
      });
    },
    [introductionId],
  );

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

      const [messageResult, previewResult] = await Promise.all([
        supabase.rpc("list_my_conversation_messages_v2", {
          p_introduction_id: introductionId,
          p_before_sent_at: null,
          p_before_message_id: null,
          p_limit: PAGE_SIZE,
        }),
        supabase.rpc("get_introduction_preview", {
          p_introduction_id: introductionId,
        }),
      ]);

      refreshingRef.current = false;
      if (messageResult.error || previewResult.error) {
        if (showLoading) {
          setLoadError(true);
          setLoading(false);
        }
        return;
      }

      const rows = (messageResult.data ?? []) as MessageRow[];
      const previewRow = ((Array.isArray(previewResult.data) ? previewResult.data[0] : previewResult.data) ??
        null) as ConversationPreview | null;
      setMessages((current) => (showLoading ? rows : mergeMessages(current, rows)));
      setPreview(previewRow);
      if (showLoading) setHasOlder(rows.length === PAGE_SIZE);
      setLoadError(false);
      setLoading(false);
      void markVisibleMessagesRead(rows);
    },
    [introductionId, locale, markVisibleMessagesRead, validIntroduction],
  );

  useEffect(() => {
    void loadMessages(true);
  }, [loadMessages]);

  useEffect(() => {
    if (!validIntroduction || loadError) return;
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void loadMessages(false);
    }, 8000);
    return () => clearInterval(timer);
  }, [loadError, loadMessages, validIntroduction]);

  useEffect(() => {
    if (!validIntroduction) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void loadMessages(false);
    });
    return () => subscription.remove();
  }, [loadMessages, validIntroduction]);

  async function loadOlderMessages() {
    if (!hasOlder || loadingOlder || messages.length === 0 || refreshingRef.current) return;

    const oldestMessage = messages[0];
    if (!oldestMessage) return;

    setLoadingOlder(true);
    setOlderError(null);
    refreshingRef.current = true;

    const { data, error } = await supabase.rpc("list_my_conversation_messages_v2", {
      p_introduction_id: introductionId,
      p_before_sent_at: oldestMessage.sent_at,
      p_before_message_id: oldestMessage.message_id,
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

    let attempt = pendingSendRef.current;
    if (!attempt || attempt.body !== body) {
      attempt = { body, nonce: createClientNonce() };
      pendingSendRef.current = attempt;
    }

    setSending(true);
    setSendError(null);
    const { error } = await supabase.rpc("send_conversation_message_idempotent", {
      p_introduction_id: introductionId,
      p_body: body,
      p_client_nonce: attempt.nonce,
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("idempotency conflict")) pendingSendRef.current = null;
      setSendError(message.includes("rate limit") ? copy.rateLimit : copy.sendError);
      setSending(false);
      return;
    }

    pendingSendRef.current = null;
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

  const hasTrust = Boolean(
    preview && (preview.real_person_verified || preview.age_18_plus_verified || preview.identity_verified),
  );
  const initials = preview?.display_name?.trim().charAt(0) || "م";
  const profileMeta = [preview?.age_band_label, preview?.city].filter(Boolean).join(" · ");

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
          {preview ? (
            <View style={styles.partnerCard}>
              <ProfilePortrait
                height={172}
                initials={initials}
                privacyLabel={copy.partnerPhoto}
                rtl={rtl}
                uri={preview.primary_photo_url}
              />
              <View style={[styles.partnerContent, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
                <View style={[styles.stagePill, { alignSelf: rtl ? "flex-end" : "flex-start" }]}>
                  <Text style={styles.stagePillText}>
                    {preview.presentation_mode === "open_profile" ? copy.openProfile : copy.controlledReveal}
                  </Text>
                </View>
                <Text style={[styles.partnerName, { textAlign, writingDirection }]}>
                  {preview.display_name ?? copy.member}
                </Text>
                <Text style={[styles.partnerMeta, { textAlign, writingDirection }]}>
                  {profileMeta || copy.privateMember}
                </Text>

                {hasTrust ? (
                  <View style={styles.partnerTrust}>
                    <TrustBadges
                      compact
                      locale={locale}
                      realPersonVerified={Boolean(preview.real_person_verified)}
                      age18PlusVerified={Boolean(preview.age_18_plus_verified)}
                      identityVerified={Boolean(preview.identity_verified)}
                    />
                  </View>
                ) : null}

                <View style={[styles.partnerFacts, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                  {preview.marital_status ? (
                    <View style={styles.partnerFact}>
                      <Text style={styles.partnerFactLabel}>{copy.marital}</Text>
                      <Text style={styles.partnerFactValue}>{copy.maritalStatus[preview.marital_status]}</Text>
                    </View>
                  ) : null}
                  {preview.has_children !== null ? (
                    <View style={styles.partnerFact}>
                      <Text style={styles.partnerFactLabel}>{copy.children}</Text>
                      <Text style={styles.partnerFactValue}>{preview.has_children ? copy.yes : copy.no}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.boundaryCard}>
            <Text style={[styles.boundaryEyebrow, { textAlign, writingDirection }]}>{copy.boundaryEyebrow}</Text>
            <Text style={[styles.boundaryTitle, { textAlign, writingDirection }]}>{copy.boundaryTitle}</Text>
            <Text style={[styles.boundaryBody, { textAlign, writingDirection }]}>{copy.boundaryBody}</Text>
          </View>

          {messages.length > 0 ? (
            <View style={styles.historyControls}>
              {hasOlder ? (
                <PrimaryButton tone="quiet" loading={loadingOlder} onPress={() => void loadOlderMessages()}>
                  {copy.loadEarlier}
                </PrimaryButton>
              ) : (
                <Text style={styles.historyEnd}>{copy.historyStart}</Text>
              )}
              {olderError ? (
                <Text accessibilityRole="alert" style={[styles.error, { textAlign, writingDirection }]}>
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
                <Text style={[styles.emptyTitle, { textAlign: "center", writingDirection }]}>{copy.emptyTitle}</Text>
                <Text style={[styles.emptyBody, { textAlign: "center", writingDirection }]}>{copy.emptyBody}</Text>
                <Text style={[styles.starterLabel, { textAlign: "center", writingDirection }]}>
                  {copy.starterLabel}
                </Text>
                <View style={styles.starterList}>
                  {copy.starters.map((starter) => (
                    <Pressable
                      key={starter}
                      accessibilityRole="button"
                      onPress={() => {
                        setDraft(starter);
                        setSendError(null);
                      }}
                      style={({ pressed }) => [styles.starterButton, pressed ? styles.pressed : null]}
                    >
                      <Text style={[styles.starterText, { textAlign, writingDirection }]}>{starter}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.messageList}>
                {messages.map((message, index) => {
                  const previous = index > 0 ? messages[index - 1] : null;
                  const showDay = !previous || dayKey(previous.sent_at) !== dayKey(message.sent_at);
                  return (
                    <View key={message.message_id} style={styles.messageEntry}>
                      {showDay ? <DayLabel sentAt={message.sent_at} locale={locale} /> : null}
                      <MessageBubble message={message} locale={locale} rtl={rtl} />
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.composerCard}>
            <Text style={[styles.composerTitle, { textAlign, writingDirection }]}>{copy.composerTitle}</Text>
            <TextInput
              accessibilityLabel={copy.composerLabel}
              multiline
              maxLength={2000}
              editable={!sending && !ending}
              value={draft}
              onChangeText={(value) => {
                const nextBody = value.trim();
                if (pendingSendRef.current && pendingSendRef.current.body !== nextBody) {
                  pendingSendRef.current = null;
                }
                setDraft(value);
                setSendError(null);
              }}
              placeholder={copy.placeholder}
              placeholderTextColor={colors.mutedSoft}
              textAlign={textAlign}
              style={[styles.input, { writingDirection }]}
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
            <Text style={[styles.noPresence, { textAlign, writingDirection }]}>{copy.noPresence}</Text>
          </View>

          {sendError ? (
            <Text accessibilityRole="alert" style={[styles.error, { textAlign, writingDirection }]}>
              {sendError}
            </Text>
          ) : null}

          <View style={styles.controlsCard}>
            <Text style={[styles.controlsTitle, { textAlign, writingDirection }]}>{copy.controlsTitle}</Text>
            <Text style={[styles.controlsBody, { textAlign, writingDirection }]}>{copy.controlsBody}</Text>
            <View style={styles.controlActions}>
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
              <Pressable
                accessibilityRole="button"
                disabled={sending || ending}
                onPress={() => void endConversation()}
                style={({ pressed }) => [
                  styles.endButton,
                  pressed && !ending ? styles.endButtonPressed : null,
                  ending ? styles.endButtonDisabled : null,
                ]}
              >
                {ending ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <Text style={styles.endButtonText}>{confirmEnd ? copy.endConfirm : copy.endButton}</Text>
                )}
              </Pressable>
              {confirmEnd ? (
                <View style={styles.endConfirmCard}>
                  <Text style={[styles.endConfirmTitle, { textAlign, writingDirection }]}>{copy.endConfirmTitle}</Text>
                  <Text style={[styles.endConfirmBody, { textAlign, writingDirection }]}>{copy.endConfirmBody}</Text>
                  <PrimaryButton tone="quiet" disabled={ending} onPress={() => setConfirmEnd(false)}>
                    {copy.cancelEnd}
                  </PrimaryButton>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

function DayLabel({ sentAt, locale }: { sentAt: string; locale: MobileLocale }) {
  const label = new Date(sentAt).toLocaleDateString(locale === "ar" ? "ar-LY" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return (
    <View style={styles.dayRow}>
      <View style={styles.dayRule} />
      <Text style={styles.dayLabel}>{label}</Text>
      <View style={styles.dayRule} />
    </View>
  );
}

function MessageBubble({ message, locale, rtl }: { message: MessageRow; locale: MobileLocale; rtl: boolean }) {
  const time = new Date(message.sent_at).toLocaleTimeString(locale === "ar" ? "ar-LY" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <View style={[styles.messageRow, message.sender_is_me ? styles.messageRowMine : styles.messageRowTheirs]}>
      <View style={[styles.bubble, message.sender_is_me ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text
          style={[
            styles.messageBody,
            message.sender_is_me ? styles.messageBodyMine : null,
            { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" },
          ]}
        >
          {message.body}
        </Text>
        <Text style={[styles.messageTime, message.sender_is_me ? styles.messageTimeMine : null]}>{time}</Text>
      </View>
    </View>
  );
}

function conversationCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  const maritalStatus = ar
    ? {
        never_married: "لم يسبق الزواج",
        married: "متزوج/ة",
        divorced: "مطلق/ة",
        widowed: "أرمل/ة",
      }
    : {
        never_married: "Never married",
        married: "Married",
        divorced: "Divorced",
        widowed: "Widowed",
      };

  return {
    eyebrow: ar ? "الزواج · محادثة خاصة" : "MARRIAGE · PRIVATE CONVERSATION",
    title: ar ? "تعرّفا على بعضكما بهدوء" : "Get to know each other calmly",
    body: ar
      ? "بدأت هذه المحادثة فقط بعد القبول المتبادل. ميثاق لا يضيف حالة اتصال أو آخر ظهور أو مؤشرات شعبية."
      : "This conversation opened only after mutual acceptance. Mithaq does not add online status, last seen, or popularity signals.",
    loading: ar ? "جارٍ فتح المحادثة الخاصة" : "Opening private conversation",
    unavailableTitle: ar ? "المحادثة غير متاحة" : "Conversation unavailable",
    unavailableBody: ar
      ? "قد يكون التعارف أُغلق أو توقف بسبب الخصوصية أو الحظر أو حالة السلامة."
      : "The introduction may have closed or stopped because of privacy, blocking, or safety controls.",
    retry: ar ? "إعادة المحاولة" : "Try again",
    back: ar ? "العودة إلى التعارفات" : "Back to introductions",
    partnerPhoto: ar ? "صورة مسموحة داخل هذا التعارف" : "Portrait permitted inside this introduction",
    openProfile: ar ? "ملف مفتوح باختياره" : "Open profile by choice",
    controlledReveal: ar ? "كشف متحكم به" : "Controlled reveal",
    member: ar ? "عضو ميثاق" : "Mithaq member",
    privateMember: ar ? "تعارف خاص" : "Private introduction",
    marital: ar ? "الحالة الاجتماعية" : "Marital status",
    children: ar ? "الأطفال" : "Children",
    yes: ar ? "نعم" : "Yes",
    no: ar ? "لا" : "No",
    maritalStatus,
    boundaryEyebrow: ar ? "حدود المحادثة" : "CONVERSATION BOUNDARY",
    boundaryTitle: ar ? "هذه المساحة تخص هذا التعارف فقط" : "This space belongs to this introduction only",
    boundaryBody: ar
      ? "لا يظهر رقم الهاتف أو آخر ظهور أو حالة الاتصال. وإذا أُضيف أحدكما إلى درع العائلة أو حدث حظر أو إغلاق، يتوقف الوصول من جهة الخادم."
      : "Phone numbers, last seen, and online status are not shown. If either person is added to Family Shield, blocked, or the introduction closes, server access stops.",
    loadEarlier: ar ? "تحميل الرسائل الأقدم" : "Load earlier messages",
    historyStart: ar ? "هذه بداية المحادثة" : "This is the beginning of the conversation",
    olderError: ar ? "تعذر تحميل الرسائل الأقدم. حاول مرة أخرى." : "We couldn’t load earlier messages. Try again.",
    emptyTitle: ar
      ? "ابدأ بسؤال يساعد على فهم الزواج، لا الدردشة فقط"
      : "Start with something that helps you understand marriage fit",
    emptyBody: ar
      ? "يمكنك الكتابة بطريقتك، أو استخدام أحد الأسئلة كبداية فقط. لن يرسل ميثاق شيئاً نيابةً عنك."
      : "Write in your own words, or use one of these as a starting point. Mithaq never sends a prompt on your behalf.",
    starterLabel: ar ? "بدايات مقترحة" : "Optional conversation starters",
    starters: ar
      ? [
          "ما أهم شيء تريد أن نفهمه عن رؤيتك للحياة الزوجية؟",
          "كيف تتصور دور العائلة عندما يصبح التعارف أكثر جدية؟",
          "ما الموضوع الذي ترى أنه من الأفضل أن نتحدث عنه بوضوح من البداية؟",
        ]
      : [
          "What matters most for us to understand about your view of married life?",
          "How do you picture family involvement if this becomes more serious?",
          "What do you think is better to discuss clearly from the beginning?",
        ],
    composerTitle: ar ? "رسالتك" : "Your message",
    composerLabel: ar ? "اكتب رسالة" : "Write a message",
    placeholder: ar ? "اكتب رسالتك..." : "Write your message...",
    refresh: ar ? "تحديث" : "Refresh",
    send: ar ? "إرسال" : "Send",
    noPresence: ar
      ? "لا توجد مؤشرات كتابة أو آخر ظهور. الرد يكون عندما يكون الطرف الآخر جاهزاً."
      : "There are no typing or last-seen indicators. The other person can respond when they are ready.",
    rateLimit: ar
      ? "أرسلت رسائل كثيرة بسرعة. انتظر قليلاً قبل إرسال رسالة أخرى."
      : "You are sending too quickly. Wait briefly before sending another message.",
    sendError: ar
      ? "تعذر تأكيد إرسال الرسالة. اضغط إرسال مرة أخرى؛ إعادة المحاولة محمية من تكرار الرسالة."
      : "We couldn’t confirm delivery. Tap Send again; retries are protected against duplicate messages.",
    controlsTitle: ar ? "أنت تتحكم في استمرار التعارف" : "You control whether this continues",
    controlsBody: ar
      ? "الإبلاغ أو الحظر مخصصان لمشكلات السلامة. ويمكنك أيضاً إنهاء التعارف بهدوء من دون حظر الطرف الآخر."
      : "Report or block for safety concerns. You can also end the introduction quietly without blocking the other person.",
    safetyButton: ar ? "الأمان والإبلاغ" : "Safety & report",
    endButton: ar ? "إنهاء هذا التعارف" : "End this introduction",
    endConfirmTitle: ar ? "إنهاء التعارف؟" : "End the introduction?",
    endConfirmBody: ar
      ? "سيُغلق هذا التعارف ومسار الرسائل الحالي. هذا ليس حظراً، ويمكنك استخدام أدوات الأمان بشكل منفصل إذا احتجت إليها."
      : "This closes the current introduction and message path. It is not a block; safety tools remain separate if you need them.",
    endConfirm: ar ? "نعم، إنهاء التعارف" : "Yes, end introduction",
    cancelEnd: ar ? "إلغاء" : "Cancel",
    endError: ar ? "تعذر إنهاء التعارف الآن. حاول مرة أخرى." : "We couldn’t end the introduction right now. Try again.",
  };
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  singleAction: { marginTop: 14 },
  loadingState: { minHeight: 260, alignItems: "center", justifyContent: "center" },
  partnerCard: {
    width: "100%",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    overflow: "hidden",
    ...shadows.card,
  },
  partnerContent: { width: "100%", padding: 16 },
  stagePill: {
    borderRadius: radius.pill,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  stagePillText: { color: colors.primaryStrong, fontSize: 9, lineHeight: 13, fontWeight: "900" },
  partnerName: {
    width: "100%",
    color: colors.foreground,
    fontSize: 24,
    lineHeight: 34,
    fontWeight: "900",
    marginTop: 10,
  },
  partnerMeta: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 1 },
  partnerTrust: { width: "100%", marginTop: 9 },
  partnerFacts: { width: "100%", gap: 8, marginTop: 12 },
  partnerFact: { flex: 1, minHeight: 57, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, padding: 10 },
  partnerFactLabel: { color: colors.muted, fontSize: 8, lineHeight: 12, fontWeight: "800" },
  partnerFactValue: { color: colors.foreground, fontSize: 11, lineHeight: 17, fontWeight: "900", marginTop: 3 },
  boundaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primaryWash,
    padding: 15,
  },
  boundaryEyebrow: { color: colors.gold, fontSize: 9, lineHeight: 13, fontWeight: "900" },
  boundaryTitle: { color: colors.primaryStrong, fontSize: 14, lineHeight: 21, fontWeight: "900", marginTop: 4 },
  boundaryBody: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 4 },
  historyControls: { gap: 8 },
  historyEnd: { color: colors.mutedSoft, fontSize: 10, textAlign: "center" },
  messagesCard: {
    minHeight: 280,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 14,
    ...shadows.card,
  },
  emptyState: { minHeight: 250, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  emptyMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
    marginBottom: 11,
  },
  emptyMarkText: { color: colors.gold, fontSize: 20, fontWeight: "900" },
  emptyTitle: { maxWidth: 320, color: colors.foreground, fontSize: 16, lineHeight: 24, fontWeight: "900" },
  emptyBody: { maxWidth: 330, color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 6 },
  starterLabel: { color: colors.primaryStrong, fontSize: 10, lineHeight: 15, fontWeight: "900", marginTop: 16 },
  starterList: { width: "100%", gap: 7, marginTop: 8 },
  starterButton: {
    width: "100%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  starterText: { color: colors.foreground, fontSize: 11, lineHeight: 18, fontWeight: "700" },
  messageList: { gap: 5 },
  messageEntry: { width: "100%" },
  dayRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9 },
  dayRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  dayLabel: { color: colors.mutedSoft, fontSize: 8, lineHeight: 12, fontWeight: "800" },
  messageRow: { width: "100%", marginVertical: 3 },
  messageRowMine: { alignItems: "flex-end" },
  messageRowTheirs: { alignItems: "flex-start" },
  bubble: { maxWidth: "84%", borderRadius: radius.lg, paddingHorizontal: 13, paddingVertical: 10 },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleTheirs: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  messageBody: { color: colors.foreground, fontSize: 14, lineHeight: 21 },
  messageBodyMine: { color: colors.white },
  messageTime: { color: colors.mutedSoft, fontSize: 9, marginTop: 5 },
  messageTimeMine: { color: "rgba(255,255,255,0.68)" },
  composerCard: {
    gap: 9,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 14,
    ...shadows.card,
  },
  composerTitle: { color: colors.foreground, fontSize: 13, lineHeight: 20, fontWeight: "900" },
  input: {
    minHeight: 102,
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
  counter: { color: colors.mutedSoft, fontSize: 9 },
  refreshButton: { paddingHorizontal: 9, paddingVertical: 6 },
  refreshText: { color: colors.primary, fontSize: 10, fontWeight: "800" },
  noPresence: { color: colors.mutedSoft, fontSize: 9, lineHeight: 15 },
  pressed: { opacity: 0.7 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 19, fontWeight: "700" },
  controlsCard: {
    gap: 7,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 15,
  },
  controlsTitle: { color: colors.foreground, fontSize: 14, lineHeight: 21, fontWeight: "900" },
  controlsBody: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  controlActions: { gap: 8, marginTop: 5 },
  endButton: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(163,60,63,0.32)",
    backgroundColor: "#FBF4F2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  endButtonPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  endButtonDisabled: { opacity: 0.5 },
  endButtonText: { color: colors.danger, fontSize: 12, lineHeight: 18, fontWeight: "900" },
  endConfirmCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(163,60,63,0.22)",
    backgroundColor: "#FBF4F2",
    padding: 12,
    gap: 6,
  },
  endConfirmTitle: { color: colors.danger, fontSize: 12, lineHeight: 18, fontWeight: "900" },
  endConfirmBody: { color: colors.muted, fontSize: 10, lineHeight: 17 },
});
