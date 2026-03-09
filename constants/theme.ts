import { Platform } from 'react-native';

export const Colors = {
  // Brand Colors
  brandHoney: '#F3C742',
  brandInk: '#251B10',
  brandCream: '#FFF6DC',
  brandSand: '#EFD9A2',
  brandMint: '#EAF7F0',

  // Surfaces
  surfaceSoft: '#F8F4EA',
  surfaceAlt: '#FBF7ED',
  background: '#FFF9EF', // Main background from pen
  card: '#FFFFFF',

  // UI Colors
  text: '#11181C',
  foreground: '#251B10',
  mutedForeground: '#7A6A58',
  border: '#EFD9A2',

  // Status Colors
  colorSuccess: '#10B981',
  colorError: '#EF4444',
  colorWarning: '#F59E0B',
  colorInfo: '#3B82F6',

  // Tab Bar
  tabIconDefault: '#7A6A58',
  tabIconSelected: '#251B10',
};

// Asymmetric Corner Radius [14, 0, 14, 14]
export const Radius = {
  button: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 14,
  },
  card: 24,
  small: 8,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sidebar: {
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 24,
    elevation: 5,
  }
};

export const Fonts = Platform.select({
  ios: {
    sans: 'Pretendard',
  },
  android: {
    sans: 'Pretendard',
  },
  default: {
    sans: 'Pretendard, Outfit, sans-serif',
  },
});
