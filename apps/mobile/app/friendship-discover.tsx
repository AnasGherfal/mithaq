import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  isFriendshipDiscoveryUnavailable,
  listFriendshipDiscovery,
  sendFriendshipRequest,
  type FriendshipDiscoveryProfile,
} from "@/lib/friendship";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

export default function FriendshipDiscoverScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => discoverCopy(locale), [locale]);
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [featurePending, setFeaturePending] = useState(false);
  const [profiles, setProfiles] = useState<FriendshipDiscoveryProfile[]>([]);
  const [index, setIndex] = useState(0);
  const [sending, setSending] = useState(false);
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
      const rows = await listFriendshipDiscovery(6);
      setProfiles(rows);
      setIndex(0);
    } catch (error) {
      if (__DEV__ && isFriendshipDiscoveryUnavailable(error)) {
        setFeaturePending(true);
        setProfiles([]);
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

  const current = profiles[index] ?? null;

  function next() {
    if (!current || sending) return;
    setMessage(null);
    setIndex((value) => value + 1);
  }

  async function connect() {
    if (!current || sending) return;
    setSending(true);
    setMessage(null);
    try {
      await sendFriendshipRequest(current.userId);
      setProfiles((items) => items.filter((item) => item.userId !== current.userId));
      setIndex((value) => Math.min(value, Math.max(0, profiles.length - 2)));
      setMessage(copy.sent);
    } catch {
      setMessage(copy.sendError);
    } finally {
      setSending(false);
    }
  }

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace({ pathname: "/friendship", params: { locale } })}
          style={({ pressed }) => [styles.back, pressed ? styles.pressed : null]}
        >
          <AppIcon name="back" rtl={rtl} size={17} />
          <Text style={[styles.backText, { writingDirection }]}>{copy.home}</Text>
        </Pressable>
      }
    >
      {loading ? (
        <View style={styles.loading}>
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
      ) : featurePending ? (
        <StateCard
          rtl={rtl}
          title={copy.previewTitle}
          body={copy.previewBody}
          actionLabel={copy.retry}
          onAction={() => void load()}
        />
      ) : current ? (
        <View style={styles.page}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { textAlign, writingDirection }]}>
              {copy.today}
            </Text>
            <Text style={styles.progressCount}>{index + 1}/{profiles.length}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardGlowOne} />
            <View style={styles.cardGlowTwo} />
            <View style={[styles.identityRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{current.displayName.trim().charAt(0).toUpperCase()}</Text>
              </View>
              <View style={[styles.identityCopy, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
                <Text style={[styles.name, { textAlign, writingDirection }]}>{current.displayName}</Text>
                <Text style={[styles.city, { textAlign, writingDirection }]}>{current.city}</Text>
              </View>
            </View>

            {current.sharedInterests.length > 0 ? (
              <View style={styles.commonGround}>
                <Text style={[styles.commonTitle, { textAlign, writingDirection }]}>
                  {copy.commonGround(current.sharedInterestCount)}
                </Text>
                <View style={[styles.chips, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                  {current.sharedInterests.slice(0, 4).map((interest) => (
                    <View key={interest} style={styles.sharedChip}>
                      <Text style={[styles.sharedChipText, { writingDirection }]}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <Text style={[styles.about, { textAlign, writingDirection }]}>{current.aboutMe}</Text>

            <View style={[styles.chips, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              {current.interests.slice(0, 6).map((interest) => (
                <View key={interest} style={styles.interestChip}>
                  <Text style={[styles.interestChipText, { writingDirection }]}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.note}>
            <AppIcon name="privacy" active size={17} />
            <Text style={[styles.noteText, { textAlign, writingDirection }]}>{copy.privateNote}</Text>
          </View>

          {message ? (
            <Text accessibilityLiveRegion="polite" style={[styles.message, { textAlign, writingDirection }]}>
              {message}
            </Text>
          ) : null}

          <PrimaryButton loading={sending} onPress={() => void connect()}>
            {copy.connect}
          </PrimaryButton>
          <PrimaryButton tone="quiet" disabled={sending} onPress={next}>
            {copy.next}
          </PrimaryButton>
        </View>
      ) : (
        <StateCard
          rtl={rtl}
          title={copy.emptyTitle}
          body={copy.emptyBody}
          actionLabel={copy.requests}
          onAction={() => router.push({ pathname: "/friendship-requests", params: { locale } })}
        />
      )}
    </ScreenShell>
  );
}

function discoverCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  return {
    eyebrow: ar ? "الأصدقاء · اكتشاف" : "FRIENDS · DISCOVER",
    title: ar ? "اكتشف أشخاصاً من اهتمامات مشتركة" : "Discover people through shared interests",
    body: ar ? "مجموعة محدودة، بدون سحب لا نهائي وبدون خلط مع مساحة الزواج." : "A finite set with no endless swiping and no mixing with Marriage.",
    home: ar ? "الأصدقاء" : "Friends home",
    today: ar ? "اقتراحات اليوم" : "Today’s suggestions",
    commonGround: (count: number) => ar ? `${count} اهتمامات مشتركة` : `${count} shared interests`,
    privateNote: ar ? "طلب الصداقة خاص. لا يفتح محادثة إلا بعد القبول." : "Friend requests stay private. Chat does not open until acceptance.",
    connect: ar ? "إرسال طلب صداقة" : "Send friend request",
    next: ar ? "التالي" : "Next",
    sent: ar ? "تم إرسال طلب الصداقة بشكل خاص." : "Your friend request was sent privately.",
    sendError: ar ? "تعذر إرسال الطلب الآن. حاول مرة أخرى." : "We couldn’t send the request right now. Try again.",
    emptyTitle: ar ? "انتهت اقتراحاتك الحالية" : "You’re caught up for now",
    emptyBody: ar ? "لن نملأ الشاشة بسحب لا نهائي. ارجع لاحقاً أو راجع طلبات الصداقة." : "Mithaq won’t fill the screen with endless swiping. Check back later or review your requests.",
    requests: ar ? "طلبات الصداقة" : "Friend requests",
    previewTitle: ar ? "اكتشاف الأصدقاء جاهز للكود" : "Friends discovery is ready in the app",
    previewBody: ar ? "طبّق ترحيل اكتشاف الأصدقاء على Supabase المرحلي لعرض أشخاص حقيقيين وإرسال طلبات." : "Deploy the Friends discovery migration to hosted staging to show real candidates and send requests.",
    retry: ar ? "التحقق من الاستضافة" : "Check staging again",
    loadErrorTitle: ar ? "تعذر تحميل اكتشاف الأصدقاء" : "We couldn’t load Friends discovery",
    loadErrorBody: ar ? "تحقق من الاتصال ثم حاول مرة أخرى." : "Check your connection and try again.",
  };
}

const styles = StyleSheet.create({
  loading: { minHeight: 360, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 14 },
  progressRow: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressLabel: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 17, fontWeight: "700" },
  progressCount: { color: colors.accent, fontSize: 11, fontWeight: "900" },
  card: { width: "100%", minHeight: 390, justifyContent: "flex-end", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.accentSoft, backgroundColor: colors.accentWash, padding: 20, overflow: "hidden", ...shadows.card },
  cardGlowOne: { position: "absolute", width: 250, height: 250, borderRadius: 125, top: -110, right: -80, backgroundColor: "rgba(4,144,155,0.12)" },
  cardGlowTwo: { position: "absolute", width: 190, height: 190, borderRadius: 95, top: 40, left: -90, backgroundColor: "rgba(208,156,81,0.15)" },
  identityRow: { width: "100%", alignItems: "center", gap: 13, marginBottom: 18 },
  avatar: { width: 78, height: 78, borderRadius: 39, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.accentSoft },
  avatarText: { color: colors.accent, fontSize: 28, lineHeight: 36, fontWeight: "900" },
  identityCopy: { flex: 1 },
  name: { width: "100%", color: colors.foreground, fontSize: 23, lineHeight: 32, fontWeight: "900" },
  city: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 2 },
  commonGround: { width: "100%", borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, padding: 13, marginBottom: 14 },
  commonTitle: { width: "100%", color: colors.primary, fontSize: 12, lineHeight: 19, fontWeight: "800", marginBottom: 8 },
  about: { width: "100%", color: colors.foreground, fontSize: 15, lineHeight: 25, fontWeight: "600", marginBottom: 14 },
  chips: { width: "100%", flexWrap: "wrap", gap: 7 },
  sharedChip: { borderRadius: radius.pill, backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 7 },
  sharedChipText: { color: colors.primaryStrong, fontSize: 10, lineHeight: 15, fontWeight: "800" },
  interestChip: { borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 7 },
  interestChipText: { color: colors.muted, fontSize: 10, lineHeight: 15, fontWeight: "700" },
  note: { width: "100%", flexDirection: "row", alignItems: "center", gap: 9, borderRadius: radius.md, backgroundColor: colors.primaryWash, padding: 12 },
  noteText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 18 },
  message: { width: "100%", color: colors.primary, fontSize: 12, lineHeight: 19, fontWeight: "800" },
  back: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  backText: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.55 },
});
