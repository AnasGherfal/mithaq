import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  isConnectionSpaceFeatureUnavailable,
  joinMyConnectionSpace,
  listMyConnectionSpaces,
  setMyCurrentConnectionSpace,
  type ConnectionSpace,
  type ConnectionSpaceState,
} from "@/lib/connection-spaces";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

const fallbackSpaces: ConnectionSpaceState[] = [
  {
    space: "marriage",
    membershipState: null,
    isCurrent: false,
    profileCompleted: false,
  },
  {
    space: "friendship",
    membershipState: null,
    isCurrent: false,
    profileCompleted: false,
  },
];

export default function SpacesScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => spaceCopy(locale), [locale]);
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [featurePending, setFeaturePending] = useState(false);
  const [spaces, setSpaces] = useState<ConnectionSpaceState[]>(fallbackSpaces);
  const [opening, setOpening] = useState<ConnectionSpace | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setFeaturePending(false);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }

      const rows = await listMyConnectionSpaces();
      setSpaces(rows.length > 0 ? rows : fallbackSpaces);
    } catch (error) {
      if (__DEV__ && isConnectionSpaceFeatureUnavailable(error)) {
        setSpaces(fallbackSpaces);
        setFeaturePending(true);
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openSpace(space: ConnectionSpace) {
    if (opening) return;
    setOpening(space);
    setMessage(null);

    try {
      if (featurePending) {
        router.replace({
          pathname: space === "marriage" ? "/status" : "/friendship",
          params: space === "friendship" ? { locale, preview: "1" } : { locale },
        });
        return;
      }

      const current = spaces.find((item) => item.space === space);
      if (current?.membershipState !== "active") {
        await joinMyConnectionSpace(space);
      }
      await setMyCurrentConnectionSpace(space);

      router.replace({
        pathname: space === "marriage" ? "/status" : "/friendship",
        params: { locale },
      });
    } catch {
      setMessage(copy.openError);
      setOpening(null);
    }
  }

  const marriage = spaces.find((item) => item.space === "marriage") ?? fallbackSpaces[0];
  const friendship = spaces.find((item) => item.space === "friendship") ?? fallbackSpaces[1];

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={
        <PrimaryButton
          tone="quiet"
          onPress={() => router.replace({ pathname: "/account", params: { locale } })}
        >
          {copy.account}
        </PrimaryButton>
      }
    >
      {loading ? (
        <View style={styles.loadingState} accessibilityLabel={copy.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
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
              styles.promise,
              { alignItems: rtl ? "flex-end" : "flex-start" },
            ]}
          >
            <Text style={[styles.promiseTitle, { textAlign, writingDirection }]}>
              {copy.promiseTitle}
            </Text>
            <Text style={[styles.promiseBody, { textAlign, writingDirection }]}>
              {copy.promiseBody}
            </Text>
          </View>

          <SpaceCard
            rtl={rtl}
            tone="marriage"
            title={copy.marriageTitle}
            subtitle={copy.marriageSubtitle}
            body={copy.marriageBody}
            detail={copy.marriageDetail}
            action={
              opening === "marriage"
                ? copy.opening
                : marriage?.membershipState === "active"
                  ? copy.openMarriage
                  : copy.joinMarriage
            }
            joined={marriage?.membershipState === "active"}
            current={Boolean(marriage?.isCurrent)}
            profileComplete={Boolean(marriage?.profileCompleted)}
            busy={opening === "marriage"}
            onPress={() => void openSpace("marriage")}
          />

          <SpaceCard
            rtl={rtl}
            tone="friendship"
            title={copy.friendshipTitle}
            subtitle={copy.friendshipSubtitle}
            body={copy.friendshipBody}
            detail={copy.friendshipDetail}
            action={
              opening === "friendship"
                ? copy.opening
                : featurePending
                  ? copy.previewFriends
                  : friendship?.membershipState === "active"
                    ? copy.openFriends
                    : copy.joinFriends
            }
            joined={friendship?.membershipState === "active"}
            current={Boolean(friendship?.isCurrent)}
            profileComplete={Boolean(friendship?.profileCompleted)}
            busy={opening === "friendship"}
            onPress={() => void openSpace("friendship")}
          />

          <View
            style={[
              styles.boundary,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            <View style={styles.boundaryIcon}>
              <AppIcon name="privacy" active size={18} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.boundaryTitle, { textAlign, writingDirection }]}>
                {copy.boundaryTitle}
              </Text>
              <Text style={[styles.boundaryBody, { textAlign, writingDirection }]}>
                {copy.boundaryBody}
              </Text>
            </View>
          </View>

          {featurePending ? (
            <Text style={[styles.previewNote, { textAlign, writingDirection }]}>
              {copy.previewNote}
            </Text>
          ) : null}

          {message ? (
            <Text
              accessibilityRole="alert"
              style={[styles.error, { textAlign, writingDirection }]}
            >
              {message}
            </Text>
          ) : null}
        </View>
      )}
    </ScreenShell>
  );
}

