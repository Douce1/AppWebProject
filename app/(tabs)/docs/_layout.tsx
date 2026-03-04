import { Stack } from 'expo-router';

export default function DocsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: '서류 / 계약', headerShadowVisible: false }} />
      <Stack.Screen name="sign" options={{ title: '서명 상세' }} />
      <Stack.Screen name="contract" options={{ title: '계약서 상세' }} />
    </Stack>
  );
}

