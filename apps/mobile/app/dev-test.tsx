import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { TrustBadges } from "@/components/trust-badges";
import type { MobileLocale } from "@/i18n";
import { colors, radius, shadows } from "@/theme";

type DemoMode = "discover" | "introduction" | "privacy" | "photos";

const profiles = [
  {
    age: "25–29",
    city: "Tripoli",
    marital: "Never married",
    children: "No",
    reasons: ["Same city", "Living expectations", "Wedding expectations"],
    realPersonVerified: true,
    age18PlusVerified: true,
    identityVerified: false,
  },
  {
    age: "30–34",
    city: "Misrata",
    marital: "Married",
    children: "Yes",
    reasons: ["Similar view on children", "Work expectations"],
    realPersonVerified: true,
    age18PlusVerified: true,
    identityVerified: true,
  },
  {
    age: "25–29",
    city: "Benghazi",
    marital: "Divorced",
    children: "No",
    reasons: ["Living expectations"],
    realPersonVerified: false,
    age18PlusVerified: false,
    identityVerified: false,
  },
];

export default function DevTestScreen() {
  if (!__DEV__) return null;

  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => testCopy(locale), [locale]);
  const [mode, setMode] = useState<DemoMode>("discover");
  const [index, setIndex] = useState(0);
  const [interestSaved, setInterestSaved] = useState(false);
  const [shielded, setShielded] = useState(false);
  const [photoRevealConfirm, setPhotoRevealConfirm] = useState(false);
  const [photoRevealed, setPhotoRevealed] = useState(false);
  const profile = profiles[index % profiles.length]!;
  const direction = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";
  const hasTrust = profile.realPersonVerified || profile.age18PlusVerified || profile.identityVerified;

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
          {(["discover", "introduction", "privacy", "photos"] as DemoMode[]).map((item) => (
            <Pressable
              key={item}
              onPress={() => setMode(item)}
              style={[styles.tab, mode === item ? styles.tabActive : null]}
            >
              <Text style={[styles.tabText, mode === item ? styles.tabTextActive : null]}>{copy.tabs[item]}</Text>
            </Pressable>
          ))}
        </View>

        {mode === "discover" ? (
          <View style={styles.card}>
            <Text style={[styles.kicker, { textAlign, writingDirection: direction }]}>{copy.discoverKicker}</Text>
            <View style={styles.anonymousHero}>
              <Text style={styles.lock}>◌</Text>
              <Text style={[styles.anonymousTitle, { textAlign, writingDirection: direction }]}>{copy.anonymousTitle}</Text>
              <Text style={[styles.anonymousBody, { textAlign, writingDirection: direction }]}>{copy.anonymousBody}</Text>
            </View>

            {hasTrust ? (
              <View style={styles.trustCard}>
                <Text style={[styles.trustTitle, { textAlign, writingDirection: direction }]}>{copy.trustTitle}</Text>
                <TrustBadges
                  locale={locale}
                  realPersonVerified={profile.realPersonVerified}
                  age18PlusVerified={profile.age18PlusVerified}
                  identityVerified={profile.identityVerified}
                />
                <Text style={[styles.note, { textAlign, writingDirection: direction }]}>{copy.trustBody}</Text>
              </View>
            ) : (
              <View style={styles.noBadgeCard}>
                <Text style={[styles.noBadgeTitle, { textAlign, writingDirection: direction }]}>{copy.noBadgeTitle}</Text>
                <Text style={[styles.note, { textAlign, writingDirection: direction }]}>{copy.noBadgeBody}</Text>
              </View>
            )}

            <View style={styles.details}>
              <Row rtl={rtl} label={copy.age} value={profile.age} />
              <Row rtl={rtl} label={copy.city} value={profile.city} />
              <Row rtl={rtl} label={copy.marital} value={locale === "ar" ? localizeMarital(profile.marital) : profile.marital} />
              <Row rtl={rtl} label={copy.children} value={locale === "ar" ? (profile.children === "Yes" ? "نعم" : "لا") : profile.children} />
            </View>

            <View style={styles.whyCard}>
              <Text style={[styles.whyTitle, { textAlign, writingDirection: direction }]}>{copy.whyTitle}</Text>
              <Text style={[styles.whyBody, { textAlign, writingDirection: direction }]}>{copy.whyBody}</Text>
              <View style={[styles.chips, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                {profile.reasons.map((reason) => (
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
              <PrimaryButton
                tone="quiet"
                onPress={() => {
                  setIndex((value) => value + 1);
                  setInterestSaved(false);
                }}
              >
                {copy.next}
              </PrimaryButton>
            </View>
          </View>
        ) : null}

        {mode === "introduction" ? (
          <View style={styles.card}>
            <Text style={[styles.kicker, { textAlign, writingDirection: direction }]}>{copy.introductionKicker}</Text>
            <Text style={[styles.name, { textAlign, writingDirection: direction }]}>{copy.mutualTitle}</Text>
            <Text style={[styles.body, { textAlign, writingDirection: direction }]}>{copy.mutualBody}</Text>

            <View style={styles.trustCard}>
              <Text style={[styles.trustTitle, { textAlign, writingDirection: direction }]}>{copy.trustTitle}</Text>
              <TrustBadges
                locale={locale}
                realPersonVerified
                age18PlusVerified
                identityVerified={false}
              />
            </View>

            <View style={styles.revealCard}>
              <Text style={[styles.privateTitle, { textAlign, writingDirection: direction }]}>{copy.revealTitle}</Text>
              <Text style={[styles.privateBody, { textAlign, writingDirection: direction }]}>
                {photoRevealed ? copy.revealedBody : copy.revealBody}
              </Text>
              {!photoRevealed ? (
                <View style={styles.actions}>
                  {photoRevealConfirm ? (
                    <Text style={[styles.note, { textAlign, writingDirection: direction }]}>{copy.revealWarning}</Text>
                  ) : null}
                  <PrimaryButton
                    onPress={() => {
                      if (!photoRevealConfirm) {
                        setPhotoRevealConfirm(true);
                        return;
                      }
                      setPhotoRevealed(true);
                      setPhotoRevealConfirm(false);
                    }}
                  >
                    {photoRevealConfirm ? copy.confirmReveal : copy.revealButton}
                  </PrimaryButton>
                  {photoRevealConfirm ? (
                    <PrimaryButton tone="quiet" onPress={() => setPhotoRevealConfirm(false)}>{copy.cancel}</PrimaryButton>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={styles.privateCard}>
              <Text style={[styles.privateTitle, { textAlign, writingDirection: direction }]}>{copy.chatReady}</Text>
              <Text style={[styles.privateBody, { textAlign, writingDirection: direction }]}>{copy.chatReadyBody}</Text>
            </View>
          </View>
        ) : null}

        {mode === "privacy" ? (
          <View style={styles.card}>
            <Text style={[styles.kicker, { textAlign, writingDirection: direction }]}>{copy.privacyKicker}</Text>
            <Text style={[styles.name, { textAlign, writingDirection: direction }]}>{copy.familyScenario}</Text>
            <Text style={[styles.body, { textAlign, writingDirection: direction }]}>{copy.familyScenarioBody}</Text>

            <View style={styles.privateCard}>
              <Text style={[styles.privateTitle, { textAlign, writingDirection: direction }]}>{copy.beforeEitherSees}</Text>
              <Text style={[styles.privateBody, { textAlign, writingDirection: direction }]}>{copy.beforeEitherSeesBody}</Text>
            </View>

            {shielded ? (
              <View style={styles.successCard}>
                <Text style={[styles.success, { textAlign, writingDirection: direction }]}>{copy.shielded}</Text>
                <Text style={[styles.note, { textAlign, writingDirection: direction }]}>{copy.shieldedBody}</Text>
              </View>
            ) : (
              <PrimaryButton onPress={() => setShielded(true)}>{copy.simulateShield}</PrimaryButton>
            )}

            <PrimaryButton tone="quiet" onPress={() => router.push({ pathname: "/profile-visibility", params: { locale } })}>
              {copy.openPrivacy}
            </PrimaryButton>
          </View>
        ) : null}

        {mode === "photos" ? (
          <View style={styles.card}>
            <Text style={[styles.kicker, { textAlign, writingDirection: direction }]}>{copy.photosKicker}</Text>
            <Text style={[styles.name, { textAlign, writingDirection: direction }]}>{copy.photosOptional}</Text>
            <Text style={[styles.body, { textAlign, writingDirection: direction }]}>{copy.photosBody}</Text>
            <PrimaryButton onPress={() => router.push({ pathname: "/photos", params: { locale } })}>{copy.openPhotos}</PrimaryButton>
            <Text style={[styles.note, { textAlign, writingDirection: direction }]}>{copy.photosNote}</Text>
          </View>
        ) : null}
      </View>
    </ScreenShell>
  );
}

function Row({ rtl, label, value }: { rtl: boolean; label: string; value: string }) {
  return (
    <View style={[styles.row, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <Text style={[styles.rowLabel, { textAlign: rtl ? "right" : "left" }]}>{label}</Text>
      <Text style={[styles.rowValue, { textAlign: rtl ? "left" : "right" }]}>{value}</Text>
    </View>
  );
}

function localizeMarital(value: string) {
  if (value === "Never married") return "لم يسبق له/لها الزواج";
  if (value === "Married") return "متزوج/متزوجة";
  if (value === "Divorced") return "مطلق/مطلقة";
  return value;
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
    eyebrow: ar ? "مختبر تجربة الزواج" : "MARRIAGE UX TEST LAB",
    title: ar ? "جرّب رحلة ميثاق بدون حساب ثانٍ" : "Test Mithaq without a second account",
    body: ar ? "معاينات محلية لتجربة الاكتشاف والتعارف والخصوصية والصور على هاتفك." : "Local previews for testing Discover, introductions, privacy, and photos on your phone.",
    back: ar ? "رجوع" : "Back",
    devOnly: ar ? "للتطوير فقط" : "Development only",
    devOnlyBody: ar ? "هذه بيانات تجريبية وليست أعضاء حقيقيين ولا تظهر في نسخة الإنتاج." : "These are sample profiles, not real members, and this screen does not ship in production.",
    tabs: { discover: ar ? "الاكتشاف" : "Discover", introduction: ar ? "التعارف" : "Introduction", privacy: ar ? "الخصوصية" : "Privacy", photos: ar ? "الصور" : "Photos" },
    discoverKicker: ar ? "معاينة اكتشاف الزواج" : "MARRIAGE DISCOVER PREVIEW",
    anonymousTitle: ar ? "ملف زواج مجهول" : "Anonymous Marriage profile",
    anonymousBody: ar ? "لا اسم ولا صورة ولا عمل ولا تعليم في مرحلة الاكتشاف الأولى." : "No name, photo, work, or education is shown in the first discovery stage.",
    trustTitle: ar ? "موثّق من ميثاق" : "Verified by Mithaq",
    trustBody: ar ? "هذه العلامات تخص فقط ما تحقّق منه ميثاق. لا تعني أن كل إجابة في الملف موثّقة." : "These badges cover only checks Mithaq actually verified. They do not mean every profile answer is verified.",
    noBadgeTitle: ar ? "لا توجد علامات تحقق إضافية" : "No additional verification badges",
    noBadgeBody: ar ? "في التطبيق الحقيقي لن نضع تحذيراً أحمر؛ ببساطة لن تظهر أي علامة إضافية." : "In the real app there is no red warning; there simply would be no extra badge.",
    age: ar ? "العمر" : "Age",
    city: ar ? "المدينة" : "City",
    marital: ar ? "الحالة الاجتماعية" : "Marital status",
    children: ar ? "أطفال" : "Children",
    whyTitle: ar ? "لماذا أظهر لك ميثاق هذا الملف؟" : "Why Mithaq showed you this profile",
    whyBody: ar ? "ترى فئات توافق عامة فقط، وليس إجابات الطرف الآخر الخاصة." : "You only see broad alignment categories, not the other person’s private answers.",
    reason: (value: string) => reasonLabels[value] ?? value,
    noScore: ar ? "لا نعرض نسبة توافق وهمية." : "Mithaq does not show a fake compatibility percentage.",
    caughtAttention: ar ? "لفت انتباهي" : "Caught my attention",
    privateInterestSaved: ar ? "تم حفظ الاهتمام بشكل خاص. الطرف الآخر لا يعرف." : "Private interest saved. The other person is not told.",
    next: ar ? "التالي" : "Next",
    introductionKicker: ar ? "بعد القبول المتبادل" : "AFTER MUTUAL ACCEPTANCE",
    mutualTitle: ar ? "القبول أصبح متبادلاً" : "Interest is mutual",
    mutualBody: ar ? "الآن يمكن لكليكما متابعة التعارف بدون كشف رقم الهاتف أو إجبار أي طرف على كشف صورة." : "You can now continue without sharing phone numbers or forcing either person to reveal a photo.",
    revealTitle: ar ? "كشف الصورة باختيارك" : "Photo reveal is your choice",
    revealBody: ar ? "تخيّل أن إعدادك هو «بعد موافقتي الصريحة». صورتك المعتمدة ما زالت خاصة ويمكنك كشفها لهذا التعارف فقط." : "Imagine your setting is “only after my explicit approval.” Your approved photo is still private and can be revealed for this introduction only.",
    revealWarning: ar ? "بعد الكشف قد يكون الطرف الآخر قد شاهد الصورة، لذلك لا يمكن اعتبار التراجع لاحقاً وكأنها لم تُشاهد." : "Once revealed, the other person may have seen it. A later change cannot make an already viewed photo unseen.",
    revealButton: ar ? "كشف صورتي لهذا التعارف" : "Reveal my photo here",
    confirmReveal: ar ? "نعم، اكشف صورتي هنا" : "Yes, reveal my photo here",
    cancel: ar ? "إلغاء" : "Cancel",
    revealedBody: ar ? "تم كشف الصورة في هذه المعاينة لهذا التعارف فقط." : "The photo is now revealed in this preview for this introduction only.",
    chatReady: ar ? "المحادثة لا تحتاج صورة" : "Chat does not require a photo",
    chatReadyBody: ar ? "حتى لو أبقيت صورتك خاصة، يمكنك بدء المحادثة بعد القبول المتبادل." : "Even if you keep your photo private, you can start chatting after mutual acceptance.",
    privacyKicker: ar ? "اختبار درع العائلة" : "FAMILY SHIELD PREVIEW",
    familyScenario: ar ? "مثال: أخ أو قريب أو زميل" : "Example: sibling, relative, or coworker",
    familyScenarioBody: ar ? "بدلاً من الانتظار حتى يرى أحدكما الآخر، يمكن إضافة رقمه مسبقاً إلى درع الخصوصية." : "Instead of waiting until one of you sees the other, add their number to the privacy shield beforehand.",
    beforeEitherSees: ar ? "الحماية تعمل في الاتجاهين" : "Protection works both ways",
    beforeEitherSeesBody: ar ? "إذا أضاف أي طرف رقم الآخر، لا يظهر أي منهما للآخر في الاكتشاف ولا نكشف هل الرقم مسجل في ميثاق." : "If either person adds the other number, neither profile is shown to the other, and Mithaq never reveals whether that number is registered.",
    simulateShield: ar ? "محاكاة إضافة الرقم للدرع" : "Simulate adding to shield",
    shielded: ar ? "لن يظهر أي منكما للآخر" : "Neither of you will be shown",
    shieldedBody: ar ? "لا إشعار ولا رسالة ولا دليل للطرف الآخر." : "No notification, message, or indication is sent to the other person.",
    openPrivacy: ar ? "فتح إعدادات الخصوصية الحقيقية" : "Open real privacy settings",
    photosKicker: ar ? "الصور" : "PHOTOS",
    photosOptional: ar ? "إضافة الصور اختيارية" : "Photos are optional",
    photosBody: ar ? "يمكن استخدام ميثاق والاكتشاف المجهول بدون رفع صورة. إذا أضفت صورة لاحقاً تبقى خاصة حتى مرحلة الكشف المناسبة." : "You can use Mithaq and anonymous Discover without uploading a photo. If you add one later, it stays private until the appropriate reveal stage.",
    openPhotos: ar ? "فتح الصور الخاصة" : "Open private photos",
    photosNote: ar ? "عدم رفع صورة لا يمنعك من استخدام الاكتشاف عند الإطلاق الأول." : "Not uploading a photo does not block initial-launch Discover.",
  };
}

const styles = StyleSheet.create({
  stack: { width: "100%", gap: 14 },
  warning: { borderRadius: radius.lg, backgroundColor: colors.goldSoft, padding: 14, gap: 4 },
  warningTitle: { color: colors.gold, fontSize: 13, fontWeight: "900" },
  warningBody: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  tabs: { width: "100%", gap: 6, flexWrap: "wrap" },
  tab: { flexGrow: 1, minWidth: "45%", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, paddingVertical: 10, paddingHorizontal: 8, alignItems: "center" },
  tabActive: { backgroundColor: colors.primaryWash, borderColor: colors.primarySoft },
  tabText: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  tabTextActive: { color: colors.primaryStrong },
  card: { width: "100%", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 18, gap: 12, ...shadows.card },
  kicker: { color: colors.primary, fontSize: 10, fontWeight: "900" },
  anonymousHero: { width: "100%", alignItems: "center", borderRadius: radius.lg, backgroundColor: colors.primaryWash, padding: 20, gap: 7 },
  lock: { color: colors.primary, fontSize: 34, fontWeight: "900" },
  anonymousTitle: { width: "100%", color: colors.primaryStrong, fontSize: 18, lineHeight: 27, fontWeight: "900" },
  anonymousBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 18 },
  trustCard: { width: "100%", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.surfaceRaised, padding: 13, gap: 8 },
  trustTitle: { color: colors.primaryStrong, fontSize: 12, lineHeight: 18, fontWeight: "900" },
  noBadgeCard: { width: "100%", borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, padding: 13, gap: 4 },
  noBadgeTitle: { color: colors.foreground, fontSize: 11, lineHeight: 17, fontWeight: "800" },
  details: { width: "100%", borderTopWidth: 1, borderTopColor: colors.border },
  row: { width: "100%", justifyContent: "space-between", gap: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { flex: 1, color: colors.muted, fontSize: 10, fontWeight: "700" },
  rowValue: { flex: 1, color: colors.foreground, fontSize: 11, fontWeight: "800" },
  whyCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.primaryWash, padding: 13, gap: 8 },
  whyTitle: { color: colors.primaryStrong, fontSize: 13, lineHeight: 21, fontWeight: "900" },
  whyBody: { color: colors.foreground, fontSize: 11, lineHeight: 18 },
  chips: { gap: 6, flexWrap: "wrap" },
  reasonChip: { borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, paddingHorizontal: 9, paddingVertical: 6 },
  reasonChipText: { color: colors.primary, fontSize: 9, fontWeight: "800" },
  actions: { gap: 8 },
  success: { color: colors.primaryStrong, fontSize: 12, lineHeight: 19, fontWeight: "800" },
  name: { color: colors.foreground, fontSize: 20, lineHeight: 28, fontWeight: "900" },
  body: { color: colors.foreground, fontSize: 13, lineHeight: 22 },
  privateCard: { borderRadius: radius.lg, backgroundColor: colors.primaryWash, padding: 14, gap: 5 },
  privateTitle: { color: colors.primaryStrong, fontSize: 12, lineHeight: 19, fontWeight: "900" },
  privateBody: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  revealCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.goldSoft, backgroundColor: colors.surfaceRaised, padding: 14, gap: 9 },
  successCard: { borderRadius: radius.lg, backgroundColor: colors.primaryWash, padding: 14, gap: 5 },
  note: { color: colors.muted, fontSize: 10, lineHeight: 17 },
});