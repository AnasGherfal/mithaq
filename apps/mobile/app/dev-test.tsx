import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import type { MobileLocale } from "@/i18n";
import { colors, radius, shadows } from "@/theme";

type DemoMode = "friends" | "marriage" | "chat" | "photos";
type DemoMessage = { id: number; mine: boolean; body: string };

const friendPeople = [
  { name: "Salma", city: "Tripoli", interests: ["Coffee", "Books", "Walking"], about: "I enjoy quiet cafés, books, and simple local plans with kind people." },
  { name: "Huda", city: "Benghazi", interests: ["Walking", "Food", "Volunteering"], about: "I like outdoor walks, volunteering, and trying new places around the city." },
];

const marriagePeople = [
  {
    name: "Mariam",
    city: "Tripoli",
    age: "25–29",
    about: "Family-oriented, thoughtful, and enjoys meaningful conversations and a calm social life.",
    details: "Engineer · University graduate",
    reasons: ["Same city", "Living expectations", "Wedding expectations"],
  },
  {
    name: "Amina",
    city: "Misrata",
    age: "30–34",
    about: "Values kindness, family, personal growth, and spending time with close friends and relatives.",
    details: "Teacher · University graduate",
    reasons: ["Similar view on children", "Work expectations"],
  },
];

export default function DevTestScreen() {
  if (!__DEV__) return null;

  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => testCopy(locale), [locale]);
  const [mode, setMode] = useState<DemoMode>("friends");
  const [friendIndex, setFriendIndex] = useState(0);
  const [marriageIndex, setMarriageIndex] = useState(0);
  const [friendState, setFriendState] = useState<"discover" | "requested" | "connected">("discover");
  const [interestSaved, setInterestSaved] = useState(false);
  const [hideConfirm, setHideConfirm] = useState(false);
  const [marriageHidden, setMarriageHidden] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<DemoMessage[]>([
    { id: 1, mine: false, body: locale === "ar" ? "مرحباً! كيف كان يومك؟" : "Hey! How was your day?" },
  ]);

  const friend = friendPeople[friendIndex % friendPeople.length]!;
  const marriage = marriagePeople[marriageIndex % marriagePeople.length]!;
  const direction = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";

  function nextMarriage() {
    setMarriageIndex((value) => value + 1);
    setInterestSaved(false);
    setHideConfirm(false);
    setMarriageHidden(false);
  }

  function send() {
    const body = draft.trim();
    if (!body) return;
    setMessages((current) => [...current, { id: Date.now(), mine: true, body }]);
    setDraft("");
  }

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={<PrimaryButton tone="quiet" onPress={() => router.back()}>{copy.back}</PrimaryButton>}
    >
      <View style={styles.stack}>
        <View style={styles.warning}>
          <Text style={[styles.warningTitle, { textAlign, writingDirection: direction }]}>{copy.devOnly}</Text>
          <Text style={[styles.warningBody, { textAlign, writingDirection: direction }]}>{copy.devOnlyBody}</Text>
        </View>

        <View style={[styles.tabs, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          {(["friends", "marriage", "chat", "photos"] as DemoMode[]).map((item) => (
            <Pressable key={item} onPress={() => setMode(item)} style={[styles.tab, mode === item ? styles.tabActive : null]}>
              <Text style={[styles.tabText, mode === item ? styles.tabTextActive : null]}>{copy.tabs[item]}</Text>
            </Pressable>
          ))}
        </View>

        {mode === "friends" ? (
          <View style={styles.card}>
            <Text style={[styles.kicker, { textAlign, writingDirection: direction }]}>{copy.friendsKicker}</Text>
            <Text style={[styles.name, { textAlign, writingDirection: direction }]}>{friend.name}</Text>
            <Text style={[styles.meta, { textAlign, writingDirection: direction }]}>{friend.city}</Text>
            <Text style={[styles.body, { textAlign, writingDirection: direction }]}>{friend.about}</Text>
            <View style={[styles.chips, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              {friend.interests.map((interest) => <View key={interest} style={styles.chip}><Text style={styles.chipText}>{interest}</Text></View>)}
            </View>
            {friendState === "discover" ? (
              <View style={styles.actions}>
                <PrimaryButton onPress={() => setFriendState("requested")}>{copy.connect}</PrimaryButton>
                <PrimaryButton tone="quiet" onPress={() => setFriendIndex((i) => i + 1)}>{copy.next}</PrimaryButton>
              </View>
            ) : friendState === "requested" ? (
              <View style={styles.actions}>
                <Text style={[styles.success, { textAlign, writingDirection: direction }]}>{copy.requestSent}</Text>
                <PrimaryButton onPress={() => setFriendState("connected")}>{copy.simulateAccept}</PrimaryButton>
              </View>
            ) : (
              <View style={styles.actions}>
                <Text style={[styles.success, { textAlign, writingDirection: direction }]}>{copy.connected}</Text>
                <PrimaryButton onPress={() => setMode("chat")}>{copy.openChat}</PrimaryButton>
              </View>
            )}
          </View>
        ) : null}

        {mode === "marriage" ? (
          <View style={styles.marriageStack}>
            <View style={styles.visibilityCard}>
              <View style={[styles.visibilityTop, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                <Text style={[styles.visibilityTitle, { textAlign, writingDirection: direction }]}>{copy.privateVisibilityTitle}</Text>
                <View style={styles.recommendedBadge}><Text style={styles.recommendedText}>{copy.recommended}</Text></View>
              </View>
              <Text style={[styles.visibilityBody, { textAlign, writingDirection: direction }]}>{copy.privateVisibilityBody}</Text>
              <PrimaryButton tone="quiet" onPress={() => router.push({ pathname: "/profile-visibility", params: { locale } })}>{copy.openVisibility}</PrimaryButton>
            </View>

            {marriageHidden ? (
              <View style={styles.card}>
                <Text style={[styles.kicker, { textAlign, writingDirection: direction }]}>{copy.hiddenKicker}</Text>
                <Text style={[styles.successTitle, { textAlign, writingDirection: direction }]}>{copy.hiddenTitle}</Text>
                <Text style={[styles.body, { textAlign, writingDirection: direction }]}>{copy.hiddenBody}</Text>
                <PrimaryButton onPress={nextMarriage}>{copy.showNext}</PrimaryButton>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={[styles.kicker, { textAlign, writingDirection: direction }]}>{copy.marriageKicker}</Text>
                <View style={styles.demoPortrait}>
                  <Text style={styles.demoInitial}>{marriage.name.charAt(0)}</Text>
                  <View style={styles.demoPhotoBadge}>
                    <Text style={[styles.demoPhotoBadgeText, { writingDirection: direction }]}>{copy.photoPrivacy}</Text>
                  </View>
                </View>
                <Text style={[styles.name, { textAlign, writingDirection: direction }]}>{marriage.name}</Text>
                <Text style={[styles.meta, { textAlign, writingDirection: direction }]}>{marriage.age} · {marriage.city} · {marriage.details}</Text>
                <Text style={[styles.body, { textAlign, writingDirection: direction }]}>{marriage.about}</Text>

                <View style={styles.whyCard}>
                  <Text style={[styles.whyTitle, { textAlign, writingDirection: direction }]}>{copy.whyTitle}</Text>
                  <Text style={[styles.whyBody, { textAlign, writingDirection: direction }]}>{copy.whyBody}</Text>
                  <View style={[styles.chips, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                    {marriage.reasons.map((reason) => (
                      <View key={reason} style={styles.reasonChip}>
                        <Text style={styles.reasonChipText}>{copy.reason(reason)}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[styles.note, { textAlign, writingDirection: direction }]}>{copy.noScore}</Text>
                </View>

                {interestSaved ? <Text style={[styles.success, { textAlign, writingDirection: direction }]}>{copy.privateInterestSaved}</Text> : null}
                <View style={styles.actions}>
                  <PrimaryButton onPress={() => setInterestSaved(true)}>{copy.caughtAttention}</PrimaryButton>
                  <PrimaryButton tone="quiet" onPress={nextMarriage}>{copy.next}</PrimaryButton>
                </View>

                {hideConfirm ? (
                  <View style={styles.hideConfirm}>
                    <Text style={[styles.hideTitle, { textAlign, writingDirection: direction }]}>{copy.hideConfirmTitle}</Text>
                    <Text style={[styles.note, { textAlign, writingDirection: direction }]}>{copy.hideConfirmBody}</Text>
                    <PrimaryButton onPress={() => { setMarriageHidden(true); setHideConfirm(false); setInterestSaved(false); }}>{copy.hideConfirmButton}</PrimaryButton>
                    <PrimaryButton tone="quiet" onPress={() => setHideConfirm(false)}>{copy.cancel}</PrimaryButton>
                  </View>
                ) : (
                  <Pressable onPress={() => setHideConfirm(true)} style={({ pressed }) => [styles.hideLink, pressed ? styles.pressed : null]}>
                    <Text style={[styles.hideLinkText, { textAlign, writingDirection: direction }]}>{copy.hideLink}</Text>
                    <Text style={[styles.note, { textAlign, writingDirection: direction }]}>{copy.hideLinkBody}</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        ) : null}

        {mode === "chat" ? (
          <View style={styles.card}>
            <Text style={[styles.kicker, { textAlign, writingDirection: direction }]}>{copy.chatKicker}</Text>
            <Text style={[styles.name, { textAlign, writingDirection: direction }]}>{friend.name}</Text>
            <View style={styles.messages}>
              {messages.map((message) => (
                <View key={message.id} style={[styles.bubble, message.mine ? styles.bubbleMine : styles.bubbleTheirs, { alignSelf: message.mine ? "flex-end" : "flex-start" }]}>
                  <Text style={[styles.bubbleText, message.mine ? styles.bubbleTextMine : null, { writingDirection: direction }]}>{message.body}</Text>
                </View>
              ))}
            </View>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={copy.messagePlaceholder}
              placeholderTextColor={colors.mutedSoft}
              style={[styles.input, { textAlign, writingDirection: direction }]}
            />
            <PrimaryButton disabled={!draft.trim()} onPress={send}>{copy.send}</PrimaryButton>
          </View>
        ) : null}

        {mode === "photos" ? (
          <View style={styles.card}>
            <Text style={[styles.kicker, { textAlign, writingDirection: direction }]}>{copy.photosKicker}</Text>
            <Text style={[styles.body, { textAlign, writingDirection: direction }]}>{copy.photosBody}</Text>
            <PrimaryButton onPress={() => router.push({ pathname: "/photos", params: { locale } })}>{copy.openPhotos}</PrimaryButton>
            <PrimaryButton tone="quiet" onPress={() => router.push({ pathname: "/questionnaire", params: { locale } })}>{copy.photoPrivacySettings}</PrimaryButton>
            <Text style={[styles.note, { textAlign, writingDirection: direction }]}>{copy.photosNote}</Text>
          </View>
        ) : null}
      </View>
    </ScreenShell>
  );
}

function testCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  const reasonLabels: Record<string, string> = ar
    ? {
        "Same city": "نفس المدينة",
        "Living expectations": "توقعات السكن",
        "Wedding expectations": "توقعات حفل الزواج",
        "Similar view on children": "نظرة متقاربة للأطفال",
        "Work expectations": "توقعات العمل",
      }
    : {};

  return {
    eyebrow: ar ? "مختبر تجربة المستخدم" : "UX TEST LAB",
    title: ar ? "جرّب المزايا بدون حساب ثانٍ" : "Test features without a second account",
    body: ar ? "بيانات تجريبية محلية لمراجعة الواجهات والتدفق على هاتفك." : "Local sample data for reviewing screens and flows on your phone.",
    back: ar ? "رجوع" : "Back",
    devOnly: ar ? "للتطوير فقط" : "Development only",
    devOnlyBody: ar ? "هذه البيانات ليست أشخاصاً حقيقيين ولا تُحفظ على الخادم، ولن تظهر في نسخة الإنتاج." : "These are not real members and nothing here is saved to the server. This screen will not appear in production.",
    tabs: { friends: ar ? "الأصدقاء" : "Friends", marriage: ar ? "الزواج" : "Marriage", chat: ar ? "المحادثة" : "Chat", photos: ar ? "الصور" : "Photos" },
    friendsKicker: ar ? "معاينة اكتشاف الأصدقاء" : "FRIENDS DISCOVER PREVIEW",
    marriageKicker: ar ? "معاينة اكتشاف الزواج" : "MARRIAGE DISCOVER PREVIEW",
    chatKicker: ar ? "معاينة محادثة الأصدقاء" : "FRIENDS CHAT PREVIEW",
    photosKicker: ar ? "معاينة الصور" : "PHOTO PREVIEW",
    photoPrivacy: ar ? "الصورة حسب اختيار الخصوصية" : "Photo follows privacy choice",
    whyTitle: ar ? "لماذا أظهر لك ميثاق هذا الشخص؟" : "Why Mithaq showed you this person",
    whyBody: ar ? "هذه أمثلة لفئات توافق عملية، وليست كشفاً لإجابات الشخص الخاصة." : "These are example alignment categories, not a reveal of the person’s private answers.",
    reason: (value: string) => reasonLabels[value] ?? value,
    noScore: ar ? "لا نعرض نسبة توافق وهمية." : "Mithaq does not show a fake compatibility percentage.",
    privateVisibilityTitle: ar ? "الظهور الخاص" : "Private visibility",
    privateVisibilityBody: ar ? "في هذا الوضع لا يراك شخص في الاكتشاف إلا بعد أن تختاره أنت أولاً بشكل خاص. لا يعرف أنك اخترته." : "In this mode, a person cannot discover you until you privately choose them first. They are not told you chose them.",
    recommended: ar ? "موصى به" : "Recommended",
    openVisibility: ar ? "فتح إعدادات الظهور الحقيقية" : "Open real visibility settings",
    connect: ar ? "تواصل" : "Connect",
    next: ar ? "التالي" : "Next",
    requestSent: ar ? "تم إرسال طلب خاص في هذه المعاينة." : "Private request sent in this preview.",
    simulateAccept: ar ? "محاكاة القبول" : "Simulate acceptance",
    connected: ar ? "أصبحتم متصلين كأصدقاء في المعاينة." : "You are now Friends connections in this preview.",
    openChat: ar ? "فتح المحادثة" : "Open chat",
    caughtAttention: ar ? "لفت انتباهي" : "Caught my attention",
    privateInterestSaved: ar ? "تم حفظ الاهتمام بشكل خاص في هذه المعاينة. لا يظهر للشخص الآخر." : "Private interest saved in this preview. The other person is not told.",
    hideLink: ar ? "أعرف هذا الشخص — لا تظهرنا لبعض" : "I know this person — don’t show us to each other",
    hideLinkBody: ar ? "مثال: أخ، قريب، زميل. لا يصل إليه أي إشعار." : "Example: sibling, relative, coworker. They receive no notification.",
    hideConfirmTitle: ar ? "محاكاة الإخفاء المتبادل؟" : "Simulate reciprocal hide?",
    hideConfirmBody: ar ? "بعد التأكيد لن تظهرا لبعض في هذه المعاينة، كما في تجربة ميثاق الحقيقية." : "After confirmation, you stop appearing to each other in this preview, just like the real Mithaq privacy flow.",
    hideConfirmButton: ar ? "نعم، لا تظهرنا لبعض" : "Yes, don’t show us to each other",
    cancel: ar ? "إلغاء" : "Cancel",
    hiddenKicker: ar ? "محاكاة الخصوصية" : "PRIVACY SIMULATION",
    hiddenTitle: ar ? "لن تظهرا لبعض" : "You won’t be shown to each other",
    hiddenBody: ar ? "الشخص الآخر لا يعرف أنك رأيته أو أخفيته، ولا نكشف سبب الإخفاء." : "The other person does not know you saw or hid them, and Mithaq does not reveal the reason.",
    showNext: ar ? "عرض شخص تجريبي آخر" : "Show another sample person",
    messagePlaceholder: ar ? "اكتب رسالة تجريبية…" : "Write a test message…",
    send: ar ? "إرسال" : "Send",
    photosBody: ar ? "افتح شاشة الصور لاختيار صورة حقيقية من هاتفك ورفعها بشكل خاص. يمكنك أيضاً تجربة من يرى صورتك من إعدادات الخصوصية." : "Open Photos to choose a real image from your phone and save it privately. You can also test who can see it from your privacy preferences.",
    openPhotos: ar ? "فتح الصور" : "Open Photos",
    photoPrivacySettings: ar ? "إعدادات ظهور الصورة" : "Photo visibility settings",
    photosNote: ar ? "لا نعرض أي تفاصيل تقنية للمستخدم داخل تجربة الصور." : "The photo experience never exposes backend or developer details to the user.",
  };
}

const styles = StyleSheet.create({
  stack: { width: "100%", gap: 14 },
  marriageStack: { width: "100%", gap: 12 },
  warning: { borderRadius: radius.lg, backgroundColor: colors.goldSoft, padding: 14, gap: 4 },
  warningTitle: { color: colors.gold, fontSize: 13, fontWeight: "900" },
  warningBody: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  tabs: { width: "100%", gap: 6, flexWrap: "wrap" },
  tab: { flexGrow: 1, minWidth: "46%", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, paddingVertical: 10, paddingHorizontal: 12, alignItems: "center" },
  tabActive: { backgroundColor: colors.primaryWash, borderColor: colors.primarySoft },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  tabTextActive: { color: colors.primaryStrong },
  visibilityCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.primaryWash, padding: 14, gap: 8 },
  visibilityTop: { alignItems: "center", gap: 8 },
  visibilityTitle: { flex: 1, color: colors.primaryStrong, fontSize: 14, lineHeight: 22, fontWeight: "900" },
  visibilityBody: { color: colors.foreground, fontSize: 11, lineHeight: 19 },
  recommendedBadge: { borderRadius: radius.pill, backgroundColor: colors.goldSoft, paddingHorizontal: 8, paddingVertical: 4 },
  recommendedText: { color: colors.gold, fontSize: 9, fontWeight: "900" },
  card: { width: "100%", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 18, gap: 12, ...shadows.card },
  kicker: { color: colors.primary, fontSize: 10, fontWeight: "900" },
  demoPortrait: { width: "100%", aspectRatio: 4 / 5, borderRadius: radius.lg, backgroundColor: colors.primaryWash, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  demoInitial: { color: colors.primary, fontSize: 70, fontWeight: "900" },
  demoPhotoBadge: { position: "absolute", bottom: 12, left: 12, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, paddingHorizontal: 10, paddingVertical: 7 },
  demoPhotoBadgeText: { color: colors.foreground, fontSize: 9, fontWeight: "800" },
  name: { color: colors.foreground, fontSize: 25, lineHeight: 31, fontWeight: "900" },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  body: { color: colors.foreground, fontSize: 14, lineHeight: 23 },
  chips: { gap: 6, flexWrap: "wrap" },
  chip: { borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, paddingHorizontal: 9, paddingVertical: 6 },
  chipText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  whyCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.primaryWash, padding: 13, gap: 8 },
  whyTitle: { color: colors.primaryStrong, fontSize: 13, lineHeight: 21, fontWeight: "900" },
  whyBody: { color: colors.foreground, fontSize: 11, lineHeight: 18 },
  reasonChip: { borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, paddingHorizontal: 9, paddingVertical: 6 },
  reasonChipText: { color: colors.primary, fontSize: 9, fontWeight: "800" },
  actions: { gap: 8 },
  success: { color: colors.primaryStrong, fontSize: 12, lineHeight: 19, fontWeight: "800" },
  successTitle: { color: colors.primaryStrong, fontSize: 20, lineHeight: 28, fontWeight: "900" },
  hideLink: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 4 },
  hideLinkText: { color: colors.foreground, fontSize: 11, lineHeight: 18, fontWeight: "800" },
  hideConfirm: { borderRadius: radius.md, backgroundColor: colors.goldSoft, padding: 12, gap: 8 },
  hideTitle: { color: colors.foreground, fontSize: 13, lineHeight: 21, fontWeight: "900" },
  pressed: { opacity: 0.6 },
  messages: { gap: 8, minHeight: 150, justifyContent: "flex-end" },
  bubble: { maxWidth: "82%", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleTheirs: { backgroundColor: colors.surfaceMuted },
  bubbleText: { color: colors.foreground, fontSize: 13, lineHeight: 20 },
  bubbleTextMine: { color: colors.white },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: 13, color: colors.foreground, fontSize: 14 },
  note: { color: colors.muted, fontSize: 10, lineHeight: 17 },
});
