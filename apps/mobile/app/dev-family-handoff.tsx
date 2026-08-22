import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import type { MobileLocale } from "@/i18n";
import { colors, radius, shadows } from "@/theme";

type DemoContact = {
  name: string;
  relationship: string;
  phone: string;
};

export default function DevFamilyHandoffScreen() {
  if (!__DEV__) return null;
  return <DevFamilyHandoffContent />;
}

function DevFamilyHandoffContent() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => familyCopy(locale), [locale]);
  const [selected, setSelected] = useState(0);
  const [confirmShare, setConfirmShare] = useState(false);
  const [myShared, setMyShared] = useState(false);
  const [otherShared, setOtherShared] = useState(false);

  const contacts: DemoContact[] = locale === "ar"
    ? [
        { name: "أحمد", relationship: "أخ", phone: "+218 91 000 1111" },
        { name: "خالد", relationship: "أب", phone: "+218 92 000 2222" },
      ]
    : [
        { name: "Ahmed", relationship: "Brother", phone: "+218 91 000 1111" },
        { name: "Khaled", relationship: "Father", phone: "+218 92 000 2222" },
      ];
  const chosen = contacts[selected]!;

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={<PrimaryButton tone="quiet" onPress={() => router.back()}>{copy.back}</PrimaryButton>}
    >
      <View style={styles.stack}>
        <View style={styles.devCard}>
          <Text style={[styles.devTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.devTitle}</Text>
          <Text style={[styles.devBody, { textAlign: rtl ? "right" : "left" }]}>{copy.devBody}</Text>
        </View>

        <View style={styles.photoCard}>
          <Text style={[styles.kicker, { textAlign: rtl ? "right" : "left" }]}>{copy.photoKicker}</Text>
          <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>
            {myShared ? copy.photoOpened : copy.photoPrivate}
          </Text>
          <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left" }]}>
            {myShared ? copy.photoOpenedBody : copy.photoPrivateBody}
          </Text>
        </View>

        {otherShared ? (
          <View style={styles.otherCard}>
            <Text style={[styles.kicker, { textAlign: rtl ? "right" : "left" }]}>{copy.theirKicker}</Text>
            <Text style={[styles.contactName, { textAlign: rtl ? "right" : "left" }]}>{locale === "ar" ? "فاطمة" : "Fatima"}</Text>
            <Text style={[styles.contactMeta, { textAlign: rtl ? "right" : "left" }]}>{locale === "ar" ? "الأم" : "Mother"}</Text>
            <Text style={styles.phone}>+218 91 000 3333</Text>
            <Text style={[styles.smallNote, { textAlign: rtl ? "right" : "left" }]}>{copy.theirNote}</Text>
          </View>
        ) : (
          <View style={styles.waitingCard}>
            <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.theirWaiting}</Text>
            <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left" }]}>{copy.theirWaitingBody}</Text>
            <PrimaryButton tone="quiet" onPress={() => setOtherShared(true)}>{copy.simulateTheirShare}</PrimaryButton>
          </View>
        )}

        {!myShared ? (
          <View style={styles.shareCard}>
            <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.chooseTitle}</Text>
            <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left" }]}>{copy.chooseBody}</Text>
            <View style={styles.contactList}>
              {contacts.map((contact, index) => (
                <Pressable
                  key={contact.phone}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: index === selected }}
                  onPress={() => {
                    setSelected(index);
                    setConfirmShare(false);
                  }}
                  style={[styles.contactCard, index === selected ? styles.contactCardSelected : null]}
                >
                  <View style={[styles.contactRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                    <View style={[styles.radio, index === selected ? styles.radioSelected : null]}>
                      {index === selected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.contactName, { textAlign: rtl ? "right" : "left" }]}>{contact.name}</Text>
                      <Text style={[styles.contactMeta, { textAlign: rtl ? "right" : "left" }]}>{contact.relationship} · {contact.phone}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>

            {confirmShare ? (
              <View style={styles.confirmCard}>
                <Text style={[styles.confirmTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.confirmTitle}</Text>
                <Text style={[styles.confirmBody, { textAlign: rtl ? "right" : "left" }]}>{copy.confirmBody(chosen.name, chosen.phone)}</Text>
                <Text style={[styles.smallNote, { textAlign: rtl ? "right" : "left" }]}>{copy.noUndo}</Text>
              </View>
            ) : null}

            <PrimaryButton
              onPress={() => {
                if (!confirmShare) {
                  setConfirmShare(true);
                  return;
                }
                setMyShared(true);
                setConfirmShare(false);
              }}
            >
              {confirmShare ? copy.confirmButton : copy.shareButton}
            </PrimaryButton>
            {confirmShare ? <PrimaryButton tone="quiet" onPress={() => setConfirmShare(false)}>{copy.cancel}</PrimaryButton> : null}
          </View>
        ) : (
          <View style={styles.successCard}>
            <Text style={[styles.successTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.sharedTitle}</Text>
            <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left" }]}>{copy.sharedBody(chosen.name)}</Text>
            <Text style={[styles.smallNote, { textAlign: rtl ? "right" : "left" }]}>{copy.noUndo}</Text>
          </View>
        )}

        <View style={styles.ruleCard}>
          <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.noAutomaticTitle}</Text>
          <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left" }]}>{copy.noAutomaticBody}</Text>
        </View>

        <PrimaryButton
          tone="quiet"
          onPress={() => {
            setSelected(0);
            setConfirmShare(false);
            setMyShared(false);
            setOtherShared(false);
          }}
        >
          {copy.reset}
        </PrimaryButton>
      </View>
    </ScreenShell>
  );
}

function familyCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  return {
    eyebrow: ar ? "مختبر دائرة الثقة" : "TRUSTED CIRCLE TEST LAB",
    title: ar ? "جرّب التسليم العائلي" : "Test the family handoff",
    body: ar ? "معاينة محلية فقط لا تحفظ أرقاماً ولا تراسل أحداً." : "A local-only preview that saves no numbers and contacts nobody.",
    back: ar ? "رجوع" : "Back",
    devTitle: ar ? "للتطوير فقط" : "Development only",
    devBody: ar ? "الأسماء والأرقام أدناه تجريبية ولا تمثل أعضاء أو جهات اتصال حقيقية." : "The names and numbers below are samples and do not represent real members or contacts.",
    photoKicker: ar ? "خيار الصورة: بعد إشراك العائلة" : "PHOTO CHOICE: AFTER FAMILY INVOLVEMENT",
    photoPrivate: ar ? "صورتك ما زالت خاصة" : "Your photo is still private",
    photoPrivateBody: ar ? "محاكاة مشاركة الطرف الآخر وحدها لا تكشف صورتك. يجب أن تبدأ أنت مرحلة العائلة لصورتك." : "The other member sharing first does not reveal your photo. You must start the family stage for your own photo.",
    photoOpened: ar ? "بدأت مرحلة العائلة لصورتك" : "Your family stage has started",
    photoOpenedBody: ar ? "بعد مشاركة جهة اتصالك أنت، يمكن لصورتك اتباع خيار «بعد إشراك العائلة» لهذا التعارف." : "After you share your own trusted contact, your photo can follow the “after family involvement” setting for this introduction.",
    theirKicker: ar ? "جهة اتصال الطرف الآخر" : "OTHER MEMBER’S TRUSTED CONTACT",
    theirNote: ar ? "هذه البيانات تظهر فقط لأن الطرف الآخر اختار مشاركتها في التعارف." : "These details appear only because the other member chose to share them in the introduction.",
    theirWaiting: ar ? "الطرف الآخر لم يشارك جهة اتصال بعد" : "The other member has not shared a contact yet",
    theirWaitingBody: ar ? "لا يلزم أن يشارك الطرفان في نفس الوقت." : "Both people do not have to share at the same time.",
    simulateTheirShare: ar ? "محاكاة مشاركة الطرف الآخر" : "Simulate their contact share",
    chooseTitle: ar ? "اختر شخصاً واحداً" : "Choose one trusted contact",
    chooseBody: ar ? "الاختيار هنا لا يرسل شيئاً حتى تؤكد المشاركة مرتين." : "Selecting a contact sends nothing until you explicitly confirm the share.",
    confirmTitle: ar ? "تأكيد المشاركة" : "Confirm sharing",
    confirmBody: (name: string, phone: string) => ar ? `سيتمكن الطرف الآخر من رؤية ${name} ورقم ${phone}. ميثاق لن يراسله.` : `The other member will be able to see ${name} and ${phone}. Mithaq will not message them.`,
    noUndo: ar ? "بعد أن يرى الطرف الآخر الرقم لا يمكن جعله كأنه لم يُرَ، لذلك لا يوجد زر تراجع مضلل." : "Once the other member has seen the number, it cannot be made unseen, so there is no misleading undo button.",
    shareButton: ar ? "مشاركة جهة الاتصال" : "Share trusted contact",
    confirmButton: ar ? "نعم، شارك هذه البيانات" : "Yes, share these details",
    cancel: ar ? "إلغاء" : "Cancel",
    sharedTitle: ar ? "تمت المشاركة في المعاينة" : "Shared in this preview",
    sharedBody: (name: string) => ar ? `يمكن للطرف الآخر الآن رؤية بيانات ${name} في سيناريو الاختبار.` : `The other member can now see ${name}’s details in this test scenario.`,
    noAutomaticTitle: ar ? "ميثاق لا يتواصل مع العائلة تلقائياً" : "Mithaq does not contact family automatically",
    noAutomaticBody: ar ? "النسخة الأولى تشارك جهة الاتصال بين العضوين فقط. لا SMS ولا مكالمة ولا دعوة تُرسل للطرف الثالث." : "V1 shares the contact between the two members only. No SMS, call, or invitation is sent to the third party.",
    reset: ar ? "إعادة تجربة السيناريو" : "Reset the scenario",
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, stack: { width: "100%", gap: 14 },
  devCard: { borderRadius: radius.lg, backgroundColor: colors.goldSoft, padding: 14 }, devTitle: { color: colors.gold, fontSize: 12, fontWeight: "900" }, devBody: { color: colors.muted, fontSize: 10, lineHeight: 17, marginTop: 3 },
  photoCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.primaryWash, padding: 15 }, kicker: { color: colors.primary, fontSize: 9, fontWeight: "900" }, sectionTitle: { color: colors.foreground, fontSize: 14, lineHeight: 22, fontWeight: "900", marginTop: 4 }, sectionBody: { color: colors.muted, fontSize: 10, lineHeight: 18, marginTop: 3 },
  otherCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.surfaceRaised, padding: 15, ...shadows.card }, waitingCard: { borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, padding: 14, gap: 8 }, shareCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 15, gap: 10, ...shadows.card }, successCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.primaryWash, padding: 15 }, successTitle: { color: colors.primaryStrong, fontSize: 14, fontWeight: "900" },
  contactList: { gap: 7 }, contactCard: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 12 }, contactCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryWash }, contactRow: { alignItems: "center", gap: 10 }, radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" }, radioSelected: { borderColor: colors.primary }, radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary }, contactName: { color: colors.foreground, fontSize: 14, fontWeight: "900" }, contactMeta: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 2 }, phone: { color: colors.primaryStrong, fontSize: 17, fontWeight: "900", textAlign: "left", writingDirection: "ltr", marginTop: 8 }, smallNote: { color: colors.muted, fontSize: 9, lineHeight: 16, marginTop: 6 },
  confirmCard: { borderRadius: radius.md, backgroundColor: colors.goldSoft, padding: 12 }, confirmTitle: { color: colors.foreground, fontSize: 12, fontWeight: "900" }, confirmBody: { color: colors.muted, fontSize: 10, lineHeight: 17, marginTop: 3 }, ruleCard: { borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, padding: 14 },
});
