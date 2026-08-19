export const colors = {
  background: "#F7F8F6",
  backgroundDeep: "#EEF0EC",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  surfaceMuted: "#F1F3F0",
  foreground: "#111A17",
  muted: "#63706A",
  mutedSoft: "#8D9792",
  primary: "#125846",
  primaryStrong: "#0C4234",
  primarySoft: "#DDECE6",
  primaryWash: "#EEF6F2",
  border: "#E2E6E3",
  borderStrong: "#CDD5D1",
  gold: "#AE8750",
  goldSoft: "#F5EDE1",
  danger: "#B4233F",
  white: "#FFFFFF",
  scrim: "rgba(17, 26, 23, 0.08)",
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
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
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  button: {
    shadowColor: colors.primary,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  navigation: {
    shadowColor: colors.foreground,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -5 },
    elevation: 10,
  },
} as const;
