import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ProfilePortrait } from "@/components/profile-portrait";
import { ScreenShell } from "@/components/screen-shell";
import { TrustBadges } from "@/components/trust-badges";
import type { MobileLocale } from "@/i18n";
import { colors, radius, shadows } from "@/theme";

export default function DevConversationScreen() {
  if (!__DEV__) return null;
  return <DevConversationContent />;
}

function DevConversationContent() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => previewCopy(locale), [locale]);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ended, setEnded] = useState(false);
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";

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
      <View style={styles.stack}>
        <View style={styles.devCard}>
          <Text style={[styles.devTitle, { textAlign, writingDirection }]}>{copy.devTitle}</Text>
          <Text style={[styles.devBody, { textAlign, writingDirection }]}>{copy.devBody}</Text>
        </View>

        <View style={styles.partnerCard}>
          <ProfilePortrait height={172} initials="M" privacyLabel={copy.photoLabel} rtl={rtl} uri={null} />
          <View style={[styles.partnerContent, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
            <View style={styles.stagePill}>
              <Text style={styles.stagePillText}>{copy.stage}</Text>
            </View>
            <Text style={[styles.name, { textAlign, writingDirection }]}>Maya</Text>
            <Text style={[styles.meta, { textAlign, writingDirection }]}>25–29 · Tripoli</Text>
            <View style={styles.trust}>
              <TrustBadges locale={locale} compact realPersonVerified age18PlusVerified identityVerified />
            </View>
            <View style={[styles.facts, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <Fact label={copy.marital} value={copy.neverMarried} rtl={rtl} />
              <Fact label={copy.children} value={copy.no} rtl={rtl} />
            </View>
          </View>
        </View>

        <View style={styles.boundaryCard}>
          <Text style={[styles.boundaryEyebrow, { textAlign, writingDirection }]}>{copy.boundaryEyebrow}</Text>
          <Text style={[styles.boundaryTitle, { textAlign, writingDirection }]}>{copy.boundaryTitle}</Text>
          <Text style={[styles.boundaryBody, { textAlign, writingDirection }]}>{copy.boundaryBody}</Text>
        </View>

        {!sent ? (
          <View style={styles.emptyCard}>
            <Text style={styles.spark}>✦</Text>
            <Text style={[styles.emptyTitle, { textAlign: "center", writingDirection }]}>{copy.emptyTitle}</Text>
            <Text style={[styles.emptyBody, { textAlign: "center", writingDirection }]}>{copy.emptyBody}</Text>
            <View style={styles.starters}>
              {copy.starters.map((starter) => (
                <Pressable
                  key={starter}
                  accessibilityRole="button"
                  onPress={() => setDraft(starter)}
                  style={({ pressed }) => [styles.starter, pressed ? styles.pressed : null]}
                >
                  <Text style={[styles.starterText, { textAlign, writingDirection }]}>{starter}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.messagesCard}>
            <Text style={styles.dayLabel}>{copy.today}</Text>
            <View style={styles.theirRow}>
              <View style={styles.theirBubble}>
                <Text style={[styles.theirText, { textAlign, writingDirection }]}>{copy.sampleReply}</Text>
                <Text style={styles.time}>3:42</Text>
              </View>
            </View>
            <View style={styles.myRow}>
              <View style={styles.myBubble}>
                <Text style={[styles.myText, { textAlign, writingDirection }]}>{draft || copy.sampleMine}</Text>
                <Text style={styles.myTime}>3:44</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.composerCard}>
          <Text style={[styles.composerTitle, { textAlign, writingDirection }]}>{copy.composerTitle}</Text>
          <TextInput
            multiline
            maxLength={2000}
            value={draft}
            onChangeText={setDraft}
            placeholder={copy.placeholder}
            placeholderTextColor={colors.mutedSoft}
            textAlign={textAlign}
            style={[styles.input, { writingDirection }]}
          />
          <PrimaryButton disabled={!draft.trim()} onPress={() => setSent(true)}>
            {copy.send}
          </PrimaryButton>
          <Text style={[styles.presenceNote, { textAlign, writingDirection }]}>{copy.presenceNote}</Text>
        </View>

        {ended ? (
          <View style={styles.endedCard}>
            <Text style={[styles.endedTitle, { textAlign, writingDirection }]}>{copy.endedTitle}</Text>
            <Text style={[styles.endedBody, { textAlign, writingDirection }]}>{copy.endedBody}</Text>
          </View>
        ) : (
          <View style={styles.controlsCard}>
            <Text style={[styles.controlsTitle, { textAlign, writingDirection }]}>{copy.controlsTitle}</Text>
            <Text style={[styles.controlsBody, { textAlign, writingDirection }]}>{copy.controlsBody}</Text>
            <PrimaryButton tone="quiet" onPress={() => setConfirmEnd((value) => !value)}>
              {confirmEnd ? copy.confirmEnd : copy.end}
            </PrimaryButton>
            {confirmEnd ? (
              <View style={styles.confirmCard}>
                <Text style={[styles.confirmBody, { textAlign, writingDirection }]}>{copy.confirmBody}</Text>
                <PrimaryButton tone="quiet" onPress={() => setEnded(true)}>
                  {copy.yesEnd}
                </PrimaryButton>
                <PrimaryButton tone="quiet" onPress={() => setConfirmEnd(false)}>
                  {copy.cancel}
                </PrimaryButton>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </ScreenShell>
  );
}

function Fact({ label, value, rtl }: { label: string; value: string; rtl: boolean }) {
  return (
    <View style={[styles.fact, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function previewCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  return {
    eyebrow: ar ? "مختبر المحادثة" : "CONVERSATION V2 PREVIEW",
    title: ar ? "اختبر المحادثة الخاصة" : "Test the private conversation",
    body: ar ? "معاينة محلية لا ترسل أي رسالة حقيقية." : "A local preview that sends no real messages.",
    back: ar ? "رجوع" : "Back",
    devTitle: ar ? "للتطوير فقط" : "Development only",
    devBody: ar
      ? "Maya والرسائل هنا بيانات تجريبية وليست أعضاء أو رسائل حقيقية."
      : "Maya and these messages are sample data, not real members or real messages.",
    photoLabel: ar ? "صورة مسموحة داخل التعارف" : "Portrait permitted inside the introduction",
    stage: ar ? "كشف متحكم به" : "Controlled reveal",
    marital: ar ? "الحالة الاجتماعية" : "Marital status",
    neverMarried: ar ? "لم يسبق الزواج" : "Never married",
    children: ar ? "الأطفال" : "Children",
    no: ar ? "لا" : "No",
    boundaryEyebrow: ar ? "حدود المحادثة" : "CONVERSATION BOUNDARY",
    boundaryTitle: ar ? "لا حالة اتصال ولا آخر ظهور" : "No online status or last seen",
    boundaryBody: ar
      ? "المحادثة تخص هذا التعارف فقط. درع العائلة أو الحظر أو إنهاء التعارف يوقف الوصول."
      : "The conversation belongs only to this introduction. Family Shield, blocking, or ending the introduction stops access.",
    emptyTitle: ar ? "ابدأ بشيء يساعد على فهم الزواج" : "Start with something that helps you understand marriage fit",
    emptyBody: ar
      ? "اختر سؤالاً كبداية أو اكتب بطريقتك. لا يتم الإرسال تلقائياً."
      : "Choose a starter or write your own. Nothing is sent automatically.",
    starters: ar
      ? [
          "ما أهم شيء تريد أن نفهمه عن رؤيتك للحياة الزوجية؟",
          "كيف تتصور دور العائلة إذا أصبح التعارف أكثر جدية؟",
          "ما الموضوع الذي ترى أنه من الأفضل مناقشته بوضوح من البداية؟",
        ]
      : [
          "What matters most for us to understand about your view of married life?",
          "How do you picture family involvement if this becomes more serious?",
          "What do you think is better to discuss clearly from the beginning?",
        ],
    today: ar ? "اليوم" : "Today",
    sampleReply: ar
      ? "بالنسبة لي الوضوح واحترام العائلة مهمان جداً."
      : "For me, clarity and respect for family are very important.",
    sampleMine: ar
      ? "أتفق، وأحب أن نكون واضحين من البداية."
      : "I agree, and I’d like us to be clear from the beginning.",
    composerTitle: ar ? "رسالتك" : "Your message",
    placeholder: ar ? "اكتب رسالتك..." : "Write your message...",
    send: ar ? "محاكاة الإرسال" : "Simulate send",
    presenceNote: ar ? "لا مؤشرات كتابة ولا آخر ظهور." : "No typing indicators and no last seen.",
    controlsTitle: ar ? "التحكم بالتعارف" : "Introduction controls",
    controlsBody: ar
      ? "الإنهاء الهادئ مختلف عن الحظر أو الإبلاغ."
      : "Ending quietly is separate from blocking or reporting.",
    end: ar ? "تجربة إنهاء التعارف" : "Try ending introduction",
    confirmEnd: ar ? "راجع قرار الإنهاء" : "Review ending choice",
    confirmBody: ar
      ? "سيُغلق مسار الرسائل في التطبيق الحقيقي، لكنه لا يحظر الطرف الآخر."
      : "In the real app this closes the message path, but it does not block the other person.",
    yesEnd: ar ? "محاكاة الإنهاء" : "Simulate ending",
    cancel: ar ? "إلغاء" : "Cancel",
    endedTitle: ar ? "تم إنهاء التعارف في المعاينة" : "Preview introduction ended",
    endedBody: ar
      ? "هذه معاينة محلية فقط؛ لم يتغير أي حساب حقيقي."
      : "This was local only; no real account or introduction changed.",
  };
}

const styles = StyleSheet.create({
  stack: { width: "100%", gap: 14 },
  devCard: { borderRadius: radius.lg, backgroundColor: colors.goldSoft, padding: 14, gap: 4 },
  devTitle: { color: colors.gold, fontSize: 13, fontWeight: "900" },
  devBody: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  partnerCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    overflow: "hidden",
    ...shadows.card,
  },
  partnerContent: { padding: 15 },
  stagePill: {
    borderRadius: radius.pill,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  stagePillText: { color: colors.primaryStrong, fontSize: 9, fontWeight: "900" },
  name: { color: colors.foreground, fontSize: 24, lineHeight: 34, fontWeight: "900", marginTop: 9 },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  trust: { width: "100%", marginTop: 8 },
  facts: { width: "100%", gap: 8, marginTop: 11 },
  fact: { flex: 1, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, padding: 10 },
  factLabel: { color: colors.muted, fontSize: 8, fontWeight: "800" },
  factValue: { color: colors.foreground, fontSize: 11, fontWeight: "900", marginTop: 3 },
  boundaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primaryWash,
    padding: 14,
  },
  boundaryEyebrow: { color: colors.gold, fontSize: 9, fontWeight: "900" },
  boundaryTitle: { color: colors.primaryStrong, fontSize: 14, lineHeight: 21, fontWeight: "900", marginTop: 4 },
  boundaryBody: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 4 },
  emptyCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 15,
    alignItems: "center",
    ...shadows.card,
  },
  spark: { color: colors.gold, fontSize: 22, fontWeight: "900" },
  emptyTitle: { color: colors.foreground, fontSize: 15, lineHeight: 23, fontWeight: "900", marginTop: 8 },
  emptyBody: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 5 },
  starters: { width: "100%", gap: 7, marginTop: 13 },
  starter: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 11,
  },
  starterText: { color: colors.foreground, fontSize: 11, lineHeight: 18, fontWeight: "700" },
  messagesCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 14,
    gap: 8,
    ...shadows.card,
  },
  dayLabel: { color: colors.mutedSoft, fontSize: 9, textAlign: "center", fontWeight: "800" },
  theirRow: { alignItems: "flex-start" },
  myRow: { alignItems: "flex-end" },
  theirBubble: {
    maxWidth: "84%",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 11,
  },
  myBubble: { maxWidth: "84%", borderRadius: radius.lg, backgroundColor: colors.primary, padding: 11 },
  theirText: { color: colors.foreground, fontSize: 13, lineHeight: 20 },
  myText: { color: colors.white, fontSize: 13, lineHeight: 20 },
  time: { color: colors.mutedSoft, fontSize: 8, marginTop: 4 },
  myTime: { color: "rgba(255,255,255,0.7)", fontSize: 8, marginTop: 4 },
  composerCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 14,
    gap: 9,
    ...shadows.card,
  },
  composerTitle: { color: colors.foreground, fontSize: 13, fontWeight: "900" },
  input: {
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    color: colors.foreground,
    padding: 12,
    fontSize: 13,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  presenceNote: { color: colors.mutedSoft, fontSize: 9, lineHeight: 15 },
  controlsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 14,
    gap: 7,
  },
  controlsTitle: { color: colors.foreground, fontSize: 13, fontWeight: "900" },
  controlsBody: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  confirmCard: { borderRadius: radius.md, backgroundColor: "#FBF4F2", padding: 11, gap: 7 },
  confirmBody: { color: colors.muted, fontSize: 10, lineHeight: 17 },
  endedCard: { borderRadius: radius.lg, backgroundColor: colors.primaryWash, padding: 14 },
  endedTitle: { color: colors.primaryStrong, fontSize: 13, fontWeight: "900" },
  endedBody: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 4 },
  pressed: { opacity: 0.7 },
});
