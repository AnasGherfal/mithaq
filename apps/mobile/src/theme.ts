export const colors = {
  background: "#F4F0E6",
  backgroundDeep: "#ECE6D8",
  surface: "#FFFDF8",
  surfaceRaised: "#FFFFFF",
  surfaceMuted: "#F8F5ED",
  foreground: "#12211B",
  muted: "#65716A",
  mutedSoft: "#8C968F",
  primary: "#0B4A3B",
  primaryStrong: "#07382E",
  primarySoft: "#E7EFEA",
  primaryWash: "#F0F5F1",
  border: "#D8D3C6",
  borderStrong: "#C7C0B0",
  gold: "#AA8240",
  goldSoft: "#F3E9D3",
  danger: "#A33C3F",
  white: "#FFFFFF",
  scrim: "rgba(18, 33, 27, 0.08)",
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  xl: 34,
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
    shadowOpacity: 0.08,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
  },
  button: {
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
} as const;
