import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { startTransition, useEffect, useState } from 'react';
import 'react-native-reanimated';

import { httpClient, setAuthFailureHandler } from '@/src/api/httpClient';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChatProvider } from '@/src/context/ChatContext';
import { ProfileProvider } from '@/src/context/ProfileContext';
import { ScheduleProvider } from '@/src/context/ScheduleContext';
import { AppQueryProvider } from '@/src/query/AppQueryProvider';
import { getAccessToken, subscribeAuthState } from '@/src/store/authStore';
import { registerPushDeviceIfNeeded, setupNotificationHandlers } from '@/src/services/notificationService';

// JS 번들 로딩 중에는 스플래시 유지 (빈 화면 대신 스플래시 표시)
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const bootstrapAuth = async () => {
      try {
        const token = await getAccessToken();
        if (!mounted) {
          return;
        }

        if (!token) {
          setIsAuthenticated(false);
          setIsAuthReady(true);
          return;
        }

        // 토큰이 있으면 /me 호출로 세션 유효성 검증 (내부에서 refresh/401 처리)
        await httpClient.getMe();
        if (!mounted) {
          return;
        }
        setIsAuthenticated(true);
      } catch {
        if (!mounted) {
          return;
        }
        // /me 또는 refresh 실패 → 비인증 상태로 간주
        setIsAuthenticated(false);
      } finally {
        if (mounted) {
          setIsAuthReady(true);
        }
      }
    };

    bootstrapAuth();

    const unsubscribe = subscribeAuthState((nextIsAuthenticated) => {
      startTransition(() => {
        setIsAuthenticated(nextIsAuthenticated);
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setAuthFailureHandler(async () => {
      startTransition(() => {
        setIsAuthenticated(false);
      });

      if (pathname !== '/login') {
        router.replace('/login');
      }
    });

    return () => {
      setAuthFailureHandler(() => {});
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!isAuthenticated && pathname !== '/login') {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && pathname === '/login') {
      router.replace('/(tabs)');
    }
  }, [isAuthReady, isAuthenticated, pathname, router]);

  // 앱 마운트 시 1회: 포그라운드 알림 표시 + 탭 딥링크 핸들러 등록
  useEffect(() => {
    return setupNotificationHandlers();
  }, []);

  // 로그인 완료 시 push device 등록
  useEffect(() => {
    if (isAuthenticated) {
      void registerPushDeviceIfNeeded();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthReady) {
      SplashScreen.hideAsync();
    }
  }, [isAuthReady]);

  if (!isAuthReady) {
    return null;
  }

  const stack = (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerBackTitleVisible: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="docs/import" options={{ headerShown: false }} />
        <Stack.Screen name="docs/review" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: '앱 설정' }} />
        {/* 이슈 #137: 내 정보 하위 화면은 루트 스택에 등록 → bottom tab 숨김 */}
        <Stack.Screen name="profile/instructor" options={{ title: '강사 프로필 설정' }} />
        <Stack.Screen name="profile/availability" options={{ title: '가용시간 설정' }} />
        <Stack.Screen name="profile/career" options={{ title: '강의 이력' }} />
        <Stack.Screen name="profile/career-detail" options={{ title: '강의 이력 상세' }} />
        <Stack.Screen name="profile/region" options={{ title: '희망 지역' }} />
        <Stack.Screen name="profile/settings" options={{ title: '앱 설정' }} />
        <Stack.Screen name="profile/signature" options={{ title: '서명 이미지 관리' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="lesson-report" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );

  if (!isAuthenticated) {
    return stack;
  }

  return (
    <AppQueryProvider>
      <ScheduleProvider>
        <ChatProvider>
          <ProfileProvider>{stack}</ProfileProvider>
        </ChatProvider>
      </ScheduleProvider>
    </AppQueryProvider>
  );
}
