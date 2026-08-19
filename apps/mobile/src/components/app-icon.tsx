import { StyleSheet, View } from "react-native";
import { colors } from "@/theme";

type IconName = "home" | "introductions" | "activity" | "account" | "sliders" | "chat" | "back";

type Props = {
  name: IconName;
  active?: boolean;
  size?: number;
};

export function AppIcon({ name, active = false, size = 22 }: Props) {
  const color = active ? colors.primary : colors.mutedSoft;
  const scale = size / 22;

  if (name === "home") {
    return (
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View style={[styles.homeRoof, { borderColor: color, transform: [{ rotate: "45deg" }, { scale }] }]} />
        <View style={[styles.homeBody, { borderColor: color, transform: [{ scale }] }]} />
      </View>
    );
  }

  if (name === "introductions") {
    return (
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View style={[styles.ring, styles.ringLeft, { borderColor: color, transform: [{ scale }] }]} />
        <View style={[styles.ring, styles.ringRight, { borderColor: color, transform: [{ scale }] }]} />
      </View>
    );
  }

  if (name === "activity") {
    return (
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View style={[styles.bell, { borderColor: color, transform: [{ scale }] }]} />
        <View style={[styles.bellDot, { backgroundColor: color, transform: [{ scale }] }]} />
      </View>
    );
  }

  if (name === "account") {
    return (
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View style={[styles.head, { borderColor: color, transform: [{ scale }] }]} />
        <View style={[styles.shoulders, { borderColor: color, transform: [{ scale }] }]} />
      </View>
    );
  }

  if (name === "sliders") {
    return (
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View style={[styles.sliderLine, { top: 5, backgroundColor: color }]} /><View style={[styles.sliderKnob, { top: 2, left: 5, borderColor: color }]} />
        <View style={[styles.sliderLine, { top: 10, backgroundColor: color }]} /><View style={[styles.sliderKnob, { top: 7, right: 4, borderColor: color }]} />
        <View style={[styles.sliderLine, { top: 15, backgroundColor: color }]} /><View style={[styles.sliderKnob, { top: 12, left: 9, borderColor: color }]} />
      </View>
    );
  }

  if (name === "chat") {
    return (
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View style={[styles.chat, { borderColor: color, transform: [{ scale }] }]} />
      </View>
    );
  }

  return (
    <View style={[styles.canvas, { width: size, height: size }]}>
      <View style={[styles.backLine, { backgroundColor: color }]} />
      <View style={[styles.backHead, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { position: "relative", alignItems: "center", justifyContent: "center" },
  homeRoof: { position: "absolute", top: 3, width: 12, height: 12, borderLeftWidth: 1.8, borderTopWidth: 1.8, borderRadius: 2 },
  homeBody: { position: "absolute", bottom: 3, width: 14, height: 11, borderWidth: 1.8, borderTopWidth: 0, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  ring: { position: "absolute", width: 12, height: 16, borderWidth: 1.8, borderRadius: 7 },
  ringLeft: { left: 2, transform: [{ rotate: "-22deg" }] },
  ringRight: { right: 2, transform: [{ rotate: "22deg" }] },
  bell: { width: 14, height: 15, borderWidth: 1.8, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomWidth: 1.8 },
  bellDot: { position: "absolute", bottom: 2, width: 4, height: 2, borderRadius: 2 },
  head: { position: "absolute", top: 2, width: 8, height: 8, borderRadius: 4, borderWidth: 1.8 },
  shoulders: { position: "absolute", bottom: 2, width: 16, height: 9, borderWidth: 1.8, borderBottomWidth: 0, borderTopLeftRadius: 9, borderTopRightRadius: 9 },
  sliderLine: { position: "absolute", left: 2, right: 2, height: 1.5, borderRadius: 1 },
  sliderKnob: { position: "absolute", width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, backgroundColor: colors.background },
  chat: { width: 17, height: 13, borderWidth: 1.8, borderRadius: 5 },
  backLine: { width: 15, height: 1.7, borderRadius: 1 },
  backHead: { position: "absolute", left: 3, width: 8, height: 8, borderLeftWidth: 1.7, borderBottomWidth: 1.7, transform: [{ rotate: "45deg" }] },
});
