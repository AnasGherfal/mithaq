import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import type { MobileLocale } from "@/i18n";
import { colors, radius, shadows } from "@/theme";

export type MarriageActivityKind =
  | "interest_saved"
  | "introduction_offered"
  | "my_choice_saved"
  | "mutual_acceptance"
  | "conversation_started"
  | "message_received"
  | "my_photo_shared"
  | "photo_shared_with_me"
  | "my_trusted_contact_shared"
  | "trusted_contact_shared_with_me"
  | "introduction_closed_by_me"
  | "introduction_closed"
  | "introduction_expired"
  | "conversation_ended_by_me"
  | "conversation_closed";

export type MarriageActivityItem = {
  activityId: string;
  kind: MarriageActivityKind;
  introductionId: string | null;
  introductionStatus: "offered" | "mutually_accepted" | "declined" | "expired" | "cancelled" | "closed" | null;
  occurredAt: string;
  isUnread: boolean;
};

type Tone = "teal" | "rose" | "gold" | "neutral" | "closed";

type Props = {
  items: MarriageActivityItem[];
  locale: MobileLocale;
  onOpen?: (item: MarriageActivityItem) => void;
};

export function MarriageActivityTimeline({ items, locale, onOpen }: Props) {
  const rtl = locale === "ar";
  const groups = groupByDay(items, locale);

  return (
    <View style={styles.timeline}>
      {groups.map((group) => (
        <View key={group.key} style={styles.dayGroup}>
          <Text style={[styles.dayLabel, { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }]}>
            {group.label}
          </Text>
          <View style={styles.dayItems}>
            {group.items.map((item, index) => (
              <TimelineRow
                key={item.activityId}
                item={item}
                locale={locale}
                last={index === group.items.length - 1}
                onPress={onOpen ? () => onOpen(item) : undefined}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function TimelineRow({
  item,
  locale,
  last,
  onPress,
}: {
  item: MarriageActivityItem;
  locale: MobileLocale;
  last: boolean;
  onPress?: () => void;
}) {
  const rtl = locale === "ar";
  const presentation = activityPresentation(item.kind, locale);
  const time = formatTime(item.occurredAt, locale);
  const direction = rtl ? "rtl" : "ltr";

  const content = (
    <View style={[styles.row, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <View style={styles.rail}>
        <View style={[styles.iconWrap, toneIconStyle(presentation.tone)]}>
          <AppIcon name={presentation.icon} active size={19} />
        </View>
        {!last ? <View style={styles.line} /> : null}
      </View>

      <View style={[styles.card, item.isUnread ? styles.cardUnread : null]}>
        <View style={[styles.titleRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <Text style={[styles.title, { textAlign: rtl ? "right" : "left", writingDirection: direction }]}>
            {presentation.title}
          </Text>
          {item.isUnread ? <View style={styles.unreadDot} /> : null}
          <Text style={[styles.time, { writingDirection: direction }]}>{time}</Text>
        </View>
        <Text style={[styles.body, { textAlign: rtl ? "right" : "left", writingDirection: direction }]}>
          {presentation.body}
        </Text>
        {onPress ? (
          <Text style={[styles.openHint, { textAlign: rtl ? "right" : "left", writingDirection: direction }]}>
            {rtl ? "اضغط لعرض المرحلة" : "Tap to open this stage"}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${presentation.title}. ${presentation.body}`}
      onPress={onPress}
      style={({ pressed }) => [pressed ? styles.pressed : null]}
    >
      {content}
    </Pressable>
  );
}

function activityPresentation(kind: MarriageActivityKind, locale: MobileLocale) {
  const ar = locale === "ar";

  const values: Record<MarriageActivityKind, { icon: AppIconName; tone: Tone; title: string; body: string }> = {
    interest_saved: {
      icon: "sliders",
      tone: "teal",
      title: ar ? "اهتمامك محفوظ بسرية" : "Private interest saved",
      body: ar
        ? "لم نرسل للطرف الآخر إشعاراً باهتمامك. لا ينتقل ميثاق للمرحلة التالية إلا عبر المسار المنضبط."
        : "The other person was not notified about your interest. Mithaq only moves forward through the controlled flow.",
    },
    introduction_offered: {
      icon: "introductions",
      tone: "rose",
      title: ar ? "تعارف خاص جاهز للمراجعة" : "A private introduction is ready",
      body: ar
        ? "راجع التوافق والمعلومات المسموح بعرضها، ثم اتخذ قرارك بشكل خاص."
        : "Review the fit and permitted profile information, then make your decision privately.",
    },
    my_choice_saved: {
      icon: "privacy",
      tone: "teal",
      title: ar ? "تم حفظ اختيارك للمتابعة" : "Your choice to continue is saved",
      body: ar
        ? "يبقى اختيارك خاصاً. لا نكشف لك قرار الطرف الآخر إلا إذا أصبح القبول متبادلاً."
        : "Your choice stays private. The other person’s decision is never revealed unless acceptance becomes mutual.",
    },
    mutual_acceptance: {
      icon: "introductions",
      tone: "gold",
      title: ar ? "القبول متبادل" : "Acceptance is mutual",
      body: ar
        ? "يمكن الآن الانتقال إلى التعارف المحمي والمحادثة الخاصة وفق اختيارات الخصوصية لكل طرف."
        : "The protected handoff and private conversation are now available under each person’s privacy choices.",
    },
    conversation_started: {
      icon: "chat",
      tone: "gold",
      title: ar ? "بدأت محادثة خاصة" : "Private conversation started",
      body: ar
        ? "بدأ التواصل بعد قبول متبادل، من دون حالة اتصال أو آخر ظهور أو ضغط للرد."
        : "Conversation opened after mutual acceptance, without online status, last seen, or pressure to reply.",
    },
    message_received: {
      icon: "chat",
      tone: "teal",
      title: ar ? "رسالة خاصة جديدة" : "New private message",
      body: ar
        ? "وصلت رسالة داخل تعارف مقبول من الطرفين. لا نعرض نص الرسالة في النشاط."
        : "A message arrived inside a mutually accepted introduction. Activity never previews the message text.",
    },
    my_photo_shared: {
      icon: "photo",
      tone: "rose",
      title: ar ? "شاركت صورتك في هذا التعارف" : "You shared your photo in this introduction",
      body: ar
        ? "أصبحت صورتك المعتمدة متاحة لهذا التعارف فقط وفق اختيارك الصريح."
        : "Your approved photo became available to this introduction only through your explicit choice.",
    },
    photo_shared_with_me: {
      icon: "photo",
      tone: "rose",
      title: ar ? "تمت مشاركة صورة معك" : "A photo was shared with you",
      body: ar
        ? "اختار الطرف الآخر إتاحة صورة معتمدة داخل هذا التعارف المحمي."
        : "The other person chose to make an approved photo available inside this protected introduction.",
    },
    my_trusted_contact_shared: {
      icon: "shield",
      tone: "gold",
      title: ar ? "أشركت شخصاً من دائرة الثقة" : "You involved your Trusted Circle",
      body: ar
        ? "شاركت جهة اتصال موثوقة باختيارك داخل هذا التعارف. ميثاق لا يتواصل معها تلقائياً."
        : "You deliberately shared a trusted contact in this introduction. Mithaq does not contact them automatically.",
    },
    trusted_contact_shared_with_me: {
      icon: "shield",
      tone: "gold",
      title: ar ? "تمت مشاركة جهة اتصال موثوقة معك" : "A trusted contact was shared with you",
      body: ar
        ? "اختار الطرف الآخر إشراك شخص موثوق في هذه المرحلة من التعارف."
        : "The other person chose to involve someone they trust at this stage of the introduction.",
    },
    introduction_closed_by_me: {
      icon: "introductions",
      tone: "closed",
      title: ar ? "أنهيت هذا التعارف" : "You ended this introduction",
      body: ar
        ? "أُغلق التعارف بهدوء. لا نرسل للطرف الآخر إشعار رفض شخصي."
        : "The introduction closed quietly. Mithaq does not send the other person a personal rejection alert.",
    },
    introduction_closed: {
      icon: "introductions",
      tone: "closed",
      title: ar ? "أُغلق التعارف" : "Introduction closed",
      body: ar
        ? "انتهت هذه المرحلة. لا يكشف ميثاق قرار الطرف الآخر الخاص أو سبب الإغلاق الشخصي."
        : "This stage ended. Mithaq does not reveal the other person’s private decision or personal reason for closure.",
    },
    introduction_expired: {
      icon: "introductions",
      tone: "neutral",
      title: ar ? "انتهت مدة التعارف" : "Introduction expired",
      body: ar
        ? "أُغلق التعارف بعد انتهاء مدته من دون كشف أي قرار خاص للطرف الآخر."
        : "The introduction closed after its review window ended, without exposing anyone’s private decision.",
    },
    conversation_ended_by_me: {
      icon: "chat",
      tone: "closed",
      title: ar ? "أنهيت المحادثة" : "You ended the conversation",
      body: ar ? "أُغلق التواصل الخاص لهذا التعارف." : "Private communication for this introduction was closed.",
    },
    conversation_closed: {
      icon: "chat",
      tone: "closed",
      title: ar ? "أُغلقت المحادثة" : "Conversation closed",
      body: ar
        ? "لم يعد التواصل الخاص متاحاً لهذا التعارف."
        : "Private communication is no longer available for this introduction.",
    },
  };

  return values[kind];
}

function groupByDay(items: MarriageActivityItem[], locale: MobileLocale) {
  const formatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-LY" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const groups: Array<{ key: string; label: string; items: MarriageActivityItem[] }> = [];

  for (const item of items) {
    const date = new Date(item.occurredAt);
    const key = Number.isFinite(date.getTime())
      ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
      : item.occurredAt;
    const existing = groups[groups.length - 1];
    if (existing?.key === key) {
      existing.items.push(item);
      continue;
    }
    groups.push({
      key,
      label: Number.isFinite(date.getTime()) ? formatter.format(date) : item.occurredAt,
      items: [item],
    });
  }

  return groups;
}

function formatTime(value: string, locale: MobileLocale) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleTimeString(locale === "ar" ? "ar-LY" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function toneIconStyle(tone: Tone) {
  if (tone === "rose") return styles.iconRose;
  if (tone === "gold") return styles.iconGold;
  if (tone === "closed") return styles.iconClosed;
  if (tone === "neutral") return styles.iconNeutral;
  return styles.iconTeal;
}

const styles = StyleSheet.create({
  timeline: { width: "100%", gap: 22 },
  dayGroup: { width: "100%" },
  dayLabel: {
    width: "100%",
    color: colors.muted,
    fontSize: 12,
    lineHeight: 20,
    fontWeight: "800",
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  dayItems: { width: "100%" },
  row: { width: "100%", alignItems: "stretch", gap: 11 },
  rail: { width: 44, alignItems: "center" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconTeal: { backgroundColor: colors.primaryWash, borderColor: colors.primarySoft },
  iconRose: { backgroundColor: colors.accentWash, borderColor: colors.accentSoft },
  iconGold: { backgroundColor: colors.goldSoft, borderColor: colors.goldSoft },
  iconNeutral: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
  iconClosed: { backgroundColor: colors.surfaceMuted, borderColor: colors.borderStrong },
  line: { width: 1, flex: 1, minHeight: 48, backgroundColor: colors.borderStrong },
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 11,
    ...shadows.card,
  },
  cardUnread: { borderColor: colors.primarySoft, backgroundColor: colors.primaryWash },
  titleRow: { width: "100%", alignItems: "center", gap: 8 },
  title: { flex: 1, color: colors.foreground, fontSize: 14, lineHeight: 22, fontWeight: "800" },
  time: { color: colors.mutedSoft, fontSize: 10, lineHeight: 16 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  body: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 19, marginTop: 4 },
  openHint: { width: "100%", color: colors.primary, fontSize: 10, lineHeight: 17, fontWeight: "800", marginTop: 8 },
  pressed: { opacity: 0.68 },
});
