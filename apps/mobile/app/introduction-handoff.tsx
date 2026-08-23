import { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ProfilePortrait } from "@/components/profile-portrait";
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
  primary_photo_url: string | null;
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
      const nextPreview = ((Array.isArray(previewResult.data) ? previewResult.data[0] : previewResult.data) ??
        null) as PreviewRow | null;
      setPreview(nextPreview);
      setRevealState(nextRevealState);
      setReady(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [introductionId, locale, validIntroduction]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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
  const portraitInitial = preview?.display_name?.trim().charAt(0) || "م";

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

          <View style={styles.partnerPortraitCard}>
            <Text style={[styles.partnerPortraitTitle, { textAlign: rtl ? "right" : "left" }]}>
              {copy.partnerPhotoTitle}
            </Text>
            <Text style={[styles.partnerPortraitBody, { textAlign: rtl ? "right" : "left" }]}>
              {preview?.primary_photo_url ? copy.partnerPhotoRevealed : copy.partnerPhotoPrivate}
            </Text>
            <ProfilePortrait
              height={250}
              initials={portraitInitial}
              privacyLabel={copy.partnerPhotoPrivacyLabel}
              rtl={rtl}
              uri={preview?.primary_photo_url}
            />
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
                <Text
                  accessibilityLiveRegion="polite"
                  style={[styles.revealMessage, { textAlign: rtl ? "right" : "left" }]}
                >
                  {revealMessage}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.trustedCircleCard}>
            <Text style={[styles.trustedCircleEyebrow, { textAlign: rtl ? "right" : "left" }]}>
              {copy.trustedEyebrow}
            </Text>
            <Text style={[styles.trustedCircleTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.trustedTitle}</Text>
            <Text style={[styles.trustedCircleBody, { textAlign: rtl ? "right" : "left" }]}>{copy.trustedBody}</Text>
            <PrimaryButton
              onPress={() => router.push({ pathname: "/trusted-contacts", params: { locale, introductionId } })}
            >
              {copy.trustedButton}
            </PrimaryButton>
            <Text style={[styles.trustedCircleNote, { textAlign: rtl ? "right" : "left" }]}>{copy.trustedNote}</Text>
          </View>

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
              onPress={() => router.push({ pathname: "/introduction-safety", params: { locale, introductionId } })}
            >
              {copy.safetyButton}
            </PrimaryButton>
          </View>

          <View style={styles.communicationActions}>
            <StateCard rtl={rtl} tone="success" title={copy.communicationTitle} body={copy.communicationBody} />
            <PrimaryButton
              onPress={() => router.push({ pathname: "/conversation", params: { locale, introductionId } })}
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
  const ar = locale === "ar";
  return {
    eyebrow: ar ? "قبول متبادل" : "MUTUAL ACCEPTANCE",
    title: ar ? "الخطوة التالية تبدأ من هنا" : "The next step starts here",
    body: ar
      ? "هذا الانتقال خاص بنفس التعارف. لا يفتح دليلاً عاماً ولا يكشف رقمك أو بيانات اتصالك تلقائياً."
      : "This remains inside the same private introduction. It does not create a public profile or automatically reveal your phone or contact details.",
    loading: ar ? "جارٍ التحقق من التعارف" : "Checking the introduction",
    errorTitle: ar ? "تعذر التحقق من التعارف" : "We couldn’t verify this introduction",
    errorBody: ar
      ? "لم يتم فتح أي تواصل أو تغيير أي قرار. تحقق من اتصالك وحاول مرة أخرى."
      : "No communication or decision was changed. Check your connection and try again.",
    retry: ar ? "إعادة المحاولة" : "Try again",
    unavailableTitle: ar ? "الانتقال غير متاح" : "This step is unavailable",
    unavailableBody: ar
      ? "تتوفر هذه الخطوة فقط بعد قبول التعارف من الطرفين وبقاء التعارف مؤهلاً وغير محظور."
      : "This step is available only after both people accept and the introduction remains eligible and unblocked.",
    back: ar ? "العودة إلى التعارفات" : "Back to introductions",
    mutual: ar ? "تم القبول من الطرفين" : "Acceptance is mutual",
    mutualWithName: (name: string) => (ar ? `أنت و${name} اخترتما المتابعة` : `You and ${name} chose to continue`),
    mutualBody: ar
      ? "لا نعرض أي قبول من طرف واحد. ظهور هذه الصفحة يعني أن القرار أصبح متبادلاً فعلاً."
      : "Mithaq never reveals a one-sided yes. Seeing this page means the decision is genuinely mutual.",
    partnerPhotoTitle: ar ? "صورة الطرف الآخر" : "The other person’s photo",
    partnerPhotoRevealed: ar
      ? "سمح الطرف الآخر بعرض صورة معتمدة داخل هذا التعارف. تبقى هذه الشاشة محمية."
      : "The other member has allowed an approved photo in this introduction. This screen remains protected.",
    partnerPhotoPrivate: ar
      ? "لم يسمح الطرف الآخر بعرض صورة هنا بعد. يمكن متابعة التعارف دون صورة."
      : "The other member has not allowed a photo here yet. You can continue without one.",
    partnerPhotoPrivacyLabel: ar ? "صورة خاصة محمية" : "Protected private photo",
    trustTitle: ar ? "ما تحقّق منه ميثاق" : "What Mithaq verified",
    trustBody: ar
      ? "تعني الشارات فقط ما تم التحقق منه فعلياً؛ بقية تفاصيل الملف يصرّح بها العضو بنفسه."
      : "Badges mean only what Mithaq actually verified; other profile details remain member-declared.",
    photoTitle: ar ? "كشف صورتك يبقى اختيارك" : "Your photo reveal stays your choice",
    photoAlreadyShared: ar
      ? "صورتك مسموح بها الآن في هذا التعارف وفق اختيار الخصوصية الذي حفظته."
      : "Your approved photo is now allowed in this introduction under your saved privacy choice.",
    photoReadyToShare: ar
      ? "اخترت الموافقة الصريحة. لن تظهر صورتك حتى تؤكد المشاركة لهذا التعارف."
      : "You chose explicit approval. Your photo stays private until you confirm it for this introduction.",
    photoNotRequired: ar
      ? "لا توجد صورة معتمدة، وهذا لا يمنع المحادثة أو استمرار التعارف."
      : "You do not have an approved photo, and that does not prevent chat or continuing the introduction.",
    photoAfterFamily: ar
      ? "اخترت ظهور الصورة بعد إشراك العائلة. مشاركة جهة اتصال موثوقة من طرفك ستبدأ هذه المرحلة لصورتك أنت فقط."
      : "You chose photo visibility after family involvement. Sharing your own trusted contact will start that stage for your photo only.",
    photoStaysPrivate: ar
      ? "اخترت إبقاء الصورة خاصة. المحادثة لا تتطلب صورة."
      : "You chose to keep your photo private. Chat does not require a photo.",
    photoFollowsSetting: ar
      ? "تتبع صورتك اختيار الخصوصية الذي حفظته سابقاً."
      : "Your photo follows the privacy choice you saved earlier.",
    photoConfirm: ar
      ? "بعد أن يرى الطرف الآخر الصورة لا يمكن جعلها كأنها لم تُرَ."
      : "Once the other person has seen the photo, it cannot be made unseen.",
    photoShareButton: ar ? "كشف صورتي لهذا التعارف" : "Reveal my photo here",
    photoConfirmButton: ar ? "نعم، اكشف الصورة" : "Yes, reveal the photo",
    cancel: ar ? "إلغاء" : "Cancel",
    photoShared: ar ? "تم السماح بالصورة لهذا التعارف." : "Your photo is now allowed in this introduction.",
    photoShareError: ar ? "تعذر تحديث مشاركة الصورة الآن." : "We couldn’t update photo sharing right now.",
    trustedEyebrow: ar ? "دائرة الثقة" : "TRUSTED CIRCLE",
    trustedTitle: ar ? "إشراك شخص تثق به" : "Bring in someone you trust",
    trustedBody: ar
      ? "بعد القبول المتبادل يمكنك مشاركة أب أو أم أو أخ أو أخت أو ولي أو شخص موثوق. لا يتواصل ميثاق معه تلقائياً."
      : "After mutual acceptance, you can share a parent, sibling, wali, guardian, relative, or trusted person. Mithaq does not contact them automatically.",
    trustedButton: ar ? "فتح التسليم العائلي" : "Open trusted-contact handoff",
    trustedNote: ar
      ? "كل طرف يختار بنفسه إن كان مستعداً ومتى. لا يشترط أن يشارك الطرفان في نفس الوقت."
      : "Each person chooses independently whether and when to share. Both sides do not have to do it at the same time.",
    nextEyebrow: ar ? "المحادثة" : "CONVERSATION",
    nextTitle: ar ? "التواصل الخاص أصبح متاحاً" : "Private communication is now available",
    nextBody: ar
      ? "يمكنكما الحديث داخل ميثاق من دون تبادل أرقام الهواتف أو الصور إذا لم تختارا ذلك."
      : "You can talk inside Mithaq without exchanging phone numbers or photos unless you choose to.",
    boundaryOneTitle: ar ? "لا يوجد تواصل غير مطلوب" : "No unsolicited contact",
    boundaryOneBody: ar
      ? "المحادثة موجودة فقط لأن القبول متبادل."
      : "The conversation exists only because acceptance is mutual.",
    boundaryTwoTitle: ar ? "الصورة ليست شرطاً" : "A photo is not required",
    boundaryTwoBody: ar
      ? "يمكن استمرار التعارف حتى مع إبقاء الصور خاصة."
      : "The introduction can continue while photos remain private.",
    boundaryThreeTitle: ar ? "العائلة اختيار مقصود" : "Family involvement is deliberate",
    boundaryThreeBody: ar
      ? "لا يشارك ميثاق أرقام العائلة أو يتواصل معها من دون قرارك الصريح."
      : "Mithaq does not share family numbers or contact anyone without your explicit decision.",
    safetyTitle: ar ? "الأمان يبقى متاحاً" : "Safety remains available",
    safetyBody: ar
      ? "يمكن الإبلاغ أو الحظر في أي وقت. الحظر يوقف مسار التعارف والتواصل."
      : "You can report or block at any time. Blocking stops the introduction and communication path.",
    safetyButton: ar ? "الأمان والإبلاغ" : "Safety & report",
    communicationTitle: ar ? "المحادثة جاهزة" : "Conversation is ready",
    communicationBody: ar
      ? "يمكن بدء محادثة خاصة الآن سواء شاركتما صوراً أو جهات اتصال موثوقة أم لا."
      : "You can start a private conversation now whether or not either of you shared photos or trusted contacts.",
    communicationButton: ar ? "فتح المحادثة الخاصة" : "Open private conversation",
  };
}

