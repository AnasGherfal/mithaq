import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { GuidedActionBar } from "@/components/guided-action-bar";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  isConnectionSpaceFeatureUnavailable,
  listMyConnectionSpaces,
  loadMyFriendshipProfile,
  type FriendshipProfile,
} from "@/lib/connection-spaces";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

export default function FriendshipHomeScreen() {
  const params = useLocalSearchParams<{ locale?: string; preview?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const preview = params.preview === "1";
  const copy = useMemo(() => friendshipCopy(locale), [locale]);
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";

  const [loading, setLoading] = useState(!preview);
  const [loadError, setLoadError] = useState(false);
  const [featurePending, setFeaturePending] = useState(preview);
  const [profile, setProfile] = useState<FriendshipProfile | null>(null);

  const load = useCallback(async () => {
    if (preview) {
      setFeaturePending(true);
      setLoading(false);
      return;
    }

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

      const spaces = await listMyConnectionSpaces();
      const friendship = spaces.find((item) => item.space === "friendship");
      if (friendship?.membershipState !== "active") {
        router.replace({ pathname: "/spaces", params: { locale } });
        return;
      }

      setProfile(await loadMyFriendshipProfile());
    } catch (error) {
      if (__DEV__ && isConnectionSpaceFeatureUnavailable(error)) {
        setFeaturePending(true);
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [locale, preview]);

  useEffect(() => {
    void load();
  }, [load]);

  const complete = Boolean(profile?.profileCompletedAt);
  const displayName = profile?.displayName.trim();

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      bottomBar={
        <GuidedActionBar
          rtl={rtl}
          backLabel={copy.switchSpace}
          primaryLabel={complete ? copy.editProfile : copy.createProfile}
          secondaryIcon="back"
          onBack={() => router.replace({ pathname: "/spaces", params: { locale } })}
          onPrimary={() =>
            router.push({
              pathname: "/friendship-profile",
              params: featurePending ? { locale, preview: "1" } : { locale },
            })
          }
        />
      }
    >
      {loading ? (
        <View style={styles.loadingState} accessibilityLabel={copy.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : loadError ? (
        <StateCard
          rtl={rtl}
          tone="error"
          title={copy.loadErrorTitle}
          body={copy.loadErrorBody}
          actionLabel={copy.retry}
          onAction={() => void load()}
        />
      ) : (
        <View style={styles.page}>
          <View
            style={[
              styles.hero,
              { alignItems: rtl ? "flex-end" : "flex-start" },
            ]}
          >
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />
            <View style={styles.peopleIcon}>
              <View style={[styles.person, styles.personOne]}>
                <View style={styles.head} />
                <View style={styles.bodyShape} />
              </View>
              <View style={[styles.person, styles.personTwo]}>
                <View style={styles.head} />
                <View style={styles.bodyShape} />
              </View>
              <View style={[styles.person, styles.personThree]}>
                <View style={styles.head} />
                <View style={styles.bodyShape} />
              </View>
            </View>
            <Text style={[styles.heroKicker, { textAlign, writingDirection }]}>
              {displayName ? copy.welcome(displayName) : copy.heroKicker}
            </Text>
            <Text style={[styles.heroTitle, { textAlign, writingDirection }]}>
              {complete ? copy.readyTitle : copy.heroTitle}
            </Text>
            <Text style={[styles.heroBody, { textAlign, writingDirection }]}>
              {complete ? copy.readyBody : copy.heroBody}
            </Text>
            <View
              style={[
                styles.statusPill,
                complete ? styles.statusPillReady : null,
                { flexDirection: rtl ? "row-reverse" : "row" },
              ]}
            >
              <View style={[styles.statusDot, complete ? styles.statusDotReady : null]} />
              <Text style={[styles.statusText, { writingDirection }]}>
                {complete ? copy.profileReady : copy.profileNeeded}
              </Text>
            </View>
          </View>

          <View style={styles.promptCard}>
            <Text style={[styles.promptEyebrow, { textAlign, writingDirection }]}>
              {copy.promptEyebrow}
            </Text>
            <Text style={[styles.promptTitle, { textAlign, writingDirection }]}>
              {copy.promptTitle}
            </Text>
            <View
              style={[
                styles.promptChips,
                { flexDirection: rtl ? "row-reverse" : "row" },
              ]}
            >
              {copy.promptChips.map((chip) => (
                <View key={chip} style={styles.promptChip}>
                  <Text style={[styles.promptChipText, { writingDirection }]}>{chip}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign, writingDirection }]}>
              {copy.howTitle}
            </Text>
            <FriendshipStep
              rtl={rtl}
              number="1"
              title={copy.stepOneTitle}
              body={copy.stepOneBody}
              tone="teal"
            />
            <FriendshipStep
              rtl={rtl}
              number="2"
              title={copy.stepTwoTitle}
              body={copy.stepTwoBody}
              tone="rose"
            />
            <FriendshipStep
              rtl={rtl}
              number="3"
              title={copy.stepThreeTitle}
              body={copy.stepThreeBody}
              tone="gold"
            />
          </View>

          <View
            style={[
              styles.separateCard,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            <View style={styles.separateIcon}>
              <AppIcon name="privacy" active size={18} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.separateTitle, { textAlign, writingDirection }]}>
                {copy.separateTitle}
              </Text>
              <Text style={[styles.separateBody, { textAlign, writingDirection }]}>
                {copy.separateBody}
              </Text>
            </View>
          </View>

          {featurePending ? (
            <Text style={[styles.previewNote, { textAlign, writingDirection }]}>
              {copy.previewNote}
            </Text>
          ) : null}
        </View>
      )}
    </ScreenShell>
  );
}

function FriendshipStep({
  rtl,
  number,
  title,
  body,
  tone,
}: {
  rtl: boolean;
  number: string;
  title: string;
  body: string;
  tone: "teal" | "rose" | "gold";
}) {
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";

  return (
    <View
      style={[
        styles.step,
        { flexDirection: rtl ? "row-reverse" : "row" },
      ]}
    >
      <View
        style={[
          styles.stepNumber,
          tone === "rose" ? styles.stepNumberRose : null,
          tone === "gold" ? styles.stepNumberGold : null,
        ]}
      >
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={[styles.stepTitle, { textAlign, writingDirection }]}>{title}</Text>
        <Text style={[styles.stepBody, { textAlign, writingDirection }]}>{body}</Text>
      </View>
    </View>
  );
}

function friendshipCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "مساحة الأصدقاء",
      title: "تعرّف على ناس يشبهون اهتماماتك",
      body: "صداقة ومجتمع بنية واضحة. لا ملفات زواج، لا إعجابات رومانسية، ولا خلط بين المساحتين.",
      loading: "جارٍ فتح مساحة الأصدقاء",
      loadErrorTitle: "تعذر فتح مساحة الأصدقاء",
      loadErrorBody: "لم نغيّر ملفك. تحقق من الاتصال ثم حاول مرة أخرى.",
      retry: "إعادة المحاولة",
      switchSpace: "تبديل المساحة",
      createProfile: "إنشاء ملف الصداقة",
      editProfile: "تعديل ملف الصداقة",
      welcome: (name: string) => `مرحباً ${name}`,
      heroKicker: "دائرتك الجديدة تبدأ من اهتمامات مشتركة",
      heroTitle: "كوّن صداقات بدون غموض",
      heroBody: "أنشئ ملفاً خاصاً بالصداقة، ثم اكتشف عدداً محدوداً من الأشخاص حول الأنشطة والمدينة وما تستمتع به.",
      readyTitle: "ملف الصداقة جاهز",
      readyBody: "سنستخدم اهتماماتك ومدينتك ونشاطك لبناء اكتشاف منفصل وآمن للأصدقاء.",
      profileReady: "جاهز لاكتشاف الأصدقاء",
      profileNeeded: "أكمل ملف الصداقة أولاً",
      promptEyebrow: "سؤال يساعد الناس على فهمك",
      promptTitle: "ما الشيء الذي تستمتع بفعله مع أصدقاء جدد؟",
      promptChips: ["قهوة وحديث", "مشي ونشاط", "فعالية أو تجربة جديدة"],
      howTitle: "كيف ستعمل مساحة الأصدقاء؟",
      stepOneTitle: "اكتشاف محدود وهادف",
      stepOneBody: "عدد صغير من الأشخاص بناءً على الاهتمامات والمدينة، وليس تصفحاً بلا نهاية.",
      stepTwoTitle: "طلب صداقة خاص",
      stepTwoBody: "لا تظهر الإشارة للطرف الآخر إلا عندما يسمح منطق الاتصال المتبادل بذلك.",
      stepThreeTitle: "محادثة منفصلة",
      stepThreeBody: "محادثات الأصدقاء لا تظهر داخل الزواج، والعكس صحيح.",
      separateTitle: "منفصلة فعلاً عن الزواج",
      separateBody: "نبذة الزواج وصوره وتفضيلاته لا تُنسخ هنا. ستختار لاحقاً أي معلومة ترغب في مشاركتها من جديد.",
      previewNote: "هذه معاينة قابلة للتجربة. الحفظ والاكتشاف الفعليان يبدآن بعد تطبيق ترحيل المساحات على الاستضافة.",
    };
  }

  return {
    eyebrow: "FRIENDS SPACE",
    title: "Meet people through what you enjoy",
    body: "Friendship and community with clear intent—no marriage profiles, romantic likes, or mixed conversations.",
    loading: "Opening Friends space",
    loadErrorTitle: "We couldn’t open Friends",
    loadErrorBody: "Your profile was not changed. Check your connection and try again.",
    retry: "Try again",
    switchSpace: "Switch space",
    createProfile: "Create friendship profile",
    editProfile: "Edit friendship profile",
    welcome: (name: string) => `Welcome, ${name}`,
    heroKicker: "Your next circle starts with shared interests",
    heroTitle: "Make friends without ambiguity",
    heroBody: "Create a friendship-only profile, then discover a finite set of people through activities, city, and what you enjoy.",
    readyTitle: "Your friendship profile is ready",
    readyBody: "Mithaq can use your interests, city, and activity to build a separate, safe Friends discovery experience.",
    profileReady: "Ready for friend discovery",
    profileNeeded: "Complete your friendship profile first",
    promptEyebrow: "A PROMPT THAT HELPS PEOPLE KNOW YOU",
    promptTitle: "What would you enjoy doing with new friends?",
    promptChips: ["Coffee & conversation", "Walks & activities", "A new event or experience"],
    howTitle: "How Friends will work",
    stepOneTitle: "Finite, intentional discovery",
    stepOneBody: "A small set of people based on interests and city—not endless browsing.",
    stepTwoTitle: "Private friend requests",
    stepTwoBody: "A signal is not exposed unless the mutual connection rules allow it.",
    stepThreeTitle: "Separate conversations",
    stepThreeBody: "Friends chats never appear inside Marriage, and marriage chats never appear here.",
    separateTitle: "Actually separate from Marriage",
    separateBody: "Your marriage bio, photos, and preferences are not copied here. You will explicitly choose any information you reuse later.",
    previewNote: "This is an interactive preview. Persistence and live discovery begin after the spaces migration is deployed to hosted staging.",
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingState: { minHeight: 320, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 18 },
  hero: {
    width: "100%",
    minHeight: 330,
    justifyContent: "flex-end",
    borderRadius: radius.xl,
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.accentSoft,
    padding: 21,
    overflow: "hidden",
    ...shadows.card,
  },
  heroGlowOne: {
    position: "absolute",
    top: -74,
    right: -48,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(4,144,155,0.12)",
  },
  heroGlowTwo: {
    position: "absolute",
    top: 38,
    left: -62,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(208,156,81,0.14)",
  },
  peopleIcon: {
    position: "absolute",
    top: 44,
    alignSelf: "center",
    width: 176,
    height: 122,
  },
  person: { position: "absolute", alignItems: "center" },
  personOne: { left: 10, top: 24, transform: [{ scale: 0.82 }] },
  personTwo: { left: 63, top: 0, transform: [{ scale: 1.05 }] },
  personThree: { right: 8, top: 28, transform: [{ scale: 0.78 }] },
  head: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.accentSoft,
  },
  bodyShape: {
    width: 68,
    height: 48,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 17,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.accentSoft,
    marginTop: 5,
  },
  heroKicker: {
    width: "100%",
    color: colors.accent,
    fontSize: 11,
    lineHeight: 18,
    fontWeight: "800",
  },
  heroTitle: {
    width: "100%",
    color: colors.foreground,
    fontSize: 27,
    lineHeight: 41,
    fontWeight: "800",
    marginTop: 5,
  },
  heroBody: {
    width: "100%",
    color: colors.muted,
    fontSize: 13,
    lineHeight: 22,
    marginTop: 5,
  },
  statusPill: {
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginTop: 14,
  },
  statusPillReady: { backgroundColor: colors.primarySoft },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  statusDotReady: { backgroundColor: colors.primary },
  statusText: { color: colors.foreground, fontSize: 10, lineHeight: 15, fontWeight: "800" },
  promptCard: {
    width: "100%",
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    ...shadows.card,
  },
  promptEyebrow: { width: "100%", color: colors.gold, fontSize: 10, lineHeight: 16, fontWeight: "800" },
  promptTitle: { width: "100%", color: colors.foreground, fontSize: 18, lineHeight: 29, fontWeight: "800", marginTop: 5 },
  promptChips: { width: "100%", flexWrap: "wrap", gap: 8, marginTop: 14 },
  promptChip: { borderRadius: radius.pill, backgroundColor: colors.goldSoft, paddingHorizontal: 11, paddingVertical: 8 },
  promptChipText: { color: colors.foreground, fontSize: 10, lineHeight: 15, fontWeight: "700" },
  section: { width: "100%", gap: 10 },
  sectionTitle: { width: "100%", color: colors.foreground, fontSize: 18, lineHeight: 29, fontWeight: "800", marginBottom: 2 },
  step: {
    width: "100%",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
  },
  stepNumber: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  stepNumberRose: { backgroundColor: colors.accentSoft },
  stepNumberGold: { backgroundColor: colors.goldSoft },
  stepNumberText: { color: colors.foreground, fontSize: 11, fontWeight: "900" },
  stepTitle: { width: "100%", color: colors.foreground, fontSize: 14, lineHeight: 22, fontWeight: "800" },
  stepBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 19, marginTop: 2 },
  separateCard: { width: "100%", alignItems: "flex-start", gap: 12, borderRadius: radius.lg, backgroundColor: colors.primaryWash, padding: 16 },
  separateIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised },
  separateTitle: { width: "100%", color: colors.foreground, fontSize: 14, lineHeight: 22, fontWeight: "800" },
  separateBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 19, marginTop: 3 },
  previewNote: { width: "100%", color: colors.gold, fontSize: 11, lineHeight: 19, fontWeight: "700" },
});
