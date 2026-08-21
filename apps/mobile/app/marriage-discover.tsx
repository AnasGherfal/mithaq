import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import { TrustBadges } from "@/components/trust-badges";
import type { MobileLocale } from "@/i18n";
import {
  isMarriageDiscoveryProfilePending,
  isMarriageDiscoveryUnavailable,
  listMarriageDiscovery,
  recordMarriageDiscoveryAction,
  type MarriageDiscoveryAlignmentReason,
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
  const [profilePending, setProfilePending] = useState(false);
  const [profiles, setProfiles] = useState<MarriageDiscoveryProfile[]>([]);
  const [index, setIndex] = useState(0);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
  const hasVerifiedTrust = Boolean(
    current &&
      (current.realPersonVerified || current.age18PlusVerified || current.identityVerified),
  );

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
            <Text style={[styles.counterLabel, { writingDirection }]}>{copy.today}</Text>
            <Text style={[styles.counterValue, { writingDirection }]}>{profiles.length - index}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.anonymousHero}>
              <View style={styles.anonymousIcon}>
                <AppIcon name="privacy" active size={26} />
              </View>
              <Text style={[styles.anonymousTitle, { textAlign, writingDirection }]}>{copy.anonymousTitle}</Text>
              <Text style={[styles.anonymousBody, { textAlign, writingDirection }]}>{copy.anonymousBody}</Text>
            </View>

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
      <Text style={[styles.detailValue, { textAlign: rtl ? "left" : "right", writingDirection: rtl ? "rtl" : "ltr" }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function marriageCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  const statusLabels: Record<string, string> = ar
    ? { never_married: "لم يسبق له/لها الزواج", married: "متزوج/متزوجة", divorced: "مطلق/مطلقة", widowed: "أرمل/أرملة" }
    : { never_married: "Never married", married: "Married", divorced: "Divorced", widowed: "Widowed" };
  const reasonLabels: Record<MarriageDiscoveryAlignmentReason, string> = ar
    ? { same_city: "نفس المدينة", living_arrangement: "توقعات السكن", children_plan: "نظرة متقاربة للأطفال", work_after_marriage: "توقعات العمل", wedding_style: "توقعات حفل الزواج" }
    : { same_city: "Same city", living_arrangement: "Living expectations", children_plan: "Similar view on children", work_after_marriage: "Work expectations", wedding_style: "Wedding expectations" };

  return {
    eyebrow: ar ? "الزواج · اكتشاف" : "MARRIAGE · DISCOVER",
    title: ar ? "توافق أولاً، والهوية لاحقاً" : "Fit first, identity later",
    body: ar ? "في البداية لا ترى اسماً أو صورة. قرر بناءً على التوافق العام، ثم يُكشف المزيد فقط داخل تعارف خاص ومتحكم به." : "At first you see no name or photo. Decide from broad fit, and reveal more only inside a controlled private introduction.",
    today: ar ? "متبقٍ اليوم" : "Profiles left today",
    anonymousTitle: ar ? "ملف زواج مجهول" : "Anonymous Marriage profile",
    anonymousBody: ar ? "الاسم والصورة والعمل والتعليم مخفية في هذه المرحلة لحماية الطرفين من الظهور غير المرغوب." : "Name, photo, work, and education stay hidden at this stage so neither person is exposed unexpectedly.",
    trustTitle: ar ? "موثّق من ميثاق" : "Verified by Mithaq",
    trustBody: ar ? "هذه العلامات تخص فقط ما تحقّق منه ميثاق فعلياً. بقية معلومات الملف يصرّح بها العضو بنفسه." : "These badges cover only facts Mithaq actually verified. Other profile answers remain member-declared.",
    reviewTitle: ar ? "ملفك قيد المراجعة" : "Your profile is being reviewed",
    reviewBody: ar ? "اكتمال الملف لا يعني ظهوره مباشرة. سنفتح الاكتشاف عندما تصبح مراجعة ملفك جاهزة، ولا تحتاج إلى إعادة إدخال بياناتك." : "Completing your profile does not publish it immediately. Discover opens when your profile review is ready; you do not need to re-enter your information.",
    reviewProfile: ar ? "مراجعة ملفي" : "Review my profile",
    age: ar ? "العمر" : "Age",
    city: ar ? "المدينة" : "City",
    notShared: ar ? "غير محدد" : "Not specified",
    maritalStatus: ar ? "الحالة الاجتماعية" : "Marital status",
    children: ar ? "أطفال" : "Children",
    yes: ar ? "نعم" : "Yes",
    no: ar ? "لا" : "No",
    marital: (value: string) => statusLabels[value] ?? value.replaceAll("_", " "),
    whyTitle: ar ? "لماذا أظهر لك ميثاق هذا الملف؟" : "Why Mithaq showed you this profile",
    whyBody: ar ? "هناك نقاط توافق عملية بين اختياراتكما. نعرض الفئات فقط، لا إجابات الشخص الخاصة." : "Some practical areas align between you. Mithaq shows the categories, not the other person’s private answers.",
    whyFallback: ar ? "هذا الملف يطابق حدودك الأساسية الحالية. أضف أولويات الزواج لتخصيص الترتيب أكثر." : "This profile meets your current essential boundaries. Add Marriage priorities to personalize ordering further.",
    reason: (value: MarriageDiscoveryAlignmentReason) => reasonLabels[value],
    noScore: ar ? "هذه ليست نسبة توافق أو ضماناً لنجاح العلاقة." : "This is not a compatibility percentage or a promise of relationship success.",
    privateNote: ar ? "اختيار «لفت انتباهي» خاص تماماً. لا يعرف الطرف الآخر أنك اخترته ولا يصله إشعار." : "“Caught my attention” stays private. The other person is not told and receives no notification.",
    notice: ar ? "لفت انتباهي" : "Caught my attention",
    next: ar ? "التالي" : "Next",
    noticedSaved: ar ? "حفظنا اهتمامك بشكل خاص." : "Your interest was saved privately.",
    actionError: ar ? "تعذر حفظ اختيارك الآن. حاول مرة أخرى." : "We couldn’t save that choice. Try again.",
    viewIntroductions: ar ? "عرض التعارف الحالي" : "View current introductions",
    priorities: ar ? "أولويات الزواج" : "Marriage priorities",
    privacy: ar ? "درع العائلة والخصوصية" : "Family Shield & privacy",
    doneTitle: ar ? "لا توجد ملفات أخرى الآن" : "No more profiles right now",
    doneBody: ar ? "لا يوجد تمرير لا نهائي هنا. عندما تتوفر ملفات مناسبة جديدة ستظهر في مجموعة صغيرة، ويمكنك في الوقت الحالي مراجعة التعارف الحالي." : "There is no endless feed here. New suitable profiles will appear in a small set when available; for now you can review any current introductions.",
    introductions: ar ? "التعارف" : "Introductions",
    previewTitle: ar ? "الاكتشاف غير متاح في هذه المعاينة بعد" : "Discover isn’t available in this preview yet",
    previewBody: ar ? "يمكنك الآن مراجعة ملفك وأولويات الزواج، وسيظهر الاكتشاف عندما يصبح متاحاً لحسابك." : "You can still review your profile and Marriage priorities. Discover will appear when it is available for your account.",
    loadErrorTitle: ar ? "تعذر تحميل اكتشاف الزواج" : "We couldn’t load Marriage Discover",
    loadErrorBody: ar ? "تحقق من الاتصال ثم حاول مرة أخرى." : "Check your connection and try again.",
    retry: ar ? "إعادة المحاولة" : "Try again",
  };
}

const styles = StyleSheet.create({
  loading: { minHeight: 380, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 14 },
  footerActions: { width: "100%", gap: 8 },
  counterRow: { alignItems: "center", justifyContent: "space-between", borderRadius: radius.pill, backgroundColor: colors.primaryWash, paddingHorizontal: 14, paddingVertical: 9 },
  counterLabel: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  counterValue: { color: colors.primaryStrong, fontSize: 16, fontWeight: "900" },
  card: { width: "100%", gap: 16, borderRadius: radius.xl, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: 16, ...shadows.card },
  anonymousHero: { width: "100%", alignItems: "center", borderRadius: radius.lg, backgroundColor: colors.primaryWash, paddingHorizontal: 18, paddingVertical: 28 },
  anonymousIcon: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised, marginBottom: 12 },
  anonymousTitle: { width: "100%", color: colors.primaryStrong, fontSize: 20, lineHeight: 28, fontWeight: "900" },
  anonymousBody: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 7 },
  trustCard: { width: "100%", gap: 8, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.surfaceRaised, padding: 13 },
  trustTitle: { width: "100%", color: colors.primaryStrong, fontSize: 12, lineHeight: 19, fontWeight: "900" },
  trustBody: { width: "100%", color: colors.muted, fontSize: 9, lineHeight: 15 },
  details: { width: "100%", borderTopWidth: 1, borderTopColor: colors.border },
  detailRow: { width: "100%", justifyContent: "space-between", gap: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", flex: 1 },
  detailValue: { color: colors.foreground, fontSize: 11, fontWeight: "800", flex: 1.25 },
  whyCard: { width: "100%", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.primaryWash, padding: 14, gap: 8 },
  whyTitle: { width: "100%", color: colors.primaryStrong, fontSize: 14, lineHeight: 22, fontWeight: "900" },
  whyBody: { width: "100%", color: colors.foreground, fontSize: 11, lineHeight: 19 },
  reasonWrap: { width: "100%", gap: 7, flexWrap: "wrap" },
  reasonChip: { borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, paddingHorizontal: 10, paddingVertical: 7 },
  reasonText: { color: colors.primary, fontSize: 9, lineHeight: 13, fontWeight: "800" },
  noScore: { width: "100%", color: colors.muted, fontSize: 9, lineHeight: 15 },
  privacyNote: { width: "100%", alignItems: "flex-start", gap: 8, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, padding: 11 },
  privacyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  privacyText: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 17 },
  actions: { width: "100%", gap: 9 },
  message: { width: "100%", color: colors.primary, fontSize: 11, lineHeight: 18, fontWeight: "800" },
  secondaryLink: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  secondaryLinkText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.55 },
});