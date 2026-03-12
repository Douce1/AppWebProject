/**
 * Issue #192 — 뒤로가기 버튼 텍스트 제거 통일
 *
 * 실제 레이아웃 파일 및 화면 파일을 직접 읽어
 * headerBackTitleVisible: false 적용 및 이전 해킹 제거를 검증한다.
 * 소스가 원래대로 되돌아가면 테스트가 실패하여 회귀를 방지한다.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

const rootLayoutSrc = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf-8');
const docsLayoutSrc = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'docs', '_layout.tsx'), 'utf-8');
const profileLayoutSrc = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'profile', '_layout.tsx'), 'utf-8');
const appSettingsSrc = fs.readFileSync(path.join(ROOT, 'src', 'screens', 'AppSettingsScreen.tsx'), 'utf-8');

// ══════════════════════════════════════════════════════════════════════════════
// 1. 정상 케이스 — 루트 Stack에 headerBackTitleVisible: false 적용 확인
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] app/_layout.tsx — 루트 Stack 뒤로가기 텍스트 숨김', () => {
  test('T01 — screenOptions에 headerBackTitleVisible: false 포함', () => {
    expect(rootLayoutSrc).toContain('headerBackTitleVisible: false');
  });

  test('T02 — Stack screenOptions 속성으로 선언됨', () => {
    expect(rootLayoutSrc).toMatch(/Stack\s+screenOptions=\{\{[^}]*headerBackTitleVisible:\s*false/s);
  });

  test('T03 — (tabs) Screen은 headerShown: false 유지', () => {
    expect(rootLayoutSrc).toContain('name="(tabs)" options={{ headerShown: false }}');
  });

  test('T04 — profile/instructor 화면 title 유지', () => {
    expect(rootLayoutSrc).toContain("name=\"profile/instructor\"");
    expect(rootLayoutSrc).toContain("title: '강사 프로필 설정'");
  });

  test('T05 — profile/settings 화면 title 유지', () => {
    expect(rootLayoutSrc).toContain("name=\"profile/settings\"");
  });

  test('T06 — settings 화면 title 유지', () => {
    expect(rootLayoutSrc).toContain("name=\"settings\"");
    expect(rootLayoutSrc).toContain("title: '앱 설정'");
  });

  test('T07 — profile/signature 화면 등록 유지', () => {
    expect(rootLayoutSrc).toContain("name=\"profile/signature\"");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. 정상 케이스 — docs _layout에도 headerBackTitleVisible: false 적용
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] app/(tabs)/docs/_layout.tsx — 뒤로가기 텍스트 숨김', () => {
  test('T08 — screenOptions에 headerBackTitleVisible: false 포함', () => {
    expect(docsLayoutSrc).toContain('headerBackTitleVisible: false');
  });

  test('T09 — headerShown: true 유지 (서브 스크린은 헤더 표시)', () => {
    expect(docsLayoutSrc).toContain('headerShown: true');
  });

  test('T10 — sign 화면 title 유지', () => {
    expect(docsLayoutSrc).toContain("name=\"sign\"");
    expect(docsLayoutSrc).toContain("title: '서명 상세'");
  });

  test('T11 — contract 화면 title 유지', () => {
    expect(docsLayoutSrc).toContain("name=\"contract\"");
    expect(docsLayoutSrc).toContain("title: '계약서 상세'");
  });

  test('T12 — request 화면 title 유지', () => {
    expect(docsLayoutSrc).toContain("name=\"request\"");
    expect(docsLayoutSrc).toContain("title: '요청 상세'");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. 예외 케이스 — 이전 해킹 방식(headerBackTitle: ' ') 제거 확인
// ══════════════════════════════════════════════════════════════════════════════

describe('[예외] AppSettingsScreen — headerBackTitle 해킹 제거', () => {
  test('T13 — headerBackTitle: \'  \' 해킹 제거됨', () => {
    expect(appSettingsSrc).not.toContain("headerBackTitle:");
  });

  test('T14 — headerLeft 커스텀 버튼은 유지', () => {
    expect(appSettingsSrc).toContain('headerLeft:');
  });

  test('T15 — navigation.setOptions 호출 유지', () => {
    expect(appSettingsSrc).toContain('navigation.setOptions(');
  });

  test('T16 — ChevronLeft 아이콘 사용 유지', () => {
    expect(appSettingsSrc).toContain('ChevronLeft');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. 사이드 이펙트 — profile _layout은 headerShown: false 유지 확인
// ══════════════════════════════════════════════════════════════════════════════

describe('[사이드이펙트] app/(tabs)/profile/_layout.tsx — 기존 설정 미영향', () => {
  test('T17 — profile layout은 headerShown: false 유지', () => {
    expect(profileLayoutSrc).toContain('headerShown: false');
  });

  test('T18 — profile/index Screen 등록 유지', () => {
    expect(profileLayoutSrc).toContain('name="index"');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. 통합 케이스 — 루트 레이아웃 구조 무결성
// ══════════════════════════════════════════════════════════════════════════════

describe('[통합] 레이아웃 파일 구조 무결성', () => {
  test('T19 — 루트 _layout에 Stack import 존재', () => {
    expect(rootLayoutSrc).toContain("from 'expo-router'");
    expect(rootLayoutSrc).toContain('Stack');
  });

  test('T20 — 루트 _layout에 ThemeProvider 유지', () => {
    expect(rootLayoutSrc).toContain('ThemeProvider');
  });
});