const styles = StyleSheet.create({
  action: { marginTop: 14 },
  loadingState: { minHeight: 280, alignItems: "center", justifyContent: "center" },
  stack: { width: "100%", gap: 14 },
  mutualCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primaryWash,
    padding: 17,
  },
  mutualMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    marginBottom: 10,
  },
  mutualMarkText: { color: colors.white, fontSize: 18, fontWeight: "900" },
  mutualTitle: { color: colors.primaryStrong, fontSize: 18, lineHeight: 28, fontWeight: "900" },
  mutualBody: { color: colors.muted, fontSize: 11, lineHeight: 19, marginTop: 4 },
  partnerPortraitCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 14,
    gap: 8,
  },
  partnerPortraitTitle: { color: colors.foreground, fontSize: 14, fontWeight: "900" },
  partnerPortraitBody: { color: colors.muted, fontSize: 10, lineHeight: 17 },
  trustCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.surfaceRaised,
    padding: 14,
    gap: 8,
  },
  trustTitle: { color: colors.primaryStrong, fontSize: 13, fontWeight: "900" },
  trustBody: { color: colors.muted, fontSize: 9, lineHeight: 16 },
  revealCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    backgroundColor: colors.surfaceRaised,
    padding: 14,
    gap: 8,
  },
  revealTitle: { color: colors.foreground, fontSize: 14, fontWeight: "900" },
  revealBody: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  revealActions: { gap: 8 },
  confirmText: { color: colors.foreground, fontSize: 10, lineHeight: 17, fontWeight: "700" },
  revealMessage: { color: colors.primary, fontSize: 10, lineHeight: 17, fontWeight: "700" },
  trustedCircleCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    backgroundColor: colors.surfaceRaised,
    padding: 16,
    gap: 9,
  },
  trustedCircleEyebrow: { color: colors.gold, fontSize: 9, fontWeight: "900" },
  trustedCircleTitle: { color: colors.foreground, fontSize: 17, lineHeight: 26, fontWeight: "900" },
  trustedCircleBody: { color: colors.muted, fontSize: 11, lineHeight: 19 },
  trustedCircleNote: { color: colors.muted, fontSize: 9, lineHeight: 16 },
  ruleCard: { borderRadius: radius.lg, backgroundColor: colors.primaryWash, padding: 15 },
  ruleEyebrow: { color: colors.primary, fontSize: 9, fontWeight: "900" },
  ruleTitle: { color: colors.foreground, fontSize: 15, lineHeight: 23, fontWeight: "900", marginTop: 4 },
  ruleBody: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 4 },
  boundaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 14,
  },
  boundaryRow: { alignItems: "flex-start", gap: 10 },
  boundaryMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  boundaryMarkText: { color: colors.primary, fontSize: 10, fontWeight: "900" },
  boundaryCopy: { flex: 1 },
  boundaryTitle: { color: colors.foreground, fontSize: 12, fontWeight: "900" },
  boundaryBody: { color: colors.muted, fontSize: 10, lineHeight: 17, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 11 },
  safetyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 14,
    gap: 8,
  },
  safetyTitle: { color: colors.foreground, fontSize: 13, fontWeight: "900" },
  safetyBody: { color: colors.muted, fontSize: 10, lineHeight: 17 },
  communicationActions: { gap: 9 },
});
