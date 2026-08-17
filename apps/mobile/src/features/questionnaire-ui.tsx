import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, shadows } from "@/theme";

export function textAlign(rtl: boolean) {
  return { textAlign: rtl ? ("right" as const) : ("left" as const) };
}

export function SectionTitle({ title, body, rtl }: { title: string; body: string; rtl: boolean }) {
  return (
    <View style={[styles.sectionHeading, rtl ? styles.sectionHeadingRtl : null]}>
      <View style={styles.sectionAccent} />
      <View style={styles.sectionCopy}>
        <Text style={[styles.sectionTitle, textAlign(rtl)]}>{title}</Text>
        <Text style={[styles.sectionBody, textAlign(rtl)]}>{body}</Text>
      </View>
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
      style={({ pressed }) => [styles.toggle, value ? styles.toggleSelected : null, pressed ? styles.pressed : null]}
    >
      <Text style={[styles.choiceText, value ? styles.choiceTextSelected : null, textAlign(rtl)]}>{label}</Text>
      <View style={[styles.toggleMark, value ? styles.toggleMarkActive : null]}>
        <Text style={[styles.checkMark, value ? styles.checkMarkActive : null]}>{value ? "✓" : ""}</Text>
      </View>
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
        placeholderTextColor={colors.mutedSoft}
        selectionColor={colors.primary}
      />
      {helper ? <Text style={[styles.helper, textAlign(rtl)]}>{helper}</Text> : null}
    </View>
  );
}

export function Progress({ step, rtl, labels }: { step: number; rtl: boolean; labels: string[] }) {
  return (
    <View style={[styles.progress, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      {labels.map((label, index) => {
        const complete = index + 1 < step;
        const active = index + 1 === step;

        return (
          <View key={label} style={styles.progressItem}>
            <View
              style={[
                styles.progressDot,
                complete || active ? styles.progressDotActive : null,
                active ? styles.progressDotCurrent : null,
              ]}
            />
            <Text numberOfLines={1} style={[styles.progressLabel, active ? styles.progressLabelActive : null]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export const questionnaireStyles = StyleSheet.create({
  content: { gap: 28 },
  section: { gap: 18 },
  choiceStack: { gap: 10 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  ageRow: { flexDirection: "row", gap: 12 },
  ageField: { flex: 1 },
  reassurance: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryWash,
    padding: 18,
  },
  reassuranceTitle: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  reassuranceBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 7 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 20, fontWeight: "700" },
  footerButtons: { gap: 12 },
});

const styles = StyleSheet.create({
  sectionHeading: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  sectionHeadingRtl: { flexDirection: "row-reverse" },
  sectionAccent: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.gold,
  },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: colors.foreground, fontSize: 22, lineHeight: 29, fontWeight: "800" },
  sectionBody: { color: colors.muted, fontSize: 14, lineHeight: 23, marginTop: 6 },
  label: { color: colors.foreground, fontSize: 13, fontWeight: "800", marginBottom: 9 },
  choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  choice: {
    minHeight: 54,
    flexGrow: 1,
    flexBasis: "46%",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: colors.surfaceMuted,
  },
  choiceCompact: { flexGrow: 0, flexBasis: "auto", minHeight: 44 },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryWash,
    ...shadows.card,
    shadowOpacity: 0.045,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  choiceIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceIndicatorSelected: { borderColor: colors.primary },
  choiceIndicatorCore: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  choiceText: { flexShrink: 1, color: colors.foreground, fontSize: 14, fontWeight: "600" },
  choiceTextSelected: { color: colors.primary, fontWeight: "800" },
  toggle: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 15,
    paddingVertical: 13,
    backgroundColor: colors.surfaceMuted,
  },
  toggleSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryWash,
  },
  toggleMark: {
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleMarkActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkMark: { color: colors.muted, fontSize: 14, fontWeight: "900" },
  checkMarkActive: { color: colors.white },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 15,
    color: colors.foreground,
    backgroundColor: colors.surfaceRaised,
    fontSize: 16,
  },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 7 },
  progress: {
    gap: 9,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
  },
  progressItem: { flex: 1, alignItems: "center", gap: 8 },
  progressDot: {
    width: "100%",
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  progressDotActive: { backgroundColor: colors.primary },
  progressDotCurrent: { backgroundColor: colors.gold },
  progressLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  progressLabelActive: { color: colors.foreground, fontWeight: "800" },
});
