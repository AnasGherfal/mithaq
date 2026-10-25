import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import type { MobileLocale } from "@/i18n";
import { colors, radius } from "@/theme";

type Localized = { ar: string; en: string };
type Question = { id: string; question: Localized; answer: Localized };

const journey: Localized[] = [
  { ar: "دعوة وإعداد الملف", en: "Invitation and profile" },
  { ar: "مراجعة وأهلية", en: "Review and eligibility" },
  { ar: "اهتمام متبادل وتعارف", en: "Mutual interest and introduction" },
  { ar: "قبول الطرفين ثم محادثة", en: "Both accept, then chat" },
];

const questions: Question[] = [
  {
    id: "invitation",
    question: { ar: "هل تعني الدعوة أنني جاهز للاستكشاف؟", en: "Does an invitation mean I can discover immediately?" },
    answer: {
      ar: "الدعوة تفتح إعداد العضوية فقط. أكمل الملف وأولويات الزواج وإعدادات الخصوصية، ثم انتظر مراجعة الملف قبل إتاحة الاستكشاف.",
      en: "An invitation opens member setup only. Complete your profile, marriage priorities and privacy choices, then wait for profile review before discovery is available.",
    },
  },
  {
    id: "empty",
    question: { ar: "لماذا لا تظهر لي اقتراحات؟", en: "Why aren't any matches showing?" },
    answer: {
      ar: "ميثاق يعرض عدداً محدوداً من الأعضاء المؤهلين الذين تتوافق تفضيلاتهم الأساسية مع تفضيلاتك. قد لا يوجد اقتراح مناسب في مجموعة صغيرة حالياً، وهذا ليس بالضرورة خللاً.",
      en: "Mithaq shows a limited set of eligible members whose essential preferences work in both directions. A small early member group may have no suitable candidates yet; that does not necessarily mean something is broken.",
    },
  },
  {
    id: "interest",
    question: { ar: "هل يعرف الطرف الآخر أنني أبديت اهتماماً؟", en: "Will someone know I expressed interest?" },
    answer: {
      ar: "لا يتحول الاهتمام الخاص إلى تعارف بمجرد اختيارك. لا تبدأ خطوة التعارف إلا عند وجود اهتمام متبادل ومرور جميع شروط الأهلية والسلامة.",
      en: "Your private interest does not by itself open an introduction or message. An introduction needs reciprocal interest and all eligibility and safety checks to pass.",
    },
  },
  {
    id: "chat",
    question: { ar: "متى تبدأ المحادثة؟", en: "When does messaging begin?" },
    answer: {
      ar: "عندما يُعرض تعارف منضبط، يقرر كل عضو القبول أو الرفض بشكل مستقل. لا تفتح المحادثة الخاصة إلا بعد قبول الطرفين صراحة.",
      en: "Each person separately accepts or declines a controlled introduction. Private messaging opens only after both explicitly accept.",
    },
  },
  {
    id: "photos",
    question: { ar: "هل صوري ورقم هاتفي ظاهرة للآخرين؟", en: "Are my photos and phone number public?" },
    answer: {
      ar: "لا توجد قائمة صور عامة. تُحفظ الصور بشكل خاص ويخضع عرضها للخصوصية والمراجعة والصلاحية. لا يُكشف رقم تسجيل الدخول تلقائياً عند التعارف أو المحادثة.",
      en: "There is no public photo directory. Photos are private and their display depends on your visibility choices, review and authorization. Your sign-in phone number is never automatically shared in introductions or chat.",
    },
  },
  {
    id: "verification",
    question: {
      ar: "هل التحقق بالهاتف يعني التحقق من الهوية؟",
      en: "Does phone verification mean identity verification?",
    },
    answer: {
      ar: "لا. التحقق برمز الهاتف يثبت القدرة على الوصول إلى الرقم، ولا يُعتبر إثبات هوية حكومية. أي شارة تحقق لا تظهر إلا إذا اجتاز العضو عملية التحقق المعنية فعلاً.",
      en: "No. Phone OTP confirms access to a phone number, not government identity. Verification badges should only appear after the specific verification process has actually succeeded.",
    },
  },
  {
    id: "family",
    question: { ar: "هل يجب إشراك العائلة؟", en: "Must I involve my family?" },
    answer: {
      ar: "لا. للعضو البالغ حق الاختيار. يمكن حفظ جهات اتصال موثوقة واختيار إشراك أحدها في مرحلة مناسبة، ولا يحصل أحد على وصول تلقائي إلى الحساب.",
      en: "No. Adult members choose for themselves. You can save trusted contacts and decide if and when to involve someone; they do not automatically gain access to your account.",
    },
  },
  {
    id: "safety",
    question: { ar: "كيف أبلغ أو أحظر شخصاً؟", en: "How do I report or block someone?" },
    answer: {
      ar: "توجد ضوابط للبلاغ والحظر في مسارات التعارف والمحادثة، كما يمكنك مراجعة مركز السلامة من حسابك. إذا كان هناك خطر فوري، اطلب المساعدة من شخص موثوق أو خدمات الطوارئ المحلية.",
      en: "Report and block controls are available in introduction and conversation flows, and the Safety Center is in Account. For immediate danger, seek help from someone you trust or local emergency services.",
    },
  },
  {
    id: "deletion",
    question: {
      ar: "هل أستطيع سحب الموافقة أو طلب حذف حسابي؟",
      en: "Can I change consent or request account deletion?",
    },
    answer: {
      ar: "نعم. يمكنك مراجعة الموافقات والتحديثات الاختيارية وطلب حذف الحساب من قسم الخصوصية في حسابك.",
      en: "Yes. Review consent, optional communications and account-deletion requests in the Privacy area of your account.",
    },
  },
];

