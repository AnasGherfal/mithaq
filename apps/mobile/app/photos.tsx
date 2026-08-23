import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  MemberPhotoUploadError,
  prepareAndReplaceMemberPhoto,
  prepareAndUploadMemberPhoto,
  type MemberPhotoUploadStage,
} from "@/lib/member-photo-upload";
import {
  isPhotoFeatureUnavailable,
  listMyMemberPhotos,
  removeMemberPhoto,
  reorderMemberPhotos,
  setPrimaryMemberPhoto,
  type MemberPhoto,
} from "@/lib/member-photos";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

type LocalPreview = { uri: string; width: number; height: number } | null;

type MoveDirection = "earlier" | "later";

export default function PhotosScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => photoCopy(locale), [locale]);
  const direction = rtl ? "rtl" : "ltr";
  const textAlign = rtl ? "right" : "left";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [savingUnavailable, setSavingUnavailable] = useState(false);
  const [photos, setPhotos] = useState<MemberPhoto[]>([]);
  const [localPreview, setLocalPreview] = useState<LocalPreview>(null);
  const [stage, setStage] = useState<MemberPhotoUploadStage | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setSavingUnavailable(false);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }
      const rows = await listMyMemberPhotos();
      setPhotos(rows);
    } catch (error) {
      if (__DEV__ && isPhotoFeatureUnavailable(error)) {
        setSavingUnavailable(true);
        setPhotos([]);
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

  async function choosePhoto(replacePhoto?: MemberPhoto) {
    if (stage || busyId) return;
    setMessage(null);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      allowsMultipleSelection: false,
      quality: 1,
      selectionLimit: 1,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;

    setLocalPreview({ uri: asset.uri, width: asset.width, height: asset.height });

    if (savingUnavailable) {
      setMessage(copy.localOnly);
      return;
    }

    if (replacePhoto) setBusyId(replacePhoto.photoId);

    try {
      if (replacePhoto) {
        await prepareAndReplaceMemberPhoto({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          photoId: replacePhoto.photoId,
          onStage: setStage,
        });
        setMessage(copy.replaced);
      } else {
        await prepareAndUploadMemberPhoto({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          makePrimary: photos.length === 0,
          onStage: setStage,
        });
        setMessage(copy.saved);
      }

      setPhotos(await listMyMemberPhotos());
      setLocalPreview(null);
    } catch (error) {
      if (error instanceof MemberPhotoUploadError && error.code === "unauthorized") {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }
      setMessage(photoErrorMessage(error, copy));
    } finally {
      setStage(null);
      setBusyId(null);
    }
  }

  async function makePrimary(photo: MemberPhoto) {
    if (photo.isPrimary || busyId || stage) return;
    setBusyId(photo.photoId);
    try {
      await setPrimaryMemberPhoto(photo.photoId);
      setPhotos(await listMyMemberPhotos());
      setMessage(copy.primarySaved);
    } catch {
      setMessage(copy.actionError);
    } finally {
      setBusyId(null);
    }
  }

  async function movePhoto(photo: MemberPhoto, move: MoveDirection) {
    if (busyId || stage) return;
    const index = photos.findIndex((item) => item.photoId === photo.photoId);
    const targetIndex = move === "earlier" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= photos.length) return;

    const previous = photos;
    const next = [...photos];
    const target = next[targetIndex];
    if (!target) return;
    next[targetIndex] = photo;
    next[index] = target;

    setBusyId(photo.photoId);
    setPhotos(next);
    setMessage(null);
    try {
      await reorderMemberPhotos(next.map((item) => item.photoId));
      setPhotos(await listMyMemberPhotos());
      setMessage(copy.orderSaved);
    } catch {
      setPhotos(previous);
      setMessage(copy.actionError);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(photo: MemberPhoto) {
    if (busyId || stage) return;
    setBusyId(photo.photoId);
    try {
      await removeMemberPhoto(photo.photoId);
      setPhotos(await listMyMemberPhotos());
      setMessage(copy.removed);
    } catch {
      setMessage(copy.actionError);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={
        <PrimaryButton tone="quiet" onPress={() => router.replace({ pathname: "/account", params: { locale } })}>
          {copy.back}
        </PrimaryButton>
      }
    >
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
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
        <View style={styles.stack}>
          <View style={styles.privacyCard}>
            <Text style={[styles.privacyTitle, { textAlign, writingDirection: direction }]}>{copy.privateTitle}</Text>
            <Text style={[styles.privacyBody, { textAlign, writingDirection: direction }]}>{copy.privateBody}</Text>
          </View>

          {savingUnavailable ? (
            <View style={styles.notice}>
              <Text style={[styles.noticeTitle, { textAlign, writingDirection: direction }]}>{copy.previewTitle}</Text>
              <Text style={[styles.noticeBody, { textAlign, writingDirection: direction }]}>{copy.previewBody}</Text>
            </View>
          ) : null}

          {stage ? (
            <Text style={[styles.progress, { textAlign, writingDirection: direction }]}>{copy.stage[stage]}</Text>
          ) : null}

          <PrimaryButton
            disabled={photos.length >= 5 || Boolean(stage) || Boolean(busyId)}
            onPress={() => void choosePhoto()}
          >
            {photos.length >= 5 ? copy.full : copy.choose}
          </PrimaryButton>

          {localPreview ? (
            <View style={styles.previewCard}>
              <Image source={{ uri: localPreview.uri }} style={styles.previewImage} resizeMode="cover" />
              <Text style={[styles.previewLabel, { textAlign, writingDirection: direction }]}>{copy.previewLabel}</Text>
            </View>
          ) : null}

          {message ? <Text style={[styles.message, { textAlign, writingDirection: direction }]}>{message}</Text> : null}

          {photos.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, { textAlign, writingDirection: direction }]}>{copy.emptyTitle}</Text>
              <Text style={[styles.emptyBody, { textAlign, writingDirection: direction }]}>{copy.emptyBody}</Text>
            </View>
          ) : null}

          <View style={styles.grid}>
            {photos.map((photo, index) => (
              <View key={photo.photoId} style={styles.photoCard}>
                {photo.signedUrl ? (
                  <Image source={{ uri: photo.signedUrl }} style={styles.photo} resizeMode="cover" />
                ) : (
                  <View style={[styles.photo, styles.placeholder]} />
                )}
                <View style={styles.photoCopy}>
                  <Text style={[styles.photoPosition, { textAlign, writingDirection: direction }]}>
                    {copy.position(index + 1, photos.length)}
                  </Text>
                  <Text style={[styles.photoTitle, { textAlign, writingDirection: direction }]}>
                    {photo.isPrimary ? copy.primary : copy.additional}
                  </Text>
                  <Text style={[styles.review, { textAlign, writingDirection: direction }]}>
                    {copy.review[photo.reviewState]}
                  </Text>
                </View>

                <View style={[styles.orderRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                  <SmallAction
                    label={copy.earlier}
                    disabled={index === 0 || Boolean(busyId) || Boolean(stage)}
                    onPress={() => void movePhoto(photo, "earlier")}
                  />
                  <SmallAction
                    label={copy.later}
                    disabled={index === photos.length - 1 || Boolean(busyId) || Boolean(stage)}
                    onPress={() => void movePhoto(photo, "later")}
                  />
                </View>

                <PrimaryButton
                  tone="quiet"
                  disabled={Boolean(busyId) || Boolean(stage)}
                  onPress={() => void choosePhoto(photo)}
                >
                  {copy.replace}
                </PrimaryButton>
                {!photo.isPrimary ? (
                  <PrimaryButton
                    tone="quiet"
                    disabled={Boolean(busyId) || Boolean(stage)}
                    onPress={() => void makePrimary(photo)}
                  >
                    {copy.makePrimary}
                  </PrimaryButton>
                ) : null}
                <Pressable
                  disabled={Boolean(busyId) || Boolean(stage)}
                  onPress={() => void remove(photo)}
                  style={({ pressed }) => [styles.removeButton, pressed ? styles.pressed : null]}
                >
                  <Text style={styles.removeText}>{copy.remove}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

function SmallAction({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallAction,
        disabled ? styles.smallActionDisabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <Text style={styles.smallActionText}>{label}</Text>
    </Pressable>
  );
}

function photoErrorMessage(error: unknown, copy: ReturnType<typeof photoCopy>) {
  if (!(error instanceof MemberPhotoUploadError)) return copy.saveError;
  if (error.code === "image_too_small") return copy.tooSmall;
  if (error.code === "file_too_large") return copy.tooLarge;
  return copy.saveError;
}

function photoCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  return {
    eyebrow: ar ? "صور خاصة · اختيارية" : "PRIVATE PHOTOS · OPTIONAL",
    title: ar ? "الصورة اختيارية" : "Photos are optional",
    body: ar
      ? "يمكنك استخدام ميثاق بدون أي صورة. أضف حتى خمس صور فقط إذا أردت، وستبقى خاضعة لاختيارك لطريقة الظهور والكشف."
      : "You can use Mithaq without any photo. Add up to five only if you want to, and they remain governed by your presentation and reveal choices.",
    privateTitle: ar ? "عدم رفع صورة خيار كامل" : "No photo is a complete choice",
    privateBody: ar
      ? "خيار «خصوصية أولاً» لا يعرض صورك في الاكتشاف. وإذا اخترت لاحقاً ملفاً مفتوحاً، لا تظهر إلا صورة معتمدة. كل صورة جديدة أو بديلة تمر بالمراجعة."
      : "Private first does not show your photos in Discover. If you later choose an open profile, only an approved photo may appear. Every new or replacement photo goes through review.",
    previewTitle: ar ? "الحفظ غير متاح بعد في هذه المعاينة" : "Saving isn’t available yet in this preview",
    previewBody: ar
      ? "لا يزال بإمكانك اختيار صورة من هاتفك ومعاينتها هنا. لن تغادر الصورة جهازك حتى يصبح الحفظ متاحاً."
      : "You can still choose a photo from your phone and preview it here. The image stays on your device until saving becomes available.",
    choose: ar ? "إضافة صورة اختيارية" : "Add an optional photo",
    full: ar ? "وصلت إلى خمس صور" : "Five-photo limit reached",
    localOnly: ar
      ? "تم اختيار الصورة. هذه المعاينة موجودة على جهازك فقط."
      : "Photo selected. This preview is only on your device.",
    saved: ar ? "تم حفظ الصورة وإرسالها للمراجعة." : "Photo saved and sent for review.",
    replaced: ar ? "تم استبدال الصورة وإعادتها للمراجعة." : "Photo replaced and sent back for review.",
    saveError: ar
      ? "تعذر حفظ الصورة الآن. حاول مرة أخرى لاحقاً."
      : "We couldn’t save the photo right now. Try again later.",
    tooSmall: ar
      ? "اختر صورة أوضح وأكبر قليلاً حتى نتمكن من تجهيزها بأمان."
      : "Choose a clearer, larger image so Mithaq can prepare it safely.",
    tooLarge: ar ? "حجم الصورة كبير جداً. اختر صورة أخرى." : "That image is too large. Choose another photo.",
    actionError: ar ? "تعذر حفظ التغيير الآن." : "We couldn’t save that change right now.",
    primarySaved: ar ? "تم تعيين الصورة الرئيسية." : "Primary photo updated.",
    orderSaved: ar ? "تم حفظ ترتيب الصور." : "Photo order saved.",
    removed: ar ? "تمت إزالة الصورة." : "Photo removed.",
    previewLabel: ar ? "معاينة على جهازك" : "On-device preview",
    emptyTitle: ar ? "لا توجد صور — وهذا طبيعي" : "No photos — and that’s okay",
    emptyBody: ar
      ? "يمكنك الاستمرار في ميثاق بهذه الحالة وإضافة صورة لاحقاً إذا أردت."
      : "You can continue using Mithaq exactly like this and add a photo later if you choose.",
    position: (position: number, total: number) =>
      ar ? `الصورة ${position} من ${total}` : `Photo ${position} of ${total}`,
    primary: ar ? "الصورة الرئيسية" : "Primary photo",
    additional: ar ? "صورة إضافية" : "Additional photo",
    earlier: ar ? "تقديم" : "Move earlier",
    later: ar ? "تأخير" : "Move later",
    replace: ar ? "استبدال الصورة" : "Replace photo",
    makePrimary: ar ? "اجعلها الرئيسية" : "Make primary",
    remove: ar ? "إزالة الصورة" : "Remove photo",
    back: ar ? "العودة إلى الحساب" : "Back to account",
    retry: ar ? "إعادة المحاولة" : "Try again",
    loadErrorTitle: ar ? "تعذر تحميل صورك" : "We couldn’t load your photos",
    loadErrorBody: ar
      ? "لم نغيّر أي صورة. تحقق من الاتصال وحاول مرة أخرى."
      : "No photo was changed. Check your connection and try again.",
    stage: {
      preparing: ar ? "نجهّز الصورة…" : "Preparing photo…",
      uploading: ar ? "نحفظ الصورة بشكل آمن…" : "Saving photo securely…",
      registering: ar ? "ننهي الحفظ…" : "Finishing up…",
    },
    review: {
      pending: ar ? "بانتظار المراجعة" : "Pending review",
      approved: ar ? "معتمدة" : "Approved",
      needs_changes: ar ? "تحتاج إلى تعديل" : "Needs changes",
      rejected: ar ? "غير مقبولة" : "Not approved",
    },
  };
}

const styles = StyleSheet.create({
  loading: { minHeight: 320, alignItems: "center", justifyContent: "center" },
  stack: { width: "100%", gap: 14 },
  privacyCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.primaryWash,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    padding: 16,
    gap: 5,
  },
  privacyTitle: { color: colors.primaryStrong, fontSize: 15, fontWeight: "900" },
  privacyBody: { color: colors.muted, fontSize: 12, lineHeight: 20 },
  notice: { borderRadius: radius.lg, backgroundColor: colors.goldSoft, padding: 14, gap: 5 },
  noticeTitle: { color: colors.gold, fontSize: 13, fontWeight: "900" },
  noticeBody: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  progress: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  previewCard: {
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  previewImage: { width: "100%", aspectRatio: 4 / 5 },
  previewLabel: { padding: 12, color: colors.primaryStrong, fontSize: 11, fontWeight: "800" },
  message: { color: colors.primaryStrong, fontSize: 12, lineHeight: 19, fontWeight: "800" },
  emptyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 15,
  },
  emptyTitle: { color: colors.foreground, fontSize: 14, lineHeight: 21, fontWeight: "900" },
  emptyBody: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 4 },
  grid: { width: "100%", gap: 12 },
  photoCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 12,
    gap: 10,
    ...shadows.card,
  },
  photo: { width: "100%", aspectRatio: 4 / 5, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted },
  placeholder: { borderWidth: 1, borderColor: colors.border },
  photoCopy: { gap: 2 },
  photoPosition: { color: colors.mutedSoft, fontSize: 9, lineHeight: 14, fontWeight: "800" },
  photoTitle: { color: colors.foreground, fontSize: 14, fontWeight: "900" },
  review: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  orderRow: { width: "100%", gap: 8 },
  smallAction: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
  },
  smallActionDisabled: { opacity: 0.35 },
  smallActionText: {
    color: colors.primaryStrong,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  removeButton: { minHeight: 42, alignItems: "center", justifyContent: "center" },
  removeText: { color: colors.danger, fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.55 },
});
