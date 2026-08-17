import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

export default function ConsentScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = consentCopy(locale);
  const [required, setRequired] = useState(false);
  const [communications, setCommunications] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function finalize() {
    if (!required) return;
    setSaving(true);
    setError(false);
    const { error: rpcError } = await supabase.rpc("finalize_waitlist", {
      p_locale: locale,
      p_communications: communications,
    });
    setSaving(false);
    if (rpcError) {
      setError(true);
      return;
    }
    router.replace({ pathname: "/success", params: { locale } });
  }

  return (
    <ScreenShell eyebrow={copy.eyebrow} title={copy.title} body={copy.body} rtl={rtl}>
      <View style={styles.stack}>
        <View style={[styles.summary, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <View style={styles.summaryMark}>
            <Text style={styles.summaryMarkText}>3</Text>
          </View>
          <View style={styles.summaryCopy}>
            <Text style={[styles.summaryTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.summaryTitle}</Text>
            <Text style={[styles.summaryBody, { textAlign: rtl ? "right" : "left" }]}>{copy.summaryBody}</Text>
          </View>
        </View>

        <ConsentCard
          label={copy.required}
          checked={required}
          onPress={() => setRequired((value) => !value)}
          rtl={rtl}
          required
        />
        <ConsentCard
          label={copy.communications}
          checked={communications}
          onPress={() => setCommunications((value) => !value)}
          rtl={rtl}
        />

        <View style={styles.note}>
          <Text style={[styles.noteTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.noteTitle}</Text>
          <Text style={[styles.noteBody, { textAlign: rtl ? "right" : "left" }]}>{copy.noteBody}</Text>
        </View>

        {error ? <Text style={[styles.error, { textAlign: rtl ? "right" : "left" }]}>{copy.error}</Text> : null}

        <PrimaryButton disabled={!required} loading={saving} onPress={() => void finalize()}>
          {copy.submit}
        </PrimaryButton>
      </View>
    </ScreenShell>
  );
}

function ConsentCard({
  label,
  checked,
  onPress,
  rtl,
  required = false,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  rtl: boolean;
  required?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, checked ? styles.cardChecked : null, pressed ? styles.pressed : null]}
    >
      <View style={styles.cardCopy}>
        {required ? (
          <Text style={[styles.requiredBadge, { textAlign: rtl ? "right" : "left" }]}>
            {rtl ? "مطلوب" : "Required"}
          </Text>
        ) : null}
        <Text style={[styles.cardText, checked ? styles.cardTextChecked : null, { textAlign: rtl ? "right" : "left" }]}>
          {label}
        </Text>
      </View>
      <View style={[styles.mark, checked ? styles.markChecked : null]}>
        <Text style={[styles.markText, checked ? styles.markTextChecked : null]}>{checked ? "✓" : ""}</Text>
      </View>
    </Pressable>
  );
}

function consentCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "الخطوة الأخيرة",
      title: "موافقتك واضحة ومحددة",
      body: "نحفظ نسخة وتاريخ كل موافقة. تأكيد الهاتف يثبت ملكية الرقم فقط ولا يعني توثيق الهوية.",
      summaryTitle: "أنت على بُعد خطوة واحدة",
      summaryBody: "راجع الموافقات أدناه ثم ثبّت مكانك في قائمة انتظار ميثاق.",
      required: "أوافق على شروط الاستخدام وسياسة الخصوصية ومعالجة بيانات قائمة الانتظار، وأؤكد أن عمري 18 سنة أو أكثر.",
      communications: "أرغب في تلقي تحديثات ميثاق المتعلقة بقائمة الانتظار والإطلاق.",
      noteTitle: "التحديثات اختيارية",
      noteBody: "يمكنك إيقاف رسائل ميثاق لاحقاً دون التأثير على تسجيلك.",
      submit: "تأكيد والانضمام إلى القائمة",
      error: "تعذر إكمال التسجيل الآن. حاول مرة أخرى.",
    };
  }
  return {
    eyebrow: "Final step",
    title: "Your consent stays explicit",
    body: "We record the version and time of each consent. Phone confirmation proves control of a number only, not identity.",
    summaryTitle: "You’re one step away",
    summaryBody: "Review the choices below, then secure your place on the Mithaq waitlist.",
    required: "I agree to the Terms, Privacy Policy and waitlist data processing, and confirm I am 18 or older.",
    communications: "I would like Mithaq waitlist and launch updates.",
    noteTitle: "Updates are optional",
    noteBody: "You can stop Mithaq communications later without affecting your registration.",
    submit: "Confirm and join the waitlist",
    error: "We could not complete registration right now. Try again.",
  };
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  summary: {
    alignItems: "center",
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryWash,
    padding: 16,
  },
  summaryMark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  summaryMarkText: { color: colors.white, fontSize: 15, fontWeight: "900" },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  summaryBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 4 },
  card: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  cardChecked: { borderColor: colors.primary, backgroundColor: colors.primaryWash },
  cardCopy: { flex: 1 },
  requiredBadge: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  cardText: { color: colors.foreground, fontSize: 14, lineHeight: 23, fontWeight: "600" },
  cardTextChecked: { color: colors.primary, fontWeight: "800" },
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
  markText: { color: colors.muted, fontSize: 15, fontWeight: "900" },
  markTextChecked: { color: colors.white },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  note: {
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  noteTitle: { color: colors.primary, fontWeight: "800", fontSize: 14 },
  noteBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 5 },
  error: { color: colors.danger, fontSize: 13, fontWeight: "700" },
});
