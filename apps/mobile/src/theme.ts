export const colors = {
  background: "#F8F7F3",
  backgroundDeep: "#F1EFE9",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  surfaceMuted: "#F3F2EE",
  foreground: "#151A17",
  muted: "#667069",
  mutedSoft: "#929A95",
  primary: "#173F34",
  primaryStrong: "#0F3028",
  primarySoft: "#EAF0ED",
  primaryWash: "#F1F5F3",
  border: "#E1E0DB",
  borderStrong: "#CFCEC7",
  gold: "#A77E45",
  goldSoft: "#F3ECDF",
  danger: "#A13E43",
  white: "#FFFFFF",
  scrim: "rgba(21, 26, 23, 0.08)",
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  xxl: 40,
} as const;

export const shadows = {
  card: {
    shadowColor: colors.foreground,
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  button: {
    shadowColor: colors.primary,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
} as const;
