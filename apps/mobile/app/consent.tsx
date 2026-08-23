import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { GuidedActionBar } from "@/components/guided-action-bar";
import { ScreenShell } from "@/components/screen-shell";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

export default function ConsentScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const copy = consentCopy(locale);
  const [required, setRequired] = useState(false);
  const [communications, setCommunications] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finalize() {
    if (!required || saving) return;

    setSaving(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc("finalize_waitlist", {
        p_locale: locale,
        p_communications: communications,
      });

      if (rpcError) {
        const message = rpcError.message.toLowerCase();
        if (message.includes("authentication")) {
          router.replace({ pathname: "/auth", params: { locale } });
          return;
        }
        if (message.includes("questionnaire")) {
          setError(copy.questionnaireError);
          return;
        }
        if (message.includes("deletion") || message.includes("active account")) {
          setError(copy.accountError);
          return;
        }

        setError(copy.error);
        return;
      }

      router.replace({ pathname: "/success", params: { locale } });
    } catch {
      setError(copy.networkError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      bottomBar={
        <GuidedActionBar
          rtl={rtl}
          backLabel={copy.back}
          primaryLabel={copy.submit}
          onBack={() => router.back()}
          onPrimary={() => void finalize()}
          loading={saving}
          primaryDisabled={!required}
        />
      }
    >
      <View style={styles.page}>
        <View style={[styles.privacyIntro, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <View style={styles.privacyIcon}>
            <AppIcon name="privacy" active size={20} />
          </View>
          <View style={[styles.flex, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
            <Text style={[styles.privacyTitle, { textAlign, writingDirection }]}>{copy.privacyTitle}</Text>
            <Text style={[styles.privacyBody, { textAlign, writingDirection }]}>{copy.privacyBody}</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { textAlign, writingDirection }]}>{copy.requiredSection}</Text>
        <ConsentChoice
          label={copy.required}
          badge={copy.requiredBadge}
          checked={required}
          onPress={() => {
            setRequired((value) => !value);
            setError(null);
          }}
          rtl={rtl}
          disabled={saving}
        />

        <Text style={[styles.sectionLabel, { textAlign, writingDirection }]}>{copy.optionalSection}</Text>
        <ConsentChoice
          label={copy.communications}
          badge={copy.optionalBadge}
          checked={communications}
          onPress={() => {
            setCommunications((value) => !value);
            setError(null);
          }}
          rtl={rtl}
          disabled={saving}
        />

        <View style={styles.nextSection}>
          <Text style={[styles.nextTitle, { textAlign, writingDirection }]}>{copy.nextTitle}</Text>
          <JourneyRow rtl={rtl} number="1" text={copy.nextOne} />
          <JourneyRow rtl={rtl} number="2" text={copy.nextTwo} />
          <JourneyRow rtl={rtl} number="3" text={copy.nextThree} last />
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={[styles.error, { textAlign, writingDirection }]}>
            {error}
          </Text>
        ) : null}
      </View>
    </ScreenShell>
  );
}

function ConsentChoice({
  label,
  badge,
  checked,
  onPress,
  rtl,
  disabled = false,
}: {
  label: string;
  badge: string;
  checked: boolean;
  onPress: () => void;
  rtl: boolean;
  disabled?: boolean;
}) {
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        checked ? styles.choiceChecked : null,
        { flexDirection: rtl ? "row-reverse" : "row" },
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <View style={[styles.mark, checked ? styles.markChecked : null]}>
        <Text style={[styles.markText, checked ? styles.markTextChecked : null]}>{checked ? "✓" : ""}</Text>
      </View>
      <View style={[styles.flex, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
        <Text style={[styles.badge, { textAlign, writingDirection }]}>{badge}</Text>
        <Text style={[styles.choiceText, checked ? styles.choiceTextChecked : null, { textAlign, writingDirection }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function JourneyRow({
  rtl,
  number,
  text,
  last = false,
}: {
  rtl: boolean;
  number: string;
  text: string;
  last?: boolean;
}) {
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";

  return (
    <View style={[styles.journeyRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <View style={styles.journeyRail}>
        <View style={styles.journeyNumber}>
          <Text style={styles.journeyNumberText}>{number}</Text>
        </View>
        {!last ? <View style={styles.journeyLine} /> : null}
      </View>
      <Text style={[styles.journeyText, { textAlign, writingDirection }]}>{text}</Text>
    </View>
  );
}

function consentCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "المراجعة الأخيرة",
      title: "راجع موافقتك",
      body: "الموافقة المطلوبة منفصلة بوضوح عن التحديثات الاختيارية.",
      back: "رجوع",
      privacyTitle: "بياناتك تبقى خاصة",
      privacyBody: "نحفظ نسخة وتاريخ كل موافقة. تأكيد الهاتف يثبت ملكية الرقم فقط ولا يعني توثيق الهوية.",
      requiredSection: "مطلوب للمتابعة",
      optionalSection: "اختياري",
      requiredBadge: "مطلوب",
      optionalBadge: "اختياري ويمكن تغييره لاحقاً",
      required: "أوافق على شروط الاستخدام وسياسة الخصوصية ومعالجة بيانات التسجيل، وأؤكد أن عمري 18 سنة أو أكثر.",
      communications: "أرغب في تلقي تحديثات ميثاق المهمة المتعلقة بالإطلاق وحسابي.",
      nextTitle: "ماذا يحدث بعد التأكيد؟",
      nextOne: "نحفظ موافقتك وإجاباتك الخاصة بأمان.",
      nextTwo: "تنتقل إلى ملفك الخاص لإكمال ما يظهر في التعارف.",
      nextThree: "عندما يصبح ملفك مؤهلاً، يمكن لميثاق البحث عن تعارف مناسب.",
      submit: "تأكيد والمتابعة",
      questionnaireError: "لا يمكن إكمال التسجيل لأن الاستبيان غير مكتمل. ارجع وأكمل الإجابات المطلوبة.",
      accountError: "لا يمكن إكمال التسجيل لأن الحساب غير نشط حالياً. راجع حالة حسابك للمتابعة.",
      networkError: "تعذر الاتصال لإكمال التسجيل. لم نحذف إجاباتك؛ تحقق من الشبكة ثم حاول مرة أخرى.",
      error: "تعذر إكمال التسجيل الآن. لم نفترض نجاح العملية؛ حاول مرة أخرى.",
    };
  }

  return {
    eyebrow: "Final review",
    title: "Review your consent",
    body: "Required consent is kept clearly separate from optional updates.",
    back: "Back",
    privacyTitle: "Your data stays private",
    privacyBody:
      "We record the version and time of each consent. Phone confirmation proves control of a number only, not identity.",
    requiredSection: "Required to continue",
    optionalSection: "Optional",
    requiredBadge: "Required",
    optionalBadge: "Optional and changeable later",
    required: "I agree to the Terms, Privacy Policy, and registration data processing, and confirm I am 18 or older.",
    communications: "I would like important Mithaq launch and account updates.",
    nextTitle: "What happens after confirmation?",
    nextOne: "Your consent and private answers are saved securely.",
    nextTwo: "You continue to your private profile and choose what an introduction can reveal.",
    nextThree: "Once your profile is eligible, Mithaq can look for a suitable introduction.",
    submit: "Confirm and continue",
    questionnaireError:
      "We cannot complete registration because the questionnaire is incomplete. Go back and finish the required answers.",
    accountError:
      "We cannot complete registration because this account is not active right now. Review your account status to continue.",
    networkError:
      "We could not connect to complete registration. Your saved answers were not removed; check your network and try again.",
    error: "We could not complete registration right now. We did not assume the operation succeeded; try again.",
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { width: "100%", gap: 14 },
  privacyIntro: {
    width: "100%",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryWash,
    padding: 16,
  },
  privacyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
  },
  privacyTitle: {
    width: "100%",
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "800",
  },
  privacyBody: {
    width: "100%",
    color: colors.muted,
    fontSize: 12,
    lineHeight: 21,
    marginTop: 3,
  },
  sectionLabel: {
    width: "100%",
    color: colors.muted,
    fontSize: 11,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 6,
  },
  choice: {
    width: "100%",
    minHeight: 96,
    alignItems: "flex-start",
    gap: 13,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
  },
  choiceChecked: { borderColor: colors.primary, backgroundColor: colors.primaryWash },
  mark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  markChecked: { borderColor: colors.primary, backgroundColor: colors.primary },
  markText: { color: colors.muted, fontSize: 14, lineHeight: 18, fontWeight: "900" },
  markTextChecked: { color: colors.white },
  badge: {
    width: "100%",
    color: colors.gold,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "900",
  },
  choiceText: {
    width: "100%",
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "600",
    marginTop: 5,
  },
  choiceTextChecked: { color: colors.primary, fontWeight: "700" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.993 }] },
  disabled: { opacity: 0.6 },
  nextSection: {
    width: "100%",
    marginTop: 8,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  nextTitle: {
    width: "100%",
    color: colors.foreground,
    fontSize: 17,
    lineHeight: 28,
    fontWeight: "800",
    marginBottom: 13,
  },
  journeyRow: { width: "100%", alignItems: "flex-start", gap: 12 },
  journeyRail: { width: 28, alignItems: "center" },
  journeyNumber: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  journeyNumberText: { color: colors.primary, fontSize: 10, lineHeight: 14, fontWeight: "900" },
  journeyLine: { width: 1, minHeight: 28, flex: 1, backgroundColor: colors.borderStrong },
  journeyText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 22,
    paddingBottom: 15,
  },
  error: { color: colors.danger, fontSize: 13, lineHeight: 21, fontWeight: "700" },
});
