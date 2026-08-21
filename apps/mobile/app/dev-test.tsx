import { useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { TrustBadges } from "@/components/trust-badges";
import type { MobileLocale } from "@/i18n";
import { colors, radius, shadows } from "@/theme";

type DemoMode = "discover" | "introduction" | "privacy" | "photos";
type DemoDecision = "interested" | "skip" | null;

type DemoProfile = {
  open: boolean;
  name?: string;
  about?: string;
  occupation?: string;
  education?: string;
  origin?: string;
  age: string;
  city: string;
  marital: string;
  children: string;
  reasons: string[];
  realPersonVerified: boolean;
  age18PlusVerified: boolean;
  identityVerified: boolean;
};

const profiles: DemoProfile[] = [
  {
    open: false,
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
    open: true,
    name: "Maya",
    about: "Family matters to me, and I’m looking for a calm, serious path toward marriage.",
    occupation: "Architecture",
    education: "University graduate",
    origin: "Western Libya",
    age: "25–29",
    city: "Tripoli",
    marital: "Never married",
    children: "No",
    reasons: ["Same city", "Similar view on children"],
    realPersonVerified: true,
    age18PlusVerified: true,
    identityVerified: true,
  },
  {
    open: true,
    name: "Omar",
    about: "I value direct communication, family respect, and building a stable home together.",
    occupation: "Engineering",
    education: "Master’s degree",
    origin: "Misrata",
    age: "30–34",
    city: "Misrata",
    marital: "Married",
    children: "Yes",
    reasons: ["Work expectations", "Wedding expectations"],
    realPersonVerified: true,
    age18PlusVerified: true,
    identityVerified: false,
  },
];

export default function DevTestScreen() {
  if (!__DEV__) return null;
  return <DevTestContent />;
}

function DevTestContent() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const { width } = useWindowDimensions();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => testCopy(locale), [locale]);
  const [mode, setMode] = useState<DemoMode>("discover");
  const [index, setIndex] = useState(0);
  const [decision, setDecision] = useState<DemoDecision>(null);
  const [shielded, setShielded] = useState(false);
  const [photoRevealConfirm, setPhotoRevealConfirm] = useState(false);
  const [photoRevealed, setPhotoRevealed] = useState(false);
  const cardX = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const profile = profiles[index % profiles.length]!;
  const direction = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";
  const hasTrust = profile.realPersonVerified || profile.age18PlusVerified || profile.identityVerified;
  const rotation = cardX.interpolate({
    inputRange: [-Math.max(width, 320), 0, Math.max(width, 320)],
    outputRange: ["-7deg", "0deg", "7deg"],
    extrapolate: "clamp",
  });

  function choose(nextDecision: Exclude<DemoDecision, null>) {
    if (decision) return;
    setDecision(nextDecision);
    const side = nextDecision === "interested" ? 1 : -1;
    Animated.parallel([
      Animated.timing(cardX, {
        toValue: side * (Math.max(width, 320) + 90),
        duration: 290,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 245, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.96, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setIndex((value) => value + 1);
      setDecision(null);
      cardX.setValue(-side * 42);
      cardOpacity.setValue(0.25);
      cardScale.setValue(0.975);
      Animated.parallel([
        Animated.spring(cardX, {
          toValue: 0,
          damping: 18,
          stiffness: 190,
          mass: 0.75,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(cardScale, {
          toValue: 1,
          damping: 18,
          stiffness: 210,
          mass: 0.7,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }

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
          <View style={styles.discoverStage}>
            <Text style={[styles.kicker, { textAlign, writingDirection: direction }]}>{copy.discoverKicker}</Text>
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: cardOpacity,
                  transform: [{ translateX: cardX }, { rotate: rotation }, { scale: cardScale }],
                },
              ]}
            >
              {decision ? (
                <View
                  style={[
                    styles.stamp,
                    decision === "interested" ? styles.stampInterested : styles.stampSkip,
                    decision === "interested" ? styles.stampRight : styles.stampLeft,
                  ]}
                >
                  <Text style={styles.stampText}>
                    {decision === "interested" ? copy.interestedStamp : copy.skipStamp}
                  </Text>
                </View>
              ) : null}

              {profile.open ? (
                <View>
                  <View style={styles.openPortrait}>
                    <Text style={styles.openInitial}>{profile.name?.charAt(0) ?? "م"}</Text>
                    <Text style={styles.openPhotoNote}>{copy.openPhotoPlaceholder}</Text>
                    <View style={styles.openPill}>
                      <Text style={styles.openPillText}>{copy.openPill}</Text>
                    </View>
                  </View>
                  <Text style={[styles.openName, { textAlign, writingDirection: direction }]}>{profile.name}</Text>
                  <Text style={[styles.openMeta, { textAlign, writingDirection: direction }]}>{profile.age} · {profile.city}</Text>
                  {profile.about ? (
                    <Text style={[styles.about, { textAlign, writingDirection: direction }]}>{profile.about}</Text>
                  ) : null}
                </View>
              ) : (
                <View style={styles.anonymousHero}>
                  <Text style={styles.lock}>◌</Text>
                  <Text style={[styles.anonymousTitle, { textAlign, writingDirection: direction }]}>{copy.anonymousTitle}</Text>
                  <Text style={[styles.anonymousBody, { textAlign, writingDirection: direction }]}>{copy.anonymousBody}</Text>
                </View>
              )}

              {hasTrust ? (
                <View style={styles.trustCard}>
                  <Text style={[styles.trustTitle, { textAlign, writingDirection: direction }]}>{copy.trustTitle}</Text>
                  <TrustBadges
                    locale={locale}
                    realPersonVerified={profile.realPersonVerified}
                    age18PlusVerified={profile.age18PlusVerified}
                    identityVerified={profile.identityVerified}
                  />
                </View>
              ) : null}

              <View style={styles.details}>
                <Row rtl={rtl} label={copy.age} value={profile.age} />
                <Row rtl={rtl} label={copy.city} value={profile.city} />
                <Row rtl={rtl} label={copy.marital} value={locale === "ar" ? localizeMarital(profile.marital) : profile.marital} />
                <Row rtl={rtl} label={copy.children} value={locale === "ar" ? (profile.children === "Yes" ? "نعم" : "لا") : profile.children} />
                {profile.open && profile.occupation ? <Row rtl={rtl} label={copy.work} value={profile.occupation} /> : null}
                {profile.open && profile.education ? <Row rtl={rtl} label={copy.education} value={profile.education} /> : null}
                {profile.open && profile.origin ? <Row rtl={rtl} label={copy.origin} value={profile.origin} /> : null}
              </View>

              <View style={styles.whyCard}>
                <Text style={[styles.whyTitle, { textAlign, writingDirection: direction }]}>{copy.whyTitle}</Text>
                <View style={[styles.chips, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                  {profile.reasons.map((reason) => (
                    <View key={reason} style={styles.reasonChip}>
                      <Text style={styles.reasonChipText}>{copy.reason(reason)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>

            <Text style={[styles.prompt, { textAlign, writingDirection: direction }]}>{copy.decisionPrompt}</Text>
            <View style={styles.decisionRow}>
              <DemoDecisionButton kind="skip" title={copy.notForMe} body={copy.moveQuietly} disabled={Boolean(decision)} onPress={() => choose("skip")} />
              <DemoDecisionButton kind="interested" title={copy.interested} body={copy.savedPrivately} disabled={Boolean(decision)} onPress={() => choose("interested")} />
            </View>
          </View>
        ) : null}

        {mode === "introduction" ? (
          <View style={styles.card}>
            <Text style={[styles.kicker, { textAlign, writingDirection: direction }]}>{copy.introductionKicker}</Text>
            <Text style={[styles.name, { textAlign, writingDirection: direction }]}>{copy.mutualTitle}</Text>
            <Text style={[styles.body, { textAlign, writingDirection: direction }]}>{copy.mutualBody}</Text>
            <View style={styles.trustCard}>
              <TrustBadges locale={locale} realPersonVerified age18PlusVerified identityVerified={false} />
            </View>
            <View style={styles.privateCard}>
              <Text style={[styles.privateTitle, { textAlign, writingDirection: direction }]}>{copy.revealTitle}</Text>
              <Text style={[styles.privateBody, { textAlign, writingDirection: direction }]}>{photoRevealed ? copy.revealedBody : copy.revealBody}</Text>
              {!photoRevealed ? (
                <View style={styles.actions}>
                  {photoRevealConfirm ? <Text style={[styles.note, { textAlign, writingDirection: direction }]}>{copy.revealWarning}</Text> : null}
                  <PrimaryButton onPress={() => {
                    if (!photoRevealConfirm) setPhotoRevealConfirm(true);
                    else {
                      setPhotoRevealed(true);
                      setPhotoRevealConfirm(false);
                    }
                  }}>{photoRevealConfirm ? copy.confirmReveal : copy.revealButton}</PrimaryButton>
                  {photoRevealConfirm ? <PrimaryButton tone="quiet" onPress={() => setPhotoRevealConfirm(false)}>{copy.cancel}</PrimaryButton> : null}
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
            <PrimaryButton tone="quiet" onPress={() => router.push({ pathname: "/profile-visibility", params: { locale } })}>{copy.openPrivacy}</PrimaryButton>
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

function DemoDecisionButton({
  kind,
  title,
  body,
  disabled,
  onPress,
}: {
  kind: "skip" | "interested";
  title: string;
  body: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.decisionButton,
        kind === "interested" ? styles.interestedButton : styles.skipButton,
        pressed && !disabled ? styles.decisionPressed : null,
        disabled ? styles.decisionDisabled : null,
      ]}
    >
      <Text style={[styles.decisionArrow, kind === "interested" ? styles.interestedText : styles.skipText]}>{kind === "interested" ? "→" : "←"}</Text>
      <Text style={[styles.decisionTitle, kind === "interested" ? styles.interestedText : styles.skipText]}>{title}</Text>
      <Text style={[styles.decisionBody, kind === "interested" ? styles.interestedBodyText : styles.skipBodyText]}>{body}</Text>
    </Pressable>
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
    body: ar ? "معاينات محلية لتجربة الحركة والملفات المفتوحة والخصوصية والتعارف." : "Local previews for testing motion, open profiles, privacy, and introductions.",
    back: ar ? "رجوع" : "Back",
    devOnly: ar ? "للتطوير فقط" : "Development only",
    devOnlyBody: ar ? "هذه بيانات تجريبية وليست أعضاء حقيقيين ولا تظهر في نسخة الإنتاج." : "These are sample profiles, not real members, and this screen does not ship in production.",
    tabs: { discover: ar ? "الاكتشاف" : "Discover", introduction: ar ? "التعارف" : "Introduction", privacy: ar ? "الخصوصية" : "Privacy", photos: ar ? "الصور" : "Photos" },
    discoverKicker: ar ? "اختبر حركة القرار" : "TEST THE DECISION MOTION",
    anonymousTitle: ar ? "خصوصية أولاً" : "Private-first profile",
    anonymousBody: ar ? "لا اسم ولا صورة أو نبذة هنا لأن هذا العضو اختار الخصوصية في البداية." : "No name, photo, or bio appears here because this member chose privacy first.",
    openPill: ar ? "ملف مفتوح" : "Open profile",
    openPhotoPlaceholder: ar ? "مكان الصورة المعتمدة" : "Approved photo appears here",
    trustTitle: ar ? "موثّق من ميثاق" : "Verified by Mithaq",
    age: ar ? "العمر" : "Age",
    city: ar ? "المدينة" : "City",
    marital: ar ? "الحالة الاجتماعية" : "Marital status",
    children: ar ? "أطفال" : "Children",
    work: ar ? "العمل" : "Work",
    education: ar ? "التعليم" : "Education",
    origin: ar ? "المنطقة الأصلية" : "Origin",
    whyTitle: ar ? "لماذا ظهر هذا الملف؟" : "Why this profile appeared",
    reason: (value: string) => reasonLabels[value] ?? value,
    decisionPrompt: ar ? "اختر جهة واضحة" : "Choose a clear direction",
    notForMe: ar ? "غير مناسب لي" : "Not for me",
    moveQuietly: ar ? "يسار · انتقل بهدوء" : "Left · move on quietly",
    interested: ar ? "مهتم" : "I’m interested",
    savedPrivately: ar ? "يمين · اهتمام خاص" : "Right · private interest",
    interestedStamp: ar ? "مهتم  →" : "INTERESTED  →",
    skipStamp: ar ? "←  غير مناسب" : "←  NOT FOR ME",
    introductionKicker: ar ? "بعد القبول المتبادل" : "AFTER MUTUAL ACCEPTANCE",
    mutualTitle: ar ? "الاهتمام متبادل" : "Interest is mutual",
    mutualBody: ar ? "هذا مثال محلي للمرحلة التي يمكن فيها كشف المزيد بشكل متحكم به." : "This local preview represents the controlled stage where more can be revealed.",
    revealTitle: ar ? "كشف الصورة اختياري" : "Photo reveal is optional",
    revealBody: ar ? "يمكن إبقاء الصورة خاصة والاستمرار في المحادثة." : "The photo can stay private and the conversation can still continue.",
    revealedBody: ar ? "تم كشف الصورة لهذا التعارف في المعاينة." : "The photo is revealed for this preview introduction.",
    revealWarning: ar ? "بعد أن يشاهد الطرف الآخر الصورة لا يمكن جعلها كأنها لم تُشاهد." : "Once the other person has seen the photo, a later change cannot make it unseen.",
    revealButton: ar ? "كشف صورتي هنا" : "Reveal my photo here",
    confirmReveal: ar ? "نعم، اكشف الصورة" : "Yes, reveal the photo",
    cancel: ar ? "إلغاء" : "Cancel",
    chatReady: ar ? "المحادثة لا تتطلب صورة" : "Chat does not require a photo",
    chatReadyBody: ar ? "يمكن للطرفين بدء محادثة خاصة سواء كشفا الصور أم لا." : "Both people can begin a private conversation whether or not they reveal photos.",
    privacyKicker: ar ? "اختبار درع العائلة" : "FAMILY SHIELD PREVIEW",
    familyScenario: ar ? "أخ أو قريب أو زميل" : "Sibling, relative, or coworker",
    familyScenarioBody: ar ? "أضف رقمه مسبقاً بدلاً من الانتظار حتى يظهر أحدكما للآخر." : "Add their number beforehand instead of waiting until either profile is exposed.",
    beforeEitherSees: ar ? "الحماية تعمل في الاتجاهين" : "Protection works both ways",
    beforeEitherSeesBody: ar ? "إذا أضاف أي طرف رقم الآخر، لا يظهر أي منهما للآخر حتى لو كان ملفه مفتوحاً." : "If either person adds the other number, neither profile appears to the other—even if one chose an open profile.",
    simulateShield: ar ? "محاكاة إضافة الرقم" : "Simulate adding to shield",
    shielded: ar ? "لن يظهر أي منكما للآخر" : "Neither of you will be shown",
    shieldedBody: ar ? "لا إشعار ولا دليل للطرف الآخر." : "No notification or indication is sent to the other person.",
    openPrivacy: ar ? "فتح إعدادات الظهور الحقيقية" : "Open real appearance settings",
    photosKicker: ar ? "الصور" : "PHOTOS",
    photosOptional: ar ? "إضافة الصور اختيارية" : "Photos are optional",
    photosBody: ar ? "يمكن استخدام ميثاق بدون صورة. وإذا اخترت ملفاً مفتوحاً، تظهر الصورة فقط عندما توجد صورة معتمدة." : "You can use Mithaq without a photo. With an open profile, a photo appears only when an approved one exists.",
    openPhotos: ar ? "فتح الصور الخاصة" : "Open private photos",
    photosNote: ar ? "الصورة ليست شرطاً للاكتشاف أو للمحادثة." : "A photo is not required for Discover or chat.",
  };
}

const styles = StyleSheet.create({
  stack: { width: "100%", gap: 14 },
  warning: { borderRadius: radius.lg, backgroundColor: colors.goldSoft, padding: 14, gap: 4 },
  warningTitle: { color: colors.gold, fontSize: 13, fontWeight: "900" },
  warningBody: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  tabs: { width: "100%", gap: 6, flexWrap: "wrap" },
  tab: { flex: 1, minWidth: 68, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, paddingVertical: 10, paddingHorizontal: 7, alignItems: "center" },
  tabActive: { backgroundColor: colors.primaryWash, borderColor: colors.primarySoft },
  tabText: { color: colors.muted, fontSize: 9, fontWeight: "800" },
  tabTextActive: { color: colors.primaryStrong },
  discoverStage: { width: "100%", gap: 12 },
  card: { width: "100%", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 16, gap: 12, ...shadows.card },
  kicker: { color: colors.primary, fontSize: 10, fontWeight: "900" },
  anonymousHero: { width: "100%", alignItems: "center", borderRadius: radius.lg, backgroundColor: colors.primaryWash, padding: 22, gap: 7 },
  lock: { color: colors.primary, fontSize: 34, fontWeight: "900" },
  anonymousTitle: { width: "100%", color: colors.primaryStrong, fontSize: 18, lineHeight: 27, fontWeight: "900" },
  anonymousBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 18 },
  openPortrait: { width: "100%", height: 250, borderRadius: radius.lg, backgroundColor: colors.brandNavy, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  openInitial: { color: colors.white, fontSize: 54, fontWeight: "900" },
  openPhotoNote: { color: "rgba(255,255,255,0.68)", fontSize: 10, marginTop: 8 },
  openPill: { position: "absolute", top: 12, left: 12, borderRadius: radius.pill, backgroundColor: "rgba(23,36,59,0.82)", paddingHorizontal: 9, paddingVertical: 6 },
  openPillText: { color: colors.white, fontSize: 9, fontWeight: "900" },
  openName: { width: "100%", color: colors.foreground, fontSize: 25, lineHeight: 34, fontWeight: "900", marginTop: 12 },
  openMeta: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 18 },
  about: { width: "100%", color: colors.foreground, fontSize: 12, lineHeight: 20, marginTop: 8 },
  trustCard: { width: "100%", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.surfaceRaised, padding: 12, gap: 8 },
  trustTitle: { color: colors.primaryStrong, fontSize: 11, fontWeight: "900" },
  details: { width: "100%", borderTopWidth: 1, borderTopColor: colors.border },
  row: { width: "100%", justifyContent: "space-between", gap: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { flex: 1, color: colors.muted, fontSize: 10, fontWeight: "700" },
  rowValue: { flex: 1, color: colors.foreground, fontSize: 11, fontWeight: "800" },
  whyCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.primaryWash, padding: 13, gap: 8 },
  whyTitle: { color: colors.primaryStrong, fontSize: 13, lineHeight: 21, fontWeight: "900" },
  chips: { gap: 6, flexWrap: "wrap" },
  reasonChip: { borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, paddingHorizontal: 9, paddingVertical: 6 },
  reasonChipText: { color: colors.primary, fontSize: 9, fontWeight: "800" },
  prompt: { color: colors.foreground, fontSize: 12, lineHeight: 19, fontWeight: "900" },
  decisionRow: { width: "100%", flexDirection: "row", gap: 10 },
  decisionButton: { flex: 1, minHeight: 108, borderRadius: radius.lg, borderWidth: 1, alignItems: "center", justifyContent: "center", padding: 10 },
  skipButton: { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong },
  interestedButton: { backgroundColor: colors.primary, borderColor: colors.primary },
  decisionPressed: { transform: [{ scale: 0.975 }], opacity: 0.92 },
  decisionDisabled: { opacity: 0.55 },
  decisionArrow: { fontSize: 21, fontWeight: "900" },
  decisionTitle: { fontSize: 12, lineHeight: 18, fontWeight: "900", marginTop: 3, textAlign: "center" },
  decisionBody: { fontSize: 9, lineHeight: 14, fontWeight: "700", marginTop: 2, textAlign: "center" },
  interestedText: { color: colors.white },
  interestedBodyText: { color: "rgba(255,255,255,0.76)" },
  skipText: { color: colors.foreground },
  skipBodyText: { color: colors.muted },
  stamp: { position: "absolute", top: 24, zIndex: 20, borderRadius: radius.md, borderWidth: 2, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.surfaceRaised },
  stampRight: { right: 20 },
  stampLeft: { left: 20 },
  stampInterested: { borderColor: colors.primary },
  stampSkip: { borderColor: colors.borderStrong },
  stampText: { color: colors.foreground, fontSize: 11, fontWeight: "900" },
  name: { color: colors.foreground, fontSize: 20, lineHeight: 28, fontWeight: "900" },
  body: { color: colors.foreground, fontSize: 13, lineHeight: 22 },
  privateCard: { borderRadius: radius.lg, backgroundColor: colors.primaryWash, padding: 14, gap: 5 },
  privateTitle: { color: colors.primaryStrong, fontSize: 12, lineHeight: 19, fontWeight: "900" },
  privateBody: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  actions: { gap: 8 },
  successCard: { borderRadius: radius.lg, backgroundColor: colors.primaryWash, padding: 14, gap: 5 },
  success: { color: colors.primaryStrong, fontSize: 12, lineHeight: 19, fontWeight: "800" },
  note: { color: colors.muted, fontSize: 10, lineHeight: 17 },
});
