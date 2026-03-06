# 앱 로딩이 느린 원인 정리

## 1. 앱 부팅 시 수행되는 작업

- **루트 레이아웃** (`app/_layout.tsx`)
  - `ScheduleProvider`, `ProfileProvider`, `ThemeProvider` 마운트
  - `react-native-reanimated` 전체 임포트 (무거운 라이브러리)
  - `useColorScheme` 등 훅 실행
- **ScheduleProvider** (`src/context/ScheduleContext.tsx`)
  - 마운트 직후 `useEffect`에서 **`apiClient.getLessons()`** 호출
  - mock 사용 시: 즉시 반환
  - 실제 API 사용 시: 네트워크 지연만큼 데이터 도착 전까지 홈이 빈 상태로 보일 수 있음
- **첫 화면**
  - `(tabs)/index` → `HomeScreen` 로드 (캘린더, 위치 권한 등 의존성 포함)

## 2. 가능한 원인

| 원인 | 설명 |
|------|------|
| **JS 번들 파싱/실행** | reanimated, react-navigation, lucide 등 초기 번들이 커서 기기에서 파싱·실행 시간이 길어질 수 있음 |
| **스플래시 미사용** | 준비될 때까지 스플래시를 유지하지 않아, JS 로딩 중에는 빈 화면이 보일 수 있음 |
| **API 대기** | `USE_MOCK = false`일 때 `getLessons()` 지연이 길면 홈이 늦게 채워져 “로딩이 길다”고 느낄 수 있음 |

## 3. 적용한 개선

- **스플래시 유지**: 루트에서 `SplashScreen.preventAutoHideAsync()` 호출 후, 첫 렌더가 끝난 시점에 `SplashScreen.hideAsync()` 호출하도록 추가.  
  → 로딩 중에는 빈 화면 대신 스플래시가 보여 체감 속도 개선.

## 4. 추가로 고려할 개선

- **필요 시 로딩 UI**: `getLessons()`가 느릴 때 홈에서 로딩 인디케이터 표시.
- **실제 API 사용 시**: 백엔드 응답 속도 개선, 캐시 도입 검토.
- **번들/초기 로드**: 사용하지 않는 라이브러리 제거, 큰 화면은 lazy 로드 검토.