export default function HelpScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <ScreenShell
      eyebrow={rtl ? "مساعدة ووضوح" : "HELP & CLARITY"}
      title={rtl ? "دليل ميثاق" : "Your Mithaq guide"}
      body={
        rtl
          ? "كل مرحلة واضحة. أنت تختار ما تشاركه ومتى تتقدم إلى التعارف."
          : "Understand each step, what stays private, and when you choose to move forward."
      }
      rtl={rtl}
      footer={
        <PrimaryButton tone="quiet" onPress={() => router.back()}>
          {rtl ? "العودة" : "Back"}
        </PrimaryButton>
      }
    >
      <View style={styles.journeyCard}>
        <Text style={[styles.sectionLabel, { textAlign, writingDirection }]}>
          {rtl ? "رحلتك داخل ميثاق" : "YOUR PATH"}
        </Text>
        {journey.map((step, index) => (
          <View key={index} style={[styles.stepRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={[styles.stepText, { textAlign, writingDirection }]}>{step[locale]}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionHeading, { textAlign, writingDirection }]}>
        {rtl ? "الأسئلة الأكثر شيوعاً" : "Frequently asked questions"}
      </Text>
      <View style={styles.questionList}>
        {questions.map((item) => {
          const expanded = expandedId === item.id;
          return (
            <View key={item.id} style={styles.questionCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setExpandedId(expanded ? null : item.id)}
                style={({ pressed }) => [
                  styles.questionButton,
                  { flexDirection: rtl ? "row-reverse" : "row" },
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={[styles.questionText, { textAlign, writingDirection }]}>{item.question[locale]}</Text>
                <Text style={styles.expandMark}>{expanded ? "−" : "+"}</Text>
              </Pressable>
              {expanded ? (
                <Text style={[styles.answerText, { textAlign, writingDirection }]}>{item.answer[locale]}</Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.supportCard}>
        <Text style={[styles.supportTitle, { textAlign, writingDirection }]}>
          {rtl ? "الخصوصية والسلامة أولاً" : "Privacy and safety first"}
        </Text>
        <Text style={[styles.supportBody, { textAlign, writingDirection }]}>
          {rtl
            ? "يمكنك مراجعة ضوابط السلامة والخصوصية داخل التطبيق. لا تُرسل بيانات شخصية حساسة لأي طرف يدّعي أنه دعم ميثاق."
            : "Review safety and privacy controls in the app. Do not send sensitive account details to anyone claiming to be Mithaq support."}
        </Text>
        <PrimaryButton tone="quiet" onPress={() => router.push({ pathname: "/safety", params: { locale } })}>
          {rtl ? "مركز السلامة" : "Safety Center"}
        </PrimaryButton>
        <PrimaryButton tone="quiet" onPress={() => router.push({ pathname: "/privacy", params: { locale } })}>
          {rtl ? "الخصوصية والموافقات" : "Privacy and consent"}
        </PrimaryButton>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  journeyCard: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 20,
    gap: 16,
  },
  sectionLabel: {
    color: colors.gold,
    fontSize: 11,
    lineHeight: 18,
    fontWeight: "800",
  },
  stepRow: { alignItems: "center", gap: 12 },
  stepNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
  },
  stepNumberText: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  stepText: { flex: 1, color: colors.foreground, fontSize: 14, lineHeight: 23, fontWeight: "700" },
  sectionHeading: {
    width: "100%",
    color: colors.foreground,
    fontSize: 21,
    lineHeight: 32,
    fontWeight: "800",
    marginTop: 30,
    marginBottom: 12,
  },
  questionList: { width: "100%", gap: 10 },
  questionCard: {
    width: "100%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    overflow: "hidden",
  },
  questionButton: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 17,
    paddingVertical: 18,
  },
  questionText: {
    flex: 1,
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "800",
  },
  expandMark: { color: colors.primary, fontSize: 22, lineHeight: 26, fontWeight: "600" },
  answerText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 25,
    paddingHorizontal: 17,
    paddingBottom: 19,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  supportCard: {
    width: "100%",
    borderRadius: radius.lg,
    backgroundColor: colors.primaryWash,
    padding: 18,
    gap: 12,
    marginTop: 28,
    marginBottom: 8,
  },
  supportTitle: { color: colors.primaryStrong, fontSize: 18, lineHeight: 29, fontWeight: "800" },
  supportBody: { color: colors.foreground, fontSize: 13, lineHeight: 23 },
});
