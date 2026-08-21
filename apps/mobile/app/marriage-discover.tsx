import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  isMarriageDiscoveryUnavailable,
  listMarriageDiscovery,
  recordMarriageDiscoveryAction,
  type MarriageDiscoveryProfile,
} from "@/lib/marriage-discovery";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

export default function MarriageDiscoverScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => marriageCopy(locale), [locale]);
  const writingDirection = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [featurePending, setFeaturePending] = useState(false);
  const [profiles, setProfiles] = useState<MarriageDiscoveryProfile[]>([]);
  const [index, setIndex] = useState(0);
  const [acting, setActing] = useState(false);
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
      setProfiles(await listMarriageDiscovery(6));
      setIndex(0);
    } catch (error) {
      if (__DEV__ && isMarriageDiscoveryUnavailable(error)) {
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

  const current = profiles[index] ?? null;

  async function act(action: "noticed" | "skipped") {
    if (!current || acting) return;
    setActing(true);
    setMessage(null);
    try {
      await recordMarriageDiscoveryAction(current.userId, action);
      setMessage(action === "noticed" ? copy.noticedSaved : null);
      setIndex((value) => value + 1);
    } catch {
      setMessage(copy.actionError);
    } finally {
      setActing(false);
    }
  }

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
    >
      {loading ? (
        <View style={styles.loading}>
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
            <Text style={[styles.counterLabel, { writingDirection }]}>{copy.today}</Text>
            <Text style={[styles.counterValue, { writingDirection }]}>{profiles.length - index}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.portrait}>
              <Text style={styles.initial}>{current.displayName.trim().charAt(0).toUpperCase()}</Text>
              <View style={[styles.spaceBadge, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                <View style={styles.spaceDot} />
                <Text style={[styles.spaceBadgeText, { writingDirection }]}>{copy.marriageOnly}</Text>
              </View>
            </View>

            <View style={[styles.identity, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
              <Text style={[styles.name, { textAlign, writingDirection }]}>{current.displayName}</Text>
              <Text style={[styles.location, { textAlign, writingDirection }]}>
                {[current.city, current.originRegion].filter(Boolean).join(" · ")}
              </Text>
            </View>

            <Text style={[styles.about, { textAlign, writingDirection }]}>{current.aboutMe}</Text>

            <View style={styles.details}>
              {current.occupation ? <Detail label={copy.occupation} value={current.occupation} rtl={rtl} /> : null}
              {current.education ? <Detail label={copy.education} value={current.education} rtl={rtl} /> : null}
              <Detail label={copy.maritalStatus} value={copy.marital(current.maritalStatus)} rtl={rtl} />
              <Detail label={copy.children} value={current.hasChildren ? copy.yes : copy.no} rtl={rtl} />
            </View>

            <View style={[styles.privacyNote, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <View style={styles.privacyDot} />
              <Text style={[styles.privacyText, { textAlign, writingDirection }]}>{copy.privateNote}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton loading={acting} onPress={() => void act("noticed")}>
              {copy.notice}
            </PrimaryButton>
            <PrimaryButton tone="quiet" disabled={acting} onPress={() => void act("skipped")}>
              {copy.next}
            </PrimaryButton>
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

function Detail({ label, value, rtl }: { label: string; value: string; rtl: boolean }) {
  return (
    <View style={[styles.detailRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <Text style={[styles.detailLabel, { writingDirection: rtl ? "rtl" : "ltr" }]}>{label}</Text>
      <Text style={[styles.detailValue, { writingDirection: rtl ? "rtl" : "ltr" }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function marriageCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  return {
    eyebrow: ar ? "الزواج · اكتشاف" : "MARRIAGE · DISCOVER",
    title: ar ? "أشخاص يستحقون نظرة هادئة" : "People worth a closer look",
    body: ar ? "مجموعة صغيرة ومحدودة مبنية على أهلية وتوافق أساسي في مساحة الزواج فقط." : "A small finite set based on Marriage eligibility and foundational compatibility only.",
    today: ar ? "متبقٍ اليوم" : "People left today",
    marriageOnly: ar ? "مساحة الزواج" : "Marriage space",
    occupation: ar ? "العمل" : "Work",
    education: ar ? "التعليم" : "Education",
    maritalStatus: ar ? "الحالة الاجتماعية" : "Marital status",
    children: ar ? "أطفال" : "Children",
    yes: ar ? "نعم" : "Yes",
    no: ar ? "لا" : "No",
    marital: (value: string) => ar ? ({ single: "أعزب/عزباء", divorced: "مطلق/مطلقة", widowed: "أرمل/أرملة" }[value] ?? value) : value.replaceAll("_", " "),
    privateNote: ar ? "اختيار «لفت انتباهي» خاص تماماً ولا يرسل إشعاراً لهذا الشخص." : "“Caught my attention” is private. It does not notify this person.",
    notice: ar ? "لفت انتباهي" : "Caught my attention",
    next: ar ? "التالي" : "Next",
    noticedSaved: ar ? "حفظنا اهتمامك بشكل خاص." : "Your interest was saved privately.",
    actionError: ar ? "تعذر حفظ اختيارك الآن. حاول مرة أخرى." : "We couldn’t save that choice. Try again.",
    viewIntroductions: ar ? "عرض التعارف الحالي" : "View current introductions",
    doneTitle: ar ? "انتهت مجموعة اليوم" : "You’ve seen today’s set",
    doneBody: ar ? "لا يوجد تمرير لا نهائي هنا. عد لاحقاً لمجموعة صغيرة جديدة أو راجع التعارف الحالي." : "There is no endless feed here. Come back for another small set or review your current introductions.",
    introductions: ar ? "التعارف" : "Introductions",
    previewTitle: ar ? "اكتشاف الزواج بانتظار ترحيل الاستضافة" : "Marriage Discover needs the staging migration",
    previewBody: ar ? "طبّق ترحيل Marriage Discover على Supabase المرحلي لتفعيل الاكتشاف الحقيقي." : "Deploy the Marriage Discover migration to hosted staging to activate real discovery.",
    loadErrorTitle: ar ? "تعذر تحميل اكتشاف الزواج" : "We couldn’t load Marriage Discover",
    loadErrorBody: ar ? "تحقق من الاتصال ثم حاول مرة أخرى." : "Check your connection and try again.",
    retry: ar ? "إعادة المحاولة" : "Try again",
  };
}

const styles = StyleSheet.create({
  loading: { minHeight: 380, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 14 },
  counterRow: { alignItems: "center", justifyContent: "space-between", borderRadius: radius.pill, backgroundColor: colors.primaryWash, paddingHorizontal: 14, paddingVertical: 9 },
  counterLabel: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  counterValue: { color: colors.primaryStrong, fontSize: 16, fontWeight: "900" },
  card: { width: "100%", gap: 16, borderRadius: radius.xl, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: 16, ...shadows.card },
  portrait: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.primaryWash, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  initial: { color: colors.primary, fontSize: 68, fontWeight: "900" },
  spaceBadge: { position: "absolute", top: 12, right: 12, alignItems: "center", gap: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, paddingHorizontal: 10, paddingVertical: 7 },
  spaceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  spaceBadgeText: { color: colors.primary, fontSize: 9, fontWeight: "900" },
  identity: { width: "100%" },
  name: { width: "100%", color: colors.foreground, fontSize: 24, lineHeight: 31, fontWeight: "900" },
  location: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 3 },
  about: { width: "100%", color: colors.foreground, fontSize: 14, lineHeight: 24 },
  details: { width: "100%", borderTopWidth: 1, borderTopColor: colors.border },
  detailRow: { width: "100%", justifyContent: "space-between", gap: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", flex: 1 },
  detailValue: { color: colors.foreground, fontSize: 11, fontWeight: "800", flex: 1, textAlign: "right" },
  privacyNote: { width: "100%", alignItems: "flex-start", gap: 8, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, padding: 11 },
  privacyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  privacyText: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 17 },
  actions: { width: "100%", gap: 9 },
  message: { width: "100%", color: colors.primary, fontSize: 11, lineHeight: 18, fontWeight: "800" },
  secondaryLink: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  secondaryLinkText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.55 },
});