function SpaceCard({
  rtl,
  tone,
  title,
  subtitle,
  body,
  detail,
  action,
  joined,
  current,
  profileComplete,
  busy,
  onPress,
}: {
  rtl: boolean;
  tone: "marriage" | "friendship";
  title: string;
  subtitle: string;
  body: string;
  detail: string;
  action: string;
  joined: boolean;
  current: boolean;
  profileComplete: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const friendship = tone === "friendship";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy, selected: current }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        friendship ? styles.friendshipCard : styles.marriageCard,
        current ? styles.currentCard : null,
        pressed && !busy ? styles.cardPressed : null,
        busy ? styles.disabled : null,
      ]}
    >
      <View style={[styles.cardTop, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <View
          style={[
            styles.cardIcon,
            friendship ? styles.friendshipIcon : styles.marriageIcon,
          ]}
        >
          {friendship ? (
            <View style={styles.peopleMark}>
              <View style={[styles.personHead, styles.personHeadOne]} />
              <View style={[styles.personHead, styles.personHeadTwo]} />
              <View style={[styles.personBody, styles.personBodyOne]} />
              <View style={[styles.personBody, styles.personBodyTwo]} />
            </View>
          ) : (
            <AppIcon name="introductions" active size={23} />
          )}
        </View>
        <View style={[styles.cardCopy, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
          <Text style={[styles.cardSubtitle, { textAlign, writingDirection }]}>
            {subtitle}
          </Text>
          <Text style={[styles.cardTitle, { textAlign, writingDirection }]}>{title}</Text>
        </View>
        <View
          style={[
            styles.statePill,
            current ? styles.statePillCurrent : null,
            friendship && !current ? styles.statePillFriendship : null,
          ]}
        >
          <Text style={styles.stateText}>
            {current ? (rtl ? "الحالية" : "Current") : joined ? (rtl ? "منضم" : "Joined") : (rtl ? "جديد" : "New")}
          </Text>
        </View>
      </View>

      <Text style={[styles.cardBody, { textAlign, writingDirection }]}>{body}</Text>

      <View
        style={[
          styles.detailRow,
          { flexDirection: rtl ? "row-reverse" : "row" },
        ]}
      >
        <View
          style={[
            styles.detailDot,
            friendship ? styles.detailDotFriendship : null,
          ]}
        />
        <Text style={[styles.detailText, { textAlign, writingDirection }]}>{detail}</Text>
      </View>

      <View style={[styles.cardAction, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        {busy ? (
          <ActivityIndicator color={friendship ? colors.accent : colors.primary} size="small" />
        ) : (
          <>
            <Text
              style={[
                styles.cardActionText,
                friendship ? styles.cardActionFriendship : null,
                { textAlign, writingDirection },
              ]}
            >
              {action}
            </Text>
            <AppIcon name="chevron" active size={15} rtl={rtl} />
          </>
        )}
      </View>

      {profileComplete ? (
        <View style={[styles.completeMark, rtl ? styles.completeMarkRtl : styles.completeMarkLtr]}>
          <Text style={styles.completeMarkText}>✓</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function spaceCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "مساحتان منفصلتان",
      title: "اختر لماذا أنت هنا",
      body: "يمكنك استخدام الزواج أو الأصدقاء أو الاثنين. لكل مساحة ملفها واكتشافها ونشاطها ومحادثاتها الخاصة.",
      loading: "جارٍ تحميل مساحات ميثاق",
      account: "العودة إلى حسابي",
      loadErrorTitle: "تعذر تحميل المساحات",
      loadErrorBody: "لم نغيّر اختيارك. تحقق من الاتصال ثم حاول مرة أخرى.",
      retry: "إعادة المحاولة",
      promiseTitle: "وضوح النية قبل أي تواصل",
      promiseBody: "لن نعرض شخصاً يبحث عن صداقة داخل تعارف للزواج، ولن ننقل إعجاباً أو محادثة بين المساحتين.",
      marriageTitle: "الزواج",
      marriageSubtitle: "شريك حياة",
      marriageBody: "تعارفات مدروسة، تفضيلات متبادلة، وقرار خاص قبل فتح التواصل.",
      marriageDetail: "ملف الزواج وتفضيلاته وصوره تبقى داخل مساحة الزواج.",
      friendshipTitle: "الأصدقاء",
      friendshipSubtitle: "مجتمع وصداقة",
      friendshipBody: "تعرّف على أشخاص حول الاهتمامات والمدينة والأنشطة، بدون تحويل الصداقة إلى تعارف مبهم.",
      friendshipDetail: "ملف الصداقة وإشاراتها ومحادثاتها مستقلة تماماً عن الزواج.",
      joinMarriage: "الانضمام إلى مساحة الزواج",
      openMarriage: "فتح مساحة الزواج",
      joinFriends: "الانضمام إلى مساحة الأصدقاء",
      openFriends: "فتح مساحة الأصدقاء",
      previewFriends: "معاينة مساحة الأصدقاء",
      opening: "جارٍ الفتح...",
      boundaryTitle: "لا خلط تلقائي",
      boundaryBody: "لا ننسخ نبذة الزواج أو صوره أو تفضيلاته إلى الأصدقاء. أي مشاركة مستقبلية تحتاج اختياراً صريحاً منك.",
      previewNote: "المعاينة البصرية متاحة الآن، وسيُحفظ الانضمام بعد تطبيق ترحيل المساحات على بيئة الاستضافة.",
      openError: "تعذر فتح هذه المساحة الآن. لم نغيّر عضويتك؛ حاول مرة أخرى.",
    };
  }

  return {
    eyebrow: "TWO SEPARATE SPACES",
    title: "Choose why you’re here",
    body: "Use Marriage, Friends, or both. Each space keeps its own profile, discovery, activity, and conversations.",
    loading: "Loading Mithaq spaces",
    account: "Back to Account",
    loadErrorTitle: "We couldn’t load your spaces",
    loadErrorBody: "Your choice was not changed. Check your connection and try again.",
    retry: "Try again",
    promiseTitle: "Clear intent before any connection",
    promiseBody: "A friendship-only member never appears in marriage introductions, and likes or conversations never move between spaces.",
    marriageTitle: "Marriage",
    marriageSubtitle: "A life partner",
    marriageBody: "Considered introductions, mutual preferences, and private decisions before communication opens.",
    marriageDetail: "Your marriage profile, preferences, and photos stay inside Marriage.",
    friendshipTitle: "Friends",
    friendshipSubtitle: "Community & friendship",
    friendshipBody: "Meet people through interests, city, and activities without turning friendship into ambiguous dating.",
    friendshipDetail: "Your friendship profile, signals, and conversations remain completely separate.",
    joinMarriage: "Join Marriage",
    openMarriage: "Open Marriage",
    joinFriends: "Join Friends",
    openFriends: "Open Friends",
    previewFriends: "Preview Friends space",
    opening: "Opening...",
    boundaryTitle: "Nothing is mixed automatically",
    boundaryBody: "Mithaq does not copy your marriage bio, photos, or preferences into Friends. Any future reuse requires your explicit choice.",
    previewNote: "The visual preview is available now. Membership persists after the spaces migration is applied to hosted staging.",
    openError: "We couldn’t open that space. Your membership was not changed; try again.",
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingState: { minHeight: 320, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 16 },
  promise: {
    width: "100%",
    borderRadius: radius.lg,
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 17,
    paddingVertical: 15,
  },
  promiseTitle: {
    width: "100%",
    color: colors.foreground,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "800",
  },
  promiseBody: {
    width: "100%",
    color: colors.muted,
    fontSize: 12,
    lineHeight: 21,
    marginTop: 4,
  },
  card: {
    width: "100%",
    minHeight: 230,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 19,
    overflow: "hidden",
    ...shadows.card,
  },
  marriageCard: {
    borderColor: colors.primarySoft,
    backgroundColor: colors.primaryWash,
  },
  friendshipCard: {
    borderColor: colors.accentSoft,
    backgroundColor: colors.accentWash,
  },
  currentCard: { borderWidth: 2 },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.994 }] },
  disabled: { opacity: 0.58 },
  cardTop: { width: "100%", alignItems: "center", gap: 12 },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
  },
  marriageIcon: { borderWidth: 1, borderColor: colors.primarySoft },
  friendshipIcon: { borderWidth: 1, borderColor: colors.accentSoft },
  cardCopy: { flex: 1, minWidth: 0 },
  cardSubtitle: {
    width: "100%",
    color: colors.muted,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "800",
  },
  cardTitle: {
    width: "100%",
    color: colors.foreground,
    fontSize: 24,
    lineHeight: 36,
    fontWeight: "800",
    marginTop: 1,
  },
  statePill: {
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statePillCurrent: { backgroundColor: colors.primarySoft },
  statePillFriendship: { borderColor: colors.accentSoft },
  stateText: { color: colors.foreground, fontSize: 9, lineHeight: 13, fontWeight: "800" },
  cardBody: {
    width: "100%",
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 24,
    marginTop: 17,
  },
  detailRow: { width: "100%", alignItems: "flex-start", gap: 9, marginTop: 12 },
  detailDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  detailDotFriendship: { backgroundColor: colors.accent },
  detailText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 19 },
  cardAction: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: 17,
    paddingTop: 13,
  },
  cardActionText: { flex: 1, color: colors.primary, fontSize: 12, lineHeight: 19, fontWeight: "800" },
  cardActionFriendship: { color: colors.accent },
  completeMark: {
    position: "absolute",
    top: -18,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandGold,
  },
  completeMarkLtr: { right: -18 },
  completeMarkRtl: { left: -18 },
  completeMarkText: { color: colors.white, fontSize: 14, fontWeight: "900", marginTop: 13 },
  peopleMark: { width: 28, height: 24, position: "relative" },
  personHead: {
    position: "absolute",
    top: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.6,
    borderColor: colors.accent,
  },
  personHeadOne: { left: 4 },
  personHeadTwo: { right: 4 },
  personBody: {
    position: "absolute",
    bottom: 1,
    width: 13,
    height: 10,
    borderWidth: 1.6,
    borderBottomWidth: 0,
    borderColor: colors.accent,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  personBodyOne: { left: 0 },
  personBodyTwo: { right: 0 },
  boundary: {
    width: "100%",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 16,
  },
  boundaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
  },
  boundaryTitle: { width: "100%", color: colors.foreground, fontSize: 14, lineHeight: 22, fontWeight: "800" },
  boundaryBody: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 3 },
  previewNote: { width: "100%", color: colors.gold, fontSize: 11, lineHeight: 19, fontWeight: "700" },
  error: { width: "100%", color: colors.danger, fontSize: 12, lineHeight: 20, fontWeight: "700" },
});
