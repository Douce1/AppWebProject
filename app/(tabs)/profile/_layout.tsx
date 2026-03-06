import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: '내 정보', headerShown: false, headerShadowVisible: false }} />
      <Stack.Screen name="availability" options={{ title: '가용시간 설정' }} />
      <Stack.Screen name="instructor" options={{ title: '강사 프로필 설정' }} />
      <Stack.Screen name="career" options={{ title: '강의 이력' }} />
      <Stack.Screen name="career-detail" options={{ title: '강의 이력 상세' }} />
      <Stack.Screen name="region" options={{ title: '희망 지역' }} />
      <Stack.Screen name="settings" options={{ title: '앱 설정' }} />
    </Stack>
  );
}
