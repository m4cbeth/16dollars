import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { ensureDefaults } from './src/storage';
import { useTheme } from './src/useTheme';

function AppContent() {
  const { effectiveScheme } = useTheme();

  return (
    <>
      <StatusBar style={effectiveScheme === 'light' ? 'dark' : 'light'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  useEffect(() => {
    ensureDefaults();
  }, []);

  return <AppContent />;
}
