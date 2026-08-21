import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import { TrustBadges } from "@/components/trust-badges";
import type { MobileLocale } from "@/i18n";
import {
  getMyIntroductionRevealState,
  revealMyIntroductionPhoto,
  type IntroductionRevealState,
} from "@/lib/introduction-reveal";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

type IntroductionRow = {
  introduction_id: string;
  status: "offered" | "mutually_accepted" | "declined" | "expired" | "cancelled" | "closed";
};

type PreviewRow = {
  display_name: string | null;
  real_person_verified: boolean | null;
  age_18_plus_verified: boolean | null;
  identity_verified: boolean | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function IntroductionHandoffScreen() {
  const params = useLocalSearchParams<{ locale?: string; introductionId?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const introductionId = params.introductionId ?? "";
  const validIntroduction = uuidPattern.test(introductionId);
  const copy = useMemo(() => handoffCopy(locale), [locale]);
  const [loading, setLoading] = useState(validIntroduction);
  const [loadError, setLoadError] = useState(false);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState<PreviewRow | null>(null);
  const [revealState, setRevealState] = useState<IntroductionRevealState | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [revealMessage, setRevealMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!validIntroduction) return;

    setLoading(true);
    setLoadError(false);
    setRevealMessage(null);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    if (!sessionData.session) {
      router.replace({ pathname: "/auth", params: { locale } });
      return;
    }

    const { data: introductionData, error: introductionError } = await supabase.rpc("list_my_introductions");
    if (introductionError) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    const introduction = ((introductionData ?? []) as IntroductionRow[]).find(
      (item) => item.introduction_id === introductionId,
    );
    if (!introduction || introduction.status !== "mutually_accepted") {
      setReady(false);
      setLoading(false);
      return;
    }

    try {
      const [previewResult, nextRevealState] = await Promise.all([
        supabase.rpc("get_introduction_preview", { p_introduction_id: introductionId }),
        getMyIntroductionRevealState(introductionId),
      ]);
      if (previewResult.error) throw previewResult.error;

      const nextPreview = ((Array.isArray(previewResult.data) ? previewResult.data[0] : previewResult.data) ?? null) as PreviewRow | null;
      setPreview(nextPreview);
      setRevealState(nextRevealState);
      setReady(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [introductionId, locale, validIntroduction]);

  useEffect(() => {
    void load();
  }, [load]);

  async function revealPhoto() {
    if (!revealState?.canRevealPhoto || revealLoading) return;
    if (!confirmReveal) {
      setConfirmReveal(true);
      setRevealMessage(null);
      return;
    }

    setRevealLoading(true);
    setRevealMessage(null);
    try {
      await revealMyIntroductionPhoto(introductionId);
      setRevealState(await getMyIntroductionRevealState(introductionId));
      setConfirmReveal(false);
      setRevealMessage(copy.photoShared);
    } catch {
      setRevealMessage(copy.photoShareError);
    } finally {
      setRevealLoading(false);
    }
  }

  if (!validIntroduction) {
    return (
      <ScreenShell eyebrow={copy.eyebrow} title={copy.title} body={copy.body} rtl={rtl}>
        <StateCard rtl={rtl} tone="error" title={copy.unavailableTitle} body={copy.unavailableBody} />
        <View style={styles.action}>
          <PrimaryButton
            tone="quiet"
            onPress={() => router.replace({ pathname: "/introductions", params: { locale } })}
          >
            {copy.back}
          </PrimaryButton>
        </View>
      </ScreenShell>
    );
  }

  const hasVerifiedTrust = Boolean(
    preview?.real_person_verified || preview?.age_18_plus_verified || preview?.identity_verified,
  );

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={
        <PrimaryButton tone="quiet" onPress={() => router.replace({ pathname: "/introductions", params: { locale } })}>
          {copy.back}
        </PrimaryButton>
      }
    >
      {loading ? (
        <View style={styles.loadingState} accessibilityLabel={copy.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loadError ? (
        <StateCard
          rtl={rtl}
          tone="error"
          title={copy.errorTitle}
          body={copy.errorBody}
          actionLabel={copy.retry}
          onAction={() => void load()}
        />
      ) : !ready ? (
        <StateCard rtl={rtl} tone="neutral" title={copy.unavailableTitle} body={copy.unavailableBody} />
      ) : (
        <View style={styles.stack}>
          <View style={styles.mutualCard}>
            <View style={styles.mutualMark}>
              <Text style={styles.mutualMarkText}>✓</Text>
            </View>
            <Text style={[styles.mutualTitle, { textAlign: rtl ? "right" : "left" }]}>
              {preview?.display_name ? copy.mutualWithName(preview.display_name) : copy.mutual}
            </Text>
            <Text style={[styles.mutualBody, { textAlign: rtl ? "right" : "left" }]}>{copy.mutualBody}</Text>
          </View>

          {hasVerifiedTrust ? (
            <View style={styles.trustCard}>
              <Text style={[styles.trustTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.trustTitle}</Text>
              <TrustBadges
                locale={locale}
                realPersonVerified={Boolean(preview?.real_person_verified)}
                age18PlusVerified={Boolean(preview?.age_18_plus_verified)}
                identityVerified={Boolean(preview?.identity_verified)}
              />
              <Text style={[styles.trustBody, { textAlign: rtl ? "right" : "left" }]}>{copy.trustBody}</Text>
            </View>
          ) : null}

          {revealState ? (
            <View style={styles.revealCard}>
              <Text style={[styles.revealTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.photoTitle}</Text>
              <Text style={[styles.revealBody, { textAlign: rtl ? "right" : "left" }]}>
                {photoStateBody(revealState, copy)}
              </Text>

              {revealState.canRevealPhoto ? (
                <View style={styles.revealActions}>
                  {confirmReveal ? (
                    <Text style={[styles.confirmText, { textAlign: rtl ? "right" : "left" }]}>{copy.photoConfirm}</Text>
                  ) : null}
                  <PrimaryButton loading={revealLoading} onPress={() => void revealPhoto()}>
                    {confirmReveal ? copy.photoConfirmButton : copy.photoShareButton}
                  </PrimaryButton>
                  {confirmReveal ? (
                    <PrimaryButton tone="quiet" disabled={revealLoading} onPress={() => setConfirmReveal(false)}>
                      {copy.cancel}
                    </PrimaryButton>
                  ) : null}
                </View>
              ) : null}

              {revealMessage ? (
                <Text accessibilityLiveRegion="polite" style={[styles.revealMessage, { textAlign: rtl ? "right" : "left" }]}>
                  {revealMessage}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.ruleCard}>
            <Text style={[styles.ruleEyebrow, { textAlign: rtl ? "right" : "left" }]}>{copy.nextEyebrow}</Text>
            <Text style={[styles.ruleTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.nextTitle}</Text>
            <Text style={[styles.ruleBody, { textAlign: rtl ? "right" : "left" }]}>{copy.nextBody}</Text>
          </View>

          <View style={styles.boundaryCard}>
            <Boundary rtl={rtl} mark="1" title={copy.boundaryOneTitle} body={copy.boundaryOneBody} />
            <View style={styles.divider} />
            <Boundary rtl={rtl} mark="2" title={copy.boundaryTwoTitle} body={copy.boundaryTwoBody} />
            <View style={styles.divider} />
            <Boundary rtl={rtl} mark="3" title={copy.boundaryThreeTitle} body={copy.boundaryThreeBody} />
          </View>

          <View style={styles.safetyCard}>
            <Text style={[styles.safetyTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.safetyTitle}</Text>
            <Text style={[styles.safetyBody, { textAlign: rtl ? "right" : "left" }]}>{copy.safetyBody}</Text>
            <PrimaryButton
              tone="quiet"
              onPress={() =>
                router.push({
                  pathname: "/introduction-safety",
                  params: { locale, introductionId },
                })
              }
            >
              {copy.safetyButton}
            </PrimaryButton>
          </View>

          <View style={styles.communicationActions}>
            <StateCard rtl={rtl} tone="success" title={copy.communicationTitle} body={copy.communicationBody} />
            <PrimaryButton
              onPress={() =>
                router.push({
                  pathname: "/conversation",
                  params: { locale, introductionId },
                })
              }
            >
              {copy.communicationButton}
            </PrimaryButton>
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

function photoStateBody(state: IntroductionRevealState, copy: ReturnType<typeof handoffCopy>) {
  if (state.photoRevealed) return copy.photoAlreadyShared;
  if (state.canRevealPhoto) return copy.photoReadyToShare;
  if (!state.approvedPhotoAvailable) return copy.photoNotRequired;
  if (state.photoPreference === "after_family_involvement") return copy.photoAfterFamily;
  if (state.photoPreference === "none") return copy.photoStaysPrivate;
  return copy.photoFollowsSetting;
}

function Boundary({ rtl, mark, title, body }: { rtl: boolean; mark: string; title: string; body: string }) {
  return (
    <View style={[styles.boundaryRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <View style={styles.boundaryMark}>
        <Text style={styles.boundaryMarkText}>{mark}</Text>
      </View>
      <View style={styles.boundaryCopy}>
        <Text style={[styles.boundaryTitle, { textAlign: rtl ? "right" : "left" }]}>{title}</Text>
        <Text style={[styles.boundaryBody, { textAlign: rtl ? "right" : "left" }]}>{body}</Text>
      </View>
    </View>
  );
}

function handoffCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "قبول متبادل",
      title: "الخطوة التالية تبدأ من هنا",
      body: "هذا الانتقال لا يفتح دليلاً عاماً ولا يكشف بيانات اتصال. هو امتداد خاص لنفس التعارف الذي وافقتما عليه.",
      loading: "جارٍ التحقق من التعارف",
      errorTitle: "تعذر التحقق من التعارف",
      errorBody: "لم يتم فتح أي تواصل أو تغيير أي قرار. تحقق من اتصالك وحاول مرة أخرى.",
      retry: "إعادة المحاولة",
      unavailableTitle: "الانتقال غير متاح",
      unavailableBody: "تتوفر هذه الخطوة فقط بعد قبول التعارف من الطرفين وبقاء التعارف مؤهلاً وغير محظور.",
      back: "العودة إلى التعارفات",
      mutual: "تم القبول من الطرفين",
      mutualWithName: (name: string) => `أنت و${name} اخترتما المتابعة`,
      mutualBody: "لا نعرض أي قبول من طرف واحد. ظهور هذه الصفحة يعني أن القرار أصبح متبادلاً فعلاً.",
      trustTitle: "ما تحقّق منه ميثاق",
      trustBody: "هذه العلامات تخص فقط الأمور التي تحقّق منها ميثاق فعلياً، ولا تعني أن كل تفاصيل الملف موثّقة.",
      photoTitle: "كشف الصورة يبقى باختيارك",
      photoAlreadyShared: "صورتك المعتمدة متاحة الآن داخل هذا التعارف فقط وفق اختيارك.",
      photoReadyToShare: "لديك صورة معتمدة، لكنها ما زالت خاصة. يمكنك كشفها لهذا التعارف فقط إذا أردت.",
      photoNotRequired: "لا توجد صورة معتمدة على حسابك، وهذا لا يمنعك من بدء المحادثة أو متابعة التعارف.",
      photoAfterFamily: "اخترت إبقاء صورتك خاصة حتى مرحلة إشراك العائلة. لن نكشفها الآن.",
      photoStaysPrivate: "اخترت عدم كشف صورتك. يمكنك متابعة التعارف والمحادثة بدون صورة.",
      photoFollowsSetting: "صورتك تتبع اختيار الخصوصية الذي حفظته مسبقاً لهذا النوع من التعارف.",
      photoShareButton: "كشف صورتي لهذا التعارف",
      photoConfirm: "بعد الكشف قد يكون الطرف الآخر قد شاهد الصورة، لذلك لا يمكن اعتبار التراجع لاحقاً وكأنها لم تُشاهد.",
      photoConfirmButton: "نعم، اكشف صورتي لهذا التعارف",
      photoShared: "تم كشف صورتك لهذا التعارف فقط.",
      photoShareError: "تعذر حفظ اختيار كشف الصورة الآن. لم نغيّر خصوصية صورتك.",
      cancel: "إلغاء",
      nextEyebrow: "حدود التواصل",
      nextTitle: "التواصل سيبقى مرتبطاً بهذا التعارف",
      nextBody: "لا توجد رسائل عامة أو إمكانية البحث عن أعضاء. المحادثة تفتح فقط لهذا التعارف وبعد تحقق الخادم من الأهلية والحظر والسلامة.",
      boundaryOneTitle: "لا أرقام هاتف تلقائياً",
      boundaryOneBody: "لا يحتاج الطرفان إلى كشف رقم الهاتف أو بيانات الاتصال لبدء التواصل داخل ميثاق.",
      boundaryTwoTitle: "الحظر يوقف المسار",
      boundaryTwoBody: "إذا حظر أحد الطرفين الآخر، يتوقف التعارف ولا يفتح تواصل جديد بينهما.",
      boundaryThreeTitle: "السلامة متاحة دائماً",
      boundaryThreeBody: "الإبلاغ والحظر يبقيان متاحين من نفس التعارف قبل وأثناء أي تواصل لاحق.",
      safetyTitle: "هل تريد مراجعة خيارات السلامة؟",
      safetyBody: "يمكنك الإبلاغ أو الحظر من دون كشف معرف الطرف الآخر داخل التطبيق.",
      safetyButton: "الأمان والإبلاغ",
      communicationTitle: "المحادثة الخاصة جاهزة",
      communicationBody: "يمكنك بدء المحادثة حتى لو اخترت إبقاء صورتك خاصة. لا يشترط ميثاق كشف الصورة لفتح التواصل.",
      communicationButton: "بدء المحادثة الخاصة",
    };
  }

  return {
    eyebrow: "Mutual acceptance",
    title: "The next step starts here",
    body: "This handoff does not open a public directory or reveal contact details. It remains a private extension of the introduction you both accepted.",
    loading: "Verifying introduction",
    errorTitle: "We couldn’t verify the introduction",
    errorBody: "No communication was opened and no decision was changed. Check your connection and try again.",
    retry: "Try again",
    unavailableTitle: "Handoff unavailable",
    unavailableBody: "This step is available only after both members accept and the introduction remains eligible and unblocked.",
    back: "Back to introductions",
    mutual: "Both members accepted",
    mutualWithName: (name: string) => `You and ${name} chose to continue`,
    mutualBody: "Mithaq never exposes one-sided acceptance. Seeing this page means the decision is genuinely mutual.",
    trustTitle: "What Mithaq verified",
    trustBody: "These badges cover only facts Mithaq actually verified. They do not mean every profile answer is verified.",
    photoTitle: "Photo reveal stays your choice",
    photoAlreadyShared: "Your approved photo is now available inside this introduction only, according to your choice.",
    photoReadyToShare: "You have an approved photo, but it is still private. You can reveal it for this introduction only if you want to.",
    photoNotRequired: "You do not have an approved photo, and that does not stop you from chatting or continuing this introduction.",
    photoAfterFamily: "You chose to keep your photo private until family involvement. Mithaq will not reveal it now.",
    photoStaysPrivate: "You chose not to reveal your photo. You can continue the introduction and chat without one.",
    photoFollowsSetting: "Your photo follows the privacy choice you previously saved for this stage of an introduction.",
    photoShareButton: "Reveal my photo in this introduction",
    photoConfirm: "Once revealed, the other person may have seen the photo. A later change cannot make an already viewed photo unseen.",
    photoConfirmButton: "Yes, reveal my photo here",
    photoShared: "Your photo is now revealed for this introduction only.",
    photoShareError: "We couldn’t save your photo-reveal choice. Your photo privacy was not changed.",
    cancel: "Cancel",
    nextEyebrow: "Communication boundaries",
    nextTitle: "Communication stays tied to this introduction",
    nextBody: "There is no public messaging or member search. The conversation opens only for this introduction after server-side eligibility, blocking, and safety checks.",
    boundaryOneTitle: "No automatic phone-number sharing",
    boundaryOneBody: "Neither member needs to reveal a phone number or contact details to begin communicating inside Mithaq.",
    boundaryTwoTitle: "Blocking stops the path",
    boundaryTwoBody: "If either member blocks the other, the introduction stops and no new communication opens between them.",
    boundaryThreeTitle: "Safety stays available",
    boundaryThreeBody: "Reporting and blocking remain available from the same introduction before and during any later communication.",
    safetyTitle: "Want to review your safety options?",
    safetyBody: "Report or block without exposing the other member’s identifier in the app.",
    safetyButton: "Safety & report",
    communicationTitle: "Your private conversation is ready",
    communicationBody: "You can start chatting even if you keep your photo private. Mithaq does not require photo reveal to open communication.",
    communicationButton: "Start private conversation",
  };
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  action: { marginTop: 14 },
  loadingState: { minHeight: 220, alignItems: "center", justifyContent: "center" },
  mutualCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    backgroundColor: colors.primary,
    padding: 20,
  },
  mutualMark: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
    marginBottom: 15,
  },
  mutualMarkText: { color: colors.primary, fontSize: 24, fontWeight: "900" },
  mutualTitle: { color: colors.white, fontSize: 19, fontWeight: "800" },
  mutualBody: { color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 21, marginTop: 7 },
  trustCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primaryWash,
    padding: 16,
    gap: 8,
  },
  trustTitle: { color: colors.primaryStrong, fontSize: 14, fontWeight: "900" },
  trustBody: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  revealCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    backgroundColor: colors.surfaceRaised,
    padding: 17,
    gap: 10,
  },
  revealTitle: { color: colors.foreground, fontSize: 16, fontWeight: "900" },
  revealBody: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  revealActions: { gap: 9 },
  confirmText: { color: colors.foreground, fontSize: 12, lineHeight: 19, fontWeight: "700" },
  revealMessage: { color: colors.primaryStrong, fontSize: 12, lineHeight: 19, fontWeight: "800" },
  ruleCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primaryWash,
    padding: 17,
  },
  ruleEyebrow: { color: colors.gold, fontSize: 11, fontWeight: "800" },
  ruleTitle: { color: colors.primary, fontSize: 17, fontWeight: "800", marginTop: 5 },
  ruleBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 6 },
  boundaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 16,
  },
  boundaryRow: { gap: 12, alignItems: "flex-start" },
  boundaryMark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  boundaryMarkText: { color: colors.primary, fontSize: 12, fontWeight: "900" },
  boundaryCopy: { flex: 1 },
  boundaryTitle: { color: colors.foreground, fontSize: 14, fontWeight: "800" },
  boundaryBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  safetyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 17,
    gap: 10,
  },
  safetyTitle: { color: colors.foreground, fontSize: 15, fontWeight: "800" },
  safetyBody: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  communicationActions: { gap: 10 },
});
