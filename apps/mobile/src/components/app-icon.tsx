import { StyleSheet, View } from "react-native";
import { colors } from "@/theme";

export type AppIconName =
  | "home"
  | "introductions"
  | "activity"
  | "account"
  | "sliders"
  | "chat"
  | "back"
  | "chevron"
  | "shield"
  | "privacy"
  | "language"
  | "logout"
  | "photo"
  | "trash";

type Props = {
  name: AppIconName;
  active?: boolean;
  size?: number;
  rtl?: boolean;
};

export function AppIcon({ name, active = false, size = 22, rtl = false }: Props) {
  const color = active ? colors.primary : colors.mutedSoft;
  const scale = size / 22;

  if (name === "home") {
    return (
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View
          style={[
            styles.homeRoof,
            { borderColor: color, transform: [{ rotate: "45deg" }, { scale }] },
          ]}
        />
        <View style={[styles.homeBody, { borderColor: color, transform: [{ scale }] }]} />
      </View>
    );
  }

  if (name === "introductions") {
    return (
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View
          style={[
            styles.ring,
            styles.ringLeft,
            { borderColor: color, transform: [{ rotate: "-22deg" }, { scale }] },
          ]}
        />
        <View
          style={[
            styles.ring,
            styles.ringRight,
            { borderColor: color, transform: [{ rotate: "22deg" }, { scale }] },
          ]}
        />
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
        <View style={[styles.sliderLine, { top: 5, backgroundColor: color }]} />
        <View style={[styles.sliderKnob, { top: 2, left: 5, borderColor: color }]} />
        <View style={[styles.sliderLine, { top: 10, backgroundColor: color }]} />
        <View style={[styles.sliderKnob, { top: 7, right: 4, borderColor: color }]} />
        <View style={[styles.sliderLine, { top: 15, backgroundColor: color }]} />
        <View style={[styles.sliderKnob, { top: 12, left: 9, borderColor: color }]} />
      </View>
    );
  }

  if (name === "chat") {
    return (
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View style={[styles.chat, { borderColor: color, transform: [{ scale }] }]} />
        <View style={[styles.chatTail, { borderColor: color, transform: [{ scale }] }]} />
      </View>
    );
  }

  if (name === "shield") {
    return (
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View style={[styles.shield, { borderColor: color, transform: [{ scale }] }]} />
        <View style={[styles.shieldCheckStart, { backgroundColor: color }]} />
        <View style={[styles.shieldCheckEnd, { backgroundColor: color }]} />
      </View>
    );
  }

  if (name === "privacy") {
    return (
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View style={[styles.lockShackle, { borderColor: color, transform: [{ scale }] }]} />
        <View style={[styles.lockBody, { borderColor: color, transform: [{ scale }] }]} />
        <View style={[styles.lockKeyhole, { backgroundColor: color }]} />
      </View>
    );
  }

  if (name === "photo") {
    return (
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View style={[styles.photoFrame, { borderColor: color, transform: [{ scale }] }]} />
        <View style={[styles.photoSun, { borderColor: color, transform: [{ scale }] }]} />
        <View style={[styles.photoMountainStart, { borderColor: color }]} />
        <View style={[styles.photoMountainEnd, { borderColor: color }]} />
      </View>
    );
  }

  if (name === "trash") {
    return (
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View style={[styles.trashLid, { backgroundColor: color }]} />
        <View style={[styles.trashHandle, { borderColor: color }]} />
        <View style={[styles.trashBody, { borderColor: color, transform: [{ scale }] }]} />
      </View>
    );
  }

  if (name === "language") {
    return (
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View style={[styles.globe, { borderColor: color, transform: [{ scale }] }]} />
        <View style={[styles.globeVertical, { borderColor: color }]} />
        <View style={[styles.globeHorizontal, { backgroundColor: color }]} />
      </View>
    );
  }

  if (name === "logout") {
    return (
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View style={[styles.logoutDoor, { borderColor: color }]} />
        <View style={[styles.logoutLine, { backgroundColor: color }]} />
        <View
          style={[
            styles.logoutHead,
            {
              borderColor: color,
              transform: [{ rotate: rtl ? "135deg" : "-45deg" }],
            },
          ]}
        />
      </View>
    );
  }

  if (name === "chevron") {
    return (
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View
          style={[
            styles.chevron,
            {
              borderColor: color,
              transform: [{ rotate: rtl ? "135deg" : "-45deg" }, { scale }],
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View style={[styles.canvas, { width: size, height: size }]}>
      <View style={[styles.backLine, { backgroundColor: color }]} />
      <View
        style={[
          styles.backHead,
          {
            borderColor: color,
            left: rtl ? undefined : 3,
            right: rtl ? 3 : undefined,
            transform: [{ rotate: rtl ? "-135deg" : "45deg" }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { position: "relative", alignItems: "center", justifyContent: "center" },
  homeRoof: {
    position: "absolute",
    top: 3,
    width: 12,
    height: 12,
    borderLeftWidth: 1.8,
    borderTopWidth: 1.8,
    borderRadius: 2,
  },
  homeBody: {
    position: "absolute",
    bottom: 3,
    width: 14,
    height: 11,
    borderWidth: 1.8,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  ring: { position: "absolute", width: 12, height: 16, borderWidth: 1.8, borderRadius: 7 },
  ringLeft: { left: 2 },
  ringRight: { right: 2 },
  bell: {
    width: 14,
    height: 15,
    borderWidth: 1.8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  bellDot: { position: "absolute", bottom: 2, width: 4, height: 2, borderRadius: 2 },
  head: {
    position: "absolute",
    top: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.8,
  },
  shoulders: {
    position: "absolute",
    bottom: 2,
    width: 16,
    height: 9,
    borderWidth: 1.8,
    borderBottomWidth: 0,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
  sliderLine: { position: "absolute", left: 2, right: 2, height: 1.5, borderRadius: 1 },
  sliderKnob: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
    backgroundColor: colors.background,
  },
  chat: { width: 17, height: 13, borderWidth: 1.8, borderRadius: 5 },
  chatTail: {
    position: "absolute",
    bottom: 3,
    left: 5,
    width: 6,
    height: 6,
    borderLeftWidth: 1.8,
    transform: [{ rotate: "-35deg" }],
  },
  shield: {
    width: 15,
    height: 18,
    borderWidth: 1.8,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  shieldCheckStart: {
    position: "absolute",
    width: 5,
    height: 1.6,
    left: 6,
    top: 12,
    transform: [{ rotate: "42deg" }],
  },
  shieldCheckEnd: {
    position: "absolute",
    width: 8,
    height: 1.6,
    left: 9,
    top: 10,
    transform: [{ rotate: "-48deg" }],
  },
  lockShackle: {
    position: "absolute",
    top: 2,
    width: 11,
    height: 10,
    borderWidth: 1.8,
    borderBottomWidth: 0,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  lockBody: {
    position: "absolute",
    bottom: 2,
    width: 17,
    height: 13,
    borderWidth: 1.8,
    borderRadius: 4,
  },
  lockKeyhole: { position: "absolute", bottom: 7, width: 3, height: 4, borderRadius: 2 },
  photoFrame: {
    width: 19,
    height: 16,
    borderWidth: 1.7,
    borderRadius: 4,
  },
  photoSun: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 4,
    height: 4,
    borderWidth: 1.3,
    borderRadius: 2,
  },
  photoMountainStart: {
    position: "absolute",
    left: 5,
    bottom: 5,
    width: 8,
    height: 8,
    borderLeftWidth: 1.5,
    borderTopWidth: 1.5,
    transform: [{ rotate: "45deg" }],
  },
  photoMountainEnd: {
    position: "absolute",
    right: 4,
    bottom: 5,
    width: 6,
    height: 6,
    borderLeftWidth: 1.5,
    borderTopWidth: 1.5,
    transform: [{ rotate: "45deg" }],
  },
  trashLid: { position: "absolute", top: 5, width: 15, height: 1.7, borderRadius: 1 },
  trashHandle: {
    position: "absolute",
    top: 2,
    width: 7,
    height: 5,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  trashBody: {
    position: "absolute",
    bottom: 3,
    width: 13,
    height: 13,
    borderWidth: 1.7,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  globe: { width: 18, height: 18, borderWidth: 1.7, borderRadius: 9 },
  globeVertical: {
    position: "absolute",
    width: 8,
    height: 18,
    borderLeftWidth: 1.3,
    borderRightWidth: 1.3,
    borderRadius: 7,
  },
  globeHorizontal: { position: "absolute", width: 17, height: 1.3, borderRadius: 1 },
  logoutDoor: {
    position: "absolute",
    left: 2,
    width: 10,
    height: 17,
    borderWidth: 1.7,
    borderRightWidth: 0,
    borderRadius: 3,
  },
  logoutLine: { position: "absolute", right: 2, width: 12, height: 1.7, borderRadius: 1 },
  logoutHead: {
    position: "absolute",
    right: 2,
    width: 7,
    height: 7,
    borderRightWidth: 1.7,
    borderBottomWidth: 1.7,
  },
  chevron: { width: 8, height: 8, borderRightWidth: 1.8, borderBottomWidth: 1.8 },
  backLine: { width: 15, height: 1.7, borderRadius: 1 },
  backHead: {
    position: "absolute",
    width: 8,
    height: 8,
    borderLeftWidth: 1.7,
    borderBottomWidth: 1.7,
  },
});
