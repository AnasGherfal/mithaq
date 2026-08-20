export const colors = {
  background: "#FFF8F4",
  backgroundDeep: "#F4E9E3",
  surface: "#FFFCFA",
  surfaceRaised: "#FFFFFF",
  surfaceMuted: "#F8F0EC",
  foreground: "#17243B",
  muted: "#70696B",
  mutedSoft: "#A39898",

  // Interactive teal: intentionally darker than the logo teal so white button
  // text remains readable while the product still feels connected to the mark.
  primary: "#08747A",
  primaryStrong: "#075964",
  primarySoft: "#D7EEEC",
  primaryWash: "#EFF8F6",

  // The supplied Mithaq mark remains the source of truth for brand accents.
  brandNavy: "#08345E",
  brandTeal: "#04909B",
  brandGold: "#D09C51",

  // A restrained rose accent adds warmth to introductions and guided moments
  // without turning the product into a playful swipe app.
  accent: "#A95661",
  accentSoft: "#F1D7D9",
  accentWash: "#FCF0F1",

  border: "#EDE1DB",
  borderStrong: "#DCCEC7",
  gold: "#8E6227",
  goldSoft: "#F7E8C9",
  danger: "#B64658",
  white: "#FFFFFF",
  scrim: "rgba(23, 36, 59, 0.10)",
} as const;

export const radius = {
  sm: 12,
  md: 18,
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
    shadowColor: colors.brandNavy,
    shadowOpacity: 0.055,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  button: {
    shadowColor: colors.primaryStrong,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  navigation: {
    shadowColor: colors.brandNavy,
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 9,
  },
} as const;
