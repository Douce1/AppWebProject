import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { httpClient } from '@/src/api/httpClient';
import { saveTokens } from '@/src/store/authStore';

WebBrowser.maybeCompleteAuthSession();

type AppExtra = {
  googleClientId?: string;
  googleAndroidClientId?: string;
  googleIosClientId?: string;
  googleWebClientId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

export default function LoginScreen() {
  const googleClientIds = {
    androidClientId: extra.googleAndroidClientId ?? extra.googleClientId ?? '',
    iosClientId: extra.googleIosClientId ?? extra.googleClientId ?? '',
    webClientId: extra.googleWebClientId ?? extra.googleClientId ?? '',
  };

  const currentPlatformClientId =
    Platform.select({
      android: googleClientIds.androidClientId,
      ios: googleClientIds.iosClientId,
      web: googleClientIds.webClientId,
      default: '',
    }) ?? '';

  if (!currentPlatformClientId) {
    return <MockLoginCard />;
  }

  return <GoogleLoginCard googleClientIds={googleClientIds} />;
}

function MockLoginCard() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mockIdToken = useMemo(() => Crypto.randomUUID(), []);

  const completeLogin = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const data = await httpClient.loginWithGoogle(mockIdToken);
      await saveTokens(data.accessToken, data.refreshToken);
      router.replace('/(tabs)');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LoginCard
      buttonLabel="Google 계정으로 계속하기"
      disabled={isSubmitting}
      errorMessage={errorMessage}
      helperText='Google client ID가 없어서 개발용 mock 로그인으로 동작합니다.'
      isSubmitting={isSubmitting}
      onPress={() => {
        void completeLogin();
      }}
    />
  );
}

function GoogleLoginCard({
  googleClientIds,
}: {
  googleClientIds: {
    androidClientId: string;
    iosClientId: string;
    webClientId: string;
  };
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: googleClientIds.androidClientId || undefined,
    iosClientId: googleClientIds.iosClientId || undefined,
    webClientId: googleClientIds.webClientId || undefined,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (response?.type !== 'success') {
      return;
    }

    const idToken = response.params.id_token;
    if (!idToken) {
      setErrorMessage('Google ID 토큰을 가져오지 못했습니다.');
      return;
    }

    void completeLogin(idToken);
  }, [response]);

  const completeLogin = async (idToken: string) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const data = await httpClient.loginWithGoogle(idToken);
      await saveTokens(data.accessToken, data.refreshToken);
      router.replace('/(tabs)');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginPress = async () => {
    if (isSubmitting) {
      return;
    }

    const result = await promptAsync();
    if (result.type === 'dismiss') {
      setErrorMessage('로그인이 취소되었습니다.');
    }
  };

  return (
    <LoginCard
      buttonLabel="Google 계정으로 계속하기"
      disabled={isSubmitting || !request}
      errorMessage={errorMessage}
      isSubmitting={isSubmitting}
      onPress={() => {
        void handleLoginPress();
      }}
    />
  );
}

function LoginCard({
  buttonLabel,
  disabled,
  errorMessage,
  helperText,
  isSubmitting,
  onPress,
}: {
  buttonLabel: string;
  disabled: boolean;
  errorMessage: string | null;
  helperText?: string;
  isSubmitting: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brand}>free-b</Text>
        <Text style={styles.title}>강사 로그인</Text>
        <Text style={styles.description}>
          구글 계정으로 로그인하고 수업, 계약, 채팅 데이터를 이어서 확인하세요.
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onPress}
          style={({ pressed }) => [
            styles.button,
            (pressed || isSubmitting || disabled) && styles.buttonPressed,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          )}
        </Pressable>

        {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f3f4f6',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
    marginBottom: 24,
  },
  button: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  helperText: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: '#b91c1c',
  },
});
