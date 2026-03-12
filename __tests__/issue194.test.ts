/**
 * Issue #194 — 메뉴명 표기를 계약/정산으로 정리
 *
 * 4개 소스 파일을 직접 읽어 "서류/계약" → "계약", "수입/정산" → "정산"으로
 * 메뉴명이 올바르게 변경되었음을 검증한다.
 * 소스가 원래대로 되돌아가면 테스트가 실패하여 회귀를 방지한다.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

const tabLayout = fs.readFileSync(
  path.join(ROOT, 'app', '(tabs)', '_layout.tsx'),
  'utf-8',
);

const bottomTabNavigator = fs.readFileSync(
  path.join(ROOT, 'src', 'navigation', 'BottomTabNavigator.tsx'),
  'utf-8',
);

const docsScreen = fs.readFileSync(
  path.join(ROOT, 'src', 'screens', 'DocsScreen.tsx'),
  'utf-8',
);

const incomeScreen = fs.readFileSync(
  path.join(ROOT, 'src', 'screens', 'IncomeScreen.tsx'),
  'utf-8',
);

// ══════════════════════════════════════════════════════════════════════════════
// 1. 정상 케이스 — 변경된 문구 존재 확인
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] 변경된 메뉴명 존재', () => {
  test('T01 — app/(tabs)/_layout.tsx에 docs 탭 title이 "계약"으로 설정됨', () => {
    expect(tabLayout).toContain("title: '계약'");
  });

  test('T02 — app/(tabs)/_layout.tsx에 income 탭 title이 "정산"으로 설정됨', () => {
    expect(tabLayout).toContain("title: '정산'");
  });

  test('T03 — BottomTabNavigator.tsx에 Tab.Screen name이 "계약"으로 설정됨', () => {
    expect(bottomTabNavigator).toContain('name="계약"');
  });

  test('T04 — BottomTabNavigator.tsx에 Tab.Screen name이 "정산"으로 설정됨', () => {
    expect(bottomTabNavigator).toContain('name="정산"');
  });

  test('T05 — BottomTabNavigator.tsx에 route.name === "계약" 분기 존재', () => {
    expect(bottomTabNavigator).toContain("route.name === '계약'");
  });

  test('T06 — BottomTabNavigator.tsx에 route.name === "정산" 분기 존재', () => {
    expect(bottomTabNavigator).toContain("route.name === '정산'");
  });

  test('T07 — DocsScreen.tsx의 NotificationTopBar title이 "계약"으로 변경됨', () => {
    expect(docsScreen).toContain('title="계약"');
  });

  test('T08 — IncomeScreen.tsx의 NotificationTopBar title이 "정산"으로 변경됨', () => {
    expect(incomeScreen).toContain('title="정산"');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. 예외 케이스 — 이전 문구 제거 확인
// ══════════════════════════════════════════════════════════════════════════════

describe('[예외] 이전(복합형) 메뉴명이 제거됨', () => {
  test('T09 — app/(tabs)/_layout.tsx에 "서류/계약" 문자열 없음', () => {
    expect(tabLayout).not.toContain('서류/계약');
  });

  test('T10 — app/(tabs)/_layout.tsx에 "수입/정산" 문자열 없음', () => {
    expect(tabLayout).not.toContain('수입/정산');
  });

  test('T11 — BottomTabNavigator.tsx에 "서류/계약" 문자열 없음', () => {
    expect(bottomTabNavigator).not.toContain('서류/계약');
  });

  test('T12 — BottomTabNavigator.tsx에 "수입/정산" 문자열 없음', () => {
    expect(bottomTabNavigator).not.toContain('수입/정산');
  });

  test('T13 — DocsScreen.tsx에 "서류/계약" 문자열 없음', () => {
    expect(docsScreen).not.toContain('서류/계약');
  });

  test('T14 — IncomeScreen.tsx에 "수입/정산" 문자열 없음', () => {
    expect(incomeScreen).not.toContain('수입/정산');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. 사이드 이펙트 — 다른 탭 문구 영향 없음
// ══════════════════════════════════════════════════════════════════════════════

describe('[사이드이펙트] 다른 탭 문구 영향 없음', () => {
  test('T15 — app/(tabs)/_layout.tsx에 홈 탭 title "홈" 유지', () => {
    expect(tabLayout).toContain("title: '홈'");
  });

  test('T16 — app/(tabs)/_layout.tsx에 채팅 탭 title "채팅" 유지', () => {
    expect(tabLayout).toContain("title: '채팅'");
  });

  test('T17 — app/(tabs)/_layout.tsx에 내 정보 탭 title "내 정보" 유지', () => {
    expect(tabLayout).toContain("title: '내 정보'");
  });

  test('T18 — BottomTabNavigator.tsx에 "홈" Tab.Screen 유지', () => {
    expect(bottomTabNavigator).toContain('name="홈"');
  });

  test('T19 — BottomTabNavigator.tsx에 "채팅" Tab.Screen 유지', () => {
    expect(bottomTabNavigator).toContain('name="채팅"');
  });

  test('T20 — BottomTabNavigator.tsx에 "내 정보" Tab.Screen 유지', () => {
    expect(bottomTabNavigator).toContain('name="내 정보"');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. 통합 케이스 — 화면 컴포넌트 및 아이콘 연결 무결성
// ══════════════════════════════════════════════════════════════════════════════

describe('[통합] 화면 컴포넌트 및 아이콘 연결 무결성', () => {
  test('T21 — BottomTabNavigator.tsx에 DocsScreen 컴포넌트 연결 유지', () => {
    expect(bottomTabNavigator).toContain('component={DocsScreen}');
  });

  test('T22 — BottomTabNavigator.tsx에 IncomeScreen 컴포넌트 연결 유지', () => {
    expect(bottomTabNavigator).toContain('component={IncomeScreen}');
  });

  test('T23 — BottomTabNavigator.tsx에 "계약" 탭에 FileText 아이콘 연결됨', () => {
    expect(bottomTabNavigator).toMatch(/route\.name === '계약'.*FileText/s);
  });

  test('T24 — BottomTabNavigator.tsx에 "정산" 탭에 DollarSign 아이콘 연결됨', () => {
    expect(bottomTabNavigator).toMatch(/route\.name === '정산'.*DollarSign/s);
  });

  test('T25 — app/(tabs)/_layout.tsx에 docs 탭에 FileText 아이콘 연결됨', () => {
    expect(tabLayout).toMatch(/name="docs"[\s\S]*?FileText/);
  });

  test('T26 — app/(tabs)/_layout.tsx에 income 탭에 DollarSign 아이콘 연결됨', () => {
    expect(tabLayout).toMatch(/name="income"[\s\S]*?DollarSign/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. 회귀 케이스 — 기존 화면 구조 유지
// ══════════════════════════════════════════════════════════════════════════════

describe('[회귀] 기존 화면 구조 유지', () => {
  test('T27 — DocsScreen.tsx에 default export 유지', () => {
    expect(docsScreen).toContain('export default function DocsScreen');
  });

  test('T28 — IncomeScreen.tsx에 default export 유지', () => {
    expect(incomeScreen).toContain('export default function IncomeScreen');
  });

  test('T29 — app/(tabs)/_layout.tsx에 TabLayout default export 유지', () => {
    expect(tabLayout).toContain('export default function TabLayout');
  });

  test('T30 — BottomTabNavigator.tsx에 BottomTabNavigator default export 유지', () => {
    expect(bottomTabNavigator).toContain('export default function BottomTabNavigator');
  });
});
