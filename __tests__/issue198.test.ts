/**
 * Issue #198 — 주요 스크롤 화면에서 하단 네비게이션에 콘텐츠 가려짐 레이아웃 수정
 *
 * 검증 전략:
 * - 실제 소스 파일을 직접 읽어(fs.readFileSync) 변경 사항을 검증한다.
 * - BottomTabBar 높이(68px)와 safe area insets 처리가 올바른지 확인한다.
 * - 정상/예외/사이드이펙트/통합/회귀 케이스 20개 이상 포함.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const HOME_SCREEN = path.join(ROOT, 'src', 'screens', 'HomeScreen.tsx');
const DOCS_SCREEN = path.join(ROOT, 'src', 'screens', 'DocsScreen.tsx');
const INCOME_SCREEN = path.join(ROOT, 'src', 'screens', 'IncomeScreen.tsx');
const CHAT_SCREEN = path.join(ROOT, 'src', 'screens', 'ChatScreen.tsx');
const PROFILE_SCREEN = path.join(ROOT, 'src', 'screens', 'ProfileScreen.tsx');
const BOTTOM_TAB_BAR = path.join(ROOT, 'src', 'components', 'organisms', 'BottomTabBar.tsx');

const homeSrc = fs.readFileSync(HOME_SCREEN, 'utf-8');
const docsSrc = fs.readFileSync(DOCS_SCREEN, 'utf-8');
const incomeSrc = fs.readFileSync(INCOME_SCREEN, 'utf-8');
const chatSrc = fs.readFileSync(CHAT_SCREEN, 'utf-8');
const profileSrc = fs.readFileSync(PROFILE_SCREEN, 'utf-8');
const bottomTabBarSrc = fs.readFileSync(BOTTOM_TAB_BAR, 'utf-8');

describe('[정상] HomeScreen — safe area insets 처리', () => {
  test('HomeScreen이 useSafeAreaInsets를 import한다', () => {
    expect(homeSrc).toContain("import { useSafeAreaInsets } from 'react-native-safe-area-context'");
  });

  test('HomeScreen이 useSafeAreaInsets 훅을 사용한다', () => {
    expect(homeSrc).toContain('const insets = useSafeAreaInsets()');
  });

  test('HomeScreen의 ScrollView에 contentContainerStyle이 있다', () => {
    expect(homeSrc).toContain('contentContainerStyle={{ paddingBottom: insets.bottom + 84 }}');
  });

  test('HomeScreen ScrollView의 paddingBottom이 insets.bottom을 포함한다', () => {
    expect(homeSrc).toMatch(/contentContainerStyle=\{.*paddingBottom.*insets\.bottom/);
  });
});

describe('[정상] DocsScreen — safe area insets 처리', () => {
  test('DocsScreen이 useSafeAreaInsets를 import한다', () => {
    expect(docsSrc).toContain("import { useSafeAreaInsets } from 'react-native-safe-area-context'");
  });

  test('DocsScreen이 useSafeAreaInsets 훅을 사용한다', () => {
    expect(docsSrc).toContain('const insets = useSafeAreaInsets()');
  });

  test('DocsScreen의 ScrollView에 contentContainerStyle이 있다', () => {
    expect(docsSrc).toContain('contentContainerStyle={{ paddingBottom: insets.bottom + 84 }}');
  });

  test('DocsScreen ScrollView의 paddingBottom이 insets.bottom을 포함한다', () => {
    expect(docsSrc).toMatch(/contentContainerStyle=\{.*paddingBottom.*insets\.bottom/);
  });
});

describe('[정상] IncomeScreen — safe area insets 처리', () => {
  test('IncomeScreen이 useSafeAreaInsets를 import한다', () => {
    expect(incomeSrc).toContain("import { useSafeAreaInsets } from 'react-native-safe-area-context'");
  });

  test('IncomeScreen이 useSafeAreaInsets 훅을 사용한다', () => {
    expect(incomeSrc).toContain('const insets = useSafeAreaInsets()');
  });

  test('IncomeScreen의 ScrollView에 contentContainerStyle이 있다', () => {
    expect(incomeSrc).toContain('contentContainerStyle={{ paddingBottom: insets.bottom + 84 }}');
  });

  test('IncomeScreen historySection의 hardcoded paddingBottom: 100이 제거됐다', () => {
    expect(incomeSrc).not.toContain('paddingBottom: 100');
  });

  test('IncomeScreen historySection의 paddingBottom이 20으로 적절히 조정됐다', () => {
    expect(incomeSrc).toContain('paddingBottom: 20');
  });
});

describe('[정상] ChatScreen — safe area insets 처리', () => {
  test('ChatScreen이 useSafeAreaInsets를 import한다', () => {
    expect(chatSrc).toContain("import { useSafeAreaInsets } from 'react-native-safe-area-context'");
  });

  test('ChatScreen이 useSafeAreaInsets 훅을 사용한다', () => {
    expect(chatSrc).toContain('const insets = useSafeAreaInsets()');
  });

  test('ChatScreen FlatList의 contentContainerStyle이 insets.bottom을 사용한다', () => {
    expect(chatSrc).toContain('insets.bottom + 84');
  });

  test('ChatScreen FlatList의 paddingBottom이 20으로 고정되지 않는다', () => {
    expect(chatSrc).not.toContain('{ paddingBottom: 20 }');
  });
});

describe('[정상] ProfileScreen — safe area insets 처리', () => {
  test('ProfileScreen이 useSafeAreaInsets를 사용한다', () => {
    expect(profileSrc).toContain('const insets = useSafeAreaInsets()');
  });

  test('ProfileScreen의 ScrollView에 contentContainerStyle이 있다', () => {
    expect(profileSrc).toContain('contentContainerStyle={{ paddingBottom: insets.bottom + 84 }}');
  });

  test('ProfileScreen ScrollView의 paddingBottom이 insets.bottom을 포함한다', () => {
    expect(profileSrc).toMatch(/contentContainerStyle=\{.*paddingBottom.*insets\.bottom/);
  });
});

describe('[예외] BottomTabBar 높이 구조 확인', () => {
  test('BottomTabBar가 position absolute를 사용한다', () => {
    expect(bottomTabBarSrc).toContain("position: 'absolute'");
  });

  test('BottomTabBar가 height: 68을 가진다', () => {
    expect(bottomTabBarSrc).toContain('height: 68');
  });

  test('BottomTabBar가 useSafeAreaInsets를 사용하여 bottom 오프셋을 조정한다', () => {
    expect(bottomTabBarSrc).toContain('insets.bottom');
  });

  test('BottomTabBar가 bottom: Math.max(insets.bottom, 16)을 사용한다', () => {
    expect(bottomTabBarSrc).toContain('Math.max(insets.bottom, 16)');
  });
});

describe('[통합] paddingBottom 값이 BottomTabBar 높이를 충분히 커버한다', () => {
  test('스크린 paddingBottom 84는 BottomTabBar height(68)보다 크다', () => {
    const BOTTOM_TAB_HEIGHT = 68;
    const BOTTOM_TAB_POSITION = 16;
    const TOTAL_NAV_HEIGHT = BOTTOM_TAB_HEIGHT + BOTTOM_TAB_POSITION;
    const SCREEN_PADDING_BOTTOM = 84;
    expect(SCREEN_PADDING_BOTTOM).toBeGreaterThan(BOTTOM_TAB_HEIGHT);
    expect(SCREEN_PADDING_BOTTOM).toBeGreaterThanOrEqual(TOTAL_NAV_HEIGHT);
  });

  test('HomeScreen, DocsScreen, IncomeScreen, ChatScreen, ProfileScreen 모두 insets.bottom + 84를 사용한다', () => {
    const pattern = /insets\.bottom \+ 84/;
    expect(homeSrc).toMatch(pattern);
    expect(docsSrc).toMatch(pattern);
    expect(incomeSrc).toMatch(pattern);
    expect(chatSrc).toMatch(pattern);
    expect(profileSrc).toMatch(pattern);
  });
});

describe('[회귀] 기존 기능 유지 검증', () => {
  test('HomeScreen이 여전히 FlatList와 ScrollView를 사용한다', () => {
    expect(homeSrc).toContain('FlatList');
    expect(homeSrc).toContain('ScrollView');
  });

  test('DocsScreen이 여전히 SegmentedTabs와 NotificationTopBar를 사용한다', () => {
    expect(docsSrc).toContain('SegmentedTabs');
    expect(docsSrc).toContain('NotificationTopBar');
  });

  test('IncomeScreen이 여전히 정산 내역 기능을 포함한다', () => {
    expect(incomeSrc).toContain('historySection');
    expect(incomeSrc).toContain('filterSettlementsByPeriod');
  });

  test('ChatScreen이 여전히 FlatList와 unreadBadge를 사용한다', () => {
    expect(chatSrc).toContain('FlatList');
    expect(chatSrc).toContain('unreadBadge');
  });

  test('ProfileScreen이 여전히 메뉴 아이템들을 포함한다', () => {
    expect(profileSrc).toContain('강사 프로필 설정');
    expect(profileSrc).toContain('서명 이미지 관리');
  });

  test('DocsScreen의 insets.top 처리가 유지된다', () => {
    expect(docsSrc).toContain('insets.top');
  });

  test('ProfileScreen의 insets.top 처리가 유지된다', () => {
    expect(profileSrc).toContain('insets.top');
  });
});
