import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '../hooks/use-color-scheme';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AudioProvider, useAudio } from '../context/AudioContext';
import MiniPlayer from '../components/MiniPlayer';
import PlayerModal from '../components/PlayerModal';
import OnboardingWizard from '../components/OnboardingWizard';
import '../global.css';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AudioProvider>
          <AppContent />
        </AudioProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const colorScheme = useColorScheme();
  const { user, token, loading, checkAuth, personalizeModalOpen, closePersonalize } = useAuth();
  const { playerOpen } = useAudio();

  const segments = useSegments();
  const router = useRouter();

  // Redirect based on auth state
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!token && !inAuthGroup) {
      // Redirect to the sign-in page.
      router.replace('/auth');
    } else if (token && inAuthGroup) {
      // Redirect away from the sign-in page.
      router.replace('/(tabs)');
    }
  }, [token, loading, segments, router]);

  const showOnboarding = (user && !user.onboarded) || personalizeModalOpen;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#d91b29" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="playlist-details" options={{ presentation: 'card' }} />
        <Stack.Screen name="mix-details" options={{ presentation: 'card' }} />
      </Stack>

      {/* Global Mini player HUD */}
      {!playerOpen && <MiniPlayer />}

      {/* Full-screen playback manager panel */}
      <PlayerModal />

      {/* Onboarding Wizard Portal overlay */}
      <OnboardingWizard
        visible={!!showOnboarding}
        token={token}
        onComplete={() => {
          closePersonalize();
          checkAuth();
        }}
        onClose={closePersonalize}
      />


      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
