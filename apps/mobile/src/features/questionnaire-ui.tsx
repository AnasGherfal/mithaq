import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius } from "@/theme";

export function textAlign(rtl: boolean) {
  return { textAlign: rtl ? ("right" as const) : ("left" as const) };
}

export function SectionTitle({ title, body, rtl }: { title: string; body: string; rtl: boolean }) {
  return (
    <View>
      <Text style={[styles.sectionTitle, textAlign(rtl)]}>{title}</Text>
      <Text style={[styles.sectionBody, textAlign(rtl)]}>{body}</Text>
    </View>
  );
}

export function Label({ children, rtl }: { children: string; rtl: boolean }) {
  return <Text style={[styles.label, textAlign(rtl)]}>{children}</Text>;
}

export function ChoiceGrid({ children }: { children: ReactNode }) {
  return <View style={styles.choiceGrid}>{children}</View>;
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
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.choiceIndicator, selected ? styles.choiceIndicatorSelected : null]} />
      <Text style={[styles.choiceText, selected ? styles.choiceTextSelected : null, textAlign(rtl)]}>
        {label}
      </Text>
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
        value ? styles.choiceSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.choiceText, value ? styles.choiceTextSelected : null, textAlign(rtl)]}>
        {label}
      </Text>
      <Text style={styles.checkMark}>{value ? "✓" : "○"}</Text>
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
    <View>
      <Label rtl={rtl}>{label}</Label>
      <TextInput
        value={value}
        onChangeText={onChange}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        style={[styles.input, textAlign(rtl)]}
        placeholderTextColor={colors.muted}
      />
      {helper ? <Text style={[styles.helper, textAlign(rtl)]}>{helper}</Text> : null}
    </View>
  );
}

export function Progress({ step, rtl, labels }: { step: number; rtl: boolean; labels: string[] }) {
  return (
    <View style={[styles.progress, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      {labels.map((label, index) => (
        <View key={label} style={styles.progressItem}>
          <View style={[styles.progressDot, index + 1 <= step ? styles.progressDotActive : null]} />
          <Text
            numberOfLines={1}
            style={[styles.progressLabel, index + 1 === step ? styles.progressLabelActive : null]}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export const questionnaireStyles = StyleSheet.create({
  content: { gap: 24 },
  section: { gap: 16 },
  choiceStack: { gap: 8 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ageRow: { flexDirection: "row", gap: 10 },
  ageField: { flex: 1 },
  reassurance: { borderRadius: radius.md, backgroundColor: colors.primarySoft, padding: 16 },
  reassuranceTitle: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  reassuranceBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 6 },
  error: { color: "#A33A3A", fontSize: 13, lineHeight: 20, fontWeight: "700" },
  footerButtons: { gap: 10 },
});

const styles = StyleSheet.create({
  sectionTitle: { color: colors.foreground, fontSize: 21, fontWeight: "800" },
  sectionBody: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 5 },
  label: { color: colors.foreground, fontSize: 13, fontWeight: "800", marginBottom: 8 },
  choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    minHeight: 50,
    flexGrow: 1,
    flexBasis: "46%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: colors.background,
  },
  choiceCompact: { flexGrow: 0, flexBasis: "auto", minHeight: 42 },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceIndicator: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.border },
  choiceIndicatorSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  choiceText: { flexShrink: 1, color: colors.foreground, fontSize: 14, fontWeight: "600" },
  choiceTextSelected: { color: colors.primary, fontWeight: "800" },
  toggle: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    backgroundColor: colors.background,
  },
  checkMark: { color: colors.primary, fontSize: 20, fontWeight: "800" },
  pressed: { opacity: 0.82 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    color: colors.foreground,
    backgroundColor: colors.background,
    fontSize: 16,
  },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  progress: { gap: 8 },
  progressItem: { flex: 1, alignItems: "center", gap: 7 },
  progressDot: { width: "100%", height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.primary },
  progressLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  progressLabelActive: { color: colors.primary },
});
