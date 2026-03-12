import { Stack } from 'expo-router';

// 이슈 #137: index(내 정보 메인)만 탭 내부 스택으로 유지.
// 하위 화면(availability, instructor, career, career-detail, region, settings)은
// 루트 스택(app/_layout.tsx)으로 이동하여 bottom tab이 숨겨지도록 함.
export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
