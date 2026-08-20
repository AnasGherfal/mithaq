import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
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
  const { height } = useWindowDimensions();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const preview = params.preview === "1";
  const compact = height < 760;
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

  function openProfile() {
    router.push({
      pathname: "/friendship-profile",
      params: featurePending ? { locale, preview: "1" } : { locale },
    });
  }

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      scrollEnabled={false}
      bottomBar={
        <GuidedActionBar
          rtl={rtl}
          backLabel={complete ? copy.requests : copy.switchSpace}
          primaryLabel={complete ? copy.discoverFriends : copy.createProfile}
          secondaryIcon={complete ? "activity" : "back"}
          onBack={() =>
            complete
              ? router.push({ pathname: "/friendship-requests", params: { locale } })
              : router.replace({ pathname: "/spaces", params: { locale } })
          }
          onPrimary={() =>
            complete
              ? router.push({ pathname: "/friendship-discover", params: { locale } })
              : openProfile()
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
              compact ? styles.heroCompact : null,
              { alignItems: rtl ? "flex-end" : "flex-start" },
            ]}
          >
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />
            <View style={[styles.peopleIcon, compact ? styles.peopleIconCompact : null]}>
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
            <Text
              style={[
                styles.heroTitle,
                compact ? styles.heroTitleCompact : null,
                { textAlign, writingDirection },
              ]}
            >
              {complete ? copy.readyTitle : copy.heroTitle}
            </Text>
            <Text style={[styles.heroBody, { textAlign, writingDirection }]}>
              {complete ? copy.readyBody : copy.heroBody}
            </Text>
            <View
              style={[
                styles.statusPill,
                complete ? styles.statusPillReady : null,
                {
                  flexDirection: rtl ? "row-reverse" : "row",
                  alignSelf: rtl ? "flex-end" : "flex-start",
                },
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
            {complete ? (
              <Pressable
                accessibilityRole="button"
                onPress={openProfile}
                style={({ pressed }) => [
                  styles.editProfile,
                  { alignSelf: rtl ? "flex-end" : "flex-start" },
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={[styles.editProfileText, { writingDirection }]}>
                  {copy.editProfile}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.flowSection}>
            <View
              style={[
                styles.flow,
                { flexDirection: rtl ? "row-reverse" : "row" },
              ]}
            >
              <FlowStep label={copy.discover} tone="teal" rtl={rtl} />
              <View style={styles.flowLine} />
              <FlowStep label={copy.request} tone="rose" rtl={rtl} />
              <View style={styles.flowLine} />
              <FlowStep label={copy.chat} tone="gold" rtl={rtl} />
            </View>
            <Text style={[styles.flowBody, { textAlign, writingDirection }]}>
              {copy.flowBody}
            </Text>
          </View>

          <View
            style={[
              styles.separateCard,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            <View style={styles.separateIcon}>
              <AppIcon name="privacy" active size={17} />
            </View>
            <Text style={[styles.separateBody, { textAlign, writingDirection }]}>
              {copy.separateBody}
            </Text>
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

function FlowStep({
  label,
  tone,
  rtl,
}: {
  label: string;
  tone: "teal" | "rose" | "gold";
  rtl: boolean;
}) {
  return (
    <View style={styles.flowStep}>
      <View
        style={[
          styles.flowDot,
          tone === "rose" ? styles.flowDotRose : null,
          tone === "gold" ? styles.flowDotGold : null,
        ]}
      />
      <Text style={[styles.flowLabel, { writingDirection: rtl ? "rtl" : "ltr" }]}>
        {label}
      </Text>
    </View>
  );
}

function friendshipCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "مساحة الأصدقاء",
      title: "تعرّف على ناس يشبهون اهتماماتك",
      body: "صداقة ومجتمع بنية واضحة، منفصلان تماماً عن الزواج.",
      loading: "جارٍ فتح مساحة الأصدقاء",
      loadErrorTitle: "تعذر فتح مساحة الأصدقاء",
      loadErrorBody: "لم نغيّر ملفك. تحقق من الاتصال ثم حاول مرة أخرى.",
      retry: "إعادة المحاولة",
      switchSpace: "تبديل المساحة",
      createProfile: "إنشاء ملف الصداقة",
      editProfile: "تعديل ملف الصداقة",
      discoverFriends: "اكتشاف الأصدقاء",
      requests: "الطلبات",
      welcome: (name: string) => `مرحباً ${name}`,
      heroKicker: "دائرتك الجديدة تبدأ من اهتمامات مشتركة",
      heroTitle: "كوّن صداقات بدون غموض",
      heroBody: "ملف منفصل يساعدك على اكتشاف أشخاص حول المدينة والأنشطة وما تستمتع به.",
      readyTitle: "ملف الصداقة جاهز",
      readyBody: "اهتماماتك ومدينتك جاهزتان لاكتشاف أشخاص جدد في مساحة الأصدقاء.",
      profileReady: "جاهز لاكتشاف الأصدقاء",
      profileNeeded: "أكمل ملف الصداقة أولاً",
      promptEyebrow: "سؤال يساعد الناس على فهمك",
      promptTitle: "ماذا تستمتع بفعله مع أصدقاء جدد؟",
      promptChips: ["قهوة", "مشي", "تجربة جديدة"],
      discover: "اكتشاف",
      request: "طلب خاص",
      chat: "محادثة",
      flowBody: "اكتشاف محدود، ثم طلب صداقة خاص، ثم محادثة منفصلة بعد القبول.",
      separateBody: "نبذة الزواج وصوره وتفضيلاته لا تُنسخ هنا، ومحادثات المساحتين لا تختلط.",
      previewNote: "معاينة قابلة للتجربة؛ الحفظ والاكتشاف الحقيقيان يبدأان بعد تطبيق ترحيلات Friends على الاستضافة.",
    };
  }

  return {
    eyebrow: "FRIENDS SPACE",
    title: "Meet people through what you enjoy",
    body: "Friendship and community with clear intent, completely separate from Marriage.",
    loading: "Opening Friends space",
    loadErrorTitle: "We couldn’t open Friends",
    loadErrorBody: "Your profile was not changed. Check your connection and try again.",
    retry: "Try again",
    switchSpace: "Switch space",
    createProfile: "Create friendship profile",
    editProfile: "Edit friendship profile",
    discoverFriends: "Discover friends",
    requests: "Requests",
    welcome: (name: string) => `Welcome, ${name}`,
    heroKicker: "Your next circle starts with shared interests",
    heroTitle: "Make friends without ambiguity",
    heroBody: "A separate profile helps you discover people through city, activities, and what you enjoy.",
    readyTitle: "Your friendship profile is ready",
    readyBody: "Your interests and city are ready to discover new people inside Friends.",
    profileReady: "Ready for friend discovery",
    profileNeeded: "Complete your friendship profile first",
    promptEyebrow: "A PROMPT THAT HELPS PEOPLE KNOW YOU",
    promptTitle: "What would you enjoy doing with new friends?",
    promptChips: ["Coffee", "A walk", "A new experience"],
    discover: "Discover",
    request: "Private request",
    chat: "Conversation",
    flowBody: "Finite discovery, a private friend request, then a separate conversation after acceptance.",
    separateBody: "Marriage biography, photos, and preferences are not copied here, and conversations never mix.",
    previewNote: "Interactive preview; real persistence and discovery begin after the Friends migrations are deployed to hosted staging.",
  };
}

const styles = StyleSheet.create({
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center" },
  page: { flex: 1, width: "100%", gap: 12 },
  hero: {
    width: "100%",
    minHeight: 248,
    justifyContent: "flex-end",
    borderRadius: radius.xl,
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.accentSoft,
    padding: 18,
    overflow: "hidden",
    ...shadows.card,
  },
  heroCompact: { minHeight: 216, padding: 15 },
  heroGlowOne: {
    position: "absolute",
    top: -74,
    right: -48,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(4,144,155,0.12)",
  },
  heroGlowTwo: {
    position: "absolute",
    top: 18,
    left: -62,
    width: 174,
    height: 174,
    borderRadius: 87,
    backgroundColor: "rgba(208,156,81,0.14)",
  },
  peopleIcon: {
    position: "absolute",
    top: 25,
    alignSelf: "center",
    width: 160,
    height: 92,
  },
  peopleIconCompact: { top: 12, transform: [{ scale: 0.83 }] },
  person: { position: "absolute", alignItems: "center" },
  personOne: { left: 10, top: 20, transform: [{ scale: 0.75 }] },
  personTwo: { left: 56, top: 0 },
  personThree: { right: 8, top: 23, transform: [{ scale: 0.72 }] },
  head: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.accentSoft,
  },
  bodyShape: {
    width: 60,
    height: 40,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.accentSoft,
    marginTop: 4,
  },
  heroKicker: {
    width: "100%",
    color: colors.accent,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "800",
  },
  heroTitle: {
    width: "100%",
    color: colors.foreground,
    fontSize: 24,
    lineHeight: 37,
    fontWeight: "800",
    marginTop: 3,
  },
  heroTitleCompact: { fontSize: 21, lineHeight: 32 },
  heroBody: {
    width: "100%",
    color: colors.muted,
    fontSize: 11,
    lineHeight: 19,
    marginTop: 3,
  },
  statusPill: {
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 9,
  },
  statusPillReady: { backgroundColor: colors.primarySoft },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  statusDotReady: { backgroundColor: colors.primary },
  statusText: { color: colors.foreground, fontSize: 9, lineHeight: 13, fontWeight: "800" },
  promptCard: {
    width: "100%",
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
  },
  promptEyebrow: { width: "100%", color: colors.gold, fontSize: 9, lineHeight: 14, fontWeight: "800" },
  promptTitle: { width: "100%", color: colors.foreground, fontSize: 14, lineHeight: 22, fontWeight: "800", marginTop: 2 },
  promptChips: { width: "100%", flexWrap: "wrap", gap: 6, marginTop: 8 },
  promptChip: { borderRadius: radius.pill, backgroundColor: colors.goldSoft, paddingHorizontal: 9, paddingVertical: 6 },
  promptChipText: { color: colors.foreground, fontSize: 9, lineHeight: 13, fontWeight: "700" },
  editProfile: { minHeight: 34, justifyContent: "center", marginTop: 8 },
  editProfileText: { color: colors.primary, fontSize: 10, lineHeight: 16, fontWeight: "800" },
  flowSection: { width: "100%" },
  flow: { width: "100%", alignItems: "flex-start" },
  flowStep: { width: 76, alignItems: "center" },
  flowDot: { width: 29, height: 29, borderRadius: 15, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary },
  flowDotRose: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  flowDotGold: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  flowLine: { flex: 1, height: 1, backgroundColor: colors.borderStrong, marginTop: 15 },
  flowLabel: { color: colors.muted, fontSize: 9, lineHeight: 14, fontWeight: "700", textAlign: "center", marginTop: 4 },
  flowBody: { width: "100%", color: colors.muted, fontSize: 10, lineHeight: 17, marginTop: 5 },
  separateCard: { width: "100%", alignItems: "center", gap: 9, borderRadius: radius.md, backgroundColor: colors.primaryWash, paddingHorizontal: 12, paddingVertical: 10 },
  separateIcon: { width: 31, height: 31, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised },
  separateBody: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 17 },
  previewNote: { width: "100%", color: colors.gold, fontSize: 9, lineHeight: 15, fontWeight: "700" },
  pressed: { opacity: 0.55 },
});
