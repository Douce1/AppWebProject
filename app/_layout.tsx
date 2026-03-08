import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChatProvider } from '@/src/context/ChatContext';
import { ProfileProvider } from '@/src/context/ProfileContext';
import { ScheduleProvider } from '@/src/context/ScheduleContext';

// JS 번들 로딩 중에는 스플래시 유지 (빈 화면 대신 스플래시 표시)
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // 첫 렌더 후 스플래시 숨김 → 체감 로딩 개선
    SplashScreen.hideAsync();
  }, []);

  return (
    <ScheduleProvider>
      <ChatProvider>
        <ProfileProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ title: '앱 설정' }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </ProfileProvider>
      </ChatProvider>
    </ScheduleProvider>
  );
}
