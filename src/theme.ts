export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  colors: {
    background: string;
    card: string;
    text: string;
    muted: string;
    divider: string;
    green: string;
    yellow: string;
    red: string;
    accent: string;
    accentText: string; // text color for accent backgrounds
  };
  spacing: (n: number) => number;
  radius: number;
  shadow: {
    shadowColor: string;
    shadowOpacity: number;
    shadowRadius: number;
    shadowOffset: { width: number; height: number };
    elevation: number;
  };
}

const darkTheme: Theme = {
  colors: {
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    muted: '#BBBBBB',
    divider: '#2A2A2A',
    green: '#4CAF50',
    yellow: '#FFC107',
    red: '#F44336',
    accent: '#90CAF9',
    accentText: '#000000', // Dark text on light accent
  },
  spacing: (n: number) => 8 * n,
  radius: 12,
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
};

const lightTheme: Theme = {
  colors: {
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#000000',
    muted: '#666666',
    divider: '#E0E0E0',
    green: '#4CAF50',
    yellow: '#FFC107',
    red: '#F44336',
    accent: '#1976D2',
    accentText: '#FFFFFF', // White text on dark accent
  },
  spacing: (n: number) => 8 * n,
  radius: 12,
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
};

export { darkTheme, lightTheme };

// Default export for backwards compatibility
export const theme = darkTheme;