import { useCallback, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { darkTheme, lightTheme, Theme, ThemeMode } from './theme';
import { loadSettings } from './storage';

export function useTheme(): { theme: Theme; themeMode: ThemeMode; effectiveScheme: 'light' | 'dark'; reloadTheme: () => void } {
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());
  const [refreshKey, setRefreshKey] = useState(0);

  const loadThemePreference = useCallback(async () => {
    const settings = await loadSettings();
    console.log('📱 Loading theme preference:', settings?.themeMode);
    if (settings?.themeMode) {
      setThemeMode(settings.themeMode);
      console.log('🎨 Theme mode set to:', settings.themeMode);
    } else {
      setThemeMode('system');
      console.log('🎨 Theme mode defaulting to: system');
    }
  }, []);

  // Reload theme function that forces a refresh
  const reloadTheme = useCallback(async () => {
    await loadThemePreference();
    setRefreshKey(k => k + 1); // Force re-render
  }, [loadThemePreference]);

  // Load theme preference from storage on mount
  useEffect(() => {
    loadThemePreference();
  }, [loadThemePreference]);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  // Determine effective scheme
  const effectiveScheme: 'light' | 'dark' =
    themeMode === 'system'
      ? (systemScheme === 'light' ? 'light' : 'dark')
      : themeMode;

  const theme = effectiveScheme === 'light' ? lightTheme : darkTheme;

  console.log('🎨 useTheme result:', {
    themeMode,
    systemScheme,
    effectiveScheme,
    themeBackground: theme.colors.background,
    refreshKey,
  });

  return { theme, themeMode, effectiveScheme, reloadTheme };
}

