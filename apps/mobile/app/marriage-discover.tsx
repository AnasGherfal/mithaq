import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  getMarriageDiscoveryPhoto,
  hideMarriageDiscoveryMember,
  isMarriageDiscoveryUnavailable,
  listMarriageDiscovery,
  recordMarriageDiscoveryAction,
  type MarriageDiscoveryAlignmentReason,
  type MarriageDiscoveryPhoto,
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
  const [photo, setPhoto] = useState<MarriageDiscoveryPhoto | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [confirmHide, setConfirmHide] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setFeaturePending(false);
    setMessage(null);
    setConfirmHide(false);
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
      if (__DEV__ && isMarriageDiscoveryUnavailable(error)) setFeaturePending(true);
      else setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = profiles[index] ?? null;

  useEffect(() => {
    let active = true;
    setPhoto(null);
    setConfirmHide(false);

    if (!current?.photoId || current.photoDisplayMode === "hidden") {
      setPhotoLoading(false);
      return () => {
        active = false;
      };
    }

    setPhotoLoading(true);
    void getMarriageDiscoveryPhoto(current.userId, current.photoId)
      .then((result) => {
        if (active) setPhoto(result);
      })
      .finally(() => {
        if (active) setPhotoLoading(false);
      });

    return () => {
      active = false;
    };
  }, [current?.photoDisplayMode, current?.photoId, current?.userId]);

  async function act(action: "noticed" | "skipped") {
    if (!current || acting) return;
    setActing(true);
    setMessage(null);
    setConfirmHide(false);
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

  async function hideCurrent() {
    if (!current || acting) return;
    setActing(true);
    setMessage(null);
    try {
      await hideMarriageDiscoveryMember(current.userId);
      setConfirmHide(false);
      setMessage(copy.hiddenSaved);
      setIndex((value) => value + 1);
    } catch {
      setMessage(copy.hideError);
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
        <PrimaryButton
          tone="quiet"
          onPress={() => router.push({ pathname: "/marriage-priorities", params: { locale } })}
        >
          {copy.priorities}
        </PrimaryButton>
      }
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
              {photo?.uri ? (
                <Image source={{ uri: photo.uri }} resizeMode="cover" style={styles.portraitImage} />
              ) : (
                <Text style={styles.initial}>{current.displayName.trim().charAt(0).toUpperCase()}</Text>
              )}

              {photoLoading ? (
                <View style={styles.photoLoading}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null}

              <View style={[styles.spaceBadge, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                <View style={styles.spaceDot} />
                <Text style={[styles.spaceBadgeText, { writingDirection }]}>{copy.marriageOnly}</Text>
              </View>

              {current.photoDisplayMode !== "full" ? (
                <View style={[styles.photoPrivacyBadge, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                  <View style={styles.photoPrivacyDot} />
                  <Text style={[styles.photoPrivacyText, { writingDirection }]}>
                    {current.photoDisplayMode === "blurred" ? copy.blurredPhoto : copy.privatePhoto}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={[styles.identity, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
              <Text style={[styles.name, { textAlign, writingDirection }]}>{current.displayName}</Text>
              <Text style={[styles.location, { textAlign, writingDirection }]}>
                {[current.ageBandLabel, current.city, current.originRegion].filter(Boolean).join(" · ")}
              </Text>
            </View>

            <Text style={[styles.about, { textAlign, writingDirection }]}>{current.aboutMe}</Text>

            <View style={styles.details}>
              <Detail label={copy.age} value={current.ageBandLabel} rtl={rtl} />
              {current.occupation ? <Detail label={copy.occupation} value={current.occupation} rtl={rtl} /> : null}
              {current.education ? <Detail label={copy.education} value={current.education} rtl={rtl} /> : null}
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

          {confirmHide ? (
            <View style={styles.hideConfirmCard}>
              <Text style={[styles.hideConfirmTitle, { textAlign, writingDirection }]}>{copy.hideConfirmTitle}</Text>
              <Text style={[styles.hideConfirmBody, { textAlign, writingDirection }]}>{copy.hideConfirmBody}</Text>
              <View style={styles.hideConfirmActions}>
                <PrimaryButton disabled={acting} onPress={() => void hideCurrent()}>{copy.hideConfirmButton}</PrimaryButton>
                <PrimaryButton tone="quiet" disabled={acting} onPress={() => setConfirmHide(false)}>{copy.cancel}</PrimaryButton>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={acting}
              onPress={() => setConfirmHide(true)}
              style={({ pressed }) => [styles.hideLink, pressed ? styles.pressed : null]}
            >
              <Text style={[styles.hideLinkText, { textAlign, writingDirection }]}>{copy.hideLink}</Text>
              <Text style={[styles.hideLinkBody, { textAlign, writingDirection }]}>{copy.hideLinkBody}</Text>
            </Pressable>
          )}

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
      <Text
        style={[styles.detailValue, { textAlign: rtl ? "left" : "right", writingDirection: rtl ? "rtl" : "ltr" }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
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
    title: ar ? "أشخاص يستحقون نظرة هادئة" : "People worth a closer look",
    body: ar
      ? "مجموعة صغيرة ومحدودة، مرتبة حسب حدودك وما قد يتوافق مع حياتك — من دون سحب أو درجات وهمية."
      : "A small finite set ordered around your boundaries and meaningful life fit — without swiping or fake scores.",
    today: ar ? "متبقٍ اليوم" : "People left today",
    marriageOnly: ar ? "مساحة الزواج" : "Marriage space",
    age: ar ? "العمر" : "Age",
    occupation: ar ? "العمل" : "Work",
    education: ar ? "التعليم" : "Education",
    maritalStatus: ar ? "الحالة الاجتماعية" : "Marital status",
    children: ar ? "أطفال" : "Children",
    yes: ar ? "نعم" : "Yes",
    no: ar ? "لا" : "No",
    marital: (value: string) => statusLabels[value] ?? value.replaceAll("_", " "),
    privatePhoto: ar ? "الصورة خاصة حالياً" : "Photo kept private",
    blurredPhoto: ar ? "معاينة ضبابية باختيار صاحب الملف" : "Blurred by this member’s choice",
    whyTitle: ar ? "لماذا أظهر لك ميثاق هذا الشخص؟" : "Why Mithaq showed you this person",
    whyBody: ar
      ? "هناك نقاط توافق عملية بين اختياراتكما. نعرض الفئات فقط، لا إجابات الشخص الخاصة."
      : "Some practical areas align between you. We show the categories, not this person’s private answers.",
    whyFallback: ar
      ? "هذا الشخص يطابق حدودك الأساسية الحالية. أضف أولويات الزواج لتخصيص الترتيب أكثر."
      : "This person meets your current essential boundaries. Add Marriage priorities to personalize ordering further.",
    reason: (value: MarriageDiscoveryAlignmentReason) => reasonLabels[value],
    noScore: ar ? "هذه ليست نسبة توافق أو ضماناً لنجاح العلاقة." : "This is not a compatibility percentage or a promise of relationship success.",
    privateNote: ar
      ? "اختيار «لفت انتباهي» خاص تماماً. لا يعرف الشخص أنك اخترته ولا يصله إشعار."
      : "“Caught my attention” stays private. This person is not told and receives no notification.",
    notice: ar ? "لفت انتباهي" : "Caught my attention",
    next: ar ? "التالي" : "Next",
    noticedSaved: ar ? "حفظنا اهتمامك بشكل خاص." : "Your interest was saved privately.",
    actionError: ar ? "تعذر حفظ اختيارك الآن. حاول مرة أخرى." : "We couldn’t save that choice. Try again.",
    hideLink: ar ? "أعرف هذا الشخص أو لا أريد أن نرى بعضنا" : "I know this person or don’t want us shown to each other",
    hideLinkBody: ar ? "إخفاء متبادل خاص — لن يعرف الشخص أنك فعلت ذلك." : "Private reciprocal hide — this person will not be notified.",
    hideConfirmTitle: ar ? "إخفاء بعضكما عن بعض؟" : "Hide each other on Mithaq?",
    hideConfirmBody: ar ? "لن تظهرا لبعضكما في اكتشاف الزواج مستقبلاً. لا نرسل أي إشعار ولا نكشف سبب الإخفاء." : "You will stop appearing to each other in Marriage Discover. We send no notification and never reveal why.",
    hideConfirmButton: ar ? "نعم، لا تظهرنا لبعض" : "Yes, don’t show us to each other",
    cancel: ar ? "إلغاء" : "Cancel",
    hiddenSaved: ar ? "تم الإخفاء بشكل خاص. لن نظهركما لبعض في الاكتشاف." : "Hidden privately. You won’t be shown to each other in Discover.",
    hideError: ar ? "تعذر حفظ الإخفاء الآن. حاول مرة أخرى." : "We couldn’t save that privacy choice. Try again.",
    viewIntroductions: ar ? "عرض التعارف الحالي" : "View current introductions",
    priorities: ar ? "مراجعة أولويات الزواج" : "Review Marriage priorities",
    doneTitle: ar ? "انتهت مجموعة اليوم" : "You’ve seen today’s set",
    doneBody: ar
      ? "لا يوجد تمرير لا نهائي هنا. عد لاحقاً لمجموعة صغيرة جديدة أو راجع التعارف الحالي."
      : "There is no endless feed here. Come back for another small set or review your current introductions.",
    introductions: ar ? "التعارف" : "Introductions",
    previewTitle: ar ? "الاكتشاف غير متاح في هذه المعاينة بعد" : "Discover isn’t available in this preview yet",
    previewBody: ar
      ? "يمكنك الآن مراجعة ملفك وأولويات الزواج، وسيظهر الأشخاص هنا عندما يصبح الاكتشاف متاحاً لحسابك."
      : "You can still review your profile and Marriage priorities. People will appear here when discovery becomes available for your account.",
    loadErrorTitle: ar ? "تعذر تحميل اكتشاف الزواج" : "We couldn’t load Marriage Discover",
    loadErrorBody: ar ? "تحقق من الاتصال ثم حاول مرة أخرى." : "Check your connection and try again.",
    retry: ar ? "إعادة المحاولة" : "Try again",
  };
}

const styles = StyleSheet.create({
  loading: { minHeight: 380, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 14 },
  counterRow: {
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.pill,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  counterLabel: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  counterValue: { color: colors.primaryStrong, fontSize: 16, fontWeight: "900" },
  card: {
    width: "100%",
    gap: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadows.card,
  },
  portrait: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryWash,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  portraitImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  initial: { color: colors.primary, fontSize: 72, fontWeight: "900" },
  photoLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    opacity: 0.8,
  },
  spaceBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  spaceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  spaceBadgeText: { color: colors.primary, fontSize: 9, fontWeight: "900" },
  photoPrivacyBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  photoPrivacyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  photoPrivacyText: { color: colors.foreground, fontSize: 9, fontWeight: "800" },
  identity: { width: "100%" },
  name: { width: "100%", color: colors.foreground, fontSize: 26, lineHeight: 33, fontWeight: "900" },
  location: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 4 },
  about: { width: "100%", color: colors.foreground, fontSize: 14, lineHeight: 24 },
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
  privacyNote: {
    width: "100%",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: 11,
  },
  privacyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  privacyText: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 17 },
  actions: { width: "100%", gap: 9 },
  hideLink: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 12, gap: 4 },
  hideLinkText: { color: colors.foreground, fontSize: 11, lineHeight: 18, fontWeight: "800" },
  hideLinkBody: { color: colors.muted, fontSize: 9, lineHeight: 15 },
  hideConfirmCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.goldSoft, backgroundColor: colors.goldSoft, padding: 14, gap: 7 },
  hideConfirmTitle: { color: colors.foreground, fontSize: 13, lineHeight: 21, fontWeight: "900" },
  hideConfirmBody: { color: colors.muted, fontSize: 10, lineHeight: 17 },
  hideConfirmActions: { gap: 8, marginTop: 4 },
  message: { width: "100%", color: colors.primary, fontSize: 11, lineHeight: 18, fontWeight: "800" },
  secondaryLink: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  secondaryLinkText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.55 },
});
