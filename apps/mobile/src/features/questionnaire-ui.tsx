import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius } from "@/theme";

export function textAlign(rtl: boolean) {
  return {
    textAlign: rtl ? ("right" as const) : ("left" as const),
    writingDirection: rtl ? ("rtl" as const) : ("ltr" as const),
  };
}

export function SectionTitle({ title, body, rtl }: { title: string; body: string; rtl: boolean }) {
  return (
    <View style={[styles.sectionHeading, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
      <Text style={[styles.sectionTitle, textAlign(rtl)]}>{title}</Text>
      <Text style={[styles.sectionBody, textAlign(rtl)]}>{body}</Text>
    </View>
  );
}

export function Label({ children, rtl }: { children: string; rtl: boolean }) {
  return <Text style={[styles.label, textAlign(rtl)]}>{children}</Text>;
}

export function ChoiceGrid({ children, rtl = false }: { children: ReactNode; rtl?: boolean }) {
  return <View style={[styles.choiceGrid, { flexDirection: rtl ? "row-reverse" : "row" }]}>{children}</View>;
}

export function Choice({
  label,
  selected,
  onPress,
  rtl,
  compact = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  rtl: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        compact ? styles.choiceCompact : null,
        selected ? styles.choiceSelected : null,
        { flexDirection: rtl ? "row-reverse" : "row" },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.choiceIndicator, selected ? styles.choiceIndicatorSelected : null]}>
        {selected ? <View style={styles.choiceIndicatorCore} /> : null}
      </View>
      <Text style={[styles.choiceText, selected ? styles.choiceTextSelected : null, textAlign(rtl)]}>{label}</Text>
    </Pressable>
  );
}

export function ToggleCard({
  label,
  value,
  onChange,
  rtl,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  rtl: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [
        styles.toggle,
        value ? styles.toggleSelected : null,
        { flexDirection: rtl ? "row-reverse" : "row" },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.toggleMark, value ? styles.toggleMarkActive : null]}>
        <Text style={[styles.checkMark, value ? styles.checkMarkActive : null]}>{value ? "✓" : ""}</Text>
      </View>
      <Text style={[styles.choiceText, value ? styles.choiceTextSelected : null, textAlign(rtl)]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  helper,
  value,
  onChange,
  rtl,
  autoCapitalize = "sentences",
  keyboardType = "default",
}: {
  label: string;
  helper?: string;
  value: string;
  onChange: (value: string) => void;
  rtl: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View style={styles.field}>
      <Label rtl={rtl}>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        style={[styles.input, textAlign(rtl)]}
        placeholderTextColor={colors.mutedSoft}
        selectionColor={colors.primary}
      />
      {helper ? <Text style={[styles.helper, textAlign(rtl)]}>{helper}</Text> : null}
    </View>
  );
}

export function Progress({ step, rtl, labels }: { step: number; rtl: boolean; labels: string[] }) {
  const currentLabel = labels[step - 1] ?? "";

  return (
    <View style={styles.progress}>
      <View style={[styles.progressTop, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <Text style={[styles.progressCurrent, textAlign(rtl)]}>{currentLabel}</Text>
        <Text style={styles.progressCount}>
          {step}/{labels.length}
        </Text>
      </View>
      <View style={[styles.progressSegments, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        {labels.map((label, index) => {
          const complete = index + 1 < step;
          const active = index + 1 === step;
          return (
            <View
              key={label}
              style={[
                styles.progressSegment,
                complete ? styles.progressSegmentComplete : null,
                active ? styles.progressSegmentActive : null,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

export const questionnaireStyles = StyleSheet.create({
  content: { gap: 22 },
  section: { gap: 18 },
  choiceStack: { gap: 9 },
  chipWrap: { flexWrap: "wrap", gap: 9 },
  ageRow: { gap: 12 },
  ageField: { flex: 1 },
  reassurance: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primaryWash,
    padding: 18,
  },
  reassuranceTitle: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "800",
  },
  reassuranceBody: { color: colors.muted, fontSize: 13, lineHeight: 22, marginTop: 6 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 21, fontWeight: "700" },
  footerButtons: { gap: 12 },
});

const styles = StyleSheet.create({
  sectionHeading: { width: "100%" },
  sectionTitle: {
    width: "100%",
    color: colors.foreground,
    fontSize: 22,
    lineHeight: 34,
    fontWeight: "800",
  },
  sectionBody: {
    width: "100%",
    color: colors.muted,
    fontSize: 14,
    lineHeight: 24,
    marginTop: 5,
  },
  label: {
    width: "100%",
    color: colors.foreground,
    fontSize: 13,
    lineHeight: 21,
    fontWeight: "800",
    marginBottom: 9,
  },
  choiceGrid: { flexWrap: "wrap", gap: 10 },
  choice: {
    minHeight: 56,
    flexGrow: 1,
    flexBasis: "46%",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: colors.surfaceRaised,
  },
  choiceCompact: { flexGrow: 0, flexBasis: "auto", minHeight: 46 },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primaryWash },
  choiceIndicator: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceIndicatorSelected: { borderColor: colors.primary },
  choiceIndicatorCore: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  choiceText: {
    flex: 1,
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: 0,
  },
  choiceTextSelected: { color: colors.primary, fontWeight: "800" },
  toggle: {
    minHeight: 60,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 15,
    paddingVertical: 13,
    backgroundColor: colors.surfaceRaised,
  },
  toggleSelected: { borderColor: colors.primary, backgroundColor: colors.primaryWash },
  toggleMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleMarkActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkMark: { color: colors.muted, fontSize: 14, lineHeight: 18, fontWeight: "900" },
  checkMarkActive: { color: colors.white },
  pressed: { opacity: 0.72, transform: [{ scale: 0.992 }] },
  field: { width: "100%" },
  input: {
    minHeight: 57,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 15,
    color: colors.foreground,
    backgroundColor: colors.surfaceRaised,
    fontSize: 16,
    lineHeight: 23,
  },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 7 },
  progress: { width: "100%" },
  progressTop: { alignItems: "center", justifyContent: "space-between", gap: 12 },
  progressCurrent: {
    flex: 1,
    color: colors.foreground,
    fontSize: 12,
    lineHeight: 20,
    fontWeight: "800",
  },
  progressCount: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 18,
    fontWeight: "800",
  },
  progressSegments: { width: "100%", gap: 5, marginTop: 9 },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressSegmentComplete: { backgroundColor: colors.primarySoft },
  progressSegmentActive: { backgroundColor: colors.primary },
});
