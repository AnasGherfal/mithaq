import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import { TrustBadges } from "@/components/trust-badges";
import type { MobileLocale } from "@/i18n";
import {
  getMarriageDiscoveryPhoto,
  isMarriageDiscoveryProfilePending,
  isMarriageDiscoveryUnavailable,
  listMarriageDiscovery,
  recordMarriageDiscoveryAction,
  type MarriageDiscoveryAlignmentReason,
  type MarriageDiscoveryProfile,
} from "@/lib/marriage-discovery";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

type Decision = "noticed" | "skipped" | null;

export default function MarriageDiscoverScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const { width } = useWindowDimensions();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => marriageCopy(locale), [locale]);
  const writingDirection = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";
  const cardX = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [featurePending, setFeaturePending] = useState(false);
  const [profilePending, setProfilePending] = useState(false);
  const [profiles, setProfiles] = useState<MarriageDiscoveryProfile[]>([]);
  const [index, setIndex] = useState(0);
  const [acting, setActing] = useState(false);
  const [decision, setDecision] = useState<Decision>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setFeaturePending(false);
    setProfilePending(false);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }
      setProfiles(await listMarriageDiscovery(6));
      setIndex(0);
    } catch (error) {
      if (isMarriageDiscoveryProfilePending(error)) setProfilePending(true);
      else if (__DEV__ && isMarriageDiscoveryUnavailable(error)) setFeaturePending(true);
      else setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = profiles[index] ?? null;
  const openProfile = Boolean(current?.displayName);
  const hasVerifiedTrust = Boolean(
    current &&
      (current.realPersonVerified || current.age18PlusVerified || current.identityVerified),
  );

  useEffect(() => {
    let active = true;
    setPhotoUri(null);
    setPhotoLoading(false);

    if (!current?.photoId || current.photoDisplayMode === "hidden") {
      return () => {
        active = false;
      };
    }

    setPhotoLoading(true);
    void getMarriageDiscoveryPhoto(current.userId, current.photoId)
      .then((photo) => {
        if (active) setPhotoUri(photo?.uri ?? null);
      })
      .finally(() => {
        if (active) setPhotoLoading(false);
      });

    return () => {
      active = false;
    };
  }, [current?.photoDisplayMode, current?.photoId, current?.userId]);

  async function act(action: Exclude<Decision, null>) {
    if (!current || acting) return;
    setActing(true);
    setDecision(action);
    setMessage(null);

    try {
      await recordMarriageDiscoveryAction(current.userId, action);
      const direction = action === "noticed" ? 1 : -1;
      await animateExit(direction, width, cardX, cardOpacity, cardScale);

      setIndex((value) => value + 1);
      setMessage(action === "noticed" ? copy.noticedSaved : copy.skippedSaved);
      setDecision(null);
      animateEntry(-direction, cardX, cardOpacity, cardScale);
    } catch {
      setDecision(null);
      setMessage(copy.actionError);
      animateEntry(0, cardX, cardOpacity, cardScale);
    } finally {
      setActing(false);
    }
  }

  const rotation = cardX.interpolate({
    inputRange: [-Math.max(width, 320), 0, Math.max(width, 320)],
    outputRange: ["-7deg", "0deg", "7deg"],
    extrapolate: "clamp",
  });

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={
        <View style={styles.footerActions}>
          <PrimaryButton
            tone="quiet"
            onPress={() => router.push({ pathname: "/profile-visibility", params: { locale } })}
          >
            {copy.privacy}
          </PrimaryButton>
          <PrimaryButton
            tone="quiet"
            onPress={() => router.push({ pathname: "/marriage-priorities", params: { locale } })}
          >
            {copy.priorities}
          </PrimaryButton>
        </View>
      }
    >
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : profilePending ? (
        <StateCard
          rtl={rtl}
          tone="neutral"
          title={copy.reviewTitle}
          body={copy.reviewBody}
          actionLabel={copy.reviewProfile}
          onAction={() => router.push({ pathname: "/profile", params: { locale } })}
        />
      ) : loadError ? (
        <StateCard
          rtl={rtl}
          tone="error"
          title={copy.loadErrorTitle}
          body={copy.loadErrorBody}
          actionLabel={copy.retry}
          onAction={() => void load()}
        />
      ) : featurePending ? (
        <StateCard rtl={rtl} title={copy.previewTitle} body={copy.previewBody} />
      ) : !current ? (
        <StateCard
          rtl={rtl}
          title={copy.doneTitle}
          body={copy.doneBody}
          actionLabel={copy.introductions}
          onAction={() => router.replace({ pathname: "/introductions", params: { locale } })}
        />
      ) : (
        <View style={styles.page}>
          <View style={[styles.counterRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <View>
              <Text style={[styles.counterLabel, { writingDirection }]}>{copy.today}</Text>
              <Text style={[styles.counterHint, { writingDirection }]}>{copy.counterHint}</Text>
            </View>
            <Text style={[styles.counterValue, { writingDirection }]}>{profiles.length - index}</Text>
          </View>

          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardOpacity,
                transform: [
                  { translateX: cardX },
                  { rotate: rotation },
                  { scale: cardScale },
                ],
              },
            ]}
          >
            {decision ? (
              <View
                pointerEvents="none"
                style={[
                  styles.decisionStamp,
                  decision === "noticed" ? styles.decisionStampInterested : styles.decisionStampSkip,
                  decision === "noticed" ? styles.decisionStampRight : styles.decisionStampLeft,
                ]}
              >
                <Text
                  style={[
                    styles.decisionStampText,
                    decision === "noticed" ? styles.decisionStampTextInterested : styles.decisionStampTextSkip,
                  ]}
                >
                  {decision === "noticed" ? copy.interestedStamp : copy.skipStamp}
                </Text>
              </View>
            ) : null}

            {openProfile ? (
              <OpenProfileHero
                current={current}
                copy={copy}
                photoLoading={photoLoading}
                photoUri={photoUri}
                rtl={rtl}
              />
            ) : (
              <View style={styles.anonymousHero}>
                <View style={styles.anonymousIcon}>
                  <AppIcon name="privacy" active size={27} />
                </View>
                <Text style={[styles.anonymousTitle, { textAlign, writingDirection }]}>
                  {copy.anonymousTitle}
                </Text>
                <Text style={[styles.anonymousBody, { textAlign, writingDirection }]}>
                  {copy.anonymousBody}
                </Text>
              </View>
            )}

            {openProfile && current.aboutMe ? (
              <View style={styles.aboutCard}>
                <Text style={[styles.aboutEyebrow, { textAlign, writingDirection }]}>{copy.about}</Text>
                <Text style={[styles.aboutText, { textAlign, writingDirection }]}>{current.aboutMe}</Text>
              </View>
            ) : null}

            {hasVerifiedTrust ? (
              <View style={styles.trustCard}>
                <Text style={[styles.trustTitle, { textAlign, writingDirection }]}>{copy.trustTitle}</Text>
                <TrustBadges
                  locale={locale}
                  realPersonVerified={current.realPersonVerified}
                  age18PlusVerified={current.age18PlusVerified}
                  identityVerified={current.identityVerified}
                />
                <Text style={[styles.trustBody, { textAlign, writingDirection }]}>{copy.trustBody}</Text>
              </View>
            ) : null}

            <View style={styles.details}>
              <Detail label={copy.age} value={current.ageBandLabel} rtl={rtl} />
              <Detail label={copy.city} value={current.city || copy.notShared} rtl={rtl} />
              <Detail label={copy.maritalStatus} value={copy.marital(current.maritalStatus)} rtl={rtl} />
              <Detail label={copy.children} value={current.hasChildren ? copy.yes : copy.no} rtl={rtl} />
              {openProfile && current.occupation ? (
                <Detail label={copy.occupation} value={current.occupation} rtl={rtl} />
              ) : null}
              {openProfile && current.education ? (
                <Detail label={copy.education} value={current.education} rtl={rtl} />
              ) : null}
              {openProfile && current.originRegion ? (
                <Detail label={copy.origin} value={current.originRegion} rtl={rtl} />
              ) : null}
            </View>

            <View style={styles.whyCard}>
              <Text style={[styles.whyTitle, { textAlign, writingDirection }]}>{copy.whyTitle}</Text>
              <Text style={[styles.whyBody, { textAlign, writingDirection }]}>
                {current.alignmentReasons.length > 0 ? copy.whyBody : copy.whyFallback}
              </Text>
              {current.alignmentReasons.length > 0 ? (
                <View style={[styles.reasonWrap, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                  {current.alignmentReasons.slice(0, 4).map((reason) => (
                    <View key={reason} style={styles.reasonChip}>
                      <Text style={[styles.reasonText, { writingDirection }]}>{copy.reason(reason)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <Text style={[styles.noScore, { textAlign, writingDirection }]}>{copy.noScore}</Text>
            </View>

            <View style={[styles.privacyNote, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <View style={styles.privacyDot} />
              <Text style={[styles.privacyText, { textAlign, writingDirection }]}>
                {openProfile ? copy.openProfileNote : copy.privateNote}
              </Text>
            </View>
          </Animated.View>

          <Text style={[styles.decisionPrompt, { textAlign, writingDirection }]}>{copy.decisionPrompt}</Text>
          <View style={styles.decisionRow}>
            <DecisionButton
              kind="skip"
              title={copy.notForMe}
              body={copy.notForMeBody}
              disabled={acting}
              loading={acting && decision === "skipped"}
              onPress={() => void act("skipped")}
            />
            <DecisionButton
              kind="interested"
              title={copy.interested}
              body={copy.interestedBody}
              disabled={acting}
              loading={acting && decision === "noticed"}
              onPress={() => void act("noticed")}
            />
          </View>

          {message ? (
            <Text accessibilityLiveRegion="polite" style={[styles.message, { textAlign, writingDirection }]}>
              {message}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/introductions", params: { locale } })}
            style={({ pressed }) => [styles.secondaryLink, pressed ? styles.pressed : null]}
          >
            <Text style={[styles.secondaryLinkText, { writingDirection }]}>{copy.viewIntroductions}</Text>
          </Pressable>
        </View>
      )}
    </ScreenShell>
  );
}

function OpenProfileHero({
  current,
  copy,
  photoLoading,
  photoUri,
  rtl,
}: {
  current: MarriageDiscoveryProfile;
  copy: ReturnType<typeof marriageCopy>;
  photoLoading: boolean;
  photoUri: string | null;
  rtl: boolean;
}) {
  const writingDirection = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";
  return (
    <View style={styles.openHeroWrap}>
      <View style={styles.openPortrait}>
        {photoUri ? (
          <Image
            accessibilityLabel={copy.approvedPortrait}
            resizeMode="cover"
            source={{ uri: photoUri }}
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <View style={styles.openPortraitFallback}>
            {photoLoading ? (
              <ActivityIndicator size="large" color={colors.white} />
            ) : (
              <Text style={styles.openPortraitInitial}>{current.displayName.trim().charAt(0) || "م"}</Text>
            )}
            <Text style={[styles.openPortraitFallbackText, { writingDirection }]}>
              {photoLoading ? copy.openingPortrait : copy.noApprovedPortrait}
            </Text>
          </View>
        )}
        <View style={[styles.openBadge, { alignSelf: rtl ? "flex-end" : "flex-start" }]}>
          <Text style={[styles.openBadgeText, { writingDirection }]}>{copy.openBadge}</Text>
        </View>
      </View>
      <Text style={[styles.openName, { textAlign, writingDirection }]}>{current.displayName}</Text>
      <Text style={[styles.openMeta, { textAlign, writingDirection }]}>
        {[current.ageBandLabel, current.city].filter(Boolean).join(" · ")}
      </Text>
    </View>
  );
}

function DecisionButton({
  kind,
  title,
  body,
  disabled,
  loading,
  onPress,
}: {
  kind: "skip" | "interested";
  title: string;
  body: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.decisionButton,
        kind === "interested" ? styles.interestedButton : styles.skipButton,
        pressed && !disabled ? styles.decisionPressed : null,
        disabled ? styles.decisionDisabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={kind === "interested" ? colors.white : colors.foreground} />
      ) : (
        <>
          <Text style={[styles.decisionArrow, kind === "interested" ? styles.interestedText : styles.skipText]}>
            {kind === "interested" ? "→" : "←"}
          </Text>
          <Text style={[styles.decisionTitle, kind === "interested" ? styles.interestedText : styles.skipText]}>
            {title}
          </Text>
          <Text
            style={[
              styles.decisionBody,
              kind === "interested" ? styles.interestedBodyText : styles.skipBodyText,
            ]}
          >
            {body}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function Detail({ label, value, rtl }: { label: string; value: string; rtl: boolean }) {
  return (
    <View style={[styles.detailRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <Text style={[styles.detailLabel, { writingDirection: rtl ? "rtl" : "ltr" }]}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          {
            textAlign: rtl ? "left" : "right",
            writingDirection: rtl ? "rtl" : "ltr",
          },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function animateExit(
  direction: number,
  width: number,
  x: Animated.Value,
  opacity: Animated.Value,
  scale: Animated.Value,
) {
  return new Promise<void>((resolve) => {
    Animated.parallel([
      Animated.timing(x, {
        toValue: direction * (Math.max(width, 320) + 90),
        duration: 290,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.96,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => resolve());
  });
}

function animateEntry(
  fromDirection: number,
  x: Animated.Value,
  opacity: Animated.Value,
  scale: Animated.Value,
) {
  x.setValue(fromDirection * 42);
  opacity.setValue(fromDirection === 0 ? 1 : 0.25);
  scale.setValue(fromDirection === 0 ? 1 : 0.975);
  Animated.parallel([
    Animated.spring(x, {
      toValue: 0,
      damping: 18,
      stiffness: 190,
      mass: 0.75,
      useNativeDriver: true,
    }),
    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }),
    Animated.spring(scale, {
      toValue: 1,
      damping: 18,
      stiffness: 210,
      mass: 0.7,
      useNativeDriver: true,
    }),
  ]).start();
}

function marriageCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  const statusLabels: Record<string, string> = ar
    ? {
        never_married: "لم يسبق له/لها الزواج",
        married: "متزوج/متزوجة",
        divorced: "مطلق/مطلقة",
        widowed: "أرمل/أرملة",
      }
    : {
        never_married: "Never married",
        married: "Married",
        divorced: "Divorced",
        widowed: "Widowed",
      };
  const reasonLabels: Record<MarriageDiscoveryAlignmentReason, string> = ar
    ? {
        same_city: "نفس المدينة",
        living_arrangement: "توقعات السكن",
        children_plan: "نظرة متقاربة للأطفال",
        work_after_marriage: "توقعات العمل",
        wedding_style: "توقعات حفل الزواج",
      }
    : {
        same_city: "Same city",
        living_arrangement: "Living expectations",
        children_plan: "Similar view on children",
        work_after_marriage: "Work expectations",
        wedding_style: "Wedding expectations",
      };

  return {
    eyebrow: ar ? "الزواج · اكتشاف" : "MARRIAGE · DISCOVER",
    title: ar ? "مجموعة صغيرة، وفق اختيار كل شخص" : "A small set, on their terms",
    body: ar
      ? "بعض الأعضاء يختارون الخصوصية أولاً، وآخرون يعرضون ملفهم من البداية. قرارك في الحالتين يبقى خاصاً."
      : "Some members choose a private-first profile. Others show more from the start. Either way, your decision stays private.",
    today: ar ? "متبقٍ في هذه المجموعة" : "Profiles left in this set",
    counterHint: ar ? "لا يوجد تمرير لا نهائي" : "No endless feed",
    anonymousTitle: ar ? "ملف بخصوصية أولاً" : "Private-first profile",
    anonymousBody: ar
      ? "اختار هذا الشخص إبقاء الاسم والصورة والنبذة والتفاصيل التعريفية مخفية في هذه المرحلة."
      : "This person chose to keep their name, photo, bio, and identifying details hidden at this stage.",
    openBadge: ar ? "ملف مفتوح باختيار العضو" : "Open by member choice",
    approvedPortrait: ar ? "صورة معتمدة للعضو" : "Member’s approved portrait",
    openingPortrait: ar ? "جارٍ فتح الصورة المحمية" : "Opening protected portrait",
    noApprovedPortrait: ar ? "لا توجد صورة معتمدة" : "No approved photo",
    about: ar ? "نبذة" : "About",
    trustTitle: ar ? "موثّق من ميثاق" : "Verified by Mithaq",
    trustBody: ar
      ? "هذه العلامات تخص فقط ما تحقّق منه ميثاق فعلياً. بقية معلومات الملف يصرّح بها العضو بنفسه."
      : "These badges cover only facts Mithaq actually verified. Other profile answers remain member-declared.",
    reviewTitle: ar ? "ملفك قيد المراجعة" : "Your profile is being reviewed",
    reviewBody: ar
      ? "اكتمال الملف لا يعني ظهوره مباشرة. سنفتح الاكتشاف عندما تصبح مراجعة ملفك جاهزة، ولا تحتاج إلى إعادة إدخال بياناتك."
      : "Completing your profile does not publish it immediately. Discover opens when your profile review is ready; you do not need to re-enter your information.",
    reviewProfile: ar ? "مراجعة ملفي" : "Review my profile",
    age: ar ? "العمر" : "Age",
    city: ar ? "المدينة" : "City",
    notShared: ar ? "غير محدد" : "Not specified",
    maritalStatus: ar ? "الحالة الاجتماعية" : "Marital status",
    children: ar ? "أطفال" : "Children",
    occupation: ar ? "العمل" : "Work",
    education: ar ? "التعليم" : "Education",
    origin: ar ? "المنطقة الأصلية" : "Origin",
    yes: ar ? "نعم" : "Yes",
    no: ar ? "لا" : "No",
    marital: (value: string) => statusLabels[value] ?? value.replaceAll("_", " "),
    whyTitle: ar ? "لماذا أظهر لك ميثاق هذا الملف؟" : "Why Mithaq showed you this profile",
    whyBody: ar
      ? "هناك نقاط توافق عملية بين اختياراتكما. نعرض الفئات فقط، لا إجابات الشخص الخاصة."
      : "Some practical areas align between you. Mithaq shows the categories, not the other person’s private answers.",
    whyFallback: ar
      ? "هذا الملف يطابق حدودك الأساسية الحالية. أضف أولويات الزواج لتخصيص الترتيب أكثر."
      : "This profile meets your current essential boundaries. Add Marriage priorities to personalize ordering further.",
    reason: (value: MarriageDiscoveryAlignmentReason) => reasonLabels[value],
    noScore: ar
      ? "هذه ليست نسبة توافق أو ضماناً لنجاح العلاقة."
      : "This is not a compatibility percentage or a promise of relationship success.",
    privateNote: ar
      ? "هوية هذا الشخص تبقى مخفية وفق اختياره. اهتمامك به خاص تماماً ولا يصله إشعار."
      : "This person’s identity stays hidden by their choice. Your interest remains completely private and sends no notification.",
    openProfileNote: ar
      ? "هذا الشخص اختار عرض ملفه من البداية. يحمي ميثاق هذه الشاشة من لقطات الشاشة والتسجيل العادي."
      : "This person chose to show their profile from the start. Mithaq protects this screen from normal screenshots and screen recording.",
    decisionPrompt: ar ? "ما شعورك تجاه هذا التعارف؟" : "How do you feel about this introduction?",
    notForMe: ar ? "غير مناسب لي" : "Not for me",
    notForMeBody: ar ? "انتقل بهدوء" : "Move on quietly",
    interested: ar ? "مهتم" : "I’m interested",
    interestedBody: ar ? "يُحفظ بشكل خاص" : "Saved privately",
    interestedStamp: ar ? "مهتم  →" : "INTERESTED  →",
    skipStamp: ar ? "←  غير مناسب" : "←  NOT FOR ME",
    noticedSaved: ar ? "تم حفظ اهتمامك بشكل خاص." : "Your interest was saved privately.",
    skippedSaved: ar ? "تم الانتقال إلى الشخص التالي." : "Moved quietly to the next person.",
    actionError: ar
      ? "تعذر حفظ اختيارك الآن. لم نغيّر البطاقة. حاول مرة أخرى."
      : "We couldn’t save that choice. The card was not changed. Try again.",
    viewIntroductions: ar ? "عرض التعارف الحالي" : "View current introductions",
    priorities: ar ? "أولويات الزواج" : "Marriage priorities",
    privacy: ar ? "طريقة ظهوري والخصوصية" : "How I appear & privacy",
    doneTitle: ar ? "انتهت هذه المجموعة" : "You’ve seen this set",
    doneBody: ar
      ? "لا يوجد تمرير لا نهائي هنا. عد لاحقاً لمجموعة صغيرة جديدة أو راجع التعارف الحالي."
      : "There is no endless feed here. Come back for another small set or review your current introductions.",
    introductions: ar ? "التعارف" : "Introductions",
    previewTitle: ar ? "الاكتشاف غير متاح في هذه المعاينة بعد" : "Discover isn’t available in this preview yet",
    previewBody: ar
      ? "يمكنك مراجعة ملفك وأولويات الزواج الآن."
      : "You can still review your profile and Marriage priorities.",
    loadErrorTitle: ar ? "تعذر تحميل اكتشاف الزواج" : "We couldn’t load Marriage Discover",
    loadErrorBody: ar ? "تحقق من الاتصال ثم حاول مرة أخرى." : "Check your connection and try again.",
    retry: ar ? "إعادة المحاولة" : "Try again",
  };
}

const styles = StyleSheet.create({
  loading: { minHeight: 380, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 14 },
  footerActions: { width: "100%", gap: 8 },
  counterRow: {
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.lg,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  counterLabel: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  counterHint: { color: colors.muted, fontSize: 9, marginTop: 2 },
  counterValue: { color: colors.primaryStrong, fontSize: 22, fontWeight: "900" },
  card: {
    width: "100%",
    gap: 15,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    ...shadows.card,
  },
  decisionStamp: {
    position: "absolute",
    top: 28,
    zIndex: 20,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    transform: [{ rotate: "-5deg" }],
  },
  decisionStampRight: { right: 24 },
  decisionStampLeft: { left: 24 },
  decisionStampInterested: { borderColor: colors.primary, backgroundColor: colors.primaryWash },
  decisionStampSkip: { borderColor: colors.borderStrong, backgroundColor: colors.surfaceRaised },
  decisionStampText: { fontSize: 13, lineHeight: 18, fontWeight: "900", letterSpacing: 0.3 },
  decisionStampTextInterested: { color: colors.primaryStrong },
  decisionStampTextSkip: { color: colors.foreground },
  anonymousHero: {
    width: "100%",
    alignItems: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  anonymousIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
    marginBottom: 13,
  },
  anonymousTitle: { width: "100%", color: colors.primaryStrong, fontSize: 21, lineHeight: 29, fontWeight: "900" },
  anonymousBody: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 7 },
  openHeroWrap: { width: "100%" },
  openPortrait: {
    width: "100%",
    height: 350,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.brandNavy,
    justifyContent: "center",
  },
  openPortraitFallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  openPortraitInitial: { color: colors.white, fontSize: 58, lineHeight: 68, fontWeight: "800" },
  openPortraitFallbackText: { color: "rgba(255,255,255,0.72)", fontSize: 11, lineHeight: 18, marginTop: 10 },
  openBadge: {
    position: "absolute",
    top: 13,
    left: 13,
    borderRadius: radius.pill,
    backgroundColor: "rgba(23,36,59,0.82)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  openBadgeText: { color: colors.white, fontSize: 9, lineHeight: 13, fontWeight: "900" },
  openName: { width: "100%", color: colors.foreground, fontSize: 27, lineHeight: 37, fontWeight: "900", marginTop: 14 },
  openMeta: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 2 },
  aboutCard: { width: "100%", borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, padding: 14 },
  aboutEyebrow: { width: "100%", color: colors.gold, fontSize: 9, lineHeight: 14, fontWeight: "900" },
  aboutText: { width: "100%", color: colors.foreground, fontSize: 13, lineHeight: 22, marginTop: 5 },
  trustCard: {
    width: "100%",
    gap: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.surfaceRaised,
    padding: 13,
  },
  trustTitle: { width: "100%", color: colors.primaryStrong, fontSize: 12, lineHeight: 19, fontWeight: "900" },
  trustBody: { width: "100%", color: colors.muted, fontSize: 9, lineHeight: 15 },
  details: { width: "100%", borderTopWidth: 1, borderTopColor: colors.border },
  detailRow: {
    width: "100%",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", flex: 1 },
  detailValue: { color: colors.foreground, fontSize: 11, fontWeight: "800", flex: 1.25 },
  whyCard: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primaryWash,
    padding: 14,
    gap: 8,
  },
  whyTitle: { width: "100%", color: colors.primaryStrong, fontSize: 14, lineHeight: 22, fontWeight: "900" },
  whyBody: { width: "100%", color: colors.foreground, fontSize: 11, lineHeight: 19 },
  reasonWrap: { width: "100%", gap: 7, flexWrap: "wrap" },
  reasonChip: { borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, paddingHorizontal: 10, paddingVertical: 7 },
  reasonText: { color: colors.primary, fontSize: 9, lineHeight: 13, fontWeight: "800" },
  noScore: { width: "100%", color: colors.muted, fontSize: 9, lineHeight: 15 },
  privacyNote: { width: "100%", alignItems: "flex-start", gap: 8, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, padding: 11 },
  privacyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  privacyText: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 17 },
  decisionPrompt: { width: "100%", color: colors.foreground, fontSize: 13, lineHeight: 20, fontWeight: "800", marginTop: 2 },
  decisionRow: { width: "100%", flexDirection: "row", gap: 10 },
  decisionButton: {
    flex: 1,
    minHeight: 118,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  skipButton: { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong },
  interestedButton: { backgroundColor: colors.primary, borderColor: colors.primary },
  decisionPressed: { transform: [{ scale: 0.975 }], opacity: 0.92 },
  decisionDisabled: { opacity: 0.55 },
  decisionArrow: { fontSize: 23, lineHeight: 27, fontWeight: "800" },
  decisionTitle: { fontSize: 13, lineHeight: 19, fontWeight: "900", marginTop: 4, textAlign: "center" },
  decisionBody: { fontSize: 9, lineHeight: 14, fontWeight: "700", marginTop: 3, textAlign: "center" },
  interestedText: { color: colors.white },
  interestedBodyText: { color: "rgba(255,255,255,0.75)" },
  skipText: { color: colors.foreground },
  skipBodyText: { color: colors.muted },
  message: { width: "100%", color: colors.primary, fontSize: 11, lineHeight: 18, fontWeight: "800" },
  secondaryLink: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  secondaryLinkText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.55 },
});
