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
        <ConsentCard
          label={copy.required}
          checked={required}
          onPress={() => setRequired((value) => !value)}
          rtl={rtl}
        />
        <ConsentCard
          label={copy.communications}
          checked={communications}
          onPress={() => setCommunications((value) => !value)}
          rtl={rtl}
        />
        <View style={styles.note}>
          <Text style={[styles.noteTitle, { textAlign: rtl ? "right" : "left" }]}>
            {copy.noteTitle}
          </Text>
          <Text style={[styles.noteBody, { textAlign: rtl ? "right" : "left" }]}>
            {copy.noteBody}
          </Text>
        </View>
        {error ? (
          <Text style={[styles.error, { textAlign: rtl ? "right" : "left" }]}>{copy.error}</Text>
        ) : null}
        <PrimaryButton disabled={!required} loading={saving} onPress={() => void finalize()}>
          {copy.submit}
        </PrimaryButton>
      </View>
    </ScreenShell>
  );
}

function ConsentCard({ label, checked, onPress, rtl }: { label: string; checked: boolean; onPress: () => void; rtl: boolean }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, checked ? styles.cardChecked : null, pressed ? styles.pressed : null]}
    >
      <Text style={[styles.cardText, checked ? styles.cardTextChecked : null, { textAlign: rtl ? "right" : "left" }]}>
        {label}
      </Text>
      <Text style={styles.mark}>{checked ? "✓" : "○"}</Text>
    </Pressable>
  );
}

function consentCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "الخطوة الأخيرة",
      title: "موافقتك واضحة ومحددة",
      body: "نحفظ نسخة وتاريخ كل موافقة. تأكيد الهاتف يثبت ملكية الرقم فقط ولا يعني توثيق الهوية.",
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
  card: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  cardChecked: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  cardText: { flex: 1, color: colors.foreground, fontSize: 14, lineHeight: 23, fontWeight: "600" },
  cardTextChecked: { color: colors.primary, fontWeight: "800" },
  mark: { color: colors.primary, fontSize: 21, fontWeight: "800" },
  pressed: { opacity: 0.84 },
  note: { padding: 15, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  noteTitle: { color: colors.primary, fontWeight: "800", fontSize: 14 },
  noteBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 5 },
  error: { color: "#A33A3A", fontSize: 13, fontWeight: "700" },
});
